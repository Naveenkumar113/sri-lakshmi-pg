import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from ..database.connection import SessionLocal
from ..models.models import Resident, BedAllocation, Room, RoomBed, RentRecord, WhatsAppReminderLog, RentSettings
from ..utils.rent_calculator import (
    get_ist_today, get_ist_now, calculate_billing_schedule_for_resident,
    format_date_display, parse_date_flexible, determine_payment_status,
    safe_datetime_diff_days, KOLKATA_TZ
)
from ..utils.whatsapp_service import (
    generate_rent_reminder_text, send_whatsapp_message, normalize_whatsapp_phone
)

logger = logging.getLogger("rent_scheduler")

_scheduler: Optional[BackgroundScheduler] = None

def ensure_rent_records_for_allocation(
    db: Session,
    alloc: BedAllocation,
    as_of_date: Optional[date] = None
) -> int:
    """
    Ensures that rent records exist for an active allocation up to the current billing period.
    Returns the count of newly created records.
    Idempotent: will never duplicate existing records for the same (resident_id, rent_period).
    """
    today = as_of_date or get_ist_today()
    resident = alloc.resident
    if not resident or resident.resident_status != "ACTIVE":
        return 0

    monthly_rent = (
        alloc.monthly_rent or
        (alloc.room.monthly_rent_per_bed if alloc.room and alloc.room.monthly_rent_per_bed else (alloc.room.monthly_rent if alloc.room else 6000.0))
    )

    schedule = calculate_billing_schedule_for_resident(
        move_in_date_val=alloc.move_in_date,
        monthly_rent=monthly_rent,
        configured_billing_day=alloc.billing_day,
        move_out_date_val=alloc.move_out_date,
        max_months=12,
        as_of_date=today
    )

    created_count = 0
    for item in schedule:
        due_d = parse_date_flexible(item["due_date"])
        # Generate records for periods up to current month or due within next 30 days
        if due_d and due_d > today + timedelta(days=31):
            continue

        existing = db.query(RentRecord).filter(
            RentRecord.resident_id == resident.id,
            RentRecord.rent_period == item["rent_period"]
        ).first()

        if not existing:
            # Determine payment status
            status = determine_payment_status(
                rent_amount=item["rent_amount"],
                amount_paid=0.0,
                due_date_val=due_d,
                as_of_date=today
            )
            new_record = RentRecord(
                resident_id=resident.id,
                allocation_id=alloc.id,
                rent_month=item["rent_month"],
                rent_period=item["rent_period"],
                due_date=item["due_date"],
                billing_cycle_start=item["billing_cycle_start"],
                billing_cycle_end=item["billing_cycle_end"],
                rent_amount=item["rent_amount"],
                amount_paid=0.0,
                balance_due=item["rent_amount"],
                payment_status=status
            )
            db.add(new_record)
            created_count += 1
        else:
            # Update overdue status if unpaid and past due
            if existing.payment_status in ("PENDING", "PARTIALLY_PAID") and existing.balance_due > 0:
                if due_d and today > due_d:
                    existing.payment_status = "OVERDUE"

    if created_count > 0:
        db.flush()

    return created_count

def process_daily_rent_and_reminders(
    db: Session,
    force_date: Optional[date] = None,
    allow_overdue_reminders: bool = False
) -> Dict[str, Any]:
    """
    Primary idempotent task executed daily by the scheduler:
    1. Identifies all active allocations & residents.
    2. Synchronizes / generates monthly rent records.
    3. Finds residents with rent due today (or overdue if allowed).
    4. Verifies no duplicate reminder was already sent for that billing period.
    5. Dispatches WhatsApp reminder via Meta WhatsApp Cloud API.
    6. Stores delivery logs and status in PostgreSQL.
    """
    today = force_date or get_ist_today()
    today_str = today.strftime("%Y-%m-%d")

    settings = db.query(RentSettings).filter(RentSettings.id == 1).first()
    if not settings:
        settings = RentSettings(id=1, reminder_frequency_days=1, auto_send_on_due_date=True, send_hour_ist=9)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    cooldown_days = settings.reminder_frequency_days or 1

    # 1. Fetch all ACTIVE bed allocations
    active_allocations = db.query(BedAllocation).filter(
        BedAllocation.allocation_status == "ACTIVE"
    ).all()

    total_records_created = 0
    for alloc in active_allocations:
        created = ensure_rent_records_for_allocation(db, alloc, as_of_date=today)
        total_records_created += created

    db.commit()

    # 2. Check for records due today or overdue
    query = db.query(RentRecord).join(Resident).filter(
        Resident.resident_status == "ACTIVE",
        RentRecord.balance_due > 0
    )

    if allow_overdue_reminders:
        # Check due today OR overdue
        records_to_evaluate = query.filter(
            (RentRecord.due_date == today_str) | (RentRecord.payment_status == "OVERDUE")
        ).all()
    else:
        # Strictly due today
        records_to_evaluate = query.filter(RentRecord.due_date == today_str).all()

    reminders_sent = 0
    reminders_failed = 0
    reminders_skipped_already_sent = 0
    execution_logs = []

    for rec in records_to_evaluate:
        resident = rec.resident
        alloc = rec.allocation

        # Verify active allocation & room details
        room_number = alloc.room.room_number if alloc and alloc.room else (
            resident.allocations[0].room.room_number if resident.allocations and resident.allocations[0].room else "PG"
        )
        bed_number = alloc.bed.bed_number if alloc and alloc.bed else (
            resident.allocations[0].bed.bed_number if resident.allocations and resident.allocations[0].bed else "B1"
        )

        due_date_obj = parse_date_flexible(rec.due_date)
        due_date_fmt = format_date_display(due_date_obj) if due_date_obj else rec.due_date

        # RULE: Prevent duplicate reminders for the same rent period
        # Check if reminder was already sent successfully for this rent record
        recent_log = db.query(WhatsAppReminderLog).filter(
            WhatsAppReminderLog.rent_record_id == rec.id
        ).order_by(WhatsAppReminderLog.attempted_at.desc()).first()

        now_utc = datetime.utcnow()

        if recent_log:
            if recent_log.delivery_status in ("SENT", "DELIVERED", "CONFIRMED_SENT"):
                # If already sent within cooldown days, skip to avoid duplicates
                days_since_last = safe_datetime_diff_days(now_utc, recent_log.attempted_at)
                if days_since_last < cooldown_days:
                    reminders_skipped_already_sent += 1
                    execution_logs.append({
                        "resident": resident.full_name,
                        "code": resident.resident_code,
                        "action": "SKIPPED",
                        "reason": f"Reminder already sent on {recent_log.attempted_at.strftime('%Y-%m-%d %H:%M')} (Cooldown: {cooldown_days} day)"
                    })
                    continue

        # Prepare message text matching current template
        admin_phone = settings.admin_whatsapp_number or "7893744206"
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

        template_params = [
            resident.full_name,
            resident.resident_code,
            room_number,
            bed_number,
            rec.rent_month,
            f"₹{int(rec.balance_due):,}",
            due_date_fmt
        ]

        # Dispatch WhatsApp message
        send_result = send_whatsapp_message(
            phone_number=resident.phone,
            message_text=msg_text,
            template_name=settings.whatsapp_template_name,
            template_params=template_params
        )

        delivery_status = send_result.get("delivery_status", "FAILED")
        provider_msg_id = send_result.get("provider_message_id")
        err_details = send_result.get("error_details")

        # Log attempt in database
        log_entry = WhatsAppReminderLog(
            resident_id=resident.id,
            rent_record_id=rec.id,
            phone_number=resident.phone,
            rent_month=rec.rent_month,
            message_text=msg_text,
            template_name=settings.whatsapp_template_name,
            provider_message_id=provider_msg_id,
            delivery_status=delivery_status,
            error_details=err_details,
            attempted_at=now_utc,
            delivery_timestamp=now_utc if delivery_status in ("SENT", "DELIVERED") else None
        )
        db.add(log_entry)

        if delivery_status in ("SENT", "DELIVERED"):
            reminders_sent += 1
            rec.last_reminder_sent_at = now_utc
            rec.reminder_count = (rec.reminder_count or 0) + 1
            execution_logs.append({
                "resident": resident.full_name,
                "code": resident.resident_code,
                "action": "SENT",
                "phone": resident.phone,
                "msg_id": provider_msg_id
            })
        else:
            reminders_failed += 1
            execution_logs.append({
                "resident": resident.full_name,
                "code": resident.resident_code,
                "action": "FAILED",
                "phone": resident.phone,
                "error": err_details
            })

    db.commit()

    return {
        "execution_date": today_str,
        "active_allocations_checked": len(active_allocations),
        "records_created": total_records_created,
        "reminders_evaluated": len(records_to_evaluate),
        "reminders_sent": reminders_sent,
        "reminders_failed": reminders_failed,
        "reminders_skipped_already_sent": reminders_skipped_already_sent,
        "logs": execution_logs
    }

def scheduled_daily_rent_reminder_job():
    """Wrapper function invoked automatically by APScheduler every morning."""
    logger.info("Executing scheduled daily PG rent reminder job...")
    db = SessionLocal()
    try:
        report = process_daily_rent_and_reminders(db)
        logger.info(f"Daily rent reminder job completed: {report}")
    except Exception as exc:
        logger.error(f"Error in scheduled daily rent reminder job: {exc}", exc_info=True)
    finally:
        db.close()

def start_rent_scheduler():
    """Initializes and starts the production background scheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone=KOLKATA_TZ)
    # Schedule to run every day at 09:00 AM IST
    _scheduler.add_job(
        scheduled_daily_rent_reminder_job,
        trigger=CronTrigger(hour=9, minute=0, timezone=KOLKATA_TZ),
        id="daily_pg_rent_reminder_job",
        name="Sri Lakshmi PG Daily Rent Reminder Dispatcher",
        replace_existing=True
    )
    _scheduler.start()
    logger.info("PG Automated Rent Scheduler started successfully (Daily at 09:00 AM IST).")

def stop_rent_scheduler():
    """Gracefully shuts down the background scheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("PG Automated Rent Scheduler stopped.")
