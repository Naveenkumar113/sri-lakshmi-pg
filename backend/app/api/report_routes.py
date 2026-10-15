import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, text

from ..database.connection import get_db, SessionLocal
from ..models.models import IssueReport, User, Resident, BedAllocation, Room, RoomBed, Notification, RentSettings
from ..schemas.schemas import (
    ResidentReportInfo,
    IssueReportCreate,
    IssueReportStatusUpdate,
    IssueReportResponse,
    IssueReportListResponse,
    ISSUE_CATEGORIES
)
from ..auth.security import get_current_user, get_current_admin
from ..utils.whatsapp_service import send_whatsapp_message, normalize_whatsapp_phone, get_whatsapp_env_config

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
# Background WhatsApp Handlers
# ==========================================

def _send_admin_new_report_whatsapp(report_id: str):
    """Dispatches WhatsApp alert to PG admin upon report creation (non-blocking)."""
    db = SessionLocal()
    try:
        report = db.query(IssueReport).filter(IssueReport.id == report_id).first()
        if not report:
            return

        rent_settings = db.query(RentSettings).first()
        admin_phone = rent_settings.admin_whatsapp_number if (rent_settings and rent_settings.admin_whatsapp_number) else "7893744206"

        formatted_time = report.created_at.strftime("%d %b %Y, %I:%M %p")
        message_body = (
            f"🚨 *New PG Issue Report Received*\n\n"
            f"*Report ID:* {report.report_code}\n"
            f"*Resident:* {report.resident_name}\n"
            f"*Resident ID:* {report.resident_code or 'N/A'}\n"
            f"*Phone:* {report.resident_phone}\n"
            f"*Room:* {report.room_number or 'Unallocated'}\n"
            f"*Floor:* {f'Floor {report.floor_number}' if report.floor_number is not None else 'N/A'}\n"
            f"*Bed:* {report.bed_number or 'N/A'}\n"
            f"*Issue:* {report.issue_category}\n"
            f"*Description:* {report.description or 'No extra details provided'}\n"
            f"*Reported At:* {formatted_time} UTC\n\n"
            f"Please review and resolve this issue in the Sri Lakshmi PG Admin ERP panel."
        )

        res = send_whatsapp_message(admin_phone, message_body)
        if res.get("success"):
            report.admin_whatsapp_status = "SENT"
        else:
            report.admin_whatsapp_status = "FAILED"
            report.whatsapp_error_details = res.get("error_details")
        report.admin_whatsapp_timestamp = datetime.utcnow()
        db.commit()
    except Exception as e:
        logger.error(f"Error sending admin WhatsApp notification for report {report_id}: {e}")
    finally:
        db.close()

def _send_resident_resolution_whatsapp(report_id: str):
    """Dispatches WhatsApp alert to resident when issue is resolved (non-blocking)."""
    db = SessionLocal()
    try:
        report = db.query(IssueReport).filter(IssueReport.id == report_id).first()
        if not report or not report.resident_phone:
            return

        res_notes = report.resolution_notes or "The issue has been checked and addressed by the PG maintenance team."
        room_info = f"Room {report.room_number}" if report.room_number else "PG Accommodation"

        message_body = (
            f"Hello {report.resident_name},\n\n"
            f"Your issue report (*{report.report_code}*) regarding '*{report.issue_category}*' has been marked as *Resolved* by the PG administration.\n\n"
            f"*Accommodation:* {room_info}\n"
            f"*Resolution Notes:* {res_notes}\n\n"
            f"If the issue persists or if you require further assistance, please contact the PG management directly.\n\n"
            f"Thank you,\n"
            f"Sri Lakshmi Srinivasa Gents PG Management\n"
            f"Velachery, Chennai."
        )

        res = send_whatsapp_message(report.resident_phone, message_body)
        if res.get("success"):
            report.resident_whatsapp_status = "SENT"
        else:
            report.resident_whatsapp_status = "FAILED"
            report.whatsapp_error_details = res.get("error_details")
        report.resident_whatsapp_timestamp = datetime.utcnow()
        db.commit()
    except Exception as e:
        logger.error(f"Error sending resident WhatsApp resolution for report {report_id}: {e}")
    finally:
        db.close()


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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resident submits an issue report.
    Resident and room details are automatically populated from the server-side database.
    Triggers an in-app notification and a background WhatsApp alert to PG admin.
    """
    resident, allocation, room, bed = _get_active_resident_allocation(current_user, db)

    report_code = _generate_report_code(db)

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

    # In-app notification for admin
    room_str = f"Room {room.room_number}" if room else "Unallocated"
    admin_notif = Notification(
        user_id=None,
        for_admin=True,
        title=f"New Issue Reported: {report_code}",
        message=f"{current_user.full_name} ({room_str}) reported: {report_in.issue_category}.",
        notification_type="REPORT",
        link="/admin/reports"
    )
    db.add(admin_notif)

    # In-app notification for resident
    user_notif = Notification(
        user_id=current_user.id,
        for_admin=False,
        title=f"Report Submitted: {report_code}",
        message=f"Your issue report ({report_in.issue_category}) has been received and assigned to PG staff.",
        notification_type="REPORT",
        link="/report"
    )
    db.add(user_notif)

    db.commit()
    db.refresh(new_report)

    # Dispatch non-blocking WhatsApp alert to Admin
    background_tasks.add_task(_send_admin_new_report_whatsapp, new_report.id)

    return new_report

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
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates status of an issue report (OPEN, IN_PROGRESS, RESOLVED) and resolution notes.
    If transitioned to RESOLVED, sets resolved_at and notifies resident via WhatsApp (non-blocking).
    Avoids duplicate resolution WhatsApp messages.
    """
    report = db.query(IssueReport).filter(IssueReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Issue report not found.")

    old_status = report.status
    new_status = status_in.status.upper()

    report.status = new_status
    if status_in.resolution_notes is not None:
        report.resolution_notes = status_in.resolution_notes

    # If transitioning to RESOLVED
    if new_status == "RESOLVED":
        if not report.resolved_at:
            report.resolved_at = datetime.utcnow()
        report.resolved_by_admin_id = current_admin.id

        # In-app notification to resident
        user_notif = Notification(
            user_id=report.user_id,
            for_admin=False,
            title=f"Issue Resolved: {report.report_code}",
            message=f"Your issue ({report.issue_category}) has been marked as RESOLVED by the management.",
            notification_type="REPORT",
            link="/report"
        )
        db.add(user_notif)

        # Trigger WhatsApp notification only if not already sent for this resolution
        if old_status != "RESOLVED" or report.resident_whatsapp_status != "SENT":
            background_tasks.add_task(_send_resident_resolution_whatsapp, report.id)

    elif new_status in ("OPEN", "IN_PROGRESS"):
        # If reopening
        if old_status == "RESOLVED":
            report.resolved_at = None

    db.commit()
    db.refresh(report)

    return report
