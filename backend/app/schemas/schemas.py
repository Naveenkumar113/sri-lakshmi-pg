from datetime import datetime
from typing import Optional, List
import re
from pydantic import BaseModel, EmailStr, Field, field_validator

# Dynamic Sharing Types and Capacity Mappings (1 to 20 persons)
CAPACITY_WORDS = {
    1: "Single",
    2: "Double",
    3: "Triple",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
    10: "Ten",
    11: "Eleven",
    12: "Twelve",
    13: "Thirteen",
    14: "Fourteen",
    15: "Fifteen",
    16: "Sixteen",
    17: "Seventeen",
    18: "Eighteen",
    19: "Nineteen",
    20: "Twenty",
}

def capacity_to_sharing_type(capacity: int) -> str:
    """Converts a numeric bed capacity (e.g. 7) to human-readable sharing type ('Seven Sharing')."""
    cap = max(1, min(20, int(capacity)))
    word = CAPACITY_WORDS.get(cap, str(cap))
    return f"{word} Sharing"

WORD_TO_CAPACITY = {v.lower(): k for k, v in CAPACITY_WORDS.items()}
WORD_TO_CAPACITY.update({
    "single": 1,
    "double": 2,
    "triple": 3,
    "four": 4,
    "four_sharing": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
})

def parse_sharing_capacity(v: any, default: int = 2) -> int:
    """Parses capacity from an integer, float string, or sharing type name like 'Seven Sharing'."""
    if v is None:
        return default
    if isinstance(v, int):
        return max(1, min(20, v))
    s = str(v).strip().lower()
    m = re.match(r'^(\d+)', s)
    if m:
        num = int(m.group(1))
        return max(1, min(20, num))
    for word, num in WORD_TO_CAPACITY.items():
        if word in s:
            return num
    return default

VALID_SHARING_TYPES = [
    capacity_to_sharing_type(i) for i in range(1, 21)
] + ["Single Sharing", "Double Sharing", "Triple Sharing", "Four Sharing"]
VALID_SHARING_TYPES = list(dict.fromkeys(VALID_SHARING_TYPES))

SHARING_CAPACITY_MAP = {
    capacity_to_sharing_type(i): i for i in range(1, 21)
}
SHARING_CAPACITY_MAP.update({
    "Single Sharing": 1,
    "Double Sharing": 2,
    "Triple Sharing": 3,
    "Four Sharing": 4,
    "Five Sharing": 5,
    "Six Sharing": 6,
    "Seven Sharing": 7,
    "Eight Sharing": 8,
    "Nine Sharing": 9,
    "Ten Sharing": 10,
})

LEGACY_SHARING_MAP = {
    "SINGLE": "Single Sharing",
    "DOUBLE": "Double Sharing",
    "TRIPLE": "Triple Sharing",
    "FOUR_SHARING": "Four Sharing",
    "Single": "Single Sharing",
    "Double": "Double Sharing",
    "Triple": "Triple Sharing",
    "Four": "Four Sharing",
}


def validate_indian_mobile(v: Optional[str], field_name: str = "Phone number") -> Optional[str]:
    """
    Enforces exactly 10 numeric digits (0-9) for Indian mobile numbers.
    Rejects alphabetic chars, special chars, spaces, and length != 10.
    """
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        raise ValueError(f"{field_name} cannot be empty.")
    if not s.isdigit():
        raise ValueError(f"{field_name} must contain numeric digits (0–9) only. Alphabetic characters, special characters, and spaces are rejected.")
    if len(s) != 10:
        raise ValueError(f"{field_name} must be exactly 10 digits for Indian mobile numbers (received {len(s)} digits).")
    return s

# AUTH & USER SCHEMAS
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=10)
    password: str = Field(..., min_length=6)
    occupation: Optional[str] = None
    company_or_college: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        return validate_indian_mobile(v, "Phone number")

    @field_validator('emergency_contact', mode='before')
    @classmethod
    def validate_emergency(cls, v):
        if not v or not str(v).strip():
            return None
        return validate_indian_mobile(v, "Emergency contact")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    role: str
    occupation: Optional[str] = None
    company_or_college: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    company_or_college: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is None or not str(v).strip():
            return v
        return validate_indian_mobile(v, "Phone number")

    @field_validator('emergency_contact', mode='before')
    @classmethod
    def validate_emergency(cls, v):
        if not v or not str(v).strip():
            return None
        return validate_indian_mobile(v, "Emergency contact")

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None

# ROOM SCHEMAS
class RoomBedResponse(BaseModel):
    id: str
    bed_number: str
    bed_status: Optional[str] = "AVAILABLE"
    is_occupied: bool
    current_occupant_name: Optional[str] = None
    current_occupant_id: Optional[str] = None
    current_resident_code: Optional[str] = None
    current_allocation_id: Optional[str] = None
    move_in_date: Optional[str] = None

    class Config:
        from_attributes = True

class BedCreate(BaseModel):
    bed_number: str

class BedUpdate(BaseModel):
    bed_number: Optional[str] = None
    bed_status: Optional[str] = None

class RoomBase(BaseModel):
    room_number: str
    room_type: str = "Non-AC"  # AC or Non-AC
    capacity: int = Field(2, ge=1, le=20, description="Sharing capacity / Total beds (1 to 20 persons)")
    sharing_type: Optional[str] = "Double Sharing"
    is_ac: bool = False
    floor: int = 1
    available_beds: Optional[int] = None
    monthly_rent: Optional[float] = None
    monthly_rent_per_bed: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    images: Optional[str] = None
    status: str = "AVAILABLE"

    @field_validator('capacity', mode='before')
    @classmethod
    def validate_capacity_val(cls, v):
        if v is None:
            return 2
        if isinstance(v, bool):
            raise ValueError("Sharing capacity must be a positive whole integer between 1 and 20.")
        if isinstance(v, str):
            clean_str = v.strip()
            if not clean_str.isdigit():
                raise ValueError("Sharing capacity must be a positive whole number (digits only, no decimals or letters).")
            val = int(clean_str)
        elif isinstance(v, (int, float)):
            if isinstance(v, float) and not v.is_integer():
                raise ValueError("Sharing capacity cannot contain decimals. Must be a positive whole number.")
            val = int(v)
        else:
            raise ValueError("Sharing capacity must be a valid positive whole number.")

        if val < 1:
            raise ValueError("Sharing capacity must be a positive whole number (minimum 1 person). Zero and negative numbers are rejected.")
        if val > 20:
            raise ValueError("Sharing capacity cannot exceed the maximum limit of 20 beds per room.")
        return val

    @field_validator('sharing_type', mode='before')
    @classmethod
    def validate_sharing_type(cls, v):
        if not v or not str(v).strip():
            return None
        v_str = str(v).strip()
        if v_str in LEGACY_SHARING_MAP:
            v_str = LEGACY_SHARING_MAP[v_str]
        return v_str

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    sharing_type: Optional[str] = None
    is_ac: Optional[bool] = None
    floor: Optional[int] = None
    capacity: Optional[int] = Field(None, ge=1, le=20)
    available_beds: Optional[int] = None
    monthly_rent: Optional[float] = None
    monthly_rent_per_bed: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    images: Optional[str] = None
    status: Optional[str] = None

    @field_validator('capacity', mode='before')
    @classmethod
    def validate_capacity_update(cls, v):
        if v is None:
            return None
        if isinstance(v, bool):
            raise ValueError("Sharing capacity must be a positive whole integer between 1 and 20.")
        if isinstance(v, str):
            clean_str = v.strip()
            if not clean_str.isdigit():
                raise ValueError("Sharing capacity must be a positive whole number (digits only, no decimals or letters).")
            val = int(clean_str)
        elif isinstance(v, (int, float)):
            if isinstance(v, float) and not v.is_integer():
                raise ValueError("Sharing capacity cannot contain decimals. Must be a positive whole number.")
            val = int(v)
        else:
            raise ValueError("Sharing capacity must be a valid positive whole number.")

        if val < 1:
            raise ValueError("Sharing capacity must be a positive whole number (minimum 1 person). Zero and negative numbers are rejected.")
        if val > 20:
            raise ValueError("Sharing capacity cannot exceed the maximum limit of 20 beds per room.")
        return val

    @field_validator('sharing_type', mode='before')
    @classmethod
    def validate_sharing_type(cls, v):
        if not v or not str(v).strip():
            return None
        v_str = str(v).strip()
        if v_str in LEGACY_SHARING_MAP:
            v_str = LEGACY_SHARING_MAP[v_str]
        return v_str

class RoomResponse(RoomBase):
    id: str
    created_at: datetime
    occupied_beds: Optional[int] = None
    occupancy_percentage: Optional[float] = None
    beds: List[RoomBedResponse] = []

    class Config:
        from_attributes = True

# RESIDENT & BED ALLOCATION SCHEMAS
class ResidentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=10)
    email: Optional[EmailStr] = None
    occupation: Optional[str] = None
    company_or_college: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    user_id: Optional[str] = None  # Link to existing user if available
    room_id: Optional[str] = None  # Optional initial room allocation
    bed_id: Optional[str] = None   # Optional initial bed allocation
    move_in_date: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        return validate_indian_mobile(v, "Phone number")

    @field_validator('emergency_contact', mode='before')
    @classmethod
    def validate_emergency(cls, v):
        if not v or not str(v).strip():
            return None
        return validate_indian_mobile(v, "Emergency contact")

class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    occupation: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    resident_status: Optional[str] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is None or not str(v).strip():
            return v
        return validate_indian_mobile(v, "Phone number")

    @field_validator('emergency_contact', mode='before')
    @classmethod
    def validate_emergency(cls, v):
        if not v or not str(v).strip():
            return None
        return validate_indian_mobile(v, "Emergency contact")

class BedAllocationCreate(BaseModel):
    resident_id: str
    room_id: str
    bed_id: str
    move_in_date: str
    notes: Optional[str] = None

class BedAllocationTransfer(BaseModel):
    new_room_id: str
    new_bed_id: str
    transfer_date: str
    notes: Optional[str] = None

class BedAllocationCheckout(BaseModel):
    checkout_date: str
    notes: Optional[str] = None

class BedAllocationResponse(BaseModel):
    id: str
    resident_id: str
    bed_id: str
    room_id: str
    booking_id: Optional[str] = None
    move_in_date: str
    move_out_date: Optional[str] = None
    allocation_status: str
    notes: Optional[str] = None
    created_at: datetime
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    is_ac: Optional[bool] = None
    room_type: Optional[str] = None
    monthly_rent: Optional[float] = None

    class Config:
        from_attributes = True

class ResidentHistoryResponse(BaseModel):
    id: int
    resident_id: str
    event_type: str
    room_id: Optional[str] = None
    bed_id: Optional[str] = None
    from_room_id: Optional[str] = None
    from_bed_id: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    from_room_number: Optional[str] = None
    from_bed_number: Optional[str] = None
    details: str
    actor_admin_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ResidentResponse(BaseModel):
    id: str
    resident_code: str
    user_id: Optional[str] = None
    full_name: str
    phone: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    resident_status: str
    created_at: datetime
    current_room_id: Optional[str] = None
    current_room_number: Optional[str] = None
    current_bed_id: Optional[str] = None
    current_bed_number: Optional[str] = None
    current_allocation_id: Optional[str] = None
    current_move_in_date: Optional[str] = None
    current_monthly_rent: Optional[float] = None
    is_ac: Optional[bool] = None
    room_type: Optional[str] = None
    sharing_type: Optional[str] = None

    class Config:
        from_attributes = True

class ResidentDetailResponse(ResidentResponse):
    allocations: List[BedAllocationResponse] = []
    history: List[ResidentHistoryResponse] = []
    linked_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# VISIT SCHEMAS
class VisitRequestCreate(BaseModel):
    preferred_date: str  # YYYY-MM-DD
    preferred_time: str  # e.g. "10:00 AM"
    purpose: str = "Room Inspection"
    number_of_visitors: int = 1
    message: Optional[str] = None

class VisitApprove(BaseModel):
    confirmed_date: str
    confirmed_time: str
    admin_notes: Optional[str] = None

class VisitReschedule(BaseModel):
    rescheduled_date: str
    rescheduled_time: str
    admin_notes: Optional[str] = None

class VisitReject(BaseModel):
    admin_notes: Optional[str] = None

class VisitResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    phone: str
    email: str
    preferred_date: str
    preferred_time: str
    purpose: str
    number_of_visitors: int
    message: Optional[str] = None
    status: str
    confirmed_date: Optional[str] = None
    confirmed_time: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# BOOKING SCHEMAS
class BookingRequestCreate(BaseModel):
    room_id: Optional[str] = None
    room_type: str
    is_ac: bool = False
    preferred_joining_date: str
    stay_duration_months: int = 3
    message: Optional[str] = None

class BookingApprove(BaseModel):
    room_id: Optional[str] = None
    bed_id: Optional[str] = None
    allocated_bed: Optional[str] = None
    move_in_date: Optional[str] = None
    admin_notes: Optional[str] = None


class BookingReject(BaseModel):
    admin_notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    user_id: str
    room_id: Optional[str] = None
    room_type: str
    is_ac: bool
    preferred_joining_date: str
    stay_duration_months: int
    message: Optional[str] = None
    allocated_bed: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    room: Optional[RoomResponse] = None

    class Config:
        from_attributes = True

# FACILITY SCHEMAS
class FacilityBase(BaseModel):
    title: str
    category: str = "comfort"
    description: str
    icon: str = "check-circle"
    is_active: bool = True
    display_order: int = 0

class FacilityCreate(FacilityBase):
    pass

class FacilityUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class FacilityResponse(FacilityBase):
    id: int

    class Config:
        from_attributes = True

# GALLERY SCHEMAS
class GalleryCreate(BaseModel):
    title: str
    category: str = "Exterior"
    image_url: str
    caption: Optional[str] = None
    is_featured: bool = False
    is_authentic: bool = True
    display_order: int = 0

class GalleryResponse(BaseModel):
    id: int
    title: str
    category: str
    image_url: str
    caption: Optional[str] = None
    is_featured: bool
    is_authentic: bool
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True

# PG INFO SCHEMAS
class PGInfoUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    opening_hours: Optional[str] = None
    google_rating: Optional[str] = None
    about_text: Optional[str] = None
    rules_text: Optional[str] = None
    faq_data: Optional[str] = None
    social_links: Optional[str] = None

class PGInfoResponse(BaseModel):
    id: int
    name: str
    tagline: str
    address: str
    phone: str
    alt_phone: str
    email: str
    opening_hours: str
    google_rating: str
    about_text: Optional[str] = None
    rules_text: Optional[str] = None
    faq_data: Optional[str] = None
    social_links: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

# CONTACT SCHEMAS
class ContactMessageCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    message: str

class ContactMessageResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# NOTIFICATION SCHEMAS
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# RENT & PAYMENT MANAGEMENT SCHEMAS
class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in INR")
    payment_date: str = Field(..., description="Payment date (YYYY-MM-DD)")
    payment_method: str = Field("UPI", description="Payment method: Cash, UPI, Bank Transfer, Other")
    transaction_reference: Optional[str] = Field(None, description="Optional transaction reference or UTR")
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    rent_record_id: str
    resident_id: str
    amount: float
    payment_date: str
    payment_method: str
    transaction_reference: Optional[str] = None
    recorded_by_admin_id: Optional[str] = None
    recorded_by_admin_email: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RentRecordResponse(BaseModel):
    id: str
    resident_id: str
    resident_code: str
    resident_name: str
    resident_phone: str
    allocation_id: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    is_ac: Optional[bool] = None
    rent_month: str
    rent_period: str
    due_date: str
    due_date_formatted: str
    billing_cycle_start: Optional[str] = None
    billing_cycle_end: Optional[str] = None
    rent_amount: float
    amount_paid: float
    balance_due: float
    payment_status: str
    days_overdue: int = 0
    last_reminder_sent_at: Optional[datetime] = None
    reminder_count: int = 0
    latest_reminder_status: Optional[str] = None
    payments: List[PaymentResponse] = []
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WhatsAppLogResponse(BaseModel):
    id: str
    resident_id: str
    resident_code: Optional[str] = None
    resident_name: Optional[str] = None
    rent_record_id: Optional[str] = None
    phone_number: str
    rent_month: str
    outstanding_amount: Optional[float] = None
    message_text: str
    template_name: Optional[str] = None
    provider_message_id: Optional[str] = None
    delivery_status: str
    attempted_at: datetime
    delivery_timestamp: Optional[datetime] = None
    error_details: Optional[str] = None
    retry_count: int = 0

    class Config:
        from_attributes = True

class RentDashboardStatsResponse(BaseModel):
    month: str
    month_name: str
    total_active_residents: int
    expected_rent: float
    collected_rent: float
    outstanding_rent: float
    paid_residents: int
    partially_paid_residents: int
    pending_residents: int
    overdue_residents: int
    overdue_amount: float
    reminders_sent: int
    reminders_failed: int
    whatsapp_status: dict

class RentSettingsResponse(BaseModel):
    id: int
    admin_whatsapp_number: Optional[str] = "7893744206"
    reminder_frequency_days: int
    auto_send_on_due_date: bool
    send_hour_ist: int
    whatsapp_enabled: bool
    whatsapp_template_name: str
    updated_at: datetime

    class Config:
        from_attributes = True

class RentSettingsUpdate(BaseModel):
    admin_whatsapp_number: Optional[str] = None
    reminder_frequency_days: Optional[int] = Field(None, ge=1, le=30)
    auto_send_on_due_date: Optional[bool] = None
    send_hour_ist: Optional[int] = Field(None, ge=0, le=23)
    whatsapp_enabled: Optional[bool] = None
    whatsapp_template_name: Optional[str] = None

    @field_validator('admin_whatsapp_number', mode='before')
    @classmethod
    def validate_admin_phone(cls, v):
        if v is None:
            return v
        s = re.sub(r"\D", "", str(v))
        if not s:
            return None
        if len(s) == 12 and s.startswith("91"):
            s = s[2:]
        if len(s) == 11 and s.startswith("0"):
            s = s[1:]
        if len(s) != 10:
            raise ValueError(f"Admin WhatsApp number must be exactly 10 digits for Indian mobile numbers (received {len(s)} digits).")
        return s


