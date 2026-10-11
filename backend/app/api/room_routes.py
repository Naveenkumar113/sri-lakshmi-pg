from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Room, RoomBed, User
from ..schemas.schemas import RoomResponse, RoomCreate, RoomUpdate
from ..auth.security import get_current_admin

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])
admin_router = APIRouter(prefix="/api/admin/rooms", tags=["Admin Rooms"])

@router.get("", response_model=List[RoomResponse])
def get_rooms(
    room_type: Optional[str] = None,
    is_ac: Optional[bool] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if room_type:
        query = query.filter(Room.room_type == room_type.upper())
    if is_ac is not None:
        query = query.filter(Room.is_ac == is_ac)
    if status:
        query = query.filter(Room.status == status)
    return query.order_by(Room.floor, Room.room_number).all()

@router.get("/{room_id}", response_model=RoomResponse)
def get_room_by_id(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Requested room was not found.")
    return room

@admin_router.post("", response_model=RoomResponse)
def create_room(
    room_in: RoomCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Room).filter(Room.room_number == room_in.room_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room number {room_in.room_number} already exists.")

    new_room = Room(**room_in.model_dump())
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    # Automatically create bed slots for the capacity
    for i in range(1, new_room.capacity + 1):
        bed = RoomBed(
            room_id=new_room.id,
            bed_number=f"B{i}",
            is_occupied=False
        )
        db.add(bed)
    db.commit()
    db.refresh(new_room)
    return new_room

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
    for field, val in update_data.items():
        setattr(room, field, val)

    db.commit()
    db.refresh(room)
    return room

@admin_router.delete("/{room_id}")
def delete_room(
    room_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    db.delete(room)
    db.commit()
    return {"message": f"Room {room.room_number} deleted successfully."}

@admin_router.put("/{room_id}/beds/{bed_id}")
def update_bed_status(
    room_id: str,
    bed_id: str,
    bed_data: dict,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bed = db.query(RoomBed).filter(RoomBed.id == bed_id, RoomBed.room_id == room_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found in the specified room.")

    if "is_occupied" in bed_data:
        bed.is_occupied = bool(bed_data["is_occupied"])
    if "current_occupant_name" in bed_data:
        bed.current_occupant_name = bed_data["current_occupant_name"]

    # Re-calculate available beds on the room
    occupied_count = db.query(RoomBed).filter(RoomBed.room_id == room_id, RoomBed.is_occupied == True).count()
    room = db.query(Room).filter(Room.id == room_id).first()
    if room:
        room.available_beds = max(0, room.capacity - occupied_count)
        if room.available_beds == 0:
            room.status = "FULL"
        elif room.available_beds < room.capacity:
            room.status = "PARTIALLY_AVAILABLE"
        else:
            room.status = "AVAILABLE"

    db.commit()
    return {"message": "Bed status updated successfully", "available_beds": room.available_beds if room else 0}
