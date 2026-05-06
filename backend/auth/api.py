"""
API Router cho authentication và authorization
Module Auth - Backend Modular
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from auth.models import (
    UserLogin, UserCreate, Token, ResponseModel,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
)
from auth.services import (
    email_service, otp_service,
    verify_password, get_password_hash
)
from core.database import get_db, get_school_db
from core.logger import setup_logger
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from core.dependencies import get_current_user, get_current_user_from_refresh_token
from core.error_codes import AuthErrorCode, raise_validation_error

logger = setup_logger("auth_api")

router = APIRouter()

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

# get_current_user và get_current_user_from_refresh_token 
# đã được di chuyển vào core.dependencies để tuân thủ kiến trúc Modular Monolithic

@router.post("/register")
async def register(user: UserCreate):
    """Đăng ký user mới"""
    try:
        # Multi-database routing disabled - using single database
        # if hasattr(user, 'username') and user.username:
        #     db = get_school_db(user.username)
        # else:
        db = get_db()
        
        existing_email = db.table("users").select("id").eq("email", user.email).execute()
        
        if existing_email.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
        
        if user.username:
            existing_username = db.table("users").select("id").eq("username", user.username).execute()
            
            if existing_username.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username đã được sử dụng"
                )
        
        hashed_password = get_password_hash(user.password)
        
        user_data = {
            "email": user.email,
            "password_hash": hashed_password,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if user.username:
            user_data["username"] = user.username
        
        response = db.table("users").insert(user_data).execute()
        
        if response.data:
            user_created = response.data[0]
            user_created.pop("password_hash", None)
            
            return {
                "success": True,
                "message": "Đăng ký thành công",
                "data": user_created
            }
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
async def login(user_credentials: UserLogin):
    """Đăng nhập user với username hoặc email"""
    try:
        # Multi-database routing disabled - using single database
        # db = get_school_db(user_credentials.username)
        db = get_db()
        
        # Backend supports login with both username and email via .or_() query
        user_response = db.table("users").select("*").or_(
            f"username.eq.{user_credentials.username},email.eq.{user_credentials.username}"
        ).execute()
        
        if not user_response.data:
            # Generic message for security (doesn't reveal if email/username exists)
            raise_validation_error(
                AuthErrorCode.LOGIN_INVALID_CREDENTIALS,
                "Tên đăng nhập/email hoặc mật khẩu không chính xác"
            )
        
        user = user_response.data[0]
        
        # Verify password
        password_valid = verify_password(user_credentials.password, user["password_hash"])
        
        if not password_valid:
            raise_validation_error(
                AuthErrorCode.LOGIN_INVALID_CREDENTIALS,
                "Tên đăng nhập/email hoặc mật khẩu không chính xác"
            )
        
        # Check if account is active
        if not user.get("is_active", True):
            raise_validation_error(
                AuthErrorCode.LOGIN_ACCOUNT_INACTIVE,
                "Tài khoản này không hoạt động"
            )
        
        # Create tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        token_subject = user.get("username") or user.get("email")
        
        access_token = create_access_token(
            data={"sub": token_subject},
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(
            data={"sub": token_subject},
            expires_delta=refresh_token_expires
        )
        
        # Remove sensitive data before returning
        user.pop("password_hash", None)
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
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

@router.get("/me")
async def get_current_user_info(request: Request, current_user=Depends(get_current_user)):
    """Lấy thông tin user hiện tại"""
    return {
        "success": True,
        "message": "Lấy thông tin user thành công",
        "data": current_user
    }

@router.post("/refresh")
async def refresh_token(request: Request, current_user=Depends(get_current_user_from_refresh_token)):
    """Refresh access token sử dụng refresh token"""
    try:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user["email"]},
            expires_delta=access_token_expires
        )
        
        user_data = current_user.copy()
        user_data.pop("password_hash", None)
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": user_data
            }
        }
        
    except Exception as e:
        logger.error(f"ERROR: Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi refresh token: {str(e)}"
        )

@router.post("/logout")
async def logout(request: Request, current_user=Depends(get_current_user)):
    """Đăng xuất user"""
    return {
        "success": True,
        "message": "Đăng xuất thành công"
    }

@router.put("/change-password")
async def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user=Depends(get_current_user)
):
    """Đổi password"""
    try:
        # Multi-database routing disabled - using single database
        # username = current_user.get("username") or current_user.get("email")
        # db = get_school_db(username)
        db = get_db()
        
        user_response = db.table("users").select("*").eq("id", current_user["id"]).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy user"
            )
        
        user = user_response.data[0]
        
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password hiện tại không đúng"
            )
        
        new_password_hash = get_password_hash(new_password)
        
        response = db.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.now().isoformat()
        }).eq("id", current_user["id"]).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Đổi password thành công"
            }
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

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Gửi OTP qua email để đặt lại mật khẩu"""
    try:
        # Multi-database routing disabled - using single database
        # db = get_school_db(request.username)
        db = get_db()
        
        user_response = db.table("users").select("id, email, full_name, username").eq("username", request.username).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Username không tồn tại trong hệ thống"
            )
        
        user = user_response.data[0]
        
        if user["email"].lower() != request.otp_email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email nhận OTP không khớp với email của tài khoản này"
            )
        
        otp = email_service.generate_otp()
        
        if not otp_service.generate_and_store_otp(request.username, request.otp_email, otp):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi tạo mã OTP"
            )
        
        email_result = email_service.send_otp_email(request.otp_email, otp)
        if not email_result["success"]:
            otp_service.delete_otp(request.username)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể gửi email OTP"
            )
        
        logger.info(f"✅ Đã gửi OTP cho username {request.username} đến {request.otp_email}")
        
        return {
            "success": True,
            "message": "Mã OTP đã được gửi đến email của bạn",
            "data": {
                "username": request.username,
                "otp_email": request.otp_email,
                "otp_expiry_minutes": 10
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error in forgot password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/verify-otp")
async def verify_otp_endpoint(request: VerifyOTPRequest):
    """Xác thực mã OTP"""
    try:
        result = otp_service.verify_otp(request.username, request.otp)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "data": {
                    "username": request.username,
                    "is_verified": True
                }
            }
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

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Đặt lại mật khẩu mới"""
    try:
        # Multi-database routing disabled - using single database
        # db = get_school_db(request.username)
        db = get_db()
        
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu mới và xác nhận mật khẩu không khớp"
            )
        
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
        
        user_response = db.table("users").select("id, username").eq("username", request.username).execute()
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản"
            )
        
        user = user_response.data[0]
        
        new_password_hash = get_password_hash(request.new_password)
        
        update_response = db.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user["id"]).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi cập nhật mật khẩu"
            )
        
        otp_service.delete_otp(request.username)
        
        logger.info(f"✅ Đã đặt lại mật khẩu thành công cho username {request.username}")
        
        return {
            "success": True,
            "message": "Đặt lại mật khẩu thành công",
            "data": {"username": request.username}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.get("/otp-status/{username}")
async def get_otp_status(username: str):
    """Lấy trạng thái OTP cho username"""
    try:
        status_info = otp_service.get_otp_status(username)
        
        return {
            "success": True,
            "message": "Lấy trạng thái OTP thành công",
            "data": status_info
        }
        
    except Exception as e:
        logger.error(f"ERROR: Error getting OTP status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )