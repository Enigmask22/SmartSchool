"""
Auth Services - OTP và Email services cho authentication
"""

import os
import json
import hashlib
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path
from passlib.context import CryptContext

from core.logger import setup_logger

logger = setup_logger("auth_service")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực password"""
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

# ============ OTP SERVICE ============

class OTPService:
    """Service quản lý OTP tạm thời"""
    
    def __init__(self, storage_dir: str = "./temp_otp"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.otp_expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
        
    def _get_otp_file_path(self, email: str) -> Path:
        """Lấy đường dẫn file OTP cho email"""
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        return self.storage_dir / f"otp_{email_hash}.json"
    
    def generate_and_store_otp(self, email: str, otp_email: str, otp: str) -> bool:
        """Tạo và lưu trữ OTP tạm thời"""
        try:
            otp_data = {
                "email": email,
                "otp_email": otp_email,
                "otp": otp,
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(minutes=self.otp_expiry_minutes)).isoformat(),
                "attempts": 0,
                "max_attempts": 3,
                "is_verified": False
            }
            
            otp_file = self._get_otp_file_path(email)
            with open(otp_file, 'w', encoding='utf-8') as f:
                json.dump(otp_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"✅ Đã lưu OTP cho email {email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Lỗi lưu OTP cho email {email}: {str(e)}")
            return False
    
    def get_otp_data(self, email: str) -> Optional[Dict[str, Any]]:
        """Lấy dữ liệu OTP cho email"""
        try:
            otp_file = self._get_otp_file_path(email)
            if not otp_file.exists():
                return None
            
            with open(otp_file, 'r', encoding='utf-8') as f:
                otp_data = json.load(f)
            
            expires_at = datetime.fromisoformat(otp_data['expires_at'])
            if datetime.now() > expires_at:
                logger.info(f"⏰ OTP cho email {email} đã hết hạn")
                self.delete_otp(email)
                return None
            
            return otp_data
            
        except Exception as e:
            logger.error(f"❌ Lỗi đọc OTP cho email {email}: {str(e)}")
            return None
    
    def verify_otp(self, email: str, otp: str) -> Dict[str, Any]:
        """Xác thực OTP"""
        try:
            otp_data = self.get_otp_data(email)
            if not otp_data:
                return {
                    "success": False,
                    "message": "Mã OTP không tồn tại hoặc đã hết hạn",
                    "error_code": "OTP_NOT_FOUND"
                }
            
            if otp_data['attempts'] >= otp_data['max_attempts']:
                self.delete_otp(email)
                return {
                    "success": False,
                    "message": "Đã vượt quá số lần thử tối đa. Vui lòng yêu cầu mã OTP mới",
                    "error_code": "MAX_ATTEMPTS_EXCEEDED"
                }
            
            otp_data['attempts'] += 1
            
            if otp_data['otp'] == otp:
                otp_data['is_verified'] = True
                self._save_otp_data(email, otp_data)
                logger.info(f"✅ Xác thực OTP thành công cho email {email}")
                return {
                    "success": True,
                    "message": "Xác thực OTP thành công",
                    "otp_data": otp_data
                }
            else:
                self._save_otp_data(email, otp_data)
                logger.warning(f"❌ OTP không đúng cho email {email}. Lần thử: {otp_data['attempts']}")
                return {
                    "success": False,
                    "message": f"Mã OTP không đúng. Còn lại {otp_data['max_attempts'] - otp_data['attempts']} lần thử",
                    "error_code": "INVALID_OTP",
                    "remaining_attempts": otp_data['max_attempts'] - otp_data['attempts']
                }
                
        except Exception as e:
            logger.error(f"❌ Lỗi xác thực OTP cho email {email}: {str(e)}")
            return {
                "success": False,
                "message": "Lỗi hệ thống khi xác thực OTP",
                "error_code": "SYSTEM_ERROR"
            }
    
    def _save_otp_data(self, email: str, otp_data: Dict[str, Any]) -> bool:
        """Lưu dữ liệu OTP"""
        try:
            otp_file = self._get_otp_file_path(email)
            with open(otp_file, 'w', encoding='utf-8') as f:
                json.dump(otp_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi lưu dữ liệu OTP cho email {email}: {str(e)}")
            return False
    
    def delete_otp(self, email: str) -> bool:
        """Xóa OTP tạm thời"""
        try:
            otp_file = self._get_otp_file_path(email)
            if otp_file.exists():
                otp_file.unlink()
                logger.info(f"🗑️ Đã xóa OTP cho email {email}")
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi xóa OTP cho email {email}: {str(e)}")
            return False
    
    def cleanup_expired_otps(self) -> int:
        """Dọn dẹp các OTP đã hết hạn"""
        deleted_count = 0
        try:
            for otp_file in self.storage_dir.glob("otp_*.json"):
                try:
                    with open(otp_file, 'r', encoding='utf-8') as f:
                        otp_data = json.load(f)
                    
                    expires_at = datetime.fromisoformat(otp_data['expires_at'])
                    if datetime.now() > expires_at:
                        otp_file.unlink()
                        deleted_count += 1
                        
                except Exception as e:
                    logger.error(f"❌ Lỗi kiểm tra file OTP {otp_file}: {str(e)}")
                    otp_file.unlink()
                    deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"🧹 Đã dọn dẹp {deleted_count} OTP hết hạn")
                
        except Exception as e:
            logger.error(f"❌ Lỗi dọn dẹp OTP hết hạn: {str(e)}")
        
        return deleted_count

# ============ EMAIL SERVICE ============

class EmailService:
    """Service gửi email OTP cho chức năng quên mật khẩu"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email = os.getenv("SMTP_EMAIL", "your-email@gmail.com")
        self.password = os.getenv("SMTP_PASSWORD", "your-app-password")
        self.sender_name = os.getenv("SMTP_SENDER_NAME", "SynapseS System")
        
    def generate_otp(self, length: int = 6) -> str:
        """Tạo mã OTP ngẫu nhiên"""
        return ''.join(random.choices(string.digits, k=length))
    
    def create_otp_email_html(self, otp: str, recipient_email: str) -> str:
        """Tạo nội dung email HTML cho OTP"""
        return f"""
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Mã OTP đặt lại mật khẩu</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }}
                .container {{ background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ background-color: #4f46e5; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; font-weight: bold; }}
                .title {{ color: #1f2937; font-size: 24px; font-weight: bold; margin-bottom: 10px; }}
                .subtitle {{ color: #6b7280; font-size: 16px; }}
                .otp-container {{ background-color: #f3f4f6; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
                .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">📚</div>
                    <h1 class="title">SynapseS</h1>
                    <p class="subtitle">Mã OTP đặt lại mật khẩu</p>
                </div>
                <p>Xin chào,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>{recipient_email}</strong>.</p>
                <p>Để tiếp tục quá trình đặt lại mật khẩu, vui lòng sử dụng mã OTP sau:</p>
                <div class="otp-container">
                    <div class="otp-code">{otp}</div>
                </div>
                <div class="warning">
                    <strong>⚠️ Lưu ý quan trọng:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
                        <li>Không chia sẻ mã này với bất kỳ ai</li>
                        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                    </ul>
                </div>
                <p>Nếu bạn gặp khó khăn, vui lòng liên hệ với quản trị viên hệ thống.</p>
                <div class="footer">
                    <p>Email này được gửi tự động từ hệ thống SynapseS.</p>
                    <p>Thời gian gửi: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def send_otp_email(self, recipient_email: str, otp: str) -> Dict[str, Any]:
        """Gửi email OTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.sender_name} <{self.email}>"
            msg['To'] = recipient_email
            msg['Subject'] = f"Mã OTP đặt lại mật khẩu - {otp}"
            
            html_content = self.create_otp_email_html(otp, recipient_email)
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email, self.password)
                server.send_message(msg)
            
            logger.info(f"✅ Đã gửi OTP email đến {recipient_email}")
            return {
                "success": True,
                "message": "Email OTP đã được gửi thành công"
            }
            
        except Exception as e:
            logger.error(f"❌ Lỗi gửi email OTP: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi gửi email: {str(e)}"
            }

# Global instances
otp_service = OTPService()
email_service = EmailService()
