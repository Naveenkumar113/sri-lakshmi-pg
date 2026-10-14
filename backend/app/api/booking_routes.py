from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Booking, Room, RoomBed, User, Notification, AuditLog, Resident, BedAllocation, ResidentHistory
from ..schemas.schemas import BookingRequestCreate, BookingApprove, BookingReject, BookingResponse
from ..auth.security import get_current_user, get_current_admin
from ..utils.resident_id import generate_unique_resident_code
from ..utils.room_occupancy import sync_room_occupancy

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])
admin_router = APIRouter(prefix="/api/admin/bookings", tags=["Admin Bookings"])


@router.post("", response_model=BookingResponse)
def create_booking_request(
    booking_in: BookingRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user doesn't already have an active pending booking for the same room
    existing = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status == "PENDING"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a room booking request pending review by the PG administration."
        )

    # Optional initial check if room_id is specified
    selected_room = None
    if booking_in.room_id:
        selected_room = db.query(Room).filter(Room.id == booking_in.room_id).first()
        if not selected_room:
            raise HTTPException(status_code=404, detail="Selected room was not found.")
        if selected_room.available_beds <= 0 or selected_room.status == "FULL":
            raise HTTPException(
                status_code=400,
                detail=f"Room {selected_room.room_number} is currently full. Please pick another room."
            )

    new_booking = Booking(
        user_id=current_user.id,
        room_id=booking_in.room_id,
        room_type=booking_in.room_type,
        is_ac=booking_in.is_ac,
        preferred_joining_date=booking_in.preferred_joining_date,
        stay_duration_months=booking_in.stay_duration_months,
        message=booking_in.message,
        status="PENDING"
    )
    db.add(new_booking)

    # Notification for User
    user_notif = Notification(
        user_id=current_user.id,
        for_admin=False,
        title="Booking Request Received",
        message=f"Your booking request for {booking_in.room_type} ({'AC' if booking_in.is_ac else 'Non-AC'}) starting {booking_in.preferred_joining_date} has been received. Our administration will review bed availability and confirm.",
        notification_type="BOOKING",
        link="/my-bookings"
    )
    db.add(user_notif)

    # Notification for Admin
    admin_notif = Notification(
        user_id=None,
        for_admin=True,
        title="New Room Booking Request",
        message=f"{current_user.full_name} ({current_user.phone}) requested a {booking_in.room_type} ({'AC' if booking_in.is_ac else 'Non-AC'}) bed.",
        notification_type="BOOKING",
        link="/admin/bookings"
    )
    db.add(admin_notif)

    db.commit()
    db.refresh(new_booking)
    return new_booking

@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()

@router.put("/{booking_id}/cancel")
def cancel_my_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")
    if booking.status in ["CANCELLED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Cannot cancel booking in its current status.")

    # If was approved, close bed allocation and free up bed
    if booking.status == "APPROVED":
        active_alloc = db.query(BedAllocation).filter(
            BedAllocation.booking_id == booking.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).first()
        if active_alloc:
            active_alloc.allocation_status = "CANCELLED"
            active_alloc.move_out_date = datetime.utcnow().strftime("%Y-%m-%d")
            active_alloc.notes = f"{active_alloc.notes or ''} [Cancelled by user]".strip()
            db.flush()
            sync_room_occupancy(db, active_alloc.room_id)
        elif booking.room_id:
            sync_room_occupancy(db, booking.room_id)

    booking.status = "CANCELLED"
    db.commit()
    return {"message": "Booking request successfully cancelled."}

# ADMIN ENDPOINTS
@admin_router.get("", response_model=List[BookingResponse])
def get_all_bookings(
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    return query.order_by(Booking.created_at.desc()).all()

@admin_router.put("/{booking_id}/approve", response_model=BookingResponse)
def approve_booking(
    booking_id: str,
    approve_data: BookingApprove,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Method A: Convert booking request into resident record & bed allocation.
    1. Verify booking and user.
    2. Check room and bed availability.
    3. Select or confirm free bed.
    4. Create or link resident record with unique resident ID.
    5. Create active bed allocation.
    6. Mark booking approved.
    7. Send notification.
    8. Update room occupancy atomically.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")

    if booking.status == "APPROVED":
        raise HTTPException(status_code=400, detail="This booking has already been approved.")

    user = db.query(User).filter(User.id == booking.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Associated applicant user account not found.")

    # 1. Determine target room
    room = None
    target_room_id = approve_data.room_id or booking.room_id
    if target_room_id:
        room = db.query(Room).filter(Room.id == target_room_id).first()
    else:
        # Find first matching room by sharing_type or room_type that has available beds and not maintenance
        room = db.query(Room).filter(
            (Room.sharing_type == booking.room_type) |
            (Room.sharing_type.ilike(f"%{booking.room_type}%")) |
            (Room.room_type == booking.room_type),
            Room.is_ac == booking.is_ac,
            Room.status.in_(["AVAILABLE", "PARTIALLY_AVAILABLE"])
        ).first()

        # Fallback to any room matching AC preference with available beds
        if not room:
            room = db.query(Room).filter(
                Room.is_ac == booking.is_ac,
                Room.status.in_(["AVAILABLE", "PARTIALLY_AVAILABLE"])
            ).first()

    if not room or room.status in ["MAINTENANCE", "INACTIVE"]:
        raise HTTPException(status_code=400, detail="Target room is either not found, under maintenance, or inactive.")

    # 2. Re-verify active occupancy against room capacity
    active_room_allocs = db.query(BedAllocation).filter(
        BedAllocation.room_id == room.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).count()
    if active_room_allocs >= room.capacity:
        raise HTTPException(status_code=400, detail=f"Room {room.room_number} is at full capacity ({room.capacity} beds).")

    # 3. Select target bed
    available_bed = None
    if approve_data.bed_id:
        available_bed = db.query(RoomBed).filter(
            RoomBed.id == approve_data.bed_id,
            RoomBed.room_id == room.id
        ).first()
    elif approve_data.allocated_bed:
        available_bed = db.query(RoomBed).filter(
            RoomBed.room_id == room.id,
            (RoomBed.bed_number == approve_data.allocated_bed) |
            (RoomBed.bed_number == f"Bed {approve_data.allocated_bed.replace('Bed', '').replace('B', '').strip()}")
        ).first()

    if not available_bed:
        # Pick first bed without an active allocation
        active_bed_ids = [
            b_id for (b_id,) in db.query(BedAllocation.bed_id).filter(
                BedAllocation.room_id == room.id,
                BedAllocation.allocation_status == "ACTIVE"
            ).all()
        ]
        available_bed = db.query(RoomBed).filter(
            RoomBed.room_id == room.id,
            ~RoomBed.id.in_(active_bed_ids),
            RoomBed.bed_status != "MAINTENANCE"
        ).first()


    if not available_bed:
        raise HTTPException(status_code=400, detail=f"No available beds remaining in Room {room.room_number}.")

    # Verify selected bed has no active allocation
    bed_allocated = db.query(BedAllocation).filter(
        BedAllocation.bed_id == available_bed.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()
    if bed_allocated:
        raise HTTPException(status_code=400, detail=f"Bed {available_bed.bed_number} in Room {room.room_number} is already occupied.")

    # 4. Method A: Find or create resident record, linking to existing user
    resident = db.query(Resident).filter(Resident.user_id == user.id).first()
    if not resident:
        # Check if phone matches any resident
        resident = db.query(Resident).filter(Resident.phone == user.phone).first()

    if not resident:
        new_resident_code = generate_unique_resident_code(db)
        resident = Resident(
            resident_code=new_resident_code,
            user_id=user.id,
            full_name=user.full_name,
            phone=user.phone,
            email=user.email,
            occupation=user.occupation,
            emergency_contact=user.emergency_contact,
            address=user.address,
            resident_status="ACTIVE"
        )
        db.add(resident)
        db.flush()

        # Log registration
        hist = ResidentHistory(
            resident_id=resident.id,
            event_type="REGISTERED",
            details=f"Resident record automatically created for website user {user.full_name} ({resident.resident_code}) upon booking approval.",
            actor_admin_id=current_admin.id
        )
        db.add(hist)
    else:
        # Link user_id if not already linked
        if not resident.user_id:
            resident.user_id = user.id
        resident.resident_status = "ACTIVE"
        db.flush()

    # Verify resident does not have another active allocation
    existing_active_alloc = db.query(BedAllocation).filter(
        BedAllocation.resident_id == resident.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()
    if existing_active_alloc:
        raise HTTPException(
            status_code=400,
            detail=f"Resident {resident.resident_code} already has an active bed allocation (Room {existing_active_alloc.room.room_number}, {existing_active_alloc.bed.bed_number})."
        )

    # 5. Create Bed Allocation
    move_in = approve_data.move_in_date or booking.preferred_joining_date or datetime.utcnow().strftime("%Y-%m-%d")
    allocation = BedAllocation(
        resident_id=resident.id,
        bed_id=available_bed.id,
        room_id=room.id,
        booking_id=booking.id,
        move_in_date=move_in,
        allocation_status="ACTIVE",
        created_by_admin_id=current_admin.id,
        notes=approve_data.admin_notes
    )
    db.add(allocation)
    db.flush()

    # Log allocation history
    alloc_hist = ResidentHistory(
        resident_id=resident.id,
        event_type="ALLOCATED",
        room_id=room.id,
        bed_id=available_bed.id,
        details=f"Approved room booking {booking.id}. Allocated to Room {room.room_number}, Bed {available_bed.bed_number}.",
        actor_admin_id=current_admin.id
    )
    db.add(alloc_hist)

    # 6. Synchronize room occupancy strictly from allocations
    sync_room_occupancy(db, room.id)

    # 7. Update booking details
    booking.room_id = room.id
    booking.allocated_bed = available_bed.bed_number
    booking.status = "APPROVED"
    booking.admin_notes = approve_data.admin_notes or "Booking confirmed by management."
    booking.reviewed_by = current_admin.full_name
    booking.reviewed_at = datetime.utcnow()

    # 8. User Notification
    user_notif = Notification(
        user_id=booking.user_id,
        for_admin=False,
        title="Your Room Booking has been Approved!",
        message=f"Congratulations! Your booking for Room {room.room_number} ({available_bed.bed_number}) has been approved. Your Resident ID is {resident.resident_code}. Joining Date: {booking.preferred_joining_date}.",
        notification_type="BOOKING",
        link="/my-bookings"
    )
    db.add(user_notif)

    # 9. Audit log
    audit = AuditLog(
        actor_email=current_admin.email,
        action="BOOKING_APPROVAL",
        details=f"Approved booking {booking.id} -> Resident {resident.resident_code} assigned to Room {room.room_number}, Bed {available_bed.bed_number}"
    )
    db.add(audit)

    db.commit()
    db.refresh(booking)
    return booking


@admin_router.put("/{booking_id}/reject", response_model=BookingResponse)
def reject_booking(
    booking_id: str,
    reject_data: BookingReject,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    booking.status = "REJECTED"
    booking.admin_notes = reject_data.admin_notes or "Booking request could not be accommodated at this time."
    booking.reviewed_by = current_admin.full_name
    booking.reviewed_at = datetime.utcnow()

    user_notif = Notification(
        user_id=booking.user_id,
        for_admin=False,
        title="Your Room Booking Request was Rejected",
        message=f"Your room booking request has been rejected. Reason: {booking.admin_notes}. Please reach out if you would like alternative options.",
        notification_type="BOOKING",
        link="/my-bookings"
    )
    db.add(user_notif)
    db.commit()
    db.refresh(booking)
    return booking
