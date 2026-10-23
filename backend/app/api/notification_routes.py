import json
import logging
from datetime import datetime
from typing import List, Optional, Union
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..database.connection import get_db, SessionLocal
from ..models.models import Notification, User, PushSubscription
from ..schemas.schemas import (
    NotificationResponse,
    NotificationListResponse,
    PushSubscriptionCreate
)
from ..auth.security import get_current_user, get_current_admin, decode_token_user_id
from ..utils.realtime_manager import realtime_hub, vapid_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=Union[NotificationListResponse, List[NotificationResponse]])
def get_notifications(
    paginated: bool = Query(False, description="Set to true for paginated structure"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns notifications for the current authenticated user or administrator.
    Supports filtering by unread status, type, and keyword search.
    Provides backward-compatible list response by default, or paginated response when paginated=True.
    """
    if current_user.role == "ADMIN":
        query = db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.id,
                (Notification.for_admin == True) & (Notification.user_id == None)
            )
        )
    else:
        query = db.query(Notification).filter(
            Notification.user_id == current_user.id
        )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    if notification_type and notification_type != "ALL":
        query = query.filter(Notification.notification_type == notification_type)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Notification.title.ilike(term),
                Notification.message.ilike(term)
            )
        )

    total = query.count()
    unread_count = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            (Notification.for_admin == True) & (Notification.user_id == None)
        ) if current_user.role == "ADMIN"
        else Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    offset = (page - 1) * limit
    items = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

    if paginated:
        return NotificationListResponse(
            items=items,
            total=total,
            unread_count=unread_count,
            page=page,
            page_size=limit
        )

    return items


@router.get("/paginated", response_model=NotificationListResponse)
def get_paginated_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicit paginated endpoint for admin notification center."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return get_notifications(
        paginated=True,
        page=page,
        limit=limit,
        unread_only=unread_only,
        notification_type=notification_type,
        search=search,
        current_user=current_user,
        db=db
    )


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns number of unread notifications for current user/admin."""
    if current_user.role == "ADMIN":
        count = db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.id,
                (Notification.for_admin == True) & (Notification.user_id == None)
            ),
            Notification.is_read == False
        ).count()
    else:
        count = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).count()
    return {"unread_count": count, "count": count}


@router.put("/{notif_id}/read")
@router.patch("/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    # Authorization / IDOR Protection
    if current_user.role != "ADMIN" and notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this notification.")

    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {
        "message": "Notification marked as read.",
        "id": notif.id,
        "is_read": True,
        "read_at": notif.read_at.isoformat(),
        "link": notif.link
    }


@router.put("/read-all")
@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marks all unread notifications as read for current user/admin."""
    now = datetime.utcnow()
    if current_user.role == "ADMIN":
        db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.id,
                (Notification.for_admin == True) & (Notification.user_id == None)
            ),
            Notification.is_read == False
        ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    else:
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}


# ==========================================
# Web Push Subscription Endpoints
# ==========================================

@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Returns VAPID public key needed by browser pushManager.subscribe()."""
    return {"publicKey": vapid_manager.public_key}


@router.post("/push-subscribe")
def subscribe_push(
    sub_in: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Saves or updates browser Web Push subscription for authenticated administrator."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Push subscriptions are currently enabled for administrators."
        )

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == sub_in.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = sub_in.p256dh
        existing.auth = sub_in.auth
        existing.user_agent = sub_in.user_agent
        existing.last_used_at = datetime.utcnow()
    else:
        new_sub = PushSubscription(
            user_id=current_user.id,
            endpoint=sub_in.endpoint,
            p256dh=sub_in.p256dh,
            auth=sub_in.auth,
            user_agent=sub_in.user_agent,
            created_at=datetime.utcnow()
        )
        db.add(new_sub)
    db.commit()
    return {"message": "Web Push subscription saved successfully."}


@router.post("/push-unsubscribe")
def unsubscribe_push(
    sub_in: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes a Web Push subscription."""
    db.query(PushSubscription).filter(PushSubscription.endpoint == sub_in.endpoint).delete(synchronize_session=False)
    db.commit()
    return {"message": "Web Push subscription removed."}


@router.post("/test-push")
def send_test_push(
    current_admin: User = Depends(get_current_admin)
):
    """Sends immediate test notification via Web Push to verify background delivery."""
    test_payload = {
        "title": "🔔 Sri Lakshmi PG — Test Push Alert",
        "body": "Web Push notification test successful! Alerts will appear even when browser is in background.",
        "icon": "/favicon.svg",
        "badge": "/favicon.svg",
        "link": "/admin/reports",
        "data": {
            "link": "/admin/reports",
            "test": True,
            "created_at": datetime.utcnow().isoformat()
        }
    }
    realtime_hub.send_web_push_sync(test_payload)
    return {"message": "Test push notification dispatched to registered devices."}


# ==========================================
# Real-Time WebSocket & SSE Endpoints
# ==========================================

@router.websocket("/ws")
async def websocket_notifications(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Authenticated WebSocket endpoint for real-time admin notifications.
    Token is provided via query parameter: /api/notifications/ws?token=<jwt_token>
    """
    if not token:
        logger.warning("WebSocket connection attempt missing token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = decode_token_user_id(token)
    if not user_id:
        logger.warning("WebSocket invalid token signature.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "ADMIN":
            logger.warning(f"Unauthorized WebSocket access by user: {user_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    finally:
        db.close()

    await realtime_hub.connect_admin_ws(websocket, user_id)
    try:
        while True:
            # Keep-alive heartbeat listener
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await realtime_hub.disconnect_admin_ws(websocket)
    except Exception as e:
        logger.info(f"WebSocket closed: {e}")
        await realtime_hub.disconnect_admin_ws(websocket)


@router.get("/stream")
async def sse_notifications_stream(
    token: Optional[str] = Query(None),
    request: Request = None
):
    """
    Server-Sent Events (SSE) fallback stream for administrators.
    Emits real-time event packets formatted as 'data: {...}\n\n'.
    """
    # 1. Resolve token from Query param or Authorization header
    auth_header = request.headers.get("Authorization") if request else None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token required.")

    user_id = decode_token_user_id(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    finally:
        db.close()

    queue = await realtime_hub.register_sse_listener()

    async def event_generator():
        try:
            # Initial connection frame
            yield f"data: {json.dumps({'type': 'CONNECTED', 'message': 'SSE Stream Active'})}\n\n"
            while True:
                data = await queue.get()
                yield data
        except (GeneratorExit, asyncio.CancelledError):
            pass
        finally:
            await realtime_hub.unregister_sse_listener(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
