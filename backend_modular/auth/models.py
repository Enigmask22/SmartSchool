"""
Pydantic models cho Auth module
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Authentication Schemas
class UserLogin(BaseModel):
    username: str = Field(..., description="Username")
    password: str

class UserCreate(BaseModel):
    email: str
    username: Optional[str] = Field(None, description="Username tùy chọn")
    password: str
    full_name: str
    role: str = "teacher"

# Forgot Password Schemas
class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp_email: str = Field(..., description="Email nhận OTP")

class VerifyOTPRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp: str = Field(..., min_length=6, max_length=6, description="Mã OTP 6 số")

class ResetPasswordRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp: str = Field(..., min_length=6, max_length=6, description="Mã OTP 6 số")
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới")
    confirm_password: str = Field(..., min_length=6, description="Xác nhận mật khẩu mới")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
