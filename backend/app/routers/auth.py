from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select, func
from pydantic import BaseModel
from app.db.database import get_session
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials"
        )
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )
    user_id = payload["sub"]
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found"
        )
    return user

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, session: Session = Depends(get_session)):
    email_clean = req.email.strip().lower()
    if "@" not in email_clean or "." not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address (e.g. name@example.com)"
        )

    if len(req.password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    statement = select(User).where(func.lower(User.email) == email_clean)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in instead."
        )

    user = User(
        email=email_clean,
        full_name=req.full_name.strip(),
        hashed_password=hash_password(req.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, session: Session = Depends(get_session)):
    email_clean = req.email.strip().lower()
    if not email_clean or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide both email and password"
        )

    statement = select(User).where(func.lower(User.email) == email_clean)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Click 'Create Account' to register."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name)
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name
    )
