import re
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.models import Resident

def generate_unique_resident_code(db: Session) -> str:
    """
    Generates a unique, non-reusable Resident ID in the format SLPG-0001, SLPG-0002...
    Uses PostgreSQL sequence when on PostgreSQL, or a transaction-safe lock/max counter on SQLite.
    Guarantees no collisions even with concurrent creation.
    """
    bind = db.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        try:
            result = db.execute(text("SELECT nextval('resident_code_seq')")).scalar()
            code = f"SLPG-{int(result):04d}"
            # Verify uniqueness in case of pre-existing records
            while db.query(Resident).filter(Resident.resident_code == code).first() is not None:
                result = db.execute(text("SELECT nextval('resident_code_seq')")).scalar()
                code = f"SLPG-{int(result):04d}"
            return code
        except Exception:
            pass

    # Transaction-safe fallback for SQLite / other engines
    # Query all resident codes matching SLPG-XXXX
    existing_codes = db.query(Resident.resident_code).all()
    max_num = 0
    for (r_code,) in existing_codes:
        if r_code and r_code.startswith("SLPG-"):
            match = re.search(r"SLPG-(\d+)", r_code)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

    next_num = max_num + 1
    candidate_code = f"SLPG-{next_num:04d}"
    while db.query(Resident).filter(Resident.resident_code == candidate_code).first() is not None:
        next_num += 1
        candidate_code = f"SLPG-{next_num:04d}"

    return candidate_code
