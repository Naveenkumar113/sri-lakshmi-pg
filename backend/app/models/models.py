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


class BedAllocation(Base):
    __tablename__ = "bed_allocations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resident_id = Column(String(36), ForeignKey("residents.id", ondelete="CASCADE"), nullable=False)
    bed_id = Column(String(36), ForeignKey("room_beds.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    move_in_date = Column(String(30), nullable=False)
    move_out_date = Column(String(30), nullable=True)
    allocation_status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, TRANSFERRED, CHECKED_OUT, CANCELLED
    created_by_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resident = relationship("Resident", back_populates="allocations")
    bed = relationship("RoomBed", back_populates="allocations")
    room = relationship("Room", back_populates="allocations")
    booking = relationship("Booking", back_populates="bed_allocation")


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
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    for_admin = Column(Boolean, default=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(30), default="INFO")  # VISIT, BOOKING, USER, SYSTEM
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


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
