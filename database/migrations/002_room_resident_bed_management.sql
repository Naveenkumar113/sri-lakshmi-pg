-- PostgreSQL 18 Migration 002: Room Management, Resident Management & Bed Allocation System
-- Sri Lakshmi Srinivasa Gents PG (Velachery, Chennai)

-- 1. Create PostgreSQL sequence for unique resident ID generation (SLPG-0001, SLPG-0002, ...)
CREATE SEQUENCE IF NOT EXISTS resident_code_seq START WITH 1 INCREMENT BY 1;

-- 2. Extend rooms table with sharing_type and monthly_rent_per_bed if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'sharing_type') THEN
        ALTER TABLE rooms ADD COLUMN sharing_type VARCHAR(30) DEFAULT 'DOUBLE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'monthly_rent_per_bed') THEN
        ALTER TABLE rooms ADD COLUMN monthly_rent_per_bed DOUBLE PRECISION;
        UPDATE rooms SET monthly_rent_per_bed = monthly_rent WHERE monthly_rent_per_bed IS NULL;
    END IF;
END $$;

-- 3. Extend room_beds table with bed_status and timestamps if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_beds' AND column_name = 'bed_status') THEN
        ALTER TABLE room_beds ADD COLUMN bed_status VARCHAR(30) DEFAULT 'AVAILABLE';
        UPDATE room_beds SET bed_status = CASE WHEN is_occupied THEN 'OCCUPIED' ELSE 'AVAILABLE' END;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_beds' AND column_name = 'created_at') THEN
        ALTER TABLE room_beds ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_beds' AND column_name = 'updated_at') THEN
        ALTER TABLE room_beds ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Residents Table
CREATE TABLE IF NOT EXISTS residents (
    id VARCHAR(36) PRIMARY KEY,
    resident_code VARCHAR(30) UNIQUE NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    occupation VARCHAR(100),
    emergency_contact VARCHAR(20),
    address TEXT,
    resident_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residents_code ON residents(resident_code);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON residents(phone);
CREATE INDEX IF NOT EXISTS idx_residents_user_id ON residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(resident_status);

-- 5. Bed Allocations Table
CREATE TABLE IF NOT EXISTS bed_allocations (
    id VARCHAR(36) PRIMARY KEY,
    resident_id VARCHAR(36) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    bed_id VARCHAR(36) NOT NULL REFERENCES room_beds(id) ON DELETE CASCADE,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    booking_id VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
    move_in_date VARCHAR(30) NOT NULL,
    move_out_date VARCHAR(30),
    allocation_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, TRANSFERRED, CHECKED_OUT, CANCELLED
    created_by_admin_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_allocations_resident ON bed_allocations(resident_id);
CREATE INDEX IF NOT EXISTS idx_allocations_bed ON bed_allocations(bed_id);
CREATE INDEX IF NOT EXISTS idx_allocations_room ON bed_allocations(room_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON bed_allocations(allocation_status);

-- Strict unique constraint: Only one ACTIVE allocation per bed at any point in time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_allocation
    ON bed_allocations (bed_id)
    WHERE allocation_status = 'ACTIVE';

-- Strict unique constraint: Only one ACTIVE allocation per resident at any point in time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_resident_allocation
    ON bed_allocations (resident_id)
    WHERE allocation_status = 'ACTIVE';

-- 6. Resident History Audit Table
CREATE TABLE IF NOT EXISTS resident_history (
    id SERIAL PRIMARY KEY,
    resident_id VARCHAR(36) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- REGISTERED, ALLOCATED, TRANSFERRED, CHECKED_OUT, UPDATED
    room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id VARCHAR(36) REFERENCES room_beds(id) ON DELETE SET NULL,
    from_room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL,
    from_bed_id VARCHAR(36) REFERENCES room_beds(id) ON DELETE SET NULL,
    details TEXT NOT NULL,
    actor_admin_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resident_history_resident ON resident_history(resident_id);
