from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import VisitRequest, VisitSlot, User, Notification, AuditLog
from ..schemas.schemas import VisitRequestCreate, VisitApprove, VisitReschedule, VisitReject, VisitResponse
from ..auth.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/visits", tags=["Visits"])
admin_router = APIRouter(prefix="/api/admin/visits", tags=["Admin Visits"])

@router.get("/slots")
def get_slots(db: Session = Depends(get_db)):
    slots = db.query(VisitSlot).filter(VisitSlot.is_enabled == True).all()
    return [{"id": s.id, "time_label": s.time_label, "max_capacity": s.max_capacity} for s in slots]

@router.post("", response_model=VisitResponse)
def create_visit(
    visit_in: VisitRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if slot exists and is enabled
    slot = db.query(VisitSlot).filter(VisitSlot.time_label == visit_in.preferred_time, VisitSlot.is_enabled == True).first()
    if not slot:
        raise HTTPException(
            status_code=400,
            detail=f"The selected time slot ({visit_in.preferred_time}) is currently unavailable. Please pick another slot."
        )

    # Check slot capacity for the given date
    booked_count = db.query(VisitRequest).filter(
        VisitRequest.preferred_date == visit_in.preferred_date,
        VisitRequest.preferred_time == visit_in.preferred_time,
        VisitRequest.status.in_(["PENDING", "APPROVED"])
    ).count()

    if booked_count >= slot.max_capacity:
        raise HTTPException(
            status_code=400,
            detail="This visit slot is no longer available on the requested date. Please select a different time or date."
        )

    # Prevent duplicate pending visit from same user for the same date
    existing_user_visit = db.query(VisitRequest).filter(
        VisitRequest.user_id == current_user.id,
        VisitRequest.preferred_date == visit_in.preferred_date,
        VisitRequest.status == "PENDING"
    ).first()
    if existing_user_visit:
        raise HTTPException(
            status_code=400,
            detail="You already have an appointment request pending review for this date."
        )

    new_visit = VisitRequest(
        user_id=current_user.id,
        full_name=current_user.full_name,
        phone=current_user.phone,
        email=current_user.email,
        preferred_date=visit_in.preferred_date,
        preferred_time=visit_in.preferred_time,
        purpose=visit_in.purpose,
        number_of_visitors=visit_in.number_of_visitors,
        message=visit_in.message,
        status="PENDING"
    )
    db.add(new_visit)

    # Notification for User
    user_notif = Notification(
        user_id=current_user.id,
        for_admin=False,
        title="Visit Request Received",
        message=f"Your visit request for {visit_in.preferred_date} at {visit_in.preferred_time} has been received. Our manager will review and confirm shortly.",
        notification_type="VISIT",
        link="/my-visits"
    )
    db.add(user_notif)

    # Notification for Admin
    admin_notif = Notification(
        user_id=None,
        for_admin=True,
        title="New PG Visit Request",
        message=f"{current_user.full_name} ({current_user.phone}) requested a visit on {visit_in.preferred_date} at {visit_in.preferred_time}.",
        notification_type="VISIT",
        link="/admin/visits"
    )
    db.add(admin_notif)

    db.commit()
    db.refresh(new_visit)
    return new_visit

@router.get("/my", response_model=List[VisitResponse])
def get_my_visits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(VisitRequest).filter(VisitRequest.user_id == current_user.id).order_by(VisitRequest.created_at.desc()).all()

@router.put("/{visit_id}/cancel")
def cancel_my_visit(visit_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id, VisitRequest.user_id == current_user.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit appointment not found.")
    if visit.status in ["COMPLETED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="This visit cannot be cancelled in its current state.")

    visit.status = "CANCELLED"
    db.commit()
    return {"message": "Visit request has been successfully cancelled."}

# ADMIN ENDPOINTS
@admin_router.get("", response_model=List[VisitResponse])
def get_all_visits(
    status: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(VisitRequest)
    if status:
        query = query.filter(VisitRequest.status == status)
    return query.order_by(VisitRequest.created_at.desc()).all()

@admin_router.put("/{visit_id}/approve", response_model=VisitResponse)
def approve_visit(
    visit_id: str,
    approve_data: VisitApprove,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found.")

    visit.status = "APPROVED"
    visit.confirmed_date = approve_data.confirmed_date
    visit.confirmed_time = approve_data.confirmed_time
    visit.admin_notes = approve_data.admin_notes

    # Send Notification to User
    notif = Notification(
        user_id=visit.user_id,
        for_admin=False,
        title="Your Visit Request has been Approved!",
        message=f"Great news! Your PG visit is confirmed for {approve_data.confirmed_date} at {approve_data.confirmed_time}. Address: 3 Bhavani St, Bharathi Nagar, Velachery. Note: {approve_data.admin_notes or 'Please carry a photo ID.'}",
        notification_type="VISIT",
        link="/my-visits"
    )
    db.add(notif)
    db.commit()
    db.refresh(visit)
    return visit

@admin_router.put("/{visit_id}/reject", response_model=VisitResponse)
def reject_visit(
    visit_id: str,
    reject_data: VisitReject,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found.")

    visit.status = "REJECTED"
    visit.admin_notes = reject_data.admin_notes

    notif = Notification(
        user_id=visit.user_id,
        for_admin=False,
        title="Visit Request Update",
        message=f"Your visit request for {visit.preferred_date} was not approved. Reason: {reject_data.admin_notes or 'Slot unavailable or scheduling conflict.'} You may choose another available slot.",
        notification_type="VISIT",
        link="/my-visits"
    )
    db.add(notif)
    db.commit()
    db.refresh(visit)
    return visit

@admin_router.put("/{visit_id}/reschedule", response_model=VisitResponse)
def reschedule_visit(
    visit_id: str,
    reschedule_data: VisitReschedule,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found.")

    visit.status = "RESCHEDULED"
    visit.confirmed_date = reschedule_data.rescheduled_date
    visit.confirmed_time = reschedule_data.rescheduled_time
    visit.admin_notes = reschedule_data.admin_notes

    notif = Notification(
        user_id=visit.user_id,
        for_admin=False,
        title="Your Visit has been Rescheduled",
        message=f"Your visit has been rescheduled by the manager to {reschedule_data.rescheduled_date} at {reschedule_data.rescheduled_time}. Note: {reschedule_data.admin_notes or 'Adjusted for optimal tour.'}",
        notification_type="VISIT",
        link="/my-visits"
    )
    db.add(notif)
    db.commit()
    db.refresh(visit)
    return visit

@admin_router.put("/{visit_id}/complete")
def complete_visit(
    visit_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found.")
    visit.status = "COMPLETED"
    db.commit()
    return {"message": "Visit marked as completed."}

@admin_router.delete("/{visit_id}")
def delete_visit(
    visit_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    visit = db.query(VisitRequest).filter(VisitRequest.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found.")
    db.delete(visit)
    db.commit()
    return {"message": "Visit record deleted."}
