from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import ContactMessage, Notification, User
from ..schemas.schemas import ContactMessageCreate, ContactMessageResponse
from ..auth.security import get_current_admin

router = APIRouter(prefix="/api/contact", tags=["Contact"])
admin_router = APIRouter(prefix="/api/admin/contact", tags=["Admin Contact"])

@router.post("", response_model=ContactMessageResponse)
def submit_contact_form(contact_in: ContactMessageCreate, db: Session = Depends(get_db)):
    new_msg = ContactMessage(**contact_in.model_dump())
    db.add(new_msg)

    # In-app notification for admin
    admin_notif = Notification(
        user_id=None,
        for_admin=True,
        title="New Website Contact Enquiry",
        message=f"{contact_in.name} ({contact_in.phone}) sent a message: '{contact_in.message[:60]}...'",
        notification_type="MESSAGE",
        link="/admin/messages"
    )
    db.add(admin_notif)

    db.commit()
    db.refresh(new_msg)
    return new_msg

@admin_router.get("", response_model=List[ContactMessageResponse])
def get_contact_messages(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()

@admin_router.put("/{msg_id}/read")
def mark_message_as_read(
    msg_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    msg = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    msg.is_read = True
    db.commit()
    return {"message": "Marked as read."}

@admin_router.delete("/{msg_id}")
def delete_message(
    msg_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    msg = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    db.delete(msg)
    db.commit()
    return {"message": "Message deleted."}
