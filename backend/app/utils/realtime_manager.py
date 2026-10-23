import os
import json
import base64
import logging
import asyncio
from datetime import datetime
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket
from py_vapid import Vapid
from cryptography.hazmat.primitives import serialization
import pywebpush

logger = logging.getLogger(__name__)

# Path for persistent VAPID keys
VAPID_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "vapid_keys.json"))


class VapidKeyManager:
    """Manages persistent VAPID keys for Web Push notifications."""
    def __init__(self):
        self.public_key: str = ""
        self.private_pem: str = ""
        self.email: str = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@srilakshmipg.com")
        self._load_or_generate_keys()

    def _load_or_generate_keys(self):
        # 1. Check environment variables
        env_pub = os.getenv("VAPID_PUBLIC_KEY")
        env_priv = os.getenv("VAPID_PRIVATE_KEY")
        if env_pub and env_priv:
            self.public_key = env_pub
            self.private_pem = env_priv
            return

        # 2. Check local file
        if os.path.exists(VAPID_FILE):
            try:
                with open(VAPID_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.public_key = data.get("public_key", "")
                    self.private_pem = data.get("private_pem", "")
                    if self.public_key and self.private_pem:
                        return
            except Exception as e:
                logger.warning(f"Failed to read existing VAPID file: {e}")

        # 3. Generate new VAPID keys
        try:
            v = Vapid()
            v.generate_keys()
            raw_pub = v.public_key.public_bytes(
                serialization.Encoding.X962,
                serialization.PublicFormat.UncompressedPoint
            )
            self.public_key = base64.urlsafe_b64encode(raw_pub).decode("utf-8").rstrip("=")
            self.private_pem = v.private_pem().decode("utf-8")

            with open(VAPID_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "public_key": self.public_key,
                    "private_pem": self.private_pem,
                    "created_at": datetime.utcnow().isoformat()
                }, f, indent=2)
            logger.info("Generated new persistent VAPID key pair for Web Push.")
        except Exception as e:
            logger.error(f"Error generating VAPID keys: {e}")


vapid_manager = VapidKeyManager()


class RealtimeNotificationManager:
    """
    Coordinates real-time delivery across:
    1. Active WebSockets for open admin browser tabs
    2. Server-Sent Events (SSE) fallback
    3. Web Push notifications for closed browser tabs / mobile
    """
    def __init__(self):
        self.admin_websockets: Set[WebSocket] = set()
        self.sse_queues: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def connect_admin_ws(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        async with self._lock:
            self.admin_websockets.add(websocket)
        logger.info(f"Admin WebSocket connected (Admin ID: {admin_id}). Total active: {len(self.admin_websockets)}")
        try:
            await websocket.send_json({
                "type": "CONNECTION_ESTABLISHED",
                "admin_id": admin_id,
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Connected to Sri Lakshmi PG Real-Time Admin Notification Center"
            })
        except Exception as e:
            logger.warning(f"Error sending welcome to admin ws: {e}")

    async def disconnect_admin_ws(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.admin_websockets:
                self.admin_websockets.remove(websocket)
        logger.info(f"Admin WebSocket disconnected. Remaining active: {len(self.admin_websockets)}")

    async def register_sse_listener(self) -> asyncio.Queue:
        q = asyncio.Queue()
        async with self._lock:
            self.sse_queues.add(q)
        return q

    async def unregister_sse_listener(self, q: asyncio.Queue):
        async with self._lock:
            if q in self.sse_queues:
                self.sse_queues.remove(q)

    async def broadcast_ws(self, payload: dict):
        if not self.admin_websockets:
            return
        dead_sockets = set()
        for ws in list(self.admin_websockets):
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning(f"Failed to send to admin ws, marking dead: {e}")
                dead_sockets.add(ws)
        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self.admin_websockets.discard(ws)

    async def broadcast_sse(self, payload: dict):
        if not self.sse_queues:
            return
        event_str = f"data: {json.dumps(payload)}\n\n"
        for q in list(self.sse_queues):
            try:
                await q.put(event_str)
            except Exception as e:
                logger.warning(f"Failed to enqueue SSE event: {e}")

    def send_web_push_sync(self, push_data: dict):
        """Dispatches Web Push notification to all stored admin push subscriptions."""
        from ..database.connection import SessionLocal
        from ..models.models import PushSubscription

        db = SessionLocal()
        try:
            subs = db.query(PushSubscription).all()
            if not subs:
                return

            payload_str = json.dumps(push_data)
            claims = {"sub": vapid_manager.email}

            expired_ids = []
            for sub in subs:
                subscription_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                }
                try:
                    pywebpush.webpush(
                        subscription_info=subscription_info,
                        data=payload_str,
                        vapid_private_key=vapid_manager.private_pem,
                        vapid_claims=claims,
                        ttl=86400  # 24 hours
                    )
                    sub.last_used_at = datetime.utcnow()
                except pywebpush.WebPushException as ex:
                    # If endpoint returned 404 or 410, it's expired or unregistered
                    response = getattr(ex, "response", None)
                    status_code = getattr(response, "status_code", None)
                    if status_code in (404, 410):
                        logger.info(f"Removing expired Web Push subscription (ID: {sub.id})")
                        expired_ids.append(sub.id)
                    else:
                        logger.warning(f"Web Push delivery error for sub {sub.id}: {ex}")
                except Exception as e:
                    logger.warning(f"Unexpected Web Push error: {e}")

            if expired_ids:
                db.query(PushSubscription).filter(PushSubscription.id.in_(expired_ids)).delete(synchronize_session=False)
            db.commit()
        except Exception as err:
            logger.error(f"Error delivering Web Push notifications: {err}")
            db.rollback()
        finally:
            db.close()

    async def broadcast_admin_notification(self, notification_dict: dict, issue_dict: Optional[dict] = None):
        """
        Primary broadcast pipeline:
        1. Formats comprehensive real-time payload
        2. Delivers immediately to all connected Admin WebSockets
        3. Delivers to SSE queues
        4. Triggers background Web Push to desktop/mobile devices
        """
        payload = {
            "type": "NEW_ISSUE_REPORT",
            "notification": notification_dict,
            "issue": issue_dict or {},
            "timestamp": datetime.utcnow().isoformat()
        }

        # 1. Send to all active WebSockets
        await self.broadcast_ws(payload)

        # 2. Send to SSE streams
        await self.broadcast_sse(payload)

        # 3. Deliver Web Push in background thread
        push_payload = {
            "title": notification_dict.get("title", "🔔 Sri Lakshmi PG — New Issue Report"),
            "body": notification_dict.get("message", "A new resident issue report requires administrative attention."),
            "icon": "/favicon.svg",
            "badge": "/favicon.svg",
            "link": notification_dict.get("link", "/admin/reports"),
            "data": {
                "id": notification_dict.get("id"),
                "report_id": notification_dict.get("report_id"),
                "link": notification_dict.get("link", "/admin/reports"),
                "created_at": notification_dict.get("created_at")
            }
        }
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, self.send_web_push_sync, push_payload)


# Global singleton instance
realtime_hub = RealtimeNotificationManager()


def dispatch_admin_notification_sync(notification_dict: dict, issue_dict: Optional[dict] = None):
    """
    Helper for synchronous routes to dispatch real-time broadcast without blocking.
    """
    try:
        loop = asyncio.get_running_loop()
        asyncio.create_task(realtime_hub.broadcast_admin_notification(notification_dict, issue_dict))
    except RuntimeError:
        # No running loop, run in a new temporary loop
        asyncio.run(realtime_hub.broadcast_admin_notification(notification_dict, issue_dict))
