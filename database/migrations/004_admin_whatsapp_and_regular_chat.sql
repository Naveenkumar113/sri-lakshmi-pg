-- PostgreSQL 18 Migration 004: Admin WhatsApp Number Configuration & Regular WhatsApp Support
-- Sri Lakshmi Srinivasa Gents PG (Velachery, Chennai)

-- 1. Add admin_whatsapp_number to rent_settings if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rent_settings' AND column_name = 'admin_whatsapp_number'
    ) THEN
        ALTER TABLE rent_settings ADD COLUMN admin_whatsapp_number VARCHAR(20) DEFAULT '7893744206';
    END IF;

    -- 2. Add outstanding_amount to whatsapp_reminder_logs if not present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_reminder_logs' AND column_name = 'outstanding_amount'
    ) THEN
        ALTER TABLE whatsapp_reminder_logs ADD COLUMN outstanding_amount DOUBLE PRECISION;
    END IF;
END $$;
