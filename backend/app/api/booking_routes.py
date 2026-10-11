from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Booking, Room, RoomBed, User, Notification, AuditLog
from ..schemas.schemas import BookingRequestCreate, BookingApprove, BookingReject, BookingResponse
from ..auth.security import get_current_user, get_current_admin

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

    # If was approved, free up bed
    if booking.status == "APPROVED" and booking.room_id:
        room = db.query(Room).filter(Room.id == booking.room_id).first()
        if room:
            room.available_beds = min(room.capacity, room.available_beds + 1)
            room.status = "AVAILABLE" if room.available_beds == room.capacity else "PARTIALLY_AVAILABLE"
            # Free the bed
            if booking.allocated_bed:
                bed = db.query(RoomBed).filter(RoomBed.room_id == room.id, RoomBed.bed_number == booking.allocated_bed).first()
                if bed:
                    bed.is_occupied = False
                    bed.current_occupant_name = None

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
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")

    if booking.status == "APPROVED":
        raise HTTPException(status_code=400, detail="This booking has already been approved.")

    # CRITICAL SERVER-SIDE AVAILABILITY VERIFICATION
    # Determine which room to allocate
    room = None
    if booking.room_id:
        room = db.query(Room).filter(Room.id == booking.room_id).first()
    else:
        # Find first matching room that has available beds
        room = db.query(Room).filter(
            Room.room_type == booking.room_type,
            Room.is_ac == booking.is_ac,
            Room.available_beds > 0,
            Room.status != "FULL"
        ).first()

    # Re-verify availability strictly on the server
    if not room or room.available_beds <= 0 or room.status == "FULL":
        booking.status = "REJECTED"
        booking.admin_notes = "Sorry, this room is no longer available."
        booking.reviewed_by = current_admin.full_name
        booking.reviewed_at = datetime.utcnow()

        user_notif = Notification(
            user_id=booking.user_id,
            for_admin=False,
            title="Room Booking Status",
            message="Sorry, this room is no longer available. Please select another available room or contact management.",
            notification_type="BOOKING",
            link="/my-bookings"
        )
        db.add(user_notif)
        db.commit()
        db.refresh(booking)
        raise HTTPException(
            status_code=400,
            detail="Sorry, this room is no longer available."
        )

    # Allocate bed
    allocated_bed_label = approve_data.allocated_bed
    available_bed = None
    if allocated_bed_label:
        available_bed = db.query(RoomBed).filter(
            RoomBed.room_id == room.id,
            RoomBed.bed_number == allocated_bed_label,
            RoomBed.is_occupied == False
        ).first()
    if not available_bed:
        # Pick the first unoccupied bed
        available_bed = db.query(RoomBed).filter(
            RoomBed.room_id == room.id,
            RoomBed.is_occupied == False
        ).first()

    if available_bed:
        available_bed.is_occupied = True
        user = db.query(User).filter(User.id == booking.user_id).first()
        available_bed.current_occupant_name = user.full_name if user else "Allocated Resident"
        allocated_bed_label = available_bed.bed_number

    # Decrement room bed count
    room.available_beds = max(0, room.available_beds - 1)
    if room.available_beds == 0:
        room.status = "FULL"
    else:
        room.status = "PARTIALLY_AVAILABLE"

    booking.room_id = room.id
    booking.allocated_bed = allocated_bed_label or "B1"
    booking.status = "APPROVED"
    booking.admin_notes = approve_data.admin_notes or "Booking confirmed by management."
    booking.reviewed_by = current_admin.full_name
    booking.reviewed_at = datetime.utcnow()

    # Create notification for User
    user_notif = Notification(
        user_id=booking.user_id,
        for_admin=False,
        title="Your Room Booking has been Approved!",
        message=f"Congratulations! Your booking for Room {room.room_number} (Bed {booking.allocated_bed}) has been approved. Joining Date: {booking.preferred_joining_date}.",
        notification_type="BOOKING",
        link="/my-bookings"
    )
    db.add(user_notif)

    # Audit log
    audit = AuditLog(
        actor_email=current_admin.email,
        action="BOOKING_APPROVAL",
        details=f"Approved booking {booking.id} for Room {room.room_number}, Bed {booking.allocated_bed}"
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
