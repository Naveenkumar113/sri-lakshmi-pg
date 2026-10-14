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

        # 4. For PostgreSQL, create sequence and partial unique index if supported
        dialect_name = engine.dialect.name
        if dialect_name == "postgresql":
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS resident_code_seq START WITH 1 INCREMENT BY 1;"))
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
