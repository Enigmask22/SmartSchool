package authsvc

import (
	"crypto/tls"
	"fmt"
	"time"

	"gopkg.in/gomail.v2"
	"smart_school_go/config"
)

func SendOTPEmail(recipientEmail, otp string) error {
	cfg := config.Cfg

	subject := fmt.Sprintf("Mã OTP đặt lại mật khẩu - %s", otp)
	body := buildOTPEmailHTML(otp, recipientEmail)

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", cfg.SMTPSenderName, cfg.SMTPEmail))
	m.SetHeader("To", recipientEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(cfg.SMTPServer, cfg.SMTPPort, cfg.SMTPEmail, cfg.SMTPPassword)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: false}

	return d.DialAndSend(m)
}

func buildOTPEmailHTML(otp, recipientEmail string) string {
	now := time.Now().Format("02/01/2006 15:04:05")
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Mã OTP đặt lại mật khẩu</title>
<style>
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#f8f9fa}
.container{background-color:white;border-radius:10px;padding:30px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.title{color:#1f2937;font-size:24px;font-weight:bold;margin-bottom:10px}
.otp-container{background-color:#f3f4f6;border:2px dashed #4f46e5;border-radius:8px;padding:20px;text-align:center;margin:30px 0}
.otp-code{font-size:32px;font-weight:bold;color:#4f46e5;letter-spacing:8px;font-family:'Courier New',monospace}
.warning{background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:4px}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px}
</style>
</head>
<body>
<div class="container">
<h1 class="title">SynapseS - Mã OTP đặt lại mật khẩu</h1>
<p>Xin chào,</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>%s</strong>.</p>
<p>Để tiếp tục, vui lòng sử dụng mã OTP sau:</p>
<div class="otp-container">
<div class="otp-code">%s</div>
</div>
<div class="warning">
<strong>⚠️ Lưu ý quan trọng:</strong>
<ul style="margin:10px 0;padding-left:20px;">
<li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
<li>Không chia sẻ mã này với bất kỳ ai</li>
<li>Nếu bạn không yêu cầu, vui lòng bỏ qua email này</li>
</ul>
</div>
<div class="footer">
<p>Email này được gửi tự động từ hệ thống SynapseS.</p>
<p>Thời gian gửi: %s</p>
</div>
</div>
</body>
</html>`, recipientEmail, otp, now)
}
