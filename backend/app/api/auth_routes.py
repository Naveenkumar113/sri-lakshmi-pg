from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import User, Notification, AuditLog
from ..schemas.schemas import UserRegister, UserLogin, UserResponse, UserUpdate, PasswordChange, Token
from ..auth.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check duplicate email
    if db.query(User).filter(User.email == user_in.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please login instead."
        )
    # Check duplicate phone
    if db.query(User).filter(User.phone == user_in.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is already associated with an existing account."
        )

    new_user = User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.lower().strip(),
        phone=user_in.phone.strip(),
        hashed_password=get_password_hash(user_in.password),
        role="USER",
        occupation=user_in.occupation,
        company_or_college=user_in.company_or_college,
        emergency_contact=user_in.emergency_contact,
        address=user_in.address,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # In-app welcome notification
    welcome_notif = Notification(
        user_id=new_user.id,
        for_admin=False,
        title="Welcome to Sri Lakshmi Srinivasa Gents PG!",
        message=f"Welcome {new_user.full_name}. You can now schedule visits and request room bookings seamlessly.",
        notification_type="USER",
        link="/dashboard"
    )
    db.add(welcome_notif)

    # Admin notification
    admin_notif = Notification(
        user_id=None,
        for_admin=True,
        title="New User Registration",
        message=f"{new_user.full_name} ({new_user.email}) registered an account.",
        notification_type="USER",
        link="/admin/users"
    )
    db.add(admin_notif)
    db.commit()

    access_token = create_access_token({"sub": new_user.id, "role": new_user.role, "email": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the PG management."
        )

    access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(email_data: dict, db: Session = Depends(get_db)):
    email = email_data.get("email", "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    # Return user-friendly response even if not found to prevent user enumeration
    return {
        "message": f"If an account is associated with {email}, password recovery instructions and a verification code have been prepared."
    }

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name.strip()
    if user_update.phone is not None:
        # Check if phone taken by other user
        existing = db.query(User).filter(User.phone == user_update.phone, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number is already in use by another account.")
        current_user.phone = user_update.phone.strip()
    if user_update.occupation is not None:
        current_user.occupation = user_update.occupation.strip()
    if user_update.company_or_college is not None:
        current_user.company_or_college = user_update.company_or_college.strip()
    if user_update.emergency_contact is not None:
        current_user.emergency_contact = user_update.emergency_contact.strip()
    if user_update.address is not None:
        current_user.address = user_update.address.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me/password")
def change_password(
    pwd_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect.")

    current_user.hashed_password = get_password_hash(pwd_data.new_password)
    
    # Audit log
    audit = AuditLog(
        actor_email=current_user.email,
        action="PASSWORD_CHANGE",
        details="User successfully updated their account password."
    )
    db.add(audit)
    db.commit()
    return {"message": "Password updated successfully."}
