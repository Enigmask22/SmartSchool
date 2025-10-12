"""
OTP Service để quản lý mã OTP tạm thời cho chức năng quên mật khẩu
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

from utils.logger import setup_logger

logger = setup_logger("otp_service")

class OTPService:
    """Service quản lý OTP tạm thời"""
    
    def __init__(self, storage_dir: str = "./temp_otp"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.otp_expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
        
    def _get_otp_file_path(self, email: str) -> Path:
        """Lấy đường dẫn file OTP cho email"""
        # Hash email để tạo tên file an toàn
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        return self.storage_dir / f"otp_{email_hash}.json"
    
    def generate_and_store_otp(self, email: str, otp_email: str, otp: str) -> bool:
        """
        Tạo và lưu trữ OTP tạm thời
        
        Args:
            email: Email đăng nhập
            otp_email: Email nhận OTP
            otp: Mã OTP 6 số
            
        Returns:
            bool: True nếu lưu thành công
        """
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
        """
        Lấy dữ liệu OTP cho email
        
        Args:
            email: Email đăng nhập
            
        Returns:
            Dict chứa dữ liệu OTP hoặc None nếu không tồn tại
        """
        try:
            otp_file = self._get_otp_file_path(email)
            if not otp_file.exists():
                return None
            
            with open(otp_file, 'r', encoding='utf-8') as f:
                otp_data = json.load(f)
            
            # Kiểm tra xem OTP có hết hạn không
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
        """
        Xác thực OTP
        
        Args:
            email: Email đăng nhập
            otp: Mã OTP cần kiểm tra
            
        Returns:
            Dict chứa kết quả xác thực
        """
        try:
            otp_data = self.get_otp_data(email)
            if not otp_data:
                return {
                    "success": False,
                    "message": "Mã OTP không tồn tại hoặc đã hết hạn",
                    "error_code": "OTP_NOT_FOUND"
                }
            
            # Kiểm tra số lần thử
            if otp_data['attempts'] >= otp_data['max_attempts']:
                self.delete_otp(email)
                return {
                    "success": False,
                    "message": "Đã vượt quá số lần thử tối đa. Vui lòng yêu cầu mã OTP mới",
                    "error_code": "MAX_ATTEMPTS_EXCEEDED"
                }
            
            # Tăng số lần thử
            otp_data['attempts'] += 1
            
            # Kiểm tra OTP
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
        """
        Xóa OTP tạm thời
        
        Args:
            email: Email đăng nhập
            
        Returns:
            bool: True nếu xóa thành công
        """
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
        """
        Dọn dẹp các OTP đã hết hạn
        
        Returns:
            int: Số lượng file đã xóa
        """
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
                    # Xóa file bị lỗi
                    otp_file.unlink()
                    deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"🧹 Đã dọn dẹp {deleted_count} OTP hết hạn")
                
        except Exception as e:
            logger.error(f"❌ Lỗi dọn dẹp OTP hết hạn: {str(e)}")
        
        return deleted_count
    
    def get_otp_status(self, email: str) -> Dict[str, Any]:
        """
        Lấy trạng thái OTP
        
        Args:
            email: Email đăng nhập
            
        Returns:
            Dict chứa thông tin trạng thái OTP
        """
        otp_data = self.get_otp_data(email)
        if not otp_data:
            return {
                "exists": False,
                "message": "Không có OTP nào cho email này"
            }
        
        expires_at = datetime.fromisoformat(otp_data['expires_at'])
        remaining_time = (expires_at - datetime.now()).total_seconds()
        
        return {
            "exists": True,
            "is_verified": otp_data['is_verified'],
            "attempts": otp_data['attempts'],
            "max_attempts": otp_data['max_attempts'],
            "remaining_attempts": otp_data['max_attempts'] - otp_data['attempts'],
            "remaining_time_seconds": max(0, remaining_time),
            "expires_at": otp_data['expires_at']
        }

# Global instance
otp_service = OTPService()
