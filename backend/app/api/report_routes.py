import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, text

from ..database.connection import get_db
from ..models.models import IssueReport, User, Resident, BedAllocation, Room, RoomBed, Notification
from ..schemas.schemas import (
    ResidentReportInfo,
    IssueReportCreate,
    IssueReportStatusUpdate,
    IssueReportResponse,
    IssueReportListResponse,
    ISSUE_CATEGORIES
)
from ..auth.security import get_current_user, get_current_admin
from ..utils.realtime_manager import dispatch_admin_notification_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Issue Reports"])
admin_router = APIRouter(prefix="/api/admin/reports", tags=["Admin Issue Reports"])

def _generate_report_code(db: Session) -> str:
    """Generates unique sequential reference code: REP-YYYYMM-XXX"""
    prefix = datetime.utcnow().strftime("REP-%Y%m")
    try:
        if db.bind and db.bind.dialect.name == "postgresql":
            val = db.execute(text("SELECT nextval('report_code_seq')")).scalar()
            return f"{prefix}-{int(val):04d}"
    except Exception as e:
        logger.warning(f"Sequence nextval failed, rolling back sub-transaction: {e}")
        db.rollback()

    count = db.query(IssueReport).filter(IssueReport.report_code.like(f"{prefix}-%")).count() + 1
    return f"{prefix}-{count:04d}"

def _get_active_resident_allocation(user: User, db: Session):
    """
    Finds active resident profile and bed allocation for authenticated user.
    Matches either by Resident.user_id or by phone number.
    """
    resident = db.query(Resident).filter(
        or_(Resident.user_id == user.id, Resident.phone == user.phone)
    ).first()

    if not resident:
        return None, None, None, None

    # Link user_id if not linked yet
    if not resident.user_id:
        resident.user_id = user.id
        db.commit()

    # Find active allocation
    allocation = db.query(BedAllocation).filter(
        BedAllocation.resident_id == resident.id,
        BedAllocation.allocation_status == "ACTIVE"
    ).first()

    room = None
    bed = None
    if allocation:
        room = db.query(Room).filter(Room.id == allocation.room_id).first()
        bed = db.query(RoomBed).filter(RoomBed.id == allocation.bed_id).first()

    return resident, allocation, room, bed


# ==========================================
# User Endpoints
# ==========================================

@router.get("/categories")
def get_categories():
    """Returns available issue categories."""
    return {"categories": ISSUE_CATEGORIES}

@router.get("/my-info", response_model=ResidentReportInfo)
def get_resident_report_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authenticated user's snapshot info:
    Resident Name, Phone, Resident ID, Room Number, Floor Number, Bed Number.
    Read-only data verified strictly from database.
    """
    resident, allocation, room, bed = _get_active_resident_allocation(current_user, db)

    return ResidentReportInfo(
        resident_id=resident.id if resident else None,
        resident_code=resident.resident_code if resident else None,
        resident_name=current_user.full_name,
        phone=current_user.phone,
        has_active_bed=bool(allocation and room and bed),
        room_number=room.room_number if room else None,
        floor_number=room.floor if room else None,
        bed_number=bed.bed_number if bed else None,
        room_name=room.room_type if room else None,
        sharing_type=room.sharing_type if room else None
    )

@router.post("", response_model=IssueReportResponse, status_code=status.HTTP_201_CREATED)
def submit_issue_report(
    report_in: IssueReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resident submits an issue report.
    Resident and room details are automatically populated from the server-side database.
    Atomically saves the report, creates in-app administrative notifications, prevents duplicate submissions,
    and dispatches real-time WebSocket, SSE, and Web Push notifications to PG administrators.
    """
    # 0. Deduplication guard: Check if an identical report was submitted within the last 60 seconds
    cutoff = datetime.utcnow() - timedelta(seconds=60)
    recent_duplicate = db.query(IssueReport).filter(
        IssueReport.user_id == current_user.id,
        IssueReport.issue_category == report_in.issue_category,
        IssueReport.description == report_in.description,
        IssueReport.status == "OPEN",
        IssueReport.created_at >= cutoff
    ).first()

    if recent_duplicate:
        logger.info(f"Duplicate issue report suppressed for user {current_user.id}. Returning existing report {recent_duplicate.report_code}")
        return recent_duplicate

    resident, allocation, room, bed = _get_active_resident_allocation(current_user, db)
    report_code = _generate_report_code(db)

    try:
        new_report = IssueReport(
            report_code=report_code,
            user_id=current_user.id,
            resident_id=resident.id if resident else None,
            resident_name=current_user.full_name,
            resident_code=resident.resident_code if resident else None,
            resident_phone=current_user.phone,
            room_number=room.room_number if room else None,
            floor_number=room.floor if room else None,
            bed_number=bed.bed_number if bed else None,
            issue_category=report_in.issue_category,
            description=report_in.description,
            status="OPEN"
        )
        db.add(new_report)
        db.flush()  # Generates new_report.id within the current transaction

        # Format location descriptor (e.g. "Room S-2, Bed B1" or "Room 101 (Bed 2)")
        if room and bed:
            location_str = f"Room {room.room_number}, Bed {bed.bed_number}"
        elif room:
            location_str = f"Room {room.room_number}"
        else:
            location_str = "No active room"

        now_utc = datetime.utcnow()

        # 1. In-app persistent notification for admin:
        # Title: New Maintenance Issue Reported — #REP-202610-XXXX
        # Message: Naveen Kumar reported an Electrical Issue — Room 7 Sharing, Bed B2.
        resident_display = current_user.full_name or "A resident"
        admin_title = f"🔔 Sri Lakshmi PG — New Issue Report: New Maintenance Issue Reported — #{report_code}"
        admin_message = f"{resident_display} reported a {report_in.issue_category} — {location_str}."
        if report_in.description and report_in.description.strip():
            desc_clean = report_in.description.strip()
            desc_short = (desc_clean[:70] + "...") if len(desc_clean) > 70 else desc_clean
            admin_message = f"{resident_display} reported a {report_in.issue_category} — {location_str}: \"{desc_short}\""

        # Associate notifications directly with active PG administrators
        admins = db.query(User).filter(User.role == "ADMIN", User.is_active == True).all()
        created_admin_notifs = []

        if admins:
            for adm in admins:
                an = Notification(
                    user_id=adm.id,
                    for_admin=True,
                    title=admin_title,
                    message=admin_message,
                    notification_type="REPORT",
                    report_id=new_report.id,
                    link=f"/admin/reports?report_id={new_report.id}",
                    delivery_status="DELIVERED",
                    delivery_timestamp=now_utc
                )
                db.add(an)
                created_admin_notifs.append(an)
        else:
            an = Notification(
                user_id=None,
                for_admin=True,
                title=admin_title,
                message=admin_message,
                notification_type="REPORT",
                report_id=new_report.id,
                link=f"/admin/reports?report_id={new_report.id}",
                delivery_status="DELIVERED",
                delivery_timestamp=now_utc
            )
            db.add(an)
            created_admin_notifs.append(an)

        # 2. In-app notification for resident: confirmation in user portal
        user_notif = Notification(
            user_id=current_user.id,
            for_admin=False,
            title=f"Issue Report Submitted — #{report_code}",
            message=f"Your report regarding '{report_in.issue_category}' has been submitted and assigned to PG staff.",
            notification_type="REPORT",
            report_id=new_report.id,
            link=f"/report?report_id={new_report.id}",
            delivery_status="DELIVERED",
            delivery_timestamp=now_utc
        )
        db.add(user_notif)

        # Atomic commit of both report and notifications
        db.commit()
        db.refresh(new_report)
        for an in created_admin_notifs:
            db.refresh(an)

        # 3. Real-time broadcast to connected Admin WebSockets, SSE streams, and Web Push
        primary_admin_notif = created_admin_notifs[0]
        notification_dict = {
            "id": primary_admin_notif.id,
            "user_id": primary_admin_notif.user_id,
            "for_admin": True,
            "title": primary_admin_notif.title,
            "message": primary_admin_notif.message,
            "notification_type": primary_admin_notif.notification_type,
            "report_id": new_report.id,
            "link": primary_admin_notif.link,
            "is_read": False,
            "read_at": None,
            "delivery_status": primary_admin_notif.delivery_status,
            "delivery_timestamp": primary_admin_notif.delivery_timestamp.isoformat() if primary_admin_notif.delivery_timestamp else None,
            "created_at": primary_admin_notif.created_at.isoformat() if primary_admin_notif.created_at else now_utc.isoformat()
        }

        issue_dict = {
            "id": new_report.id,
            "report_code": new_report.report_code,
            "resident_name": new_report.resident_name,
            "resident_phone": new_report.resident_phone,
            "resident_code": new_report.resident_code,
            "room_number": new_report.room_number,
            "floor_number": new_report.floor_number,
            "bed_number": new_report.bed_number,
            "issue_category": new_report.issue_category,
            "description": new_report.description,
            "status": new_report.status,
            "created_at": new_report.created_at.isoformat() if new_report.created_at else now_utc.isoformat()
        }

        dispatch_admin_notification_sync(notification_dict, issue_dict)

        return new_report
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to submit issue report and create notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save issue report. Please try again."
        )

@router.get("/my", response_model=IssueReportListResponse)
def get_my_issue_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all reports submitted by the logged-in user."""
    reports = db.query(IssueReport).filter(
        IssueReport.user_id == current_user.id
    ).order_by(desc(IssueReport.created_at)).all()

    open_c = sum(1 for r in reports if r.status == "OPEN")
    in_p = sum(1 for r in reports if r.status == "IN_PROGRESS")
    res_c = sum(1 for r in reports if r.status == "RESOLVED")

    return IssueReportListResponse(
        items=reports,
        total=len(reports),
        open_count=open_c,
        in_progress_count=in_p,
        resolved_count=res_c
    )

@router.get("/my/{report_id}", response_model=IssueReportResponse)
def get_my_single_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns a specific report belonging to the authenticated resident."""
    report = db.query(IssueReport).filter(
        IssueReport.id == report_id,
        IssueReport.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Issue report not found.")
    return report


# ==========================================
# Admin Endpoints
# ==========================================

@admin_router.get("", response_model=IssueReportListResponse)
def list_all_reports(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    sort_by: str = Query("newest"),  # newest, oldest, status
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Lists all issue reports with filtering, searching, and pagination.
    Restricted to authorized admins only.
    """
    query = db.query(IssueReport)

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(IssueReport.status == status_filter.upper())

    if category_filter and category_filter.upper() != "ALL":
        query = query.filter(IssueReport.issue_category == category_filter)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                IssueReport.report_code.ilike(s),
                IssueReport.resident_name.ilike(s),
                IssueReport.resident_code.ilike(s),
                IssueReport.resident_phone.ilike(s),
                IssueReport.room_number.ilike(s),
                IssueReport.description.ilike(s)
            )
        )

    # Overall counts across all records for quick summary cards
    all_reports = db.query(IssueReport.status).all()
    open_c = sum(1 for (st,) in all_reports if st == "OPEN")
    in_p = sum(1 for (st,) in all_reports if st == "IN_PROGRESS")
    res_c = sum(1 for (st,) in all_reports if st == "RESOLVED")

    # Sorting
    if sort_by == "oldest":
        query = query.order_by(IssueReport.created_at.asc())
    elif sort_by == "status":
        query = query.order_by(IssueReport.status.asc(), desc(IssueReport.created_at))
    else:
        query = query.order_by(desc(IssueReport.created_at))

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return IssueReportListResponse(
        items=items,
        total=total,
        open_count=open_c,
        in_progress_count=in_p,
        resolved_count=res_c
    )

@admin_router.get("/{report_id}", response_model=IssueReportResponse)
def get_report_details(
    report_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches full details of a specific issue report."""
    report = db.query(IssueReport).filter(IssueReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Issue report not found.")
    return report

@admin_router.put("/{report_id}/status", response_model=IssueReportResponse)
def update_report_status(
    report_id: str,
    status_in: IssueReportStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates status of an issue report (OPEN, IN_PROGRESS, RESOLVED) and resolution notes.
    Creates an in-app notification for the resident. No WhatsApp or external services used.
    """
    report = db.query(IssueReport).filter(IssueReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Issue report not found.")

    old_status = report.status
    new_status = status_in.status.upper()

    report.status = new_status
    if status_in.resolution_notes is not None:
        report.resolution_notes = status_in.resolution_notes

    room_info = f"Room {report.room_number}" if report.room_number else "PG Accommodation"

    if new_status == "RESOLVED":
        if not report.resolved_at:
            report.resolved_at = datetime.utcnow()
        report.resolved_by_admin_id = current_admin.id

        # In-app notification to resident
        notes_snippet = f"Admin Notes: {report.resolution_notes}" if report.resolution_notes else "Issue has been resolved by maintenance."
        user_notif = Notification(
            user_id=report.user_id,
            for_admin=False,
            title=f"Your Issue Has Been Resolved — #{report.report_code}",
            message=f"Your report regarding '{report.issue_category}' has been marked as resolved by the PG administration. {room_info} | Status: Resolved | {notes_snippet}",
            notification_type="REPORT",
            report_id=report.id,
            link=f"/report?report_id={report.id}"
        )
        db.add(user_notif)

    elif new_status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
        # Notify resident that maintenance is actively underway
        notes_snippet = f"Admin Notes: {report.resolution_notes}" if report.resolution_notes else "Maintenance staff has been assigned to attend."
        user_notif = Notification(
            user_id=report.user_id,
            for_admin=False,
            title=f"Issue In Progress — #{report.report_code}",
            message=f"Your report regarding '{report.issue_category}' is now In Progress. {room_info} | {notes_snippet}",
            notification_type="REPORT",
            report_id=report.id,
            link=f"/report?report_id={report.id}"
        )
        db.add(user_notif)

    elif new_status == "OPEN" and old_status == "RESOLVED":
        report.resolved_at = None

    db.commit()
    db.refresh(report)

    return report
