-- PostgreSQL 18 Migration 003: Monthly Rent Reminders, Rent Records & Payment Management System
-- Sri Lakshmi Srinivasa Gents PG (Velachery, Chennai)

-- 1. Extend bed_allocations with custom billing day and agreed monthly rent if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bed_allocations' AND column_name = 'billing_day') THEN
        ALTER TABLE bed_allocations ADD COLUMN billing_day INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bed_allocations' AND column_name = 'monthly_rent') THEN
        ALTER TABLE bed_allocations ADD COLUMN monthly_rent DOUBLE PRECISION;
    END IF;
END $$;

-- 2. Rent Records Table
-- Stores monthly rent billing periods per resident/allocation
CREATE TABLE IF NOT EXISTS rent_records (
    id VARCHAR(36) PRIMARY KEY,
    resident_id VARCHAR(36) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    allocation_id VARCHAR(36) REFERENCES bed_allocations(id) ON DELETE SET NULL,
    rent_month VARCHAR(30) NOT NULL,                    -- e.g. "October 2026"
    rent_period VARCHAR(10) NOT NULL,                   -- e.g. "2026-10"
    due_date VARCHAR(20) NOT NULL,                      -- e.g. "2026-10-09"
    billing_cycle_start VARCHAR(20),                    -- e.g. "2026-09-09"
    billing_cycle_end VARCHAR(20),                      -- e.g. "2026-10-08"
    rent_amount DOUBLE PRECISION NOT NULL,              -- e.g. 6000.0
    amount_paid DOUBLE PRECISION DEFAULT 0.0 NOT NULL,  -- e.g. 0.0, 2000.0, 6000.0
    balance_due DOUBLE PRECISION NOT NULL,              -- e.g. 6000.0, 4000.0, 0.0
    payment_status VARCHAR(30) DEFAULT 'PENDING' NOT NULL, -- PENDING, PARTIALLY_PAID, PAID, OVERDUE
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resident_rent_period UNIQUE (resident_id, rent_period)
);

CREATE INDEX IF NOT EXISTS idx_rent_records_resident ON rent_records(resident_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_period ON rent_records(rent_period);
CREATE INDEX IF NOT EXISTS idx_rent_records_status ON rent_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_rent_records_due_date ON rent_records(due_date);
CREATE INDEX IF NOT EXISTS idx_rent_records_allocation ON rent_records(allocation_id);

-- 3. Payment Transactions Table
-- Tracks individual payment receipts recorded by PG administrators
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(36) PRIMARY KEY,
    rent_record_id VARCHAR(36) NOT NULL REFERENCES rent_records(id) ON DELETE CASCADE,
    resident_id VARCHAR(36) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    payment_date VARCHAR(20) NOT NULL,                  -- e.g. "2026-10-15"
    payment_method VARCHAR(50) NOT NULL,                -- Cash, UPI, Bank Transfer, Other
    transaction_reference VARCHAR(100),                 -- UPI reference, UTR, Bank Ref No, Cheque No
    recorded_by_admin_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_rent_record ON payment_transactions(rent_record_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident ON payment_transactions(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_admin ON payment_transactions(recorded_by_admin_id);

-- 4. WhatsApp Reminder Delivery Logs Table
-- Complete audit trail of every WhatsApp rent reminder attempted, sent, or delivered
CREATE TABLE IF NOT EXISTS whatsapp_reminder_logs (
    id VARCHAR(36) PRIMARY KEY,
    resident_id VARCHAR(36) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    rent_record_id VARCHAR(36) REFERENCES rent_records(id) ON DELETE SET NULL,
    phone_number VARCHAR(30) NOT NULL,
    rent_month VARCHAR(30) NOT NULL,
    message_text TEXT NOT NULL,
    template_name VARCHAR(100),
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(30) DEFAULT 'QUEUED' NOT NULL, -- QUEUED, SENT, DELIVERED, FAILED
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_timestamp TIMESTAMP WITH TIME ZONE,
    error_details TEXT,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_resident ON whatsapp_reminder_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_rent_record ON whatsapp_reminder_logs(rent_record_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_reminder_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_provider_msg_id ON whatsapp_reminder_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_attempted_at ON whatsapp_reminder_logs(attempted_at);

-- 5. Rent & Reminder Policy Configuration Table
CREATE TABLE IF NOT EXISTS rent_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    reminder_frequency_days INTEGER DEFAULT 1 NOT NULL, -- Minimum days between reminders for same period
    auto_send_on_due_date BOOLEAN DEFAULT TRUE NOT NULL,
    send_hour_ist INTEGER DEFAULT 9 NOT NULL,            -- 9:00 AM IST
    whatsapp_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    whatsapp_template_name VARCHAR(100) DEFAULT 'pg_rent_due_reminder' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings if empty
INSERT INTO rent_settings (id, reminder_frequency_days, auto_send_on_due_date, send_hour_ist, whatsapp_enabled, whatsapp_template_name)
VALUES (1, 1, TRUE, 9, TRUE, 'pg_rent_due_reminder')
ON CONFLICT (id) DO NOTHING;
