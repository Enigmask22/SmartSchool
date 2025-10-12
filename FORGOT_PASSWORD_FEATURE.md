# Chức năng Quên Mật Khẩu

## Tổng quan

Chức năng quên mật khẩu cho phép người dùng đặt lại mật khẩu thông qua email OTP với flow an toàn và dễ sử dụng.

## Flow hoạt động

### 1. Nhấn nút "Quên mật khẩu"
- Từ trang đăng nhập, người dùng nhấn nút "Quên mật khẩu?"
- Chuyển sang form nhập email

### 2. Nhập email đăng nhập và email nhận OTP
- **Email đăng nhập**: Email tài khoản trong hệ thống
- **Email nhận OTP**: Email để nhận mã OTP (có thể khác email đăng nhập)
- Hệ thống kiểm tra email đăng nhập có tồn tại không
- Tạo mã OTP 6 số ngẫu nhiên
- Lưu OTP tạm thời với thời hạn 10 phút

### 3. Gửi OTP qua email
- Gửi email HTML đẹp mắt chứa mã OTP
- Email có thiết kế responsive và chuyên nghiệp
- Hiển thị thông báo thành công

### 4. Nhập mã OTP
- Form 6 ô số để nhập OTP
- Hỗ trợ paste từ clipboard
- Tự động chuyển ô khi nhập
- Xử lý phím Backspace
- Hiển thị thời gian hết hạn (10 phút)

### 5. Xác thực OTP
- So sánh OTP nhập với OTP đã lưu
- Giới hạn 3 lần thử
- Thông báo lỗi rõ ràng
- Xóa OTP sau khi xác thực thành công

### 6. Đặt mật khẩu mới
- Form nhập mật khẩu mới và xác nhận
- Kiểm tra mật khẩu khớp nhau
- Hash mật khẩu mới với bcrypt
- Cập nhật database
- Thông báo thành công và chuyển về trang đăng nhập

## Cấu trúc Backend

### API Endpoints

```
POST /api/auth/forgot-password
- Gửi OTP qua email
- Body: {email, otp_email}

POST /api/auth/verify-otp  
- Xác thực mã OTP
- Body: {email, otp}

POST /api/auth/reset-password
- Đặt lại mật khẩu mới
- Body: {email, otp, new_password, confirm_password}

GET /api/auth/otp-status/{email}
- Lấy trạng thái OTP
```

### Services

#### EmailService (`backend/services/email_service.py`)
- Tạo mã OTP ngẫu nhiên 6 số
- Gửi email HTML với thiết kế đẹp
- Hỗ trợ nhiều SMTP providers
- Chế độ demo khi chưa cấu hình SMTP

#### OTPService (`backend/services/otp_service.py`)
- Lưu trữ OTP tạm thời trong file JSON
- Quản lý thời gian hết hạn (10 phút)
- Giới hạn số lần thử (3 lần)
- Tự động dọn dẹp OTP hết hạn

### Schemas (`backend/models/schemas.py`)
```python
class ForgotPasswordRequest(BaseModel):
    email: str
    otp_email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: str
```

## Cấu trúc Frontend

### Components

#### ForgotPassword (`frontend/src/components/ForgotPassword.jsx`)
- Multi-step form với 3 bước
- UI responsive và đẹp mắt
- Xử lý lỗi và thông báo thành công
- Auto-focus và keyboard navigation

#### Login (cập nhật)
- Thêm nút "Quên mật khẩu?"
- Tích hợp với ForgotPassword component

### API Service (`frontend/src/services/api.jsx`)
```javascript
// Forgot Password API methods
forgotPassword(email, otpEmail)
verifyOTP(email, otp)
resetPassword(email, otp, newPassword, confirmPassword)
getOTPStatus(email)
```

## Cấu hình

### Environment Variables
```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SENDER_NAME=Smart School System

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

### Hướng dẫn cấu hình
Xem file `backend/EMAIL_SETUP_GUIDE.md` để biết cách cấu hình SMTP.

## Bảo mật

### Tính năng bảo mật
- ✅ OTP có thời hạn (10 phút)
- ✅ Giới hạn số lần thử (3 lần)
- ✅ Hash mật khẩu với bcrypt
- ✅ Xóa OTP sau khi sử dụng
- ✅ Validation đầu vào
- ✅ Rate limiting (có thể thêm)

### Lưu trữ OTP
- OTP được lưu tạm thời trong file JSON
- Mã hóa email để tạo tên file an toàn
- Tự động dọn dẹp OTP hết hạn
- Không lưu OTP trong database

## Testing

### Test Script
```bash
cd backend
python test_forgot_password.py
```

### Manual Testing
1. Cấu hình SMTP (xem EMAIL_SETUP_GUIDE.md)
2. Khởi động backend: `python main.py`
3. Khởi động frontend: `cd frontend && npm start`
4. Truy cập http://localhost:3000
5. Nhấn "Quên mật khẩu?" và test flow

## Troubleshooting

### SMTP không hoạt động
- Kiểm tra cấu hình email trong `.env`
- Đảm bảo đã bật 2-Step Verification cho Gmail
- Sử dụng App Password thay vì mật khẩu thường
- Kiểm tra firewall và port 587

### OTP không được gửi
- Kiểm tra logs backend
- Thử với email khác
- Kiểm tra thư mục Spam
- Sử dụng chế độ demo (OTP: 123456)

### Frontend lỗi
- Kiểm tra console browser
- Đảm bảo backend đang chạy
- Kiểm tra CORS settings
- Refresh trang và thử lại

## Tính năng mở rộng

### Có thể thêm
- [ ] SMS OTP thay vì email
- [ ] Rate limiting cho API
- [ ] Captcha để chống spam
- [ ] OTP QR code
- [ ] Multiple email providers
- [ ] Email templates customization
- [ ] Audit logs cho forgot password
- [ ] Account lockout sau nhiều lần thử

### Cải tiến UI/UX
- [ ] Progress indicator cho multi-step form
- [ ] Auto-resend OTP
- [ ] Remember device
- [ ] Biometric authentication
- [ ] Dark mode support
