"""
Email Service để gửi email OTP cho chức năng quên mật khẩu
"""

import os
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta

from utils.logger import setup_logger

logger = setup_logger("email_service")

class EmailService:
    """Service gửi email OTP cho chức năng quên mật khẩu"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email = os.getenv("SMTP_EMAIL", "your-email@gmail.com")
        self.password = os.getenv("SMTP_PASSWORD", "your-app-password")
        self.sender_name = os.getenv("SMTP_SENDER_NAME", "Smart School System")
        
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
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mã OTP đặt lại mật khẩu</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    border-radius: 10px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    background-color: #4f46e5;
                    color: white;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 24px;
                    font-weight: bold;
                }}
                .title {{
                    color: #1f2937;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                .subtitle {{
                    color: #6b7280;
                    font-size: 16px;
                }}
                .otp-container {{
                    background-color: #f3f4f6;
                    border: 2px dashed #4f46e5;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 30px 0;
                }}
                .otp-code {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #4f46e5;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                }}
                .warning {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">📚</div>
                    <h1 class="title">Hệ thống quản lý điểm số</h1>
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
                    <p>Email này được gửi tự động từ hệ thống Smart School.</p>
                    <p>Thời gian gửi: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_otp_email_text(self, otp: str, recipient_email: str) -> str:
        """Tạo nội dung email text cho OTP"""
        return f"""
Hệ thống quản lý điểm số - Mã OTP đặt lại mật khẩu

Xin chào,

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {recipient_email}.

Để tiếp tục quá trình đặt lại mật khẩu, vui lòng sử dụng mã OTP sau:

MÃ OTP: {otp}

Lưu ý quan trọng:
- Mã OTP này chỉ có hiệu lực trong 10 phút
- Không chia sẻ mã này với bất kỳ ai
- Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

Nếu bạn gặp khó khăn, vui lòng liên hệ với quản trị viên hệ thống.

---
Email này được gửi tự động từ hệ thống Smart School.
Thời gian gửi: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
        """
    
    async def send_otp_email(self, recipient_email: str, otp: str) -> bool:
        """
        Gửi email chứa mã OTP
        
        Args:
            recipient_email: Email người nhận
            otp: Mã OTP 6 số
            
        Returns:
            bool: True nếu gửi thành công, False nếu thất bại
        """
        try:
            # Tạo message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Smart School] Mã OTP đặt lại mật khẩu - {otp}"
            msg['From'] = f"{self.sender_name} <{self.email}>"
            msg['To'] = recipient_email
            
            # Tạo nội dung text và HTML
            text_content = self.create_otp_email_text(otp, recipient_email)
            html_content = self.create_otp_email_html(otp, recipient_email)
            
            # Attach parts
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Gửi email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email, self.password)
                server.send_message(msg)
            
            logger.info(f"✅ Gửi email OTP thành công đến {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Lỗi gửi email OTP đến {recipient_email}: {str(e)}")
            return False
    
    def is_smtp_configured(self) -> bool:
        """Kiểm tra xem SMTP đã được cấu hình chưa"""
        return bool(
            self.email and 
            self.password and 
            self.email != "your-email@gmail.com" and 
            self.password != "your-app-password"
        )

# Global instance
email_service = EmailService()
