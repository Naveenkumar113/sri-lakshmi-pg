from typing import List, Optional
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database.connection import get_db
from ..models.models import Room, RoomBed, BedAllocation, Resident, User, AuditLog
from ..schemas.schemas import (
    RoomResponse, RoomCreate, RoomUpdate, RoomBedResponse, BedCreate, BedUpdate,
    VALID_SHARING_TYPES, SHARING_CAPACITY_MAP, LEGACY_SHARING_MAP,
    capacity_to_sharing_type, parse_sharing_capacity
)
from ..auth.security import get_current_admin
from ..utils.room_occupancy import sync_room_occupancy
from ..utils.fast_cache import app_cache

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])
admin_router = APIRouter(prefix="/api/admin/rooms", tags=["Admin Rooms"])
room_avail_router = APIRouter(prefix="/api/admin", tags=["Admin Room Availability"])

def populate_room_response(room: Room, db: Session) -> dict:
    """Helper to enrich room data with live bed occupancy, resident codes, and metrics."""
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.room_id == room.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).all()
    alloc_map = {a.bed_id: a for a in active_allocations}

    beds_data = []
    for b in room.beds:
        alloc = alloc_map.get(b.id)
        beds_data.append({
            "id": b.id,
            "bed_number": b.bed_number,
            "bed_status": "OCCUPIED" if alloc else (b.bed_status or "AVAILABLE"),
            "is_occupied": alloc is not None,
            "current_occupant_name": alloc.resident.full_name if alloc and alloc.resident else b.current_occupant_name,
            "current_occupant_id": alloc.resident_id if alloc else None,
            "current_resident_code": alloc.resident.resident_code if alloc and alloc.resident else None,
            "current_allocation_id": alloc.id if alloc else None,
            "move_in_date": alloc.move_in_date if alloc else None
        })

    occupied_count = len(active_allocations)
    available_count = max(0, room.capacity - occupied_count)
    occupancy_pct = round((occupied_count / room.capacity * 100), 1) if room.capacity > 0 else 0.0

    return {
        "id": room.id,
        "room_number": room.room_number,
        "room_type": room.room_type,
        "sharing_type": room.sharing_type or room.room_type,
        "is_ac": room.is_ac,
        "floor": room.floor,
        "capacity": room.capacity,
        "available_beds": available_count,
        "monthly_rent": room.monthly_rent,
        "monthly_rent_per_bed": room.monthly_rent_per_bed or room.monthly_rent,
        "security_deposit": room.security_deposit,
        "description": room.description,
        "amenities": room.amenities,
        "images": room.images,
        "status": room.status,
        "created_at": room.created_at,
        "occupied_beds": occupied_count,
        "occupancy_percentage": occupancy_pct,
        "beds": beds_data
    }

@router.get("", response_model=List[RoomResponse])
def get_rooms(
    room_type: Optional[str] = None,
    sharing_type: Optional[str] = None,
    is_ac: Optional[bool] = None,
    floor: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cache_key = f"rooms:{room_type}:{sharing_type}:{is_ac}:{floor}:{status}"
    cached = app_cache.get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Room)
    if room_type:
        query = query.filter(Room.room_type.ilike(f"%{room_type}%"))
    if sharing_type:
        query = query.filter(Room.sharing_type.ilike(f"%{sharing_type}%"))
    if is_ac is not None:
        query = query.filter(Room.is_ac == is_ac)
    if floor is not None:
        query = query.filter(Room.floor == floor)
    if status:
        query = query.filter(Room.status == status)

    rooms = query.order_by(Room.floor, Room.room_number).all()
    if not rooms:
        return []

    room_ids = [r.id for r in rooms]
    # Single batch query for all active allocations across all queried rooms
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.room_id.in_(room_ids),
        BedAllocation.allocation_status == "ACTIVE"
    ).all()

    # Pre-group allocations by room_id and bed_id
    alloc_by_room = {}
    for alloc in active_allocations:
        if alloc.room_id not in alloc_by_room:
            alloc_by_room[alloc.room_id] = {}
        alloc_by_room[alloc.room_id][alloc.bed_id] = alloc

    results = []
    for room in rooms:
        room_alloc_map = alloc_by_room.get(room.id, {})
        beds_data = []
        for b in room.beds:
            alloc = room_alloc_map.get(b.id)
            beds_data.append({
                "id": b.id,
                "bed_number": b.bed_number,
                "bed_status": "OCCUPIED" if alloc else (b.bed_status or "AVAILABLE"),
                "is_occupied": alloc is not None,
                "current_occupant_name": alloc.resident.full_name if alloc and alloc.resident else b.current_occupant_name,
                "current_occupant_id": alloc.resident_id if alloc else None,
                "current_resident_code": alloc.resident.resident_code if alloc and alloc.resident else None,
                "current_allocation_id": alloc.id if alloc else None,
                "move_in_date": alloc.move_in_date if alloc else None
            })

        occupied_count = len(room_alloc_map)
        available_count = max(0, room.capacity - occupied_count)
        occupancy_pct = round((occupied_count / room.capacity * 100), 1) if room.capacity > 0 else 0.0

        results.append({
            "id": room.id,
            "room_number": room.room_number,
            "room_type": room.room_type,
            "sharing_type": room.sharing_type or room.room_type,
            "is_ac": room.is_ac,
            "floor": room.floor,
            "capacity": room.capacity,
            "available_beds": available_count,
            "monthly_rent": room.monthly_rent,
            "monthly_rent_per_bed": room.monthly_rent_per_bed or room.monthly_rent,
            "security_deposit": room.security_deposit,
            "description": room.description,
            "amenities": room.amenities,
            "images": room.images,
            "status": room.status,
            "created_at": room.created_at,
            "occupancy_percentage": occupancy_pct,
            "beds": beds_data
        })

    app_cache.set(cache_key, results, ttl_seconds=15)
    return results

@router.get("/{room_id}", response_model=RoomResponse)
def get_room_by_id(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Requested room was not found.")
    return populate_room_response(room, db)

# ADMIN ROOM MANAGEMENT ENDPOINTS
@admin_router.get("", response_model=List[RoomResponse])
def get_admin_rooms(
    search: Optional[str] = None,
    room_type: Optional[str] = None,
    is_ac: Optional[bool] = None,
    floor: Optional[int] = None,
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (func.lower(Room.room_number).like(s)) |
            (func.lower(Room.description).like(s))
        )
    if room_type:
        query = query.filter(Room.room_type.ilike(f"%{room_type}%"))
    if is_ac is not None:
        query = query.filter(Room.is_ac == is_ac)
    if floor is not None:
        query = query.filter(Room.floor == floor)
    if status:
        query = query.filter(Room.status == status)

    rooms = query.order_by(Room.floor, Room.room_number).all()
    return [populate_room_response(r, db) for r in rooms]

@admin_router.get("/{room_id}", response_model=RoomResponse)
def get_admin_room_by_id(
    room_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    return populate_room_response(room, db)

@admin_router.post("", response_model=RoomResponse)
def create_room(
    room_in: RoomCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Rule: Room numbers must be unique within the PG
    clean_number = room_in.room_number.strip().upper()
    existing = db.query(Room).filter(func.upper(Room.room_number) == clean_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room number '{room_in.room_number}' already exists. Room numbers must be unique.")

    data = room_in.model_dump()
    data["room_number"] = clean_number
    if not data.get("monthly_rent_per_bed") and data.get("monthly_rent"):
        data["monthly_rent_per_bed"] = data["monthly_rent"]

    # Dynamic Sharing Capacity (Number of Persons) 1 to 20
    cap = data.get("capacity")
    if cap is None:
        cap = parse_sharing_capacity(data.get("sharing_type"), default=2)

    try:
        cap = int(cap)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Sharing capacity must be a positive whole integer.")

    if cap < 1 or cap > 20:
        raise HTTPException(status_code=400, detail="Sharing capacity must be between 1 and 20 beds per room.")

    sharing = capacity_to_sharing_type(cap)
    data["sharing_type"] = sharing
    data["capacity"] = cap
    data["available_beds"] = cap

    new_room = Room(**data)
    db.add(new_room)
    db.flush()

    # Automatically generate bed slots: Bed 1, Bed 2, ... Bed N
    for i in range(1, new_room.capacity + 1):
        bed = RoomBed(
            room_id=new_room.id,
            bed_number=f"Bed {i}",
            bed_status="AVAILABLE",
            is_occupied=False
        )
        db.add(bed)

    # Log audit
    audit = AuditLog(
        actor_email=current_admin.email,
        action="ROOM_CREATED",
        details=f"Created Room {new_room.room_number} ({new_room.sharing_type}, {'AC' if new_room.is_ac else 'Non-AC'}, Capacity: {new_room.capacity})"
    )
    db.add(audit)

    db.commit()
    db.refresh(new_room)
    return populate_room_response(new_room, db)

@admin_router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: str,
    room_update: RoomUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    update_data = room_update.model_dump(exclude_unset=True)

    # Check room number uniqueness if changing
    if "room_number" in update_data and update_data["room_number"]:
        clean_num = update_data["room_number"].strip().upper()
        if clean_num != room.room_number.upper():
            existing = db.query(Room).filter(func.upper(Room.room_number) == clean_num, Room.id != room_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Room number '{clean_num}' already exists.")
            update_data["room_number"] = clean_num

    # Determine requested new capacity
    new_cap = None
    if "capacity" in update_data and update_data["capacity"] is not None:
        new_cap = update_data["capacity"]
    elif "sharing_type" in update_data and update_data["sharing_type"]:
        new_cap = parse_sharing_capacity(update_data["sharing_type"], default=room.capacity)

    if new_cap is not None:
        try:
            new_cap = int(new_cap)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Sharing capacity must be a positive whole integer.")

        if new_cap < 1 or new_cap > 20:
            raise HTTPException(status_code=400, detail="Sharing capacity must be between 1 and 20 beds per room.")

        update_data["capacity"] = new_cap
        update_data["sharing_type"] = capacity_to_sharing_type(new_cap)

        # Admin cannot reduce room capacity below the number of occupied beds
        active_allocations_count = db.query(BedAllocation).filter(
            BedAllocation.room_id == room_id,
            BedAllocation.allocation_status == "ACTIVE"
        ).count()

        if new_cap < active_allocations_count:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce capacity to {new_cap}. Room {room.room_number} currently has {active_allocations_count} active resident allocation(s). Please transfer or checkout residents first."
            )

        # Existing beds in room
        existing_beds = db.query(RoomBed).filter(RoomBed.room_id == room_id).all()
        def bed_num_key(b):
            m = re.search(r'\d+', b.bed_number)
            return int(m.group()) if m else 9999
        existing_beds = sorted(existing_beds, key=bed_num_key)

        current_bed_count = len(existing_beds)
        active_bed_ids = {
            a.bed_id for a in db.query(BedAllocation).filter(
                BedAllocation.room_id == room_id,
                BedAllocation.allocation_status == "ACTIVE"
            ).all()
        }

        if new_cap > current_bed_count:
            existing_numbers = {b.bed_number for b in existing_beds}
            next_num = 1
            beds_to_add = new_cap - current_bed_count
            added = 0
            while added < beds_to_add:
                cand = f"Bed {next_num}"
                if cand not in existing_numbers:
                    new_bed = RoomBed(
                        room_id=room_id,
                        bed_number=cand,
                        bed_status="AVAILABLE",
                        is_occupied=False
                    )
                    db.add(new_bed)
                    existing_numbers.add(cand)
                    added += 1
                next_num += 1

        elif new_cap < current_bed_count:
            # Safely remove only unoccupied beds without active allocations
            beds_to_remove = current_bed_count - new_cap
            unoccupied = [b for b in existing_beds if b.id not in active_bed_ids and not b.is_occupied]
            if len(unoccupied) < beds_to_remove:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot reduce capacity to {new_cap}: only {len(unoccupied)} unoccupied bed(s) available to remove without affecting occupied beds."
                )

            unoccupied_to_delete = sorted(unoccupied, key=bed_num_key, reverse=True)[:beds_to_remove]
            for bed in unoccupied_to_delete:
                db.delete(bed)

    for field, val in update_data.items():
        setattr(room, field, val)

    db.flush()
    sync_room_occupancy(db, room_id)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="ROOM_UPDATED",
        details=f"Updated details for Room {room.room_number}"
    )
    db.add(audit)

    db.commit()
    db.refresh(room)
    return populate_room_response(room, db)

@admin_router.delete("/{room_id}")
def delete_room(
    room_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Prevent deletion if there are active resident allocations
    active_count = db.query(BedAllocation).filter(
        BedAllocation.room_id == room_id,
        BedAllocation.allocation_status == "ACTIVE"
    ).count()
    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Room {room.room_number} because it has {active_count} active resident allocation(s). Please transfer or check out residents first."
        )

    # Protect historical data: check if there are historical allocations
    historical_count = db.query(BedAllocation).filter(BedAllocation.room_id == room_id).count()
    if historical_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Room {room.room_number} because it has {historical_count} past resident allocation/audit record(s). To preserve historical data, please set the room status to 'INACTIVE' or 'MAINTENANCE' instead."
        )

    room_num = room.room_number
    db.delete(room)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="ROOM_DELETED",
        details=f"Deleted Room {room_num}"
    )
    db.add(audit)

    db.commit()
    return {"message": f"Room {room_num} deleted successfully."}

# BED SUB-RESOURCES
@admin_router.get("/{room_id}/beds", response_model=List[RoomBedResponse])
def get_room_beds(
    room_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.room_id == room_id,
        BedAllocation.allocation_status == "ACTIVE"
    ).all()
    alloc_map = {a.bed_id: a for a in active_allocations}

    beds_data = []
    for b in room.beds:
        alloc = alloc_map.get(b.id)
        beds_data.append({
            "id": b.id,
            "bed_number": b.bed_number,
            "bed_status": "OCCUPIED" if alloc else (b.bed_status or "AVAILABLE"),
            "is_occupied": alloc is not None,
            "current_occupant_name": alloc.resident.full_name if alloc and alloc.resident else b.current_occupant_name,
            "current_occupant_id": alloc.resident_id if alloc else None,
            "current_resident_code": alloc.resident.resident_code if alloc and alloc.resident else None,
            "current_allocation_id": alloc.id if alloc else None,
            "move_in_date": alloc.move_in_date if alloc else None
        })
    return beds_data

@admin_router.post("/{room_id}/beds", response_model=RoomBedResponse)
def add_bed_to_room(
    room_id: str,
    bed_in: BedCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    new_bed = RoomBed(
        room_id=room_id,
        bed_number=bed_in.bed_number.strip(),
        bed_status="AVAILABLE",
        is_occupied=False
    )
    db.add(new_bed)
    # Increase room capacity
    room.capacity = len(room.beds) + 1
    db.flush()
    sync_room_occupancy(db, room_id)
    db.commit()
    db.refresh(new_bed)
    return {
        "id": new_bed.id,
        "bed_number": new_bed.bed_number,
        "bed_status": new_bed.bed_status,
        "is_occupied": False,
        "current_occupant_name": None,
        "current_occupant_id": None,
        "current_resident_code": None,
        "current_allocation_id": None,
        "move_in_date": None
    }

@admin_router.put("/beds/{bed_id}", response_model=RoomBedResponse)
def update_bed(
    bed_id: str,
    bed_in: BedUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bed = db.query(RoomBed).filter(RoomBed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found.")

    if bed_in.bed_number:
        bed.bed_number = bed_in.bed_number.strip()
    if bed_in.bed_status:
        # If marked maintenance while occupied, throw warning or error
        if bed_in.bed_status == "MAINTENANCE" and bed.is_occupied:
            raise HTTPException(status_code=400, detail="Cannot set an occupied bed to Maintenance status. Please transfer resident first.")
        bed.bed_status = bed_in.bed_status

    db.flush()
    sync_room_occupancy(db, bed.room_id)
    db.commit()
    db.refresh(bed)

    active_alloc = db.query(BedAllocation).filter(
        BedAllocation.bed_id == bed.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()

    return {
        "id": bed.id,
        "bed_number": bed.bed_number,
        "bed_status": "OCCUPIED" if active_alloc else bed.bed_status,
        "is_occupied": active_alloc is not None,
        "current_occupant_name": active_alloc.resident.full_name if active_alloc and active_alloc.resident else bed.current_occupant_name,
        "current_occupant_id": active_alloc.resident_id if active_alloc else None,
        "current_resident_code": active_alloc.resident.resident_code if active_alloc and active_alloc.resident else None,
        "current_allocation_id": active_alloc.id if active_alloc else None,
        "move_in_date": active_alloc.move_in_date if active_alloc else None
    }

# ROOM AVAILABILITY SUMMARY ENDPOINT
@room_avail_router.get("/room-availability")
def get_room_availability_overview(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns global room and bed availability derived strictly from active allocations.
    """
    rooms = db.query(Room).order_by(Room.floor, Room.room_number).all()

    total_rooms = len(rooms)
    total_beds = sum(r.capacity for r in rooms)

    active_allocations = db.query(BedAllocation).filter(BedAllocation.allocation_status == "ACTIVE").all()
    occupied_beds = len(active_allocations)
    available_beds = max(0, total_beds - occupied_beds)
    overall_occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

    room_summaries = [populate_room_response(r, db) for r in rooms]

    # Floor wise breakdown
    floors = {}
    for r in room_summaries:
        fl = r["floor"]
        if fl not in floors:
            floors[fl] = {"floor": fl, "total_rooms": 0, "total_beds": 0, "occupied_beds": 0, "available_beds": 0}
        floors[fl]["total_rooms"] += 1
        floors[fl]["total_beds"] += r["capacity"]
        floors[fl]["occupied_beds"] += r["occupied_beds"]
        floors[fl]["available_beds"] += r["available_beds"]

    return {
        "total_rooms": total_rooms,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "occupancy_rate": overall_occupancy_rate,
        "floors": list(floors.values()),
        "rooms": room_summaries
    }
