from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import PGInformation, User, AuditLog
from ..schemas.schemas import PGInfoResponse, PGInfoUpdate
from ..auth.security import get_current_admin

router = APIRouter(prefix="/api/pg-details", tags=["PG Details"])
admin_router = APIRouter(prefix="/api/admin/pg-details", tags=["Admin PG Details"])

@router.get("", response_model=PGInfoResponse)
def get_pg_details(db: Session = Depends(get_db)):
    info = db.query(PGInformation).filter(PGInformation.id == 1).first()
    if not info:
        raise HTTPException(status_code=404, detail="PG information has not been configured yet.")
    return info

@admin_router.put("", response_model=PGInfoResponse)
def update_pg_details(
    info_update: PGInfoUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    info = db.query(PGInformation).filter(PGInformation.id == 1).first()
    if not info:
        info = PGInformation(id=1)
        db.add(info)

    for field, val in info_update.model_dump(exclude_unset=True).items():
        setattr(info, field, val)

    audit = AuditLog(
        actor_email=current_admin.email,
        action="UPDATE_PG_DETAILS",
        details="Admin modified live PG business information."
    )
    db.add(audit)

    db.commit()
    db.refresh(info)
    return info
