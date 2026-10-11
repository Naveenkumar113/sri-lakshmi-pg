from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# AUTH & USER SCHEMAS
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6)
    occupation: Optional[str] = None
    company_or_college: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None

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
    is_occupied: bool
    current_occupant_name: Optional[str] = None

    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    room_number: str
    room_type: str  # SINGLE, DOUBLE, TRIPLE, FOUR_SHARING
    is_ac: bool = False
    floor: int = 1
    capacity: int = 2
    available_beds: int = 2
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    images: Optional[str] = None
    status: str = "AVAILABLE"

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    is_ac: Optional[bool] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    available_beds: Optional[int] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    images: Optional[str] = None
    status: Optional[str] = None

class RoomResponse(RoomBase):
    id: str
    created_at: datetime
    beds: List[RoomBedResponse] = []

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
    allocated_bed: Optional[str] = None
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
