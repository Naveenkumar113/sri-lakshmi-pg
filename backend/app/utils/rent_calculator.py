import calendar
from datetime import datetime, date, timedelta
from typing import Optional, Tuple, List, Dict
try:
    from zoneinfo import ZoneInfo
    KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    from datetime import timezone
    KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30))

def get_ist_now() -> datetime:
    """Returns the current datetime in Asia/Kolkata timezone."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Asia/Kolkata"))
    except Exception:
        from datetime import timezone
        return datetime.now(timezone(timedelta(hours=5, minutes=30)))


def get_ist_today() -> date:
    """Returns today's date in Asia/Kolkata timezone."""
    return get_ist_now().date()

def safe_datetime_diff_days(dt1: datetime, dt2: Optional[datetime]) -> int:
    """
    Safely calculates difference in days between two datetimes,
    handling offset-naive and offset-aware datetimes without raising TypeError.
    """
    if not dt1 or not dt2:
        return 999
    d1 = dt1.replace(tzinfo=None) if getattr(dt1, "tzinfo", None) else dt1
    d2 = dt2.replace(tzinfo=None) if getattr(dt2, "tzinfo", None) else dt2
    return abs((d1 - d2).days)

def parse_date_flexible(date_val: any) -> Optional[date]:
    """
    Parses date strings flexibly:
    Supports 'YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD', 'DD/MM/YYYY', or datetime.date/datetime objects.
    """
    if date_val is None:
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val

    s = str(date_val).strip()
    if not s:
        return None

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    # Try ISO format
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None

def calculate_valid_due_date(year: int, month: int, target_day: int) -> date:
    """
    Calculates a valid due date for a given year and month, safely handling month-end dates.
    Example:
      If target_day is 31 and month is February (28/29 days), returns Feb 28 (or 29 in leap year).
      If target_day is 31 and month is April (30 days), returns April 30.
    """
    days_in_month = calendar.monthrange(year, month)[1]
    safe_day = min(target_day, days_in_month)
    return date(year, month, safe_day)

def format_date_display(dt: date) -> str:
    """Formats a date as 'DD-MM-YYYY' (e.g. '09-10-2026')."""
    return dt.strftime("%d-%m-%Y")

def format_currency_inr(amount: float) -> str:
    """Formats a number as Indian Rupee string, e.g. '₹6,000'."""
    try:
        val = float(amount)
        if val.is_integer():
            return f"₹{int(val):,}"
        return f"₹{val:,.2f}"
    except Exception:
        return f"₹{amount}"

def get_period_strings(due_d: date) -> Tuple[str, str]:
    """
    Returns (rent_period, rent_month):
    e.g. for date(2026, 10, 9) -> ("2026-10", "October 2026")
    """
    rent_period = due_d.strftime("%Y-%m")
    rent_month = due_d.strftime("%B %Y")
    return rent_period, rent_month

def calculate_billing_schedule_for_resident(
    move_in_date_val: any,
    monthly_rent: float,
    configured_billing_day: Optional[int] = None,
    move_out_date_val: Optional[any] = None,
    max_months: int = 12,
    as_of_date: Optional[date] = None
) -> List[Dict]:
    """
    Calculates the sequence of monthly rent billing periods starting from move-in date.

    Example:
      Move-in date: 09-09-2026
      Configured billing day: None (defaults to 9)
      Due dates:
        1. 09-10-2026 (Rent Month: October 2026, Cycle: 2026-09-09 to 2026-10-08)
        2. 09-11-2026 (Rent Month: November 2026, Cycle: 2026-10-09 to 2026-11-08)
        3. 09-12-2026 (Rent Month: December 2026, Cycle: 2026-11-09 to 2026-12-08)

    Stops generating if move_out_date has passed for that period.
    Handles month-end dates (e.g. 31st -> 28/29 Feb, 30 Apr) correctly.
    """
    move_in = parse_date_flexible(move_in_date_val)
    if not move_in:
        return []

    move_out = parse_date_flexible(move_out_date_val)
    today = as_of_date or get_ist_today()

    # Determine billing day
    billing_day = configured_billing_day if configured_billing_day and 1 <= configured_billing_day <= 31 else move_in.day

    schedule = []
    
    # First due date is 1 month after move-in
    # If move-in is 2026-09-09:
    # Month 1 of rent: due date in October 2026
    current_year = move_in.year
    current_month = move_in.month

    prev_cycle_start = move_in

    for i in range(1, max_months + 1):
        # Advance by 1 month for the due date
        target_month = current_month + i
        target_year = current_year + (target_month - 1) // 12
        target_month = (target_month - 1) % 12 + 1

        due_date_obj = calculate_valid_due_date(target_year, target_month, billing_day)

        # If resident checked out before this due date, stop generating
        if move_out and due_date_obj > move_out:
            break

        # Billing cycle: from previous due date (or move-in date) to 1 day before current due date
        cycle_start = prev_cycle_start
        cycle_end = due_date_obj - timedelta(days=1)
        prev_cycle_start = due_date_obj

        rent_period, rent_month = get_period_strings(due_date_obj)

        schedule.append({
            "rent_month": rent_month,
            "rent_period": rent_period,
            "due_date": due_date_obj.strftime("%Y-%m-%d"),
            "due_date_formatted": format_date_display(due_date_obj),
            "billing_cycle_start": cycle_start.strftime("%Y-%m-%d"),
            "billing_cycle_end": cycle_end.strftime("%Y-%m-%d"),
            "rent_amount": round(float(monthly_rent), 2),
            "is_due_today": due_date_obj == today,
            "is_past_due": due_date_obj < today,
            "days_overdue": max(0, (today - due_date_obj).days) if today > due_date_obj else 0
        })

    return schedule

def determine_payment_status(
    rent_amount: float,
    amount_paid: float,
    due_date_val: any,
    as_of_date: Optional[date] = None
) -> str:
    """
    Determines status:
      - PAID: balance_due <= 0
      - PARTIALLY_PAID: 0 < amount_paid < rent_amount
      - OVERDUE: balance_due > 0 and today > due_date
      - PENDING: balance_due > 0 and today <= due_date
    """
    today = as_of_date or get_ist_today()
    due_d = parse_date_flexible(due_date_val)

    balance = max(0.0, round(float(rent_amount) - float(amount_paid), 2))
    paid = round(float(amount_paid), 2)

    if balance <= 0.001:
        return "PAID"
    
    if paid > 0:
        return "PARTIALLY_PAID"

    if due_d and today > due_d:
        return "OVERDUE"

    return "PENDING"
