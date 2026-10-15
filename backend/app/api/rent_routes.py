from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from ..database.connection import get_db
from ..models.models import (
    User, Resident, BedAllocation, Room, RoomBed,
    RentRecord, PaymentTransaction, WhatsAppReminderLog, RentSettings, AuditLog
)
from ..schemas.schemas import (
    PaymentCreate, PaymentResponse, RentRecordResponse,
    WhatsAppLogResponse, RentDashboardStatsResponse,
    RentSettingsResponse, RentSettingsUpdate
)
from ..auth.security import get_current_admin
from ..utils.rent_calculator import (
    get_ist_today, get_ist_now, format_date_display, parse_date_flexible,
    determine_payment_status, safe_datetime_diff_days
)
from ..utils.whatsapp_service import (
    get_whatsapp_setup_status, get_whatsapp_env_config,
    generate_rent_reminder_text, send_whatsapp_message,
    build_whatsapp_chat_url, normalize_whatsapp_phone
)
from ..scheduler.rent_scheduler import (
    ensure_rent_records_for_allocation, process_daily_rent_and_reminders
)

router = APIRouter(prefix="/api/admin/rent", tags=["Admin Rent & Payment Management"])

def enrich_rent_record(rec: RentRecord, today: date) -> dict:
    """Enriches a RentRecord DB object into the detailed dictionary structure for API responses."""
    resident = rec.resident
    alloc = rec.allocation
    room = alloc.room if alloc else (resident.allocations[0].room if resident and resident.allocations else None)
    bed = alloc.bed if alloc else (resident.allocations[0].bed if resident and resident.allocations else None)

    due_d = parse_date_flexible(rec.due_date)
    days_overdue = max(0, (today - due_d).days) if (due_d and today > due_d and rec.balance_due > 0) else 0

    latest_reminder = None
    if rec.reminders:
        sorted_reminders = sorted(rec.reminders, key=lambda x: x.attempted_at or datetime.min, reverse=True)
        if sorted_reminders:
            latest_reminder = sorted_reminders[0].delivery_status

    payments_data = []
    if rec.payments:
        for p in rec.payments:
            payments_data.append({
                "id": p.id,
                "rent_record_id": p.rent_record_id,
                "resident_id": p.resident_id,
                "amount": p.amount,
                "payment_date": p.payment_date,
                "payment_method": p.payment_method,
                "transaction_reference": p.transaction_reference,
                "recorded_by_admin_id": p.recorded_by_admin_id,
                "recorded_by_admin_email": p.recorded_by_admin.email if p.recorded_by_admin else None,
                "notes": p.notes,
                "created_at": p.created_at
            })

    return {
        "id": rec.id,
        "resident_id": rec.resident_id,
        "resident_code": resident.resident_code if resident else "N/A",
        "resident_name": resident.full_name if resident else "Unknown",
        "resident_phone": resident.phone if resident else "N/A",
        "allocation_id": rec.allocation_id,
        "room_number": room.room_number if room else "N/A",
        "bed_number": bed.bed_number if bed else "N/A",
        "is_ac": room.is_ac if room else None,
        "rent_month": rec.rent_month,
        "rent_period": rec.rent_period,
        "due_date": rec.due_date,
        "due_date_formatted": format_date_display(due_d) if due_d else rec.due_date,
        "billing_cycle_start": rec.billing_cycle_start,
        "billing_cycle_end": rec.billing_cycle_end,
        "rent_amount": rec.rent_amount,
        "amount_paid": rec.amount_paid,
        "balance_due": rec.balance_due,
        "payment_status": rec.payment_status,
        "days_overdue": days_overdue,
        "last_reminder_sent_at": rec.last_reminder_sent_at,
        "reminder_count": rec.reminder_count or 0,
        "latest_reminder_status": latest_reminder,
        "payments": payments_data,
        "notes": rec.notes,
        "created_at": rec.created_at
    }


@router.get("/dashboard-stats", response_model=RentDashboardStatsResponse)
def get_rent_dashboard_stats(
    month: Optional[str] = None,  # e.g. "2026-10" or "October 2026", defaults to current month
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Calculates dynamic summary cards from actual PostgreSQL records.
    Displays:
      - Total Active Residents
      - Total Rent Expected This Month
      - Total Rent Collected This Month
      - Total Outstanding Rent
      - Number of Residents Who Have Paid
      - Number of Residents With Pending Payments
      - Number of Overdue Payments
      - WhatsApp Reminders Sent & Failed
    """
    today = get_ist_today()
    if not month or month.upper() == "CURRENT":
        selected_period = today.strftime("%Y-%m")
        selected_month_name = today.strftime("%B %Y")
    elif "-" in month and len(month) == 7:
        selected_period = month
        try:
            parsed_dt = datetime.strptime(month, "%Y-%m")
            selected_month_name = parsed_dt.strftime("%B %Y")
        except ValueError:
            selected_month_name = month
    else:
        selected_period = month
        selected_month_name = month

    # Ensure rent records exist for current active allocations for this month
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.allocation_status == "ACTIVE"
    ).all()
    for alloc in active_allocations:
        ensure_rent_records_for_allocation(db, alloc, as_of_date=today)
    db.commit()

    # Active residents count
    total_active_residents = db.query(Resident).filter(
        Resident.resident_status == "ACTIVE"
    ).count()

    # Rent records for the selected month/period
    records_query = db.query(RentRecord).filter(
        or_(
            RentRecord.rent_period == selected_period,
            RentRecord.rent_month.ilike(f"%{selected_month_name}%")
        )
    )
    records = records_query.all()

    expected_rent = sum(r.rent_amount for r in records)
    collected_rent = sum(r.amount_paid for r in records)
    outstanding_rent = sum(r.balance_due for r in records)

    paid_residents = sum(1 for r in records if r.payment_status == "PAID")
    partially_paid_residents = sum(1 for r in records if r.payment_status == "PARTIALLY_PAID")
    pending_residents = sum(1 for r in records if r.payment_status == "PENDING")
    overdue_residents = sum(1 for r in records if r.payment_status == "OVERDUE")
    overdue_amount = sum(r.balance_due for r in records if r.payment_status == "OVERDUE")

    # WhatsApp statistics for this rent month
    reminders_sent = db.query(WhatsAppReminderLog).filter(
        or_(
            WhatsAppReminderLog.rent_month.ilike(f"%{selected_month_name}%"),
            WhatsAppReminderLog.rent_month == selected_period
        ),
        WhatsAppReminderLog.delivery_status.in_(["SENT", "DELIVERED", "CONFIRMED_SENT"])
    ).count()

    reminders_failed = db.query(WhatsAppReminderLog).filter(
        or_(
            WhatsAppReminderLog.rent_month.ilike(f"%{selected_month_name}%"),
            WhatsAppReminderLog.rent_month == selected_period
        ),
        WhatsAppReminderLog.delivery_status == "FAILED"
    ).count()

    # Rent settings for admin number
    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    admin_number = settings.admin_whatsapp_number if settings else "7893744206"

    # WhatsApp setup diagnostics
    whatsapp_status = get_whatsapp_setup_status(admin_whatsapp_number=admin_number)

    return {
        "month": selected_period,
        "month_name": selected_month_name,
        "total_active_residents": total_active_residents,
        "expected_rent": round(expected_rent, 2),
        "collected_rent": round(collected_rent, 2),
        "outstanding_rent": round(outstanding_rent, 2),
        "paid_residents": paid_residents,
        "partially_paid_residents": partially_paid_residents,
        "pending_residents": pending_residents,
        "overdue_residents": overdue_residents,
        "overdue_amount": round(overdue_amount, 2),
        "reminders_sent": reminders_sent,
        "reminders_failed": reminders_failed,
        "whatsapp_status": whatsapp_status
    }


@router.get("/records")
def get_rent_records(
    month: Optional[str] = None,          # "2026-10", "ALL"
    status: Optional[str] = None,         # "PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "ALL"
    room_number: Optional[str] = None,
    search: Optional[str] = None,
    due_date_from: Optional[str] = None,
    due_date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Searchable, filterable, and paginated table of resident rent payment records.
    """
    today = get_ist_today()

    query = db.query(RentRecord).join(Resident)

    # Filter by month/period
    if month and month.upper() != "ALL":
        query = query.filter(
            or_(
                RentRecord.rent_period == month,
                RentRecord.rent_month.ilike(f"%{month}%")
            )
        )

    # Filter by payment status
    if status and status.upper() != "ALL":
        query = query.filter(RentRecord.payment_status == status.upper())

    # Search filter (name, resident_code, phone)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Resident.full_name).like(s),
                func.lower(Resident.resident_code).like(s),
                Resident.phone.like(s)
            )
        )

    # Date range filters
    if due_date_from:
        query = query.filter(RentRecord.due_date >= due_date_from)
    if due_date_to:
        query = query.filter(RentRecord.due_date <= due_date_to)

    # Room number filter
    if room_number:
        matching_alloc_ids = [
            a_id for (a_id,) in db.query(BedAllocation.id).join(Room).filter(
                func.lower(Room.room_number) == room_number.strip().lower()
            ).all()
        ]
        query = query.filter(RentRecord.allocation_id.in_(matching_alloc_ids))

    total_count = query.count()

    from sqlalchemy.orm import joinedload
    records = query.options(
        joinedload(RentRecord.resident),
        joinedload(RentRecord.allocation).joinedload(BedAllocation.room),
        joinedload(RentRecord.allocation).joinedload(BedAllocation.bed),
        joinedload(RentRecord.payments),
        joinedload(RentRecord.reminders)
    ).order_by(
        desc(RentRecord.due_date),
        desc(RentRecord.created_at)
    ).offset((page - 1) * limit).limit(limit).all()

    enriched_records = [enrich_rent_record(r, today) for r in records]

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "records": enriched_records
    }


@router.get("/records/{record_id}", response_model=RentRecordResponse)
def get_rent_record_by_id(
    record_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches a single rent record with all payment transactions and reminder logs."""
    rec = db.query(RentRecord).filter(RentRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rent record not found.")

    today = get_ist_today()
    return enrich_rent_record(rec, today)


@router.post("/records/{record_id}/payments", response_model=RentRecordResponse)
def record_rent_payment(
    record_id: str,
    payment_in: PaymentCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin records a payment for a rent record.
    Enforces atomic transaction:
      1. Validates amount (> 0, <= balance_due).
      2. Saves payment transaction with payment method, date, reference, and admin ID.
      3. Updates amount_paid and recalculates balance_due.
      4. Sets status to PAID if balance is 0, or PARTIALLY_PAID if partial.
      5. Creates an audit log entry.
    """
    rec = db.query(RentRecord).filter(RentRecord.id == record_id).with_for_update().first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rent record not found.")

    if rec.balance_due <= 0:
        raise HTTPException(status_code=400, detail="This rent record is already fully paid. Balance is ₹0.")

    amount = round(float(payment_in.amount), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    if amount > rec.balance_due:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (₹{amount:,.2f}) cannot exceed remaining balance due (₹{rec.balance_due:,.2f})."
        )

    # 1. Insert Payment Transaction
    new_payment = PaymentTransaction(
        rent_record_id=rec.id,
        resident_id=rec.resident_id,
        amount=amount,
        payment_date=payment_in.payment_date,
        payment_method=payment_in.payment_method,
        transaction_reference=payment_in.transaction_reference.strip() if payment_in.transaction_reference else None,
        recorded_by_admin_id=current_admin.id,
        notes=payment_in.notes
    )
    db.add(new_payment)
    db.flush()

    # 2. Update RentRecord
    rec.amount_paid = round(float(rec.amount_paid) + amount, 2)
    rec.balance_due = max(0.0, round(float(rec.rent_amount) - float(rec.amount_paid), 2))
    rec.updated_at = datetime.utcnow()

    # 3. Determine new payment status
    today = get_ist_today()
    rec.payment_status = determine_payment_status(
        rent_amount=rec.rent_amount,
        amount_paid=rec.amount_paid,
        due_date_val=rec.due_date,
        as_of_date=today
    )

    # 4. Audit Log
    resident = rec.resident
    audit = AuditLog(
        actor_email=current_admin.email,
        action="RENT_PAYMENT_RECORDED",
        details=(
            f"Recorded payment of ₹{amount:,.2f} via {payment_in.payment_method} "
            f"for {resident.full_name} ({resident.resident_code}) - {rec.rent_month}. "
            f"Remaining balance: ₹{rec.balance_due:,.2f}. Status: {rec.payment_status}"
        )
    )
    db.add(audit)

    db.commit()
    db.refresh(rec)

    return enrich_rent_record(rec, today)


@router.post("/records/{record_id}/send-reminder")
@router.post("/records/{record_id}/prepare-reminder")
def send_rent_reminder_manually(
    record_id: str,
    force: bool = Query(False, description="Force send even if recently sent"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin triggers a regular WhatsApp rent reminder for a resident's rent record.
    1. Retrieves resident and rent details dynamically from PostgreSQL.
    2. Formats personal message and constructs WhatsApp click-to-chat URL (wa.me).
    3. Logs reminder attempt with status 'OPENED' and records outstanding amount.
    4. Allows admin to confirm sent message upon returning to application.
    """
    rec = db.query(RentRecord).filter(RentRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rent record not found.")

    resident = rec.resident
    if not resident:
        raise HTTPException(status_code=404, detail="Associated resident not found.")

    clean_phone = normalize_whatsapp_phone(resident.phone)
    if not clean_phone or len(clean_phone) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Resident '{resident.full_name}' does not have a valid mobile number ({resident.phone})."
        )

    alloc = rec.allocation
    room_number = alloc.room.room_number if alloc and alloc.room else "PG"
    bed_number = alloc.bed.bed_number if alloc and alloc.bed else "B1"

    due_d = parse_date_flexible(rec.due_date)
    due_date_fmt = format_date_display(due_d) if due_d else rec.due_date

    now_utc = datetime.utcnow()

    # Check recent log for cooldown if not forced
    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    cooldown_days = settings.reminder_frequency_days if settings else 1
    admin_phone = settings.admin_whatsapp_number if (settings and settings.admin_whatsapp_number) else "7893744206"

    if not force:
        recent_log = db.query(WhatsAppReminderLog).filter(
            WhatsAppReminderLog.rent_record_id == rec.id
        ).order_by(WhatsAppReminderLog.attempted_at.desc()).first()

        if recent_log and recent_log.delivery_status in ("CONFIRMED_SENT", "SENT", "DELIVERED"):
            days_since = safe_datetime_diff_days(now_utc, recent_log.attempted_at)
            if days_since < cooldown_days:
                last_time_str = recent_log.attempted_at.strftime('%d-%m-%Y %H:%M') if recent_log.attempted_at else "recently"
                raise HTTPException(
                    status_code=400,
                    detail=f"A reminder was already sent on {last_time_str}. Cooldown is {cooldown_days} day(s). Use 'force=true' to override."
                )

    msg_text = generate_rent_reminder_text(
        resident_name=resident.full_name,
        room_number=room_number,
        rent_month=rec.rent_month,
        monthly_rent=rec.rent_amount,
        amount_paid=rec.amount_paid,
        balance_due=rec.balance_due,
        due_date_formatted=due_date_fmt,
        admin_whatsapp_number=admin_phone
    )

    whatsapp_url = build_whatsapp_chat_url(
        recipient_phone=clean_phone,
        message_text=msg_text
    )

    # Record log as OPENED with outstanding balance
    log_entry = WhatsAppReminderLog(
        resident_id=resident.id,
        rent_record_id=rec.id,
        phone_number=resident.phone,
        rent_month=rec.rent_month,
        outstanding_amount=rec.balance_due,
        message_text=msg_text,
        template_name="regular_whatsapp_click_to_chat",
        provider_message_id=None,
        delivery_status="OPENED",
        error_details="WhatsApp click-to-chat link prepared and opened. Waiting for admin confirmation of send.",
        attempted_at=now_utc,
        delivery_timestamp=None
    )
    db.add(log_entry)

    # Audit log
    audit = AuditLog(
        actor_email=current_admin.email,
        action="WHATSAPP_REMINDER_OPENED",
        details=f"Admin initiated regular WhatsApp reminder for {resident.full_name} ({resident.phone}) - Outstanding: ₹{rec.balance_due:,.2f}"
    )
    db.add(audit)

    db.commit()
    db.refresh(log_entry)

    return {
        "success": True,
        "whatsapp_url": whatsapp_url,
        "message_text": msg_text,
        "log_id": log_entry.id,
        "delivery_status": "OPENED",
        "recipient": resident.full_name,
        "phone": resident.phone,
        "room_number": room_number,
        "rent_month": rec.rent_month,
        "due_date": due_date_fmt,
        "outstanding_amount": rec.balance_due,
        "admin_whatsapp_number": admin_phone,
        "attempted_at": now_utc
    }


@router.post("/reminders/{log_id}/confirm-sent")
def confirm_whatsapp_reminder_sent(
    log_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Records explicit admin confirmation that the WhatsApp reminder was sent to the resident.
    Updates reminder status to CONFIRMED_SENT and increments reminder count on the rent record.
    """
    log = db.query(WhatsAppReminderLog).filter(WhatsAppReminderLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Reminder log not found.")

    now_utc = datetime.utcnow()
    log.delivery_status = "CONFIRMED_SENT"
    log.delivery_timestamp = now_utc
    log.error_details = "Admin confirmed message was sent via regular WhatsApp."

    if log.rent_record:
        log.rent_record.last_reminder_sent_at = now_utc
        log.rent_record.reminder_count = (log.rent_record.reminder_count or 0) + 1

    resident_name = log.resident.full_name if log.resident else "Resident"
    audit = AuditLog(
        actor_email=current_admin.email,
        action="WHATSAPP_REMINDER_CONFIRMED_SENT",
        details=f"Admin confirmed WhatsApp reminder sent to {resident_name} ({log.phone_number}) for {log.rent_month}"
    )
    db.add(audit)
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "log_id": log.id,
        "delivery_status": "CONFIRMED_SENT",
        "delivery_timestamp": log.delivery_timestamp,
        "message": f"WhatsApp reminder for {resident_name} confirmed as sent."
    }


@router.get("/reminders/logs")
def get_whatsapp_reminder_logs(
    status: Optional[str] = None,       # QUEUED, OPENED, CONFIRMED_SENT, SENT, DELIVERED, FAILED, ALL
    search: Optional[str] = None,
    month: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns paginated WhatsApp reminder delivery history."""
    query = db.query(WhatsAppReminderLog).join(Resident)

    if status and status.upper() != "ALL":
        query = query.filter(WhatsAppReminderLog.delivery_status == status.upper())

    if month and month.upper() != "ALL":
        query = query.filter(WhatsAppReminderLog.rent_month.ilike(f"%{month}%"))

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Resident.full_name).like(s),
                func.lower(Resident.resident_code).like(s),
                WhatsAppReminderLog.phone_number.like(s)
            )
        )

    total = query.count()
    logs = query.order_by(
        desc(WhatsAppReminderLog.attempted_at)
    ).offset((page - 1) * limit).limit(limit).all()

    results = []
    for log in logs:
        resident = log.resident
        out_amount = log.outstanding_amount
        if out_amount is None and log.rent_record:
            out_amount = log.rent_record.balance_due

        results.append({
            "id": log.id,
            "resident_id": log.resident_id,
            "resident_code": resident.resident_code if resident else None,
            "resident_name": resident.full_name if resident else "Unknown",
            "rent_record_id": log.rent_record_id,
            "phone_number": log.phone_number,
            "rent_month": log.rent_month,
            "outstanding_amount": out_amount,
            "message_text": log.message_text,
            "template_name": log.template_name,
            "provider_message_id": log.provider_message_id,
            "delivery_status": log.delivery_status,
            "attempted_at": log.attempted_at,
            "delivery_timestamp": log.delivery_timestamp,
            "error_details": log.error_details,
            "retry_count": log.retry_count or 0
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1,
        "logs": results
    }


@router.post("/reminders/{log_id}/retry")
def retry_failed_whatsapp_reminder(
    log_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retries a WhatsApp reminder attempt via regular WhatsApp click-to-chat.
    Re-generates updated message text and click-to-chat URL, sets status to OPENED,
    and returns the URL for the admin to open and send.
    """
    log = db.query(WhatsAppReminderLog).filter(WhatsAppReminderLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Reminder log not found.")

    resident = log.resident
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    admin_phone = settings.admin_whatsapp_number if (settings and settings.admin_whatsapp_number) else "7893744206"

    rec = log.rent_record
    if rec:
        alloc = rec.allocation
        room_number = alloc.room.room_number if alloc and alloc.room else "PG"
        due_d = parse_date_flexible(rec.due_date)
        due_date_fmt = format_date_display(due_d) if due_d else rec.due_date
        msg_text = generate_rent_reminder_text(
            resident_name=resident.full_name,
            room_number=room_number,
            rent_month=rec.rent_month,
            monthly_rent=rec.rent_amount,
            amount_paid=rec.amount_paid,
            balance_due=rec.balance_due,
            due_date_formatted=due_date_fmt,
            admin_whatsapp_number=admin_phone
        )
        log.outstanding_amount = rec.balance_due
        log.message_text = msg_text
    else:
        msg_text = log.message_text

    whatsapp_url = build_whatsapp_chat_url(log.phone_number, msg_text)
    now_utc = datetime.utcnow()
    log.delivery_status = "OPENED"
    log.retry_count = (log.retry_count or 0) + 1
    log.attempted_at = now_utc
    log.error_details = "Retry initiated via WhatsApp click-to-chat. Awaiting admin confirmation."
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "whatsapp_url": whatsapp_url,
        "message_text": msg_text,
        "log_id": log.id,
        "delivery_status": "OPENED",
        "retry_count": log.retry_count,
        "recipient": resident.full_name,
        "phone": log.phone_number
    }


@router.post("/scheduler/run-now")
def trigger_rent_scheduler_run_now(
    allow_overdue: bool = Query(True, description="Also evaluate overdue unpaid residents"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    On-demand API to manually trigger the daily rent reminder job.
    Synchronizes records and attempts automated reminders immediately.
    """
    report = process_daily_rent_and_reminders(
        db,
        force_date=get_ist_today(),
        allow_overdue_reminders=allow_overdue
    )
    return {
        "message": "Automated PG rent reminder job executed successfully.",
        "report": report
    }


@router.post("/sync-records")
def sync_monthly_rent_records(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Generates and synchronizes monthly rent records for all active PG residents.
    Idempotent: never duplicates records for already created periods.
    """
    today = get_ist_today()
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.allocation_status == "ACTIVE"
    ).all()

    total_created = 0
    for alloc in active_allocations:
        created = ensure_rent_records_for_allocation(db, alloc, as_of_date=today)
        total_created += created

    db.commit()
    return {
        "message": f"Synchronized rent records. {total_created} new record(s) generated.",
        "active_allocations_count": len(active_allocations),
        "new_records_created": total_created
    }


@router.get("/whatsapp/config")
def get_whatsapp_config_diagnostics(
    current_admin: User = Depends(get_current_admin)
):
    """Returns WhatsApp Business Cloud API diagnostic status."""
    return get_whatsapp_setup_status()


@router.get("/whatsapp/webhook")
def verify_whatsapp_webhook(
    request: Request
):
    """
    Meta WhatsApp Business Cloud API Webhook Verification.
    Meta sends: hub.mode, hub.challenge, hub.verify_token.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    cfg = get_whatsapp_env_config()
    expected_token = cfg["webhook_verify_token"]

    if mode == "subscribe" and token == expected_token:
        return Response(content=challenge, media_type="text/plain")

    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@router.post("/whatsapp/webhook")
async def receive_whatsapp_webhook_event(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives incoming WhatsApp Cloud API delivery status events (sent, delivered, read, failed).
    Updates whatsapp_reminder_logs delivery status accordingly.
    """
    try:
        body = await request.json()
        entry_list = body.get("entry", [])
        for entry in entry_list:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                for st in statuses:
                    msg_id = st.get("id")
                    status_name = st.get("status", "").upper()  # SENT, DELIVERED, READ, FAILED
                    if msg_id:
                        log = db.query(WhatsAppReminderLog).filter(
                            WhatsAppReminderLog.provider_message_id == msg_id
                        ).first()
                        if log:
                            log.delivery_status = status_name
                            if status_name in ("DELIVERED", "READ"):
                                log.delivery_timestamp = datetime.utcnow()
                            if status_name == "FAILED":
                                errors = st.get("errors", [])
                                if errors:
                                    log.error_details = errors[0].get("title", "Delivery failed")
                            db.commit()
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@router.get("/settings", response_model=RentSettingsResponse)
def get_rent_settings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieves current automated rent reminder settings."""
    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    if not settings:
        settings = RentSettings(id=1, reminder_frequency_days=1, auto_send_on_due_date=True, send_hour_ist=9)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=RentSettingsResponse)
def update_rent_settings(
    settings_in: RentSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Updates automated rent reminder policy and WhatsApp template name."""
    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    if not settings:
        settings = RentSettings(id=1)
        db.add(settings)

    update_data = settings_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(settings, field, val)

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings
