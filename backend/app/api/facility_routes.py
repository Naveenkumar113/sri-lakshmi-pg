from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Facility, User
from ..schemas.schemas import FacilityResponse, FacilityCreate, FacilityUpdate
from ..auth.security import get_current_admin
from ..utils.fast_cache import app_cache

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])
admin_router = APIRouter(prefix="/api/admin/facilities", tags=["Admin Facilities"])

@router.get("", response_model=List[FacilityResponse])
def get_facilities(db: Session = Depends(get_db)):
    cached = app_cache.get("facilities:public")
    if cached is not None:
        return cached
    data = db.query(Facility).filter(Facility.is_active == True).order_by(Facility.display_order, Facility.id).all()
    # Cache serialization dictionary
    res = [FacilityResponse.model_validate(f).model_dump() for f in data]
    app_cache.set("facilities:public", res, ttl_seconds=60)
    return res

@admin_router.get("", response_model=List[FacilityResponse])
def admin_get_all_facilities(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Facility).order_by(Facility.display_order, Facility.id).all()

@admin_router.post("", response_model=FacilityResponse)
def create_facility(
    fac_in: FacilityCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_fac = Facility(**fac_in.model_dump())
    db.add(new_fac)
    db.commit()
    db.refresh(new_fac)
    app_cache.invalidate("facilities")
    return new_fac

@admin_router.put("/{fac_id}", response_model=FacilityResponse)
def update_facility(
    fac_id: int,
    fac_update: FacilityUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    fac = db.query(Facility).filter(Facility.id == fac_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found.")

    for field, val in fac_update.model_dump(exclude_unset=True).items():
        setattr(fac, field, val)

    db.commit()
    db.refresh(fac)
    app_cache.invalidate("facilities")
    return fac

@admin_router.delete("/{fac_id}")
def delete_facility(
    fac_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    fac = db.query(Facility).filter(Facility.id == fac_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found.")

    db.delete(fac)
    db.commit()
    app_cache.invalidate("facilities")
    return {"message": "Facility deleted successfully."}
