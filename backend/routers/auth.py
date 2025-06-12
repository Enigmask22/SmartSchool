"""
API Router cho authentication và authorization
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from models.schemas import UserLogin, UserCreate, Token, ResponseModel
from database.connection import get_db
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer token
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Tạo JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    """Lấy user hiện tại từ JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    user_response = db.table("users").select("*").eq("email", email).execute()
    
    if not user_response.data:
        raise credentials_exception
    
    return user_response.data[0]

@router.post("/register", response_model=ResponseModel)
async def register(
    user: UserCreate,
    db=Depends(get_db)
):
    """Đăng ký user mới"""
    try:
        # Kiểm tra email đã tồn tại chưa
        existing = db.table("users").select("id").eq("email", user.email).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
        
        # Hash password
        hashed_password = get_password_hash(user.password)
        
        # Create user data
        user_data = {
            "email": user.email,
            "password_hash": hashed_password,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Insert vào database
        response = db.table("users").insert(user_data).execute()
        
        if response.data:
            user_created = response.data[0]
            # Remove password hash from response
            user_created.pop("password_hash", None)
            
            return ResponseModel(
                success=True,
                message="Đăng ký thành công",
                data=user_created
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi tạo user"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error registering user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db=Depends(get_db)
):
    """Đăng nhập user"""
    try:
        # Tìm user trong database
        user_response = db.table("users").select("*").eq("email", user_credentials.email).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc password không đúng"
            )
        
        user = user_response.data[0]
        
        # Kiểm tra password
        if not verify_password(user_credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc password không đúng"
            )
        
        # Kiểm tra user active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        # Tạo access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=access_token_expires
        )
        
        # Remove password hash from user data
        user.pop("password_hash", None)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error logging in: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/me", response_model=ResponseModel)
async def get_current_user_info(
    current_user=Depends(get_current_user)
):
    """Lấy thông tin user hiện tại"""
    return ResponseModel(
        success=True,
        message="Lấy thông tin user thành công",
        data=current_user
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user=Depends(get_current_user)
):
    """Refresh access token"""
    try:
        # Tạo token mới
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user["email"]},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=current_user
        )
        
    except Exception as e:
        logger.error(f"❌ Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi refresh token: {str(e)}"
        )

@router.post("/logout", response_model=ResponseModel)
async def logout(
    current_user=Depends(get_current_user)
):
    """Đăng xuất user"""
    # Note: With JWT, logout is typically handled on the client side
    # by removing the token. Server-side logout would require token blacklisting
    return ResponseModel(
        success=True,
        message="Đăng xuất thành công"
    )

@router.put("/change-password", response_model=ResponseModel)
async def change_password(
    current_password: str,
    new_password: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Đổi password"""
    try:
        # Get user with password hash
        user_response = db.table("users").select("*").eq("id", current_user["id"]).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy user"
            )
        
        user = user_response.data[0]
        
        # Verify current password
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password hiện tại không đúng"
            )
        
        # Hash new password
        new_password_hash = get_password_hash(new_password)
        
        # Update password
        response = db.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.now().isoformat()
        }).eq("id", current_user["id"]).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Đổi password thành công"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi cập nhật password"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        ) 