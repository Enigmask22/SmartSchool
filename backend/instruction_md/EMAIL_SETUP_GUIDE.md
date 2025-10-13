# Hướng dẫn cấu hình Email Service cho chức năng Quên mật khẩu

## 1. Cấu hình Gmail SMTP

### Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào tài khoản Gmail của bạn
2. Truy cập [Google Account Settings](https://myaccount.google.com/)
3. Chọn **Security** → **2-Step Verification** (bật nếu chưa có)
4. Chọn **App passwords**
5. Tạo app password mới cho "Smart School System"
6. Copy mật khẩu được tạo (16 ký tự, không có dấu cách)

### Bước 2: Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_SENDER_NAME=Smart School System

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

## 2. Cấu hình các Email Provider khác

### Outlook/Hotmail

```bash
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_EMAIL=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo Mail

```bash
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_EMAIL=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### Custom SMTP Server

```bash
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
SMTP_EMAIL=your-email@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_SENDER_NAME=Your Organization Name
```

## 3. Kiểm tra cấu hình

Sau khi cấu hình, khởi động lại server và kiểm tra logs:

```bash
# Khởi động server
python main.py

# Kiểm tra logs để thấy thông báo
# ✅ SMTP đã được cấu hình thành công
# hoặc
# ⚠️ SMTP chưa được cấu hình, sử dụng OTP giả lập
```

## 4. Chế độ Development

Nếu không muốn cấu hình SMTP, hệ thống sẽ sử dụng OTP cố định `123456` trong chế độ development.

## 5. Troubleshooting

### Lỗi "Authentication failed"

- Kiểm tra lại email và password
- Đảm bảo đã bật 2-Step Verification cho Gmail
- Sử dụng App Password thay vì mật khẩu thường

### Lỗi "Connection refused"

- Kiểm tra SMTP_SERVER và SMTP_PORT
- Đảm bảo firewall không chặn port 587
- Thử port 465 với SSL thay vì 587 với TLS

### Email không được gửi

- Kiểm tra thư mục Spam
- Kiểm tra logs server để xem lỗi chi tiết
- Thử với email khác để test

## 6. Bảo mật

- Không commit file `.env` vào git
- Sử dụng App Password thay vì mật khẩu chính
- Giới hạn quyền truy cập của App Password
- Thường xuyên thay đổi App Password
