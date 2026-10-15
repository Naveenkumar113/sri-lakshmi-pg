import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from ..database.connection import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="USER", nullable=False)  # USER or ADMIN
    occupation = Column(String(100), nullable=True)
    company_or_college = Column(String(150), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    profile_photo = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    visits = relationship("VisitRequest", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    resident = relationship("Resident", back_populates="user", uselist=False)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_number = Column(String(20), unique=True, nullable=False)
    room_type = Column(String(30), nullable=False)  # SINGLE, DOUBLE, TRIPLE, FOUR_SHARING
    sharing_type = Column(String(30), default="DOUBLE", nullable=True)  # Single, Double, Triple, Four Sharing
    is_ac = Column(Boolean, default=False)
    floor = Column(Integer, default=1)
    capacity = Column(Integer, default=2)
    available_beds = Column(Integer, default=2)
    monthly_rent = Column(Float, nullable=True)  # Contact if null
    monthly_rent_per_bed = Column(Float, nullable=True)
    security_deposit = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    amenities = Column(Text, nullable=True)  # Comma-separated or JSON string
    images = Column(Text, nullable=True)  # JSON string array
    status = Column(String(30), default="AVAILABLE")  # AVAILABLE, PARTIALLY_AVAILABLE, FULL, MAINTENANCE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    beds = relationship("RoomBed", back_populates="room", cascade="all, delete-orphan", order_by="RoomBed.bed_number")
    bookings = relationship("Booking", back_populates="room")
    allocations = relationship("BedAllocation", back_populates="room")


class RoomBed(Base):
    __tablename__ = "room_beds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(20), nullable=False)  # Bed 1, Bed 2, or B1, B2, etc.
    bed_status = Column(String(30), default="AVAILABLE")  # AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE
    is_occupied = Column(Boolean, default=False)
    current_occupant_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    room = relationship("Room", back_populates="beds")
    allocations = relationship("BedAllocation", back_populates="bed", cascade="all, delete-orphan")


class Resident(Base):
    __tablename__ = "residents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resident_code = Column(String(30), unique=True, index=True, nullable=False)  # SLPG-0001, SLPG-0002...
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(120), nullable=True)
    occupation = Column(String(100), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    resident_status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, CHECKED_OUT, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="resident")
    allocations = relationship("BedAllocation", back_populates="resident", cascade="all, delete-orphan", order_by="desc(BedAllocation.created_at)")
    history = relationship("ResidentHistory", back_populates="resident", cascade="all, delete-orphan", order_by="desc(ResidentHistory.created_at)")
    rent_records = relationship("RentRecord", back_populates="resident", cascade="all, delete-orphan", order_by="desc(RentRecord.due_date)")
    payment_transactions = relationship("PaymentTransaction", back_populates="resident", cascade="all, delete-orphan", order_by="desc(PaymentTransaction.payment_date)")
    whatsapp_logs = relationship("WhatsAppReminderLog", back_populates="resident", cascade="all, delete-orphan", order_by="desc(WhatsAppReminderLog.attempted_at)")


class BedAllocation(Base):
    __tablename__ = "bed_allocations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_id = Column(String(36), ForeignKey("room_beds.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    move_in_date = Column(String(30), nullable=False)
    move_out_date = Column(String(30), nullable=True)
    billing_day = Column(Integer, nullable=True)
    monthly_rent = Column(Float, nullable=True)
    allocation_status = Column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, TRANSFERRED, CHECKED_OUT, CANCELLED
    created_by_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resident = relationship("Resident", back_populates="allocations")
    bed = relationship("RoomBed", back_populates="allocations")
    room = relationship("Room", back_populates="allocations")
    booking = relationship("Booking", back_populates="bed_allocation")
    rent_records = relationship("RentRecord", back_populates="allocation")


class ResidentHistory(Base):
    __tablename__ = "resident_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # REGISTERED, ALLOCATED, TRANSFERRED, CHECKED_OUT, UPDATED
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    bed_id = Column(String(36), ForeignKey("room_beds.id", ondelete="SET NULL"), nullable=True)
    from_room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    from_bed_id = Column(String(36), ForeignKey("room_beds.id", ondelete="SET NULL"), nullable=True)
    details = Column(Text, nullable=False)
    actor_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resident = relationship("Resident", back_populates="history")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    room_type = Column(String(30), nullable=False)
    is_ac = Column(Boolean, default=False)
    preferred_joining_date = Column(String(30), nullable=False)
    stay_duration_months = Column(Integer, default=3)
    message = Column(Text, nullable=True)
    allocated_bed = Column(String(30), nullable=True)
    status = Column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    bed_allocation = relationship("BedAllocation", back_populates="booking", uselist=False)



class VisitRequest(Base):
    __tablename__ = "visit_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(120), nullable=False)
    preferred_date = Column(String(30), nullable=False)  # YYYY-MM-DD
    preferred_time = Column(String(30), nullable=False)  # e.g. 10:00 AM
    purpose = Column(String(100), default="Room Inspection")
    number_of_visitors = Column(Integer, default=1)
    message = Column(Text, nullable=True)
    status = Column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED, RESCHEDULED, CANCELLED, COMPLETED
    confirmed_date = Column(String(30), nullable=True)
    confirmed_time = Column(String(30), nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="visits")


class VisitSlot(Base):
    __tablename__ = "visit_slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    time_label = Column(String(30), unique=True, nullable=False)  # "09:00 AM", "10:00 AM", etc.
    is_enabled = Column(Boolean, default=True)
    max_capacity = Column(Integer, default=3)


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    category = Column(String(50), default="comfort")  # essential, comfort, convenience, security
    description = Column(Text, nullable=False)
    icon = Column(String(50), default="check-circle")
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)


class PGInformation(Base):
    __tablename__ = "pg_information"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(150), default="Sri Lakshmi Srinivasa Gents PG")
    tagline = Column(String(200), default="Comfortable PG Living in Velachery, Chennai")
    address = Column(Text, default="3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu 600113")
    phone = Column(String(30), default="+91 78937 44206")
    alt_phone = Column(String(30), default="+91 90032 80430")
    email = Column(String(100), default="srilakshmisrinivasa.pg@gmail.com")
    opening_hours = Column(String(100), default="Open 24 Hours Daily")
    google_rating = Column(String(30), default="3.6 / 5 (14 Reviews)")
    about_text = Column(Text, nullable=True)
    rules_text = Column(Text, nullable=True)
    faq_data = Column(Text, nullable=True)  # JSON string
    social_links = Column(Text, nullable=True)  # JSON string
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GalleryItem(Base):
    __tablename__ = "gallery"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    category = Column(String(50), default="Exterior")  # Exterior, Bedrooms, Facilities, Surroundings, Signboard
    image_url = Column(String(255), nullable=False)
    caption = Column(Text, nullable=True)
    is_featured = Column(Boolean, default=False)
    is_authentic = Column(Boolean, default=True)  # Authentic actual photo vs realistic render
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    for_admin = Column(Boolean, default=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(30), default="INFO", index=True)  # VISIT, BOOKING, USER, SYSTEM, REPORT
    report_id = Column(String(36), ForeignKey("issue_reports.id", ondelete="SET NULL"), nullable=True, index=True)
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")
    report = relationship("IssueReport", foreign_keys=[report_id])


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_email = Column(String(120), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RentRecord(Base):
    __tablename__ = "rent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    allocation_id = Column(String(36), ForeignKey("bed_allocations.id", ondelete="SET NULL"), nullable=True)
    rent_month = Column(String(30), nullable=False)                    # e.g. "October 2026"
    rent_period = Column(String(10), nullable=False, index=True)        # e.g. "2026-10"
    due_date = Column(String(20), nullable=False, index=True)           # e.g. "2026-10-09"
    billing_cycle_start = Column(String(20), nullable=True)             # e.g. "2026-09-09"
    billing_cycle_end = Column(String(20), nullable=True)               # e.g. "2026-10-08"
    rent_amount = Column(Float, nullable=False)                         # e.g. 6000.0
    amount_paid = Column(Float, default=0.0, nullable=False)            # e.g. 0.0, 2000.0, 6000.0
    balance_due = Column(Float, nullable=False)                         # e.g. 6000.0, 4000.0, 0.0
    payment_status = Column(String(30), default="PENDING", nullable=False, index=True) # PENDING, PARTIALLY_PAID, PAID, OVERDUE
    last_reminder_sent_at = Column(DateTime, nullable=True)
    reminder_count = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resident = relationship("Resident", back_populates="rent_records")
    allocation = relationship("BedAllocation", back_populates="rent_records")
    payments = relationship("PaymentTransaction", back_populates="rent_record", cascade="all, delete-orphan", order_by="desc(PaymentTransaction.created_at)")
    reminders = relationship("WhatsAppReminderLog", back_populates="rent_record", cascade="all, delete-orphan", order_by="desc(WhatsAppReminderLog.attempted_at)")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rent_record_id = Column(String(36), ForeignKey("rent_records.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_date = Column(String(20), nullable=False, index=True)       # e.g. "2026-10-15"
    payment_method = Column(String(50), nullable=False)                 # Cash, UPI, Bank Transfer, Other
    transaction_reference = Column(String(100), nullable=True)          # UPI Ref / UTR / Cheque / Bank Txn ID
    recorded_by_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rent_record = relationship("RentRecord", back_populates="payments")
    resident = relationship("Resident", back_populates="payment_transactions")
    recorded_by_admin = relationship("User")


class WhatsAppReminderLog(Base):
    __tablename__ = "whatsapp_reminder_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    rent_record_id = Column(String(36), ForeignKey("rent_records.id", ondelete="SET NULL"), nullable=True, index=True)
    phone_number = Column(String(30), nullable=False)
    rent_month = Column(String(30), nullable=False)
    message_text = Column(Text, nullable=False)
    template_name = Column(String(100), nullable=True)
    provider_message_id = Column(String(100), nullable=True, index=True)
    delivery_status = Column(String(30), default="QUEUED", nullable=False, index=True) # QUEUED, SENT, DELIVERED, FAILED
    attempted_at = Column(DateTime, default=datetime.utcnow)
    delivery_timestamp = Column(DateTime, nullable=True)
    error_details = Column(Text, nullable=True)
    outstanding_amount = Column(Float, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resident = relationship("Resident", back_populates="whatsapp_logs")
    rent_record = relationship("RentRecord", back_populates="reminders")


class RentSettings(Base):
    __tablename__ = "rent_settings"

    id = Column(Integer, primary_key=True, default=1)
    admin_whatsapp_number = Column(String(20), default="7893744206", nullable=True)
    reminder_frequency_days = Column(Integer, default=1, nullable=False)
    auto_send_on_due_date = Column(Boolean, default=True, nullable=False)
    send_hour_ist = Column(Integer, default=9, nullable=False)
    whatsapp_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_template_name = Column(String(100), default="pg_rent_due_reminder", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IssueReport(Base):
    __tablename__ = "issue_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_code = Column(String(30), unique=True, index=True, nullable=False) # e.g. "REP-202610-001"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Snapshot details at the time of reporting
    resident_name = Column(String(100), nullable=False)
    resident_code = Column(String(30), nullable=True)
    resident_phone = Column(String(20), nullable=False, index=True)
    room_number = Column(String(20), nullable=True, index=True)
    floor_number = Column(Integer, nullable=True)
    bed_number = Column(String(20), nullable=True)
    
    # Issue content
    issue_category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Status: OPEN, IN_PROGRESS, RESOLVED
    status = Column(String(30), default="OPEN", nullable=False, index=True)
    
    # Admin resolution
    resolution_notes = Column(Text, nullable=True)
    resolved_by_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # WhatsApp delivery metadata
    admin_whatsapp_status = Column(String(30), default="NOT_SENT", nullable=False) # SENT, FAILED, NOT_CONFIGURED
    admin_whatsapp_timestamp = Column(DateTime, nullable=True)
    resident_whatsapp_status = Column(String(30), default="NOT_SENT", nullable=False) # SENT, FAILED, NOT_CONFIGURED
    resident_whatsapp_timestamp = Column(DateTime, nullable=True)
    whatsapp_error_details = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resident = relationship("Resident", foreign_keys=[resident_id])
    resolved_by_admin = relationship("User", foreign_keys=[resolved_by_admin_id])

