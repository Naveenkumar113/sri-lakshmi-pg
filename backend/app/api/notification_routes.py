from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Notification, User
from ..schemas.schemas import NotificationResponse
from ..auth.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "ADMIN":
        # Admin gets notifications marked for admin + their personal notifications
        return db.query(Notification).filter(
            (Notification.for_admin == True) | (Notification.user_id == current_user.id)
        ).order_by(Notification.created_at.desc()).limit(100).all()
    else:
        # User gets their personal notifications only
        return db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc()).limit(100).all()

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns number of unread notifications for current user/admin."""
    if current_user.role == "ADMIN":
        count = db.query(Notification).filter(
            ((Notification.for_admin == True) | (Notification.user_id == current_user.id)),
            Notification.is_read == False
        ).count()
    else:
        count = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).count()
    return {"unread_count": count}

@router.put("/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    # Authorization / IDOR Protection
    if current_user.role != "ADMIN" and notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this notification.")

    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Notification marked as read.", "id": notif.id, "link": notif.link}

@router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    if current_user.role == "ADMIN":
        db.query(Notification).filter(
            ((Notification.for_admin == True) | (Notification.user_id == current_user.id)),
            Notification.is_read == False
        ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    else:
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}
