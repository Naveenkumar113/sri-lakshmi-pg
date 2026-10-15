import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

from .database.connection import engine, SessionLocal
from .database.seed_data import seed_database
from .database.migration_helper import apply_auto_migrations

# Import routers
from .api.auth_routes import router as auth_router
from .api.room_routes import router as room_router, admin_router as room_admin_router, room_avail_router
from .api.resident_routes import router as resident_admin_router, allocation_router as allocation_admin_router
from .api.visit_routes import router as visit_router, admin_router as visit_admin_router
from .api.booking_routes import router as booking_router, admin_router as booking_admin_router
from .api.facility_routes import router as facility_router, admin_router as facility_admin_router
from .api.gallery_routes import router as gallery_router, admin_router as gallery_admin_router
from .api.pg_routes import router as pg_router, admin_router as pg_admin_router
from .api.contact_routes import router as contact_router, admin_router as contact_admin_router
from .api.notification_routes import router as notification_router
from .api.admin_analytics_routes import router as admin_analytics_router
from .api.rent_routes import router as rent_admin_router
from .scheduler.rent_scheduler import start_rent_scheduler, stop_rent_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run schema migrations, seed default data, and start rent scheduler
    apply_auto_migrations(engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    start_rent_scheduler()
    yield
    # Shutdown: Cleanly stop background scheduler
    stop_rent_scheduler()

app = FastAPI(
    title="Sri Lakshmi Srinivasa Gents PG API",
    description="Enterprise REST API for Sri Lakshmi Srinivasa Gents PG (Velachery, Chennai). Manages room bookings, visit schedules, facilities, gallery, and administration.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
# Include localhost, frontend environment variables, and any vercel preview / production URLs
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
frontend_url = os.getenv("FRONTEND_URL", "")

origins = list(default_origins)
if env_origins:
    origins.extend([orig.strip() for orig in env_origins.split(",") if orig.strip()])
if frontend_url and frontend_url.strip() not in origins:
    origins.append(frontend_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Security Response Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# Static Uploads directory
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Routers
app.include_router(auth_router)
app.include_router(room_router)
app.include_router(room_admin_router)
app.include_router(visit_router)
app.include_router(visit_admin_router)
app.include_router(booking_router)
app.include_router(booking_admin_router)
app.include_router(facility_router)
app.include_router(facility_admin_router)
app.include_router(gallery_router)
app.include_router(gallery_admin_router)
app.include_router(pg_router)
app.include_router(pg_admin_router)
app.include_router(room_avail_router)
app.include_router(resident_admin_router)
app.include_router(allocation_admin_router)
app.include_router(contact_router)
app.include_router(contact_admin_router)
app.include_router(notification_router)
app.include_router(admin_analytics_router)
app.include_router(rent_admin_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "pg_name": "Sri Lakshmi Srinivasa Gents PG",
        "location": "3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu – 600113",
        "phone": "+91 78937 44206",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "sri-lakshmi-pg-api"}

# Global Exception handler to return clean user-friendly JSON without swallowing HTTP errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        headers = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers
        )
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please try again or contact support."}
    )
