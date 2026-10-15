import logging
from sqlalchemy import inspect, text
from ..models.models import Base

logger = logging.getLogger(__name__)

def apply_auto_migrations(engine):
    """
    Safely applies non-destructive incremental schema updates for PostgreSQL and SQLite.
    Never drops tables or loses existing data.
    """
    # 1. Create any missing tables (e.g. residents, bed_allocations, resident_history)
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    with engine.begin() as conn:
        # 2. Check and extend 'rooms' table
        if "rooms" in tables:
            room_cols = [c["name"] for c in inspector.get_columns("rooms")]
            if "sharing_type" not in room_cols:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN sharing_type VARCHAR(30) DEFAULT 'Double Sharing'"))
            if "monthly_rent_per_bed" not in room_cols:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN monthly_rent_per_bed FLOAT"))
                conn.execute(text("UPDATE rooms SET monthly_rent_per_bed = monthly_rent WHERE monthly_rent_per_bed IS NULL"))

            # Normalize sharing types to standard 4 options based on capacity and legacy values
            conn.execute(text("UPDATE rooms SET sharing_type = 'Single Sharing' WHERE capacity = 1 OR sharing_type IN ('SINGLE', 'Single')"))
            conn.execute(text("UPDATE rooms SET sharing_type = 'Double Sharing' WHERE capacity = 2 OR sharing_type IN ('DOUBLE', 'Double')"))
            conn.execute(text("UPDATE rooms SET sharing_type = 'Triple Sharing' WHERE capacity = 3 OR sharing_type IN ('TRIPLE', 'Triple')"))
            conn.execute(text("UPDATE rooms SET sharing_type = 'Four Sharing' WHERE capacity = 4 OR sharing_type IN ('FOUR_SHARING', 'Four', '4-Sharing')"))

        # 3. Check and extend 'room_beds' table
        if "room_beds" in tables:
            bed_cols = [c["name"] for c in inspector.get_columns("room_beds")]
            if "bed_status" not in bed_cols:
                conn.execute(text("ALTER TABLE room_beds ADD COLUMN bed_status VARCHAR(30) DEFAULT 'AVAILABLE'"))
                conn.execute(text("UPDATE room_beds SET bed_status = CASE WHEN is_occupied THEN 'OCCUPIED' ELSE 'AVAILABLE' END"))
            if "created_at" not in bed_cols:
                conn.execute(text("ALTER TABLE room_beds ADD COLUMN created_at TIMESTAMP"))
            if "updated_at" not in bed_cols:
                conn.execute(text("ALTER TABLE room_beds ADD COLUMN updated_at TIMESTAMP"))

        # 4. Check and extend 'bed_allocations' table
        if "bed_allocations" in tables:
            alloc_cols = [c["name"] for c in inspector.get_columns("bed_allocations")]
            if "billing_day" not in alloc_cols:
                conn.execute(text("ALTER TABLE bed_allocations ADD COLUMN billing_day INTEGER"))
            if "monthly_rent" not in alloc_cols:
                conn.execute(text("ALTER TABLE bed_allocations ADD COLUMN monthly_rent FLOAT"))

        # 5. Check and extend 'rent_settings' and 'whatsapp_reminder_logs'
        if "rent_settings" in tables:
            rs_cols = [c["name"] for c in inspector.get_columns("rent_settings")]
            if "admin_whatsapp_number" not in rs_cols:
                conn.execute(text("ALTER TABLE rent_settings ADD COLUMN admin_whatsapp_number VARCHAR(20) DEFAULT '7893744206'"))

            rs_count = conn.execute(text("SELECT count(*) FROM rent_settings")).scalar()
            if rs_count == 0:
                conn.execute(text("""
                    INSERT INTO rent_settings (id, admin_whatsapp_number, reminder_frequency_days, auto_send_on_due_date, send_hour_ist, whatsapp_enabled, whatsapp_template_name)
                    VALUES (1, '7893744206', 1, TRUE, 9, TRUE, 'pg_rent_due_reminder')
                """))

        if "whatsapp_reminder_logs" in tables:
            wl_cols = [c["name"] for c in inspector.get_columns("whatsapp_reminder_logs")]
            if "outstanding_amount" not in wl_cols:
                conn.execute(text("ALTER TABLE whatsapp_reminder_logs ADD COLUMN outstanding_amount FLOAT"))

        # 6. Check and extend 'notifications' table
        if "notifications" in tables:
            notif_cols = [c["name"] for c in inspector.get_columns("notifications")]
            if "report_id" not in notif_cols:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN report_id VARCHAR(36) REFERENCES issue_reports(id) ON DELETE SET NULL"))
            if "read_at" not in notif_cols:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP"))


        # 7. For PostgreSQL, create sequence and partial unique index if supported
        dialect_name = engine.dialect.name
        if dialect_name == "postgresql":
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS resident_code_seq START WITH 1 INCREMENT BY 1;"))
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS report_code_seq START WITH 1 INCREMENT BY 1;"))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_allocation
                ON bed_allocations (bed_id)
                WHERE allocation_status = 'ACTIVE';
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_resident_allocation
                ON bed_allocations (resident_id)
                WHERE allocation_status = 'ACTIVE';
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_resident_rent_period_idx
                ON rent_records (resident_id, rent_period);
            """))
