from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database.connection import get_db
from ..models.models import User, Room, RoomBed, VisitRequest, Booking, ContactMessage, AuditLog
from ..schemas.schemas import UserResponse
from ..auth.security import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Operations & Analytics"])

@router.get("/analytics")
def get_admin_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from ..models.models import Resident, BedAllocation, RentRecord, WhatsAppReminderLog
    from ..utils.rent_calculator import get_ist_today
    from sqlalchemy.orm import joinedload

    total_users = db.query(User).filter(User.role == "USER").count()
    total_rooms = db.query(Room).count()
    available_rooms = db.query(Room).filter(Room.status.in_(["AVAILABLE", "PARTIALLY_AVAILABLE"])).count()
    
    total_beds = db.query(RoomBed).count()
    active_alloc_count = db.query(BedAllocation).filter(BedAllocation.allocation_status == "ACTIVE").count()
    occupied_beds = active_alloc_count if active_alloc_count > 0 else db.query(RoomBed).filter(RoomBed.is_occupied == True).count()
    active_residents = db.query(Resident).filter(Resident.resident_status == "ACTIVE").count()
    
    pending_visits = db.query(VisitRequest).filter(VisitRequest.status == "PENDING").count()
    approved_visits = db.query(VisitRequest).filter(VisitRequest.status == "APPROVED").count()

    pending_bookings = db.query(Booking).filter(Booking.status == "PENDING").count()
    approved_bookings = db.query(Booking).filter(Booking.status == "APPROVED").count()
    
    unread_messages = db.query(ContactMessage).filter(ContactMessage.is_read == False).count()

    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0

    recent_visits = db.query(VisitRequest).order_by(VisitRequest.created_at.desc()).limit(5).all()
    recent_bookings = db.query(Booking).options(joinedload(Booking.user)).order_by(Booking.created_at.desc()).limit(5).all()

    # Room type distribution
    room_types_summary = db.query(Room.room_type, func.count(Room.id)).group_by(Room.room_type).all()

    today = get_ist_today()
    current_period = today.strftime("%Y-%m")
    
    # Efficient SQL aggregation
    rent_agg = db.query(
        func.coalesce(func.sum(RentRecord.rent_amount), 0.0),
        func.coalesce(func.sum(RentRecord.amount_paid), 0.0),
        func.coalesce(func.sum(RentRecord.balance_due), 0.0)
    ).filter(RentRecord.rent_period == current_period).first()
    
    expected_rent = rent_agg[0] if rent_agg else 0.0
    collected_rent = rent_agg[1] if rent_agg else 0.0
    outstanding_rent = rent_agg[2] if rent_agg else 0.0

    overdue_count = db.query(RentRecord).filter(RentRecord.payment_status == "OVERDUE").count()
    reminders_sent_count = db.query(WhatsAppReminderLog).filter(WhatsAppReminderLog.delivery_status.in_(["SENT", "DELIVERED"])).count()

    return {
        "total_users": total_users,
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "active_residents": active_residents,
        "occupancy_rate": occupancy_rate,

        "expected_rent": expected_rent,
        "collected_rent": collected_rent,
        "outstanding_rent": outstanding_rent,
        "overdue_count": overdue_count,
        "reminders_sent_count": reminders_sent_count,

        "pending_visits": pending_visits,
        "approved_visits": approved_visits,
        "pending_bookings": pending_bookings,
        "approved_bookings": approved_bookings,
        "unread_messages": unread_messages,
        "room_types_distribution": {t: c for t, c in room_types_summary},
        "recent_visits": [
            {
                "id": v.id,
                "full_name": v.full_name,
                "preferred_date": v.preferred_date,
                "preferred_time": v.preferred_time,
                "status": v.status,
                "purpose": v.purpose
            } for v in recent_visits
        ],
        "recent_bookings": [
            {
                "id": b.id,
                "user_name": b.user.full_name if b.user else "Unknown",
                "room_type": b.room_type,
                "is_ac": b.is_ac,
                "status": b.status,
                "joining_date": b.preferred_joining_date
            } for b in recent_bookings
        ]
    }

@router.get("/users")
def get_all_users(
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == "USER")
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(User.full_name).like(s)) |
            (func.lower(User.email).like(s)) |
            (User.phone.like(s))
        )
    users = query.order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "occupation": u.occupation,
            "company_or_college": u.company_or_college,
            "emergency_contact": u.emergency_contact,
            "address": u.address,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "visits_count": len(u.visits),
            "bookings_count": len(u.bookings)
        } for u in users
    ]

@router.get("/users/{user_id}")
def get_user_details(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "occupation": user.occupation,
        "company_or_college": user.company_or_college,
        "emergency_contact": user.emergency_contact,
        "address": user.address,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "visits": [
            {
                "id": v.id,
                "date": v.preferred_date,
                "time": v.preferred_time,
                "purpose": v.purpose,
                "status": v.status,
                "confirmed_date": v.confirmed_date,
                "confirmed_time": v.confirmed_time,
                "admin_notes": v.admin_notes
            } for v in user.visits
        ],
        "bookings": [
            {
                "id": b.id,
                "room_type": b.room_type,
                "is_ac": b.is_ac,
                "joining_date": b.preferred_joining_date,
                "status": b.status,
                "allocated_bed": b.allocated_bed,
                "admin_notes": b.admin_notes
            } for b in user.bookings
        ]
    }

@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    data: dict,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Prevent admin account lockout / self-deactivation
    if user.id == current_admin.id and not bool(data.get("is_active", True)):
        raise HTTPException(
            status_code=400,
            detail="Administrators cannot deactivate their own active administrative account."
        )

    user.is_active = bool(data.get("is_active", True))
    
    audit = AuditLog(
        actor_email=current_admin.email,
        action="USER_STATUS_CHANGE",
        details=f"Updated status for {user.email} to {'Active' if user.is_active else 'Deactivated'}"
    )
    db.add(audit)
    db.commit()
    return {"message": f"User status updated to {'Active' if user.is_active else 'Deactivated'}."}

@router.get("/audit-logs")
def get_audit_logs(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
