import os, uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import GalleryItem, User
from ..schemas.schemas import GalleryResponse, GalleryCreate
from ..auth.security import get_current_admin
from ..utils.fast_cache import app_cache

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])
admin_router = APIRouter(prefix="/api/admin/gallery", tags=["Admin Gallery"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))

@router.get("", response_model=List[GalleryResponse])
def get_gallery(
    category: Optional[str] = None,
    authentic_only: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    cache_key = f"gallery:{category or 'all'}:{authentic_only}"
    cached = app_cache.get(cache_key)
    if cached is not None:
        return cached

    query = db.query(GalleryItem)
    if category and category != "All":
        query = query.filter(GalleryItem.category == category)
    if authentic_only is not None:
        query = query.filter(GalleryItem.is_authentic == authentic_only)
    items = query.order_by(GalleryItem.display_order, GalleryItem.id).all()
    res = [GalleryResponse.model_validate(it).model_dump() for it in items]
    app_cache.set(cache_key, res, ttl_seconds=60)
    return res

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
    app_cache.invalidate("gallery")
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
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    ext = file.filename.split(".")[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Allowed formats are: JPG, JPEG, PNG, WEBP, GIF."
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"pg_upload_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum allowed limit of 10 MB."
        )

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
