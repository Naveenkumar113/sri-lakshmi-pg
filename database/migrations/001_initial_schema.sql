-- PostgreSQL 18 Production Schema for Sri Lakshmi Srinivasa Gents PG
-- Location: 3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu - 600113

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER' NOT NULL,
    occupation VARCHAR(100),
    company_or_college VARCHAR(150),
    emergency_contact VARCHAR(20),
    address TEXT,
    profile_photo VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type VARCHAR(30) NOT NULL,
    is_ac BOOLEAN DEFAULT FALSE,
    floor INTEGER DEFAULT 1,
    capacity INTEGER DEFAULT 2,
    available_beds INTEGER DEFAULT 2,
    monthly_rent DOUBLE PRECISION,
    security_deposit DOUBLE PRECISION,
    description TEXT,
    amenities TEXT,
    images TEXT,
    status VARCHAR(30) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Room Beds Table
CREATE TABLE IF NOT EXISTS room_beds (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    current_occupant_name VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_beds_room_id ON room_beds(room_id);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL,
    room_type VARCHAR(30) NOT NULL,
    is_ac BOOLEAN DEFAULT FALSE,
    preferred_joining_date VARCHAR(30) NOT NULL,
    stay_duration_months INTEGER DEFAULT 3,
    message TEXT,
    allocated_bed VARCHAR(30),
    status VARCHAR(30) DEFAULT 'PENDING',
    admin_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 5. Visit Requests Table
CREATE TABLE IF NOT EXISTS visit_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120) NOT NULL,
    preferred_date VARCHAR(30) NOT NULL,
    preferred_time VARCHAR(30) NOT NULL,
    purpose VARCHAR(100) DEFAULT 'Room Inspection',
    number_of_visitors INTEGER DEFAULT 1,
    message TEXT,
    status VARCHAR(30) DEFAULT 'PENDING',
    confirmed_date VARCHAR(30),
    confirmed_time VARCHAR(30),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_user ON visit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_date_time ON visit_requests(preferred_date, preferred_time);

-- 6. Visit Slots Table
CREATE TABLE IF NOT EXISTS visit_slots (
    id SERIAL PRIMARY KEY,
    time_label VARCHAR(30) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    max_capacity INTEGER DEFAULT 3
);

-- 7. Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'comfort',
    description TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT 'check-circle',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);

-- 8. PG Information Table
CREATE TABLE IF NOT EXISTS pg_information (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(150) DEFAULT 'Sri Lakshmi Srinivasa Gents PG',
    tagline VARCHAR(200) DEFAULT 'Comfortable PG Living in Velachery, Chennai',
    address TEXT DEFAULT '3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu 600113',
    phone VARCHAR(30) DEFAULT '+91 78937 44206',
    alt_phone VARCHAR(30) DEFAULT '+91 90032 80430',
    email VARCHAR(100) DEFAULT 'srilakshmisrinivasa.pg@gmail.com',
    opening_hours VARCHAR(100) DEFAULT 'Open 24 Hours Daily',
    google_rating VARCHAR(30) DEFAULT '3.6 / 5 (14 Reviews)',
    about_text TEXT,
    rules_text TEXT,
    faq_data TEXT,
    social_links TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'Exterior',
    image_url VARCHAR(255) NOT NULL,
    caption TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_authentic BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    for_admin BOOLEAN DEFAULT FALSE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_email VARCHAR(120) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
