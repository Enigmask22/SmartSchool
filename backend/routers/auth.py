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

from models.schemas import (
    UserLogin, UserCreate, Token, ResponseModel,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
)
from database.connection import get_db, get_school_db
from utils.logger import setup_logger
from services.email_service import email_service
from services.otp_service import otp_service

logger = setup_logger()

router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))  # Mặc định 15 phút
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))      # Mặc định 30 ngày

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer token
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực password"""
    # Bcrypt chỉ hỗ trợ password tối đa 72 bytes
    # Truncate password nếu quá dài
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    # Bcrypt chỉ hỗ trợ password tối đa 72 bytes
    # Truncate password nếu quá dài
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Tạo JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Tạo JWT refresh token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Lấy user hiện tại từ JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")  # Thay đổi từ email sang username
        token_type: str = payload.get("type")
        
        if username is None:
            raise credentials_exception
            
        # Chỉ chấp nhận access token cho authentication
        if token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Lấy school database dựa trên username từ token
    db = get_school_db(username)
    
    # Get user from database - tìm kiếm theo username hoặc email (backward compatibility)
    user_response = db.table("users").select("*").or_(
        f"username.eq.{username},email.eq.{username}"
    ).execute()
    
    if not user_response.data:
        raise credentials_exception
    
    return user_response.data[0]

async def get_current_user_from_refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Lấy user hiện tại từ refresh token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")  # Thay đổi từ email sang username
        token_type: str = payload.get("type")
        
        if username is None:
            raise credentials_exception
            
        # Chỉ chấp nhận refresh token
        if token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Lấy school database dựa trên username từ token
    db = get_school_db(username)
    
    # Get user from database - tìm kiếm theo username hoặc email (backward compatibility)
    user_response = db.table("users").select("*").or_(
        f"username.eq.{username},email.eq.{username}"
    ).execute()
    
    if not user_response.data:
        raise credentials_exception
    
    return user_response.data[0]

@router.post("/register", response_model=ResponseModel)
async def register(
    user: UserCreate
):
    """Đăng ký user mới"""
    try:
        # Lấy school database dựa trên username (nếu có)
        # Fallback về default database nếu không có username
        if hasattr(user, 'username') and user.username:
            db = get_school_db(user.username)
        else:
            db = get_db()
        
        # Kiểm tra email đã tồn tại chưa
        existing_email = db.table("users").select("id").eq("email", user.email).execute()
        
        if existing_email.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
        
        # Kiểm tra username đã tồn tại chưa (nếu có)
        if user.username:
            existing_username = db.table("users").select("id").eq("username", user.username).execute()
            
            if existing_username.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username đã được sử dụng"
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
        
        # Thêm username nếu có
        if user.username:
            user_data["username"] = user.username
        
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
        logger.error(f"ERROR: Error registering user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/login")
async def login(
    user_credentials: UserLogin
):
    """Đăng nhập user"""
    try:
        # Lấy school database dựa trên username
        db = get_school_db(user_credentials.username)
        
        # Tìm user trong database - tìm kiếm theo username hoặc email
        user_response = db.table("users").select("*").or_(
            f"username.eq.{user_credentials.username},email.eq.{user_credentials.username}"
        ).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username hoặc password không đúng"
            )
        
        user = user_response.data[0]
        
        # Kiểm tra password
        password_valid = verify_password(user_credentials.password, user["password_hash"])
        
        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username hoặc password không đúng"
            )
        
        # Kiểm tra user active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        # Tạo access token và refresh token - sử dụng username nếu có, fallback về email
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Ưu tiên username, nếu không có thì dùng email (backward compatibility)
        token_subject = user.get("username") or user.get("email")
        
        access_token = create_access_token(
            data={"sub": token_subject},
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(
            data={"sub": token_subject},
            expires_delta=refresh_token_expires
        )
        
        # Remove password hash from user data
        user.pop("password_hash", None)
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
                "user": user
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error logging in: {str(e)}")
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

@router.post("/refresh")
async def refresh_token(
    current_user=Depends(get_current_user_from_refresh_token)
):
    """Refresh access token sử dụng refresh token"""
    try:
        # Tạo access token mới
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user["email"]},
            expires_delta=access_token_expires
        )
        
        # Remove password hash from user data
        user_data = current_user.copy()
        user_data.pop("password_hash", None)
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
                "user": user_data
            }
        }
        
    except Exception as e:
        logger.error(f"ERROR: Error refreshing token: {str(e)}")
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
    current_user=Depends(get_current_user)
):
    """Đổi password"""
    try:
        # Lấy school database dựa trên username của current user
        username = current_user.get("username") or current_user.get("email")
        db = get_school_db(username)
        
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
        logger.error(f"ERROR: Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/forgot-password", response_model=ResponseModel)
async def forgot_password(
    request: ForgotPasswordRequest
):
    """Gửi OTP qua email để đặt lại mật khẩu"""
    try:
        # Lấy school database dựa trên username
        db = get_school_db(request.username)
        
        # Kiểm tra xem username có tồn tại trong hệ thống không
        user_response = db.table("users").select("id, email, full_name, username").eq("username", request.username).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Username không tồn tại trong hệ thống"
            )
        
        user = user_response.data[0]
        
        # Kiểm tra xem SMTP đã được cấu hình chưa
        if not email_service.is_smtp_configured():
            logger.warning("SMTP chưa được cấu hình, sử dụng OTP giả lập")
            # Trong môi trường development, có thể sử dụng OTP cố định
            otp = "123456"  # OTP giả lập cho development
        else:
            # Tạo OTP ngẫu nhiên
            otp = email_service.generate_otp()
        
        # Lưu OTP tạm thời
        if not otp_service.generate_and_store_otp(request.username, request.otp_email, otp):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi tạo mã OTP"
            )
        
        # Gửi email OTP
        if email_service.is_smtp_configured():
            email_sent = await email_service.send_otp_email(request.otp_email, otp)
            if not email_sent:
                # Xóa OTP nếu gửi email thất bại
                otp_service.delete_otp(request.username)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Không thể gửi email OTP. Vui lòng thử lại sau"
                )
        
        logger.info(f"✅ Đã gửi OTP cho username {request.username} đến {request.otp_email}")
        
        return ResponseModel(
            success=True,
            message="Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)",
            data={
                "username": request.username,
                "otp_email": request.otp_email,
                "otp_expiry_minutes": 10,
                "is_smtp_configured": email_service.is_smtp_configured()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error in forgot password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/verify-otp", response_model=ResponseModel)
async def verify_otp(request: VerifyOTPRequest):
    """Xác thực mã OTP"""
    try:
        result = otp_service.verify_otp(request.username, request.otp)
        
        if result["success"]:
            return ResponseModel(
                success=True,
                message=result["message"],
                data={
                    "username": request.username,
                    "is_verified": True
                }
            )
        else:
            status_code = status.HTTP_400_BAD_REQUEST
            if result.get("error_code") == "OTP_NOT_FOUND":
                status_code = status.HTTP_404_NOT_FOUND
            elif result.get("error_code") == "MAX_ATTEMPTS_EXCEEDED":
                status_code = status.HTTP_429_TOO_MANY_REQUESTS
            
            raise HTTPException(
                status_code=status_code,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error verifying OTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/reset-password", response_model=ResponseModel)
async def reset_password(
    request: ResetPasswordRequest
):
    """Đặt lại mật khẩu mới"""
    try:
        # Lấy school database dựa trên username
        db = get_school_db(request.username)
        # Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu mới và xác nhận mật khẩu không khớp"
            )
        
        # Xác thực OTP
        otp_result = otp_service.verify_otp(request.username, request.otp)
        if not otp_result["success"]:
            status_code = status.HTTP_400_BAD_REQUEST
            if otp_result.get("error_code") == "OTP_NOT_FOUND":
                status_code = status.HTTP_404_NOT_FOUND
            elif otp_result.get("error_code") == "MAX_ATTEMPTS_EXCEEDED":
                status_code = status.HTTP_429_TOO_MANY_REQUESTS
            
            raise HTTPException(
                status_code=status_code,
                detail=otp_result["message"]
            )
        
        # Kiểm tra xem user có tồn tại không
        user_response = db.table("users").select("id, username").eq("username", request.username).execute()
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản"
            )
        
        user = user_response.data[0]
        
        # Hash mật khẩu mới
        new_password_hash = get_password_hash(request.new_password)
        
        # Cập nhật mật khẩu
        update_response = db.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user["id"]).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi cập nhật mật khẩu"
            )
        
        # Xóa OTP sau khi đổi mật khẩu thành công
        otp_service.delete_otp(request.username)
        
        logger.info(f"✅ Đã đặt lại mật khẩu thành công cho username {request.username}")
        
        return ResponseModel(
            success=True,
            message="Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới",
            data={
                "username": request.username
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/otp-status/{username}", response_model=ResponseModel)
async def get_otp_status(username: str):
    """Lấy trạng thái OTP cho username"""
    try:
        status_info = otp_service.get_otp_status(username)
        
        return ResponseModel(
            success=True,
            message="Lấy trạng thái OTP thành công",
            data=status_info
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting OTP status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        ) 