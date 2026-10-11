import os, uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import GalleryItem, User
from ..schemas.schemas import GalleryResponse, GalleryCreate
from ..auth.security import get_current_admin

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])
admin_router = APIRouter(prefix="/api/admin/gallery", tags=["Admin Gallery"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))

@router.get("", response_model=List[GalleryResponse])
def get_gallery(
    category: Optional[str] = None,
    authentic_only: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(GalleryItem)
    if category and category != "All":
        query = query.filter(GalleryItem.category == category)
    if authentic_only is not None:
        query = query.filter(GalleryItem.is_authentic == authentic_only)
    return query.order_by(GalleryItem.display_order, GalleryItem.id).all()

@admin_router.post("", response_model=GalleryResponse)
def add_gallery_item(
    item_in: GalleryCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_item = GalleryItem(**item_in.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@admin_router.post("/upload")
async def upload_gallery_image(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("Exterior"),
    caption: Optional[str] = Form(None),
    is_authentic: bool = Form(True),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"pg_upload_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Save relative URL
    image_url = f"/uploads/{filename}"
    new_item = GalleryItem(
        title=title,
        category=category,
        image_url=image_url,
        caption=caption,
        is_featured=False,
        is_authentic=is_authentic,
        display_order=db.query(GalleryItem).count() + 1
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@admin_router.delete("/{item_id}")
def delete_gallery_item(
    item_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found.")

    db.delete(item)
    db.commit()
    return {"message": "Gallery item deleted successfully."}
