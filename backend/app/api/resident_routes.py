from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from ..database.connection import get_db
from ..models.models import Resident, BedAllocation, ResidentHistory, Room, RoomBed, User, AuditLog
from ..schemas.schemas import (
    ResidentResponse, ResidentDetailResponse, ResidentCreate, ResidentUpdate,
    BedAllocationCreate, BedAllocationTransfer, BedAllocationCheckout,
    BedAllocationResponse, ResidentHistoryResponse
)
from ..auth.security import get_current_admin
from ..utils.resident_id import generate_unique_resident_code
from ..utils.room_occupancy import sync_room_occupancy

router = APIRouter(prefix="/api/admin/residents", tags=["Admin Residents"])
allocation_router = APIRouter(prefix="/api/admin/allocations", tags=["Admin Bed Allocations"])

def enrich_resident_response(resident: Resident, db: Session) -> dict:
    """Helper to enrich resident profile with current active room & bed allocation."""
    active_alloc = db.query(BedAllocation).filter(
        BedAllocation.resident_id == resident.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()

    data = {
        "id": resident.id,
        "resident_code": resident.resident_code,
        "user_id": resident.user_id,
        "full_name": resident.full_name,
        "phone": resident.phone,
        "email": resident.email,
        "occupation": resident.occupation,
        "emergency_contact": resident.emergency_contact,
        "address": resident.address,
        "resident_status": resident.resident_status,
        "created_at": resident.created_at,
        "current_room_id": None,
        "current_room_number": None,
        "current_bed_id": None,
        "current_bed_number": None,
        "current_allocation_id": None,
        "current_move_in_date": None,
        "current_monthly_rent": None,
        "is_ac": None,
        "room_type": None,
        "sharing_type": None
    }

    if active_alloc and active_alloc.room and active_alloc.bed:
        data.update({
            "current_room_id": active_alloc.room_id,
            "current_room_number": active_alloc.room.room_number,
            "current_bed_id": active_alloc.bed_id,
            "current_bed_number": active_alloc.bed.bed_number,
            "current_allocation_id": active_alloc.id,
            "current_move_in_date": active_alloc.move_in_date,
            "current_monthly_rent": active_alloc.room.monthly_rent_per_bed or active_alloc.room.monthly_rent,
            "is_ac": active_alloc.room.is_ac,
            "room_type": active_alloc.room.room_type,
            "sharing_type": active_alloc.room.sharing_type
        })

    return data

@router.get("", response_model=List[ResidentResponse])
def get_residents(
    search: Optional[str] = None,
    status: Optional[str] = None,  # ACTIVE, CHECKED_OUT, ALL
    room_number: Optional[str] = None,
    is_ac: Optional[bool] = None,
    occupation: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Resident)

    if status and status.upper() != "ALL":
        query = query.filter(Resident.resident_status == status.upper())

    if search:
        s = f"%{search.strip().lower()}%"
        # Search resident_code, full_name, phone, email, or room number
        matching_resident_ids = [
            r_id for (r_id,) in db.query(BedAllocation.resident_id).join(Room).filter(
                func.lower(Room.room_number).like(s),
                BedAllocation.allocation_status == "ACTIVE"
            ).all()
        ]

        query = query.filter(
            or_(
                func.lower(Resident.resident_code).like(s),
                func.lower(Resident.full_name).like(s),
                Resident.phone.like(s),
                func.lower(Resident.email).like(s),
                Resident.id.in_(matching_resident_ids)
            )
        )


    if occupation:
        query = query.filter(Resident.occupation.ilike(f"%{occupation}%"))

    residents = query.order_by(Resident.created_at.desc()).all()
    if not residents:
        return []

    res_ids = [r.id for r in residents]
    # Single batch query with joinedload for room and bed to eliminate N+1 queries
    from sqlalchemy.orm import joinedload
    active_allocs = db.query(BedAllocation).options(
        joinedload(BedAllocation.room),
        joinedload(BedAllocation.bed)
    ).filter(
        BedAllocation.resident_id.in_(res_ids),
        BedAllocation.allocation_status == "ACTIVE"
    ).all()

    alloc_by_resident = {a.resident_id: a for a in active_allocs}

    results = []
    for resident in residents:
        active_alloc = alloc_by_resident.get(resident.id)
        data = {
            "id": resident.id,
            "resident_code": resident.resident_code,
            "user_id": resident.user_id,
            "full_name": resident.full_name,
            "phone": resident.phone,
            "email": resident.email,
            "occupation": resident.occupation,
            "emergency_contact": resident.emergency_contact,
            "address": resident.address,
            "resident_status": resident.resident_status,
            "created_at": resident.created_at,
            "current_room_id": None,
            "current_room_number": None,
            "current_bed_id": None,
            "current_bed_number": None,
            "current_allocation_id": None,
            "current_move_in_date": None,
            "current_monthly_rent": None,
            "is_ac": None,
            "room_type": None,
            "sharing_type": None
        }
        if active_alloc and active_alloc.room and active_alloc.bed:
            data.update({
                "current_room_id": active_alloc.room_id,
                "current_room_number": active_alloc.room.room_number,
                "current_bed_id": active_alloc.bed_id,
                "current_bed_number": active_alloc.bed.bed_number,
                "current_allocation_id": active_alloc.id,
                "current_move_in_date": active_alloc.move_in_date,
                "current_monthly_rent": active_alloc.room.monthly_rent_per_bed or active_alloc.room.monthly_rent,
                "is_ac": active_alloc.room.is_ac,
                "room_type": active_alloc.room.room_type,
                "sharing_type": active_alloc.room.sharing_type
            })
        results.append(data)

    # Post-filter by room_number or is_ac if requested
    if room_number:
        results = [r for r in results if r["current_room_number"] and r["current_room_number"].lower() == room_number.lower()]
    if is_ac is not None:
        results = [r for r in results if r["is_ac"] is not None and r["is_ac"] == is_ac]

    return results

@router.get("/{resident_id}", response_model=ResidentDetailResponse)
def get_resident_by_id(
    resident_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    res_data = enrich_resident_response(resident, db)

    # Allocations history
    allocations = db.query(BedAllocation).filter(BedAllocation.resident_id == resident_id).order_by(BedAllocation.created_at.desc()).all()
    alloc_list = []
    for a in allocations:
        alloc_list.append({
            "id": a.id,
            "resident_id": a.resident_id,
            "bed_id": a.bed_id,
            "room_id": a.room_id,
            "booking_id": a.booking_id,
            "move_in_date": a.move_in_date,
            "move_out_date": a.move_out_date,
            "allocation_status": a.allocation_status,
            "notes": a.notes,
            "created_at": a.created_at,
            "room_number": a.room.room_number if a.room else None,
            "bed_number": a.bed.bed_number if a.bed else None,
            "is_ac": a.room.is_ac if a.room else None,
            "room_type": a.room.room_type if a.room else None,
            "monthly_rent": a.room.monthly_rent_per_bed or a.room.monthly_rent if a.room else None
        })

    # History event log
    history = db.query(ResidentHistory).filter(ResidentHistory.resident_id == resident_id).order_by(ResidentHistory.created_at.desc()).all()
    history_list = []
    for h in history:
        r_obj = db.query(Room).filter(Room.id == h.room_id).first() if h.room_id else None
        b_obj = db.query(RoomBed).filter(RoomBed.id == h.bed_id).first() if h.bed_id else None
        fr_obj = db.query(Room).filter(Room.id == h.from_room_id).first() if h.from_room_id else None
        fb_obj = db.query(RoomBed).filter(RoomBed.id == h.from_bed_id).first() if h.from_bed_id else None

        history_list.append({
            "id": h.id,
            "resident_id": h.resident_id,
            "event_type": h.event_type,
            "room_id": h.room_id,
            "bed_id": h.bed_id,
            "from_room_id": h.from_room_id,
            "from_bed_id": h.from_bed_id,
            "room_number": r_obj.room_number if r_obj else None,
            "bed_number": b_obj.bed_number if b_obj else None,
            "from_room_number": fr_obj.room_number if fr_obj else None,
            "from_bed_number": fb_obj.bed_number if fb_obj else None,
            "details": h.details,
            "actor_admin_id": h.actor_admin_id,
            "created_at": h.created_at
        })

    res_data["allocations"] = alloc_list
    res_data["history"] = history_list
    res_data["linked_user"] = resident.user
    return res_data

@router.post("", response_model=ResidentDetailResponse)
def create_resident(
    resident_in: ResidentCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Method B: Admin manually creates a resident.
    - Generates unique ID (e.g. SLPG-0001)
    - Enforces uniqueness and concurrent safety
    - Optionally allocates room and bed atomically
    - Immediately returns generated ID
    """
    # Check if user_id is provided, ensure not already linked
    if resident_in.user_id:
        existing_res = db.query(Resident).filter(Resident.user_id == resident_in.user_id).first()
        if existing_res:
            raise HTTPException(
                status_code=400,
                detail=f"User already has a registered resident profile ({existing_res.resident_code})."
            )

    # Rule 3: Automatically generate unique resident ID (SLPG-0001, etc.)
    new_code = generate_unique_resident_code(db)

    new_resident = Resident(
        resident_code=new_code,
        user_id=resident_in.user_id,
        full_name=resident_in.full_name.strip(),
        phone=resident_in.phone.strip(),
        email=resident_in.email.strip().lower() if resident_in.email else None,
        occupation=resident_in.occupation.strip() if resident_in.occupation else None,
        emergency_contact=resident_in.emergency_contact.strip() if resident_in.emergency_contact else None,
        address=resident_in.address.strip() if resident_in.address else None,
        resident_status="ACTIVE"
    )
    db.add(new_resident)
    db.flush()

    # Log registration in history
    hist = ResidentHistory(
        resident_id=new_resident.id,
        event_type="REGISTERED",
        details=f"Resident {new_resident.full_name} registered with ID {new_resident.resident_code}.",
        actor_admin_id=current_admin.id
    )
    db.add(hist)

    # Optional initial bed allocation with pessimistic concurrency lock
    if resident_in.room_id and resident_in.bed_id:
        # Row-level lock on the room and target bed to prevent simultaneous double-booking
        room = db.query(Room).filter(Room.id == resident_in.room_id).with_for_update().first()
        bed = db.query(RoomBed).filter(RoomBed.id == resident_in.bed_id, RoomBed.room_id == resident_in.room_id).with_for_update().first()

        if not room:
            raise HTTPException(status_code=404, detail="Selected room does not exist.")
        if not bed:
            raise HTTPException(status_code=404, detail="Selected bed does not exist in the specified room.")

        # RULE 4: Cannot assign to inactive or maintenance room
        if room.status in ["MAINTENANCE", "INACTIVE"]:
            raise HTTPException(status_code=400, detail=f"Cannot allocate bed in Room {room.room_number} because room status is {room.status}.")

        # RULE 2 & 5: Bed cannot be allocated to two active residents simultaneously
        existing_bed_alloc = db.query(BedAllocation).filter(
            BedAllocation.bed_id == bed.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).first()
        if existing_bed_alloc or bed.is_occupied:
            raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} in Room {room.room_number} is already occupied.")

        # RULE 1: Room capacity check
        active_room_allocs = db.query(BedAllocation).filter(
            BedAllocation.room_id == room.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).count()
        if active_room_allocs >= room.capacity:
            raise HTTPException(status_code=400, detail=f"Room {room.room_number} is at full capacity ({room.capacity} beds).")

        move_in = resident_in.move_in_date or datetime.utcnow().strftime("%Y-%m-%d")
        allocation = BedAllocation(
            resident_id=new_resident.id,
            bed_id=bed.id,
            room_id=room.id,
            move_in_date=move_in,
            allocation_status="ACTIVE",
            created_by_admin_id=current_admin.id,
            notes=resident_in.notes
        )
        db.add(allocation)
        db.flush()

        # History log
        alloc_hist = ResidentHistory(
            resident_id=new_resident.id,
            event_type="ALLOCATED",
            room_id=room.id,
            bed_id=bed.id,
            details=f"Assigned to Room {room.room_number}, {bed.bed_number}. Move-in: {move_in}",
            actor_admin_id=current_admin.id
        )
        db.add(alloc_hist)

        # Sync room occupancy
        sync_room_occupancy(db, room.id)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="RESIDENT_CREATED",
        details=f"Created resident {new_resident.full_name} ({new_resident.resident_code})"
    )
    db.add(audit)

    db.commit()
    db.refresh(new_resident)
    return get_resident_by_id(new_resident.id, current_admin, db)

@router.put("/{resident_id}", response_model=ResidentResponse)
def update_resident(
    resident_id: str,
    resident_update: ResidentUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    update_data = resident_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(resident, field, val)

    # History log
    hist = ResidentHistory(
        resident_id=resident.id,
        event_type="UPDATED",
        details="Resident contact and profile details updated by admin.",
        actor_admin_id=current_admin.id
    )
    db.add(hist)

    db.commit()
    db.refresh(resident)
    return enrich_resident_response(resident, db)

# ALLOCATION ENDPOINTS
@allocation_router.post("", response_model=BedAllocationResponse)
def create_allocation(
    alloc_in: BedAllocationCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Assign an existing resident to an available bed.
    Enforces all capacity and concurrency rules transactionally.
    """
    resident = db.query(Resident).filter(Resident.id == alloc_in.resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    from sqlalchemy.exc import IntegrityError

    # Row-level pessimistic locking on room and bed to serialize simultaneous concurrent allocations
    room = db.query(Room).filter(Room.id == alloc_in.room_id).with_for_update().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    bed = db.query(RoomBed).filter(RoomBed.id == alloc_in.bed_id, RoomBed.room_id == alloc_in.room_id).with_for_update().first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found in the specified room.")

    # RULE 3: A resident cannot have multiple active room allocations simultaneously
    existing_active = db.query(BedAllocation).filter(
        BedAllocation.resident_id == resident.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail=f"Resident {resident.resident_code} ({resident.full_name}) already has an active allocation (Room {existing_active.room.room_number}, {existing_active.bed.bed_number}). Please use Room Transfer instead."
        )

    # RULE 4: Resident cannot be assigned to an inactive or maintenance room
    if room.status in ["MAINTENANCE", "INACTIVE"]:
        raise HTTPException(status_code=400, detail=f"Cannot allocate bed: Room {room.room_number} is currently {room.status}.")

    # RULE 2 & 5: Bed cannot be allocated to two active residents simultaneously
    existing_bed_alloc = db.query(BedAllocation).filter(
        BedAllocation.bed_id == bed.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()
    if existing_bed_alloc or bed.is_occupied:
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} in Room {room.room_number} is already occupied.")

    # RULE 1: Room capacity check
    active_count = db.query(BedAllocation).filter(
        BedAllocation.room_id == room.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).count()
    if active_count >= room.capacity:
        raise HTTPException(status_code=400, detail=f"Room {room.room_number} is at full capacity ({room.capacity} beds).")

    new_alloc = BedAllocation(
        resident_id=resident.id,
        bed_id=bed.id,
        room_id=room.id,
        move_in_date=alloc_in.move_in_date,
        allocation_status="ACTIVE",
        created_by_admin_id=current_admin.id,
        notes=alloc_in.notes
    )
    db.add(new_alloc)
    resident.resident_status = "ACTIVE"
    
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} in Room {room.room_number} is already occupied or assigned.")

    # History log
    hist = ResidentHistory(
        resident_id=resident.id,
        event_type="ALLOCATED",
        room_id=room.id,
        bed_id=bed.id,
        details=f"Allocated to Room {room.room_number}, Bed {bed.bed_number}. Move-in: {alloc_in.move_in_date}",
        actor_admin_id=current_admin.id
    )
    db.add(hist)

    # Automatic occupancy update (RULE 9)
    sync_room_occupancy(db, room.id)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="BED_ALLOCATED",
        details=f"Allocated {resident.resident_code} ({resident.full_name}) to Room {room.room_number}, Bed {bed.bed_number}"
    )
    db.add(audit)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} in Room {room.room_number} is already occupied or assigned.")

    db.refresh(new_alloc)

    return {
        "id": new_alloc.id,
        "resident_id": new_alloc.resident_id,
        "bed_id": new_alloc.bed_id,
        "room_id": new_alloc.room_id,
        "booking_id": new_alloc.booking_id,
        "move_in_date": new_alloc.move_in_date,
        "move_out_date": new_alloc.move_out_date,
        "allocation_status": new_alloc.allocation_status,
        "notes": new_alloc.notes,
        "created_at": new_alloc.created_at,
        "room_number": room.room_number,
        "bed_number": bed.bed_number,
        "is_ac": room.is_ac,
        "room_type": room.room_type,
        "monthly_rent": room.monthly_rent_per_bed or room.monthly_rent
    }

@allocation_router.put("/{allocation_id}/transfer", response_model=BedAllocationResponse)
def transfer_resident(
    allocation_id: str,
    transfer_in: BedAllocationTransfer,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    RULE 7: Room transfers must release previous bed and allocate new bed ATOMICALLY
    in a single database transaction. Resident ID remains unchanged.
    """
    current_alloc = db.query(BedAllocation).filter(BedAllocation.id == allocation_id).first()
    if not current_alloc:
        raise HTTPException(status_code=404, detail="Active allocation record not found.")

    if current_alloc.allocation_status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Only ACTIVE allocations can be transferred.")

    resident = current_alloc.resident
    old_room_id = current_alloc.room_id
    old_bed_id = current_alloc.bed_id
    old_room = current_alloc.room
    old_bed = current_alloc.bed

    # Verify destination room & bed
    new_room = db.query(Room).filter(Room.id == transfer_in.new_room_id).first()
    if not new_room:
        raise HTTPException(status_code=404, detail="Destination room does not exist.")

    if new_room.status in ["MAINTENANCE", "INACTIVE"]:
        raise HTTPException(status_code=400, detail=f"Destination Room {new_room.room_number} is {new_room.status}.")

    new_bed = db.query(RoomBed).filter(RoomBed.id == transfer_in.new_bed_id, RoomBed.room_id == new_room.id).first()
    if not new_bed:
        raise HTTPException(status_code=404, detail="Destination bed does not exist in target room.")

    # If same bed, nothing to transfer
    if new_bed.id == old_bed_id:
        raise HTTPException(status_code=400, detail="Resident is already allocated to this specific bed.")

    # Check target bed availability
    target_bed_occupied = db.query(BedAllocation).filter(
        BedAllocation.bed_id == new_bed.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()
    if target_bed_occupied or new_bed.is_occupied:
        raise HTTPException(status_code=400, detail=f"Destination Bed {new_bed.bed_number} in Room {new_room.room_number} is already occupied.")

    # Check target room capacity if different room
    if new_room.id != old_room_id:
        target_room_occupied_count = db.query(BedAllocation).filter(
            BedAllocation.room_id == new_room.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).count()
        if target_room_occupied_count >= new_room.capacity:
            raise HTTPException(status_code=400, detail=f"Destination Room {new_room.room_number} is at maximum capacity.")

    # Close previous allocation
    current_alloc.allocation_status = "TRANSFERRED"
    current_alloc.move_out_date = transfer_in.transfer_date
    current_alloc.notes = f"{current_alloc.notes or ''} [Transferred to Room {new_room.room_number}, {new_bed.bed_number}]".strip()

    # Create new allocation
    new_alloc = BedAllocation(
        resident_id=resident.id,
        bed_id=new_bed.id,
        room_id=new_room.id,
        move_in_date=transfer_in.transfer_date,
        allocation_status="ACTIVE",
        created_by_admin_id=current_admin.id,
        notes=transfer_in.notes
    )
    db.add(new_alloc)
    db.flush()

    # Log transfer in history (RULE 7)
    hist = ResidentHistory(
        resident_id=resident.id,
        event_type="TRANSFERRED",
        room_id=new_room.id,
        bed_id=new_bed.id,
        from_room_id=old_room_id,
        from_bed_id=old_bed_id,
        details=f"Transferred from Room {old_room.room_number} ({old_bed.bed_number}) to Room {new_room.room_number} ({new_bed.bed_number}) on {transfer_in.transfer_date}.",
        actor_admin_id=current_admin.id
    )
    db.add(hist)

    # Sync occupancy on BOTH rooms atomically
    sync_room_occupancy(db, old_room_id)
    if new_room.id != old_room_id:
        sync_room_occupancy(db, new_room.id)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="RESIDENT_TRANSFERRED",
        details=f"Transferred {resident.resident_code} ({resident.full_name}) from Room {old_room.room_number} to Room {new_room.room_number}"
    )
    db.add(audit)

    db.commit()
    db.refresh(new_alloc)

    return {
        "id": new_alloc.id,
        "resident_id": new_alloc.resident_id,
        "bed_id": new_alloc.bed_id,
        "room_id": new_alloc.room_id,
        "booking_id": new_alloc.booking_id,
        "move_in_date": new_alloc.move_in_date,
        "move_out_date": new_alloc.move_out_date,
        "allocation_status": new_alloc.allocation_status,
        "notes": new_alloc.notes,
        "created_at": new_alloc.created_at,
        "room_number": new_room.room_number,
        "bed_number": new_bed.bed_number,
        "is_ac": new_room.is_ac,
        "room_type": new_room.room_type,
        "monthly_rent": new_room.monthly_rent_per_bed or new_room.monthly_rent
    }

@allocation_router.put("/{allocation_id}/checkout", response_model=BedAllocationResponse)
def checkout_resident(
    allocation_id: str,
    checkout_in: BedAllocationCheckout,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    RULE 8 & 9: Checkout releases resident's bed. Room availability updates automatically.
    Resident record, unique ID, and full allocation history remain retained.
    """
    alloc = db.query(BedAllocation).filter(BedAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation record not found.")

    if alloc.allocation_status != "ACTIVE":
        raise HTTPException(status_code=400, detail="This allocation is already closed or checked out.")

    resident = alloc.resident
    room = alloc.room
    bed = alloc.bed

    alloc.allocation_status = "CHECKED_OUT"
    alloc.move_out_date = checkout_in.checkout_date or datetime.utcnow().strftime("%Y-%m-%d")
    if checkout_in.notes:
        alloc.notes = f"{alloc.notes or ''} [Checkout: {checkout_in.notes}]".strip()

    # Update resident status to CHECKED_OUT
    resident.resident_status = "CHECKED_OUT"
    db.flush()

    # Record checkout in resident history
    hist = ResidentHistory(
        resident_id=resident.id,
        event_type="CHECKED_OUT",
        room_id=room.id if room else None,
        bed_id=bed.id if bed else None,
        details=f"Checked out from Room {room.room_number if room else ''} ({bed.bed_number if bed else ''}) on {alloc.move_out_date}. Note: {checkout_in.notes or 'None'}",
        actor_admin_id=current_admin.id
    )
    db.add(hist)

    # Automatic occupancy update (RULE 9)
    if room:
        sync_room_occupancy(db, room.id)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="RESIDENT_CHECKOUT",
        details=f"Checked out resident {resident.resident_code} ({resident.full_name}) from Room {room.room_number if room else ''}"
    )
    db.add(audit)

    db.commit()
    db.refresh(alloc)

    return {
        "id": alloc.id,
        "resident_id": alloc.resident_id,
        "bed_id": alloc.bed_id,
        "room_id": alloc.room_id,
        "booking_id": alloc.booking_id,
        "move_in_date": alloc.move_in_date,
        "move_out_date": alloc.move_out_date,
        "allocation_status": alloc.allocation_status,
        "notes": alloc.notes,
        "created_at": alloc.created_at,
        "room_number": room.room_number if room else None,
        "bed_number": bed.bed_number if bed else None,
        "is_ac": room.is_ac if room else None,
        "room_type": room.room_type if room else None,
        "monthly_rent": room.monthly_rent_per_bed or room.monthly_rent if room else None
    }

@router.get("/{resident_id}/history", response_model=List[ResidentHistoryResponse])
def get_resident_history(
    resident_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    history = db.query(ResidentHistory).filter(
        ResidentHistory.resident_id == resident_id
    ).order_by(ResidentHistory.created_at.desc()).all()

    results = []
    for h in history:
        r_obj = db.query(Room).filter(Room.id == h.room_id).first() if h.room_id else None
        b_obj = db.query(RoomBed).filter(RoomBed.id == h.bed_id).first() if h.bed_id else None
        fr_obj = db.query(Room).filter(Room.id == h.from_room_id).first() if h.from_room_id else None
        fb_obj = db.query(RoomBed).filter(RoomBed.id == h.from_bed_id).first() if h.from_bed_id else None

        results.append({
            "id": h.id,
            "resident_id": h.resident_id,
            "event_type": h.event_type,
            "room_id": h.room_id,
            "bed_id": h.bed_id,
            "from_room_id": h.from_room_id,
            "from_bed_id": h.from_bed_id,
            "room_number": r_obj.room_number if r_obj else None,
            "bed_number": b_obj.bed_number if b_obj else None,
            "from_room_number": fr_obj.room_number if fr_obj else None,
            "from_bed_number": fb_obj.bed_number if fb_obj else None,
            "details": h.details,
            "actor_admin_id": h.actor_admin_id,
            "created_at": h.created_at
        })
    return results
