from sqlalchemy.orm import Session
from ..models.models import Room, RoomBed, BedAllocation

def sync_room_occupancy(db: Session, room_id: str) -> Room:
    """
    Recalculates and synchronizes bed statuses and room occupancy numbers
    strictly from the source-of-truth: active bed allocations in the database.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return None

    # Fetch active allocations for this room
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.room_id == room_id,
        BedAllocation.allocation_status == "ACTIVE"
    ).all()

    active_by_bed = {alloc.bed_id: alloc for alloc in active_allocations}

    # Synchronize each bed in this room
    beds = db.query(RoomBed).filter(RoomBed.room_id == room_id).all()
    for bed in beds:
        if bed.id in active_by_bed:
            bed.is_occupied = True
            bed.bed_status = "OCCUPIED"
            resident = active_by_bed[bed.id].resident
            bed.current_occupant_name = resident.full_name if resident else "Active Resident"
        else:
            bed.is_occupied = False
            if bed.bed_status != "MAINTENANCE":
                bed.bed_status = "AVAILABLE"
            bed.current_occupant_name = None

    # Synchronize room availability
    occupied_count = len(active_allocations)
    room.available_beds = max(0, room.capacity - occupied_count)

    # Room status determination
    if room.status not in ["MAINTENANCE", "INACTIVE"]:
        if room.available_beds == 0:
            room.status = "FULL"
        elif occupied_count > 0:
            room.status = "PARTIALLY_AVAILABLE"
        else:
            room.status = "AVAILABLE"

    return room
