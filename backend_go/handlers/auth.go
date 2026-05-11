package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"smart_school_go/config"
	"smart_school_go/database"
	"smart_school_go/middleware"
	"smart_school_go/models"
	authsvc "smart_school_go/services/auth"
)

// Suppress unused imports
var _ = json.Marshal
var _ = io.ReadAll

func generateOTP() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%06d", r.Intn(1000000))
}

// POST /api/auth/register
func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()

	// Check email uniqueness
	var existingEmail []map[string]interface{}
	db.From("users").Select("id", "", false).Eq("email", req.Email).ExecuteTo(&existingEmail)
	if len(existingEmail) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Email đã được sử dụng"})
		return
	}

	// Check username uniqueness
	if req.Username != "" {
		var existingUser []map[string]interface{}
		db.From("users").Select("id", "", false).Eq("username", req.Username).ExecuteTo(&existingUser)
		if len(existingUser) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"detail": "Username đã được sử dụng"})
			return
		}
	}

	hashedPwd, err := authsvc.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi hash password"})
		return
	}

	role := req.Role
	if role == "" {
		role = "teacher"
	}

	userData := map[string]interface{}{
		"email":         req.Email,
		"password_hash": hashedPwd,
		"full_name":     req.FullName,
		"role":          role,
		"is_active":     true,
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
	}
	if req.Username != "" {
		userData["username"] = req.Username
	}

	var inserted []map[string]interface{}
	_, err = db.From("users").Insert(userData, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo user"})
		return
	}

	user := inserted[0]
	delete(user, "password_hash")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng ký thành công",
		"data":    user,
	})
}

// POST /api/auth/login
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()

	// Find user by username or email
	var users []map[string]interface{}
	db.From("users").Select("*", "", false).Or("username.eq."+req.Username+",email.eq."+req.Username, "").ExecuteTo(&users)

	if len(users) == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Username hoặc password không đúng"})
		return
	}

	user := users[0]

	passwordHash, _ := user["password_hash"].(string)
	if !authsvc.VerifyPassword(req.Password, passwordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Username hoặc password không đúng"})
		return
	}

	isActive, _ := user["is_active"].(bool)
	if !isActive {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Tài khoản đã bị vô hiệu hóa"})
		return
	}

	// Use username or email as token subject
	subject, _ := user["username"].(string)
	if subject == "" {
		subject, _ = user["email"].(string)
	}

	accessToken, err := authsvc.CreateAccessToken(subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo token"})
		return
	}
	refreshToken, err := authsvc.CreateRefreshToken(subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo refresh token"})
		return
	}

	// Update last_login
	db.From("users").Update(map[string]interface{}{"last_login": time.Now().Format(time.RFC3339)}, "", "").Eq("id", fmt.Sprintf("%v", user["id"])).ExecuteTo(nil)

	delete(user, "password_hash")

	cfg := config.Cfg
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"token_type":    "bearer",
			"expires_in":    cfg.AccessTokenExpireMinutes * 60,
			"user":          user,
		},
	})
}

// GET /api/auth/me
func GetMe(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}
	delete(user, "password_hash")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy thông tin user thành công",
		"data":    user,
	})
}

// POST /api/auth/refresh
func RefreshToken(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	claims, err := authsvc.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Refresh token không hợp lệ"})
		return
	}
	if claims.Type != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Token type không hợp lệ"})
		return
	}

	// Load user
	db := database.GetClient()
	var users []map[string]interface{}
	db.From("users").Select("*", "", false).Or("username.eq."+claims.Sub+",email.eq."+claims.Sub, "").ExecuteTo(&users)
	if len(users) == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Người dùng không tồn tại"})
		return
	}

	user := users[0]
	subject, _ := user["email"].(string)
	if s, ok := user["username"].(string); ok && s != "" {
		subject = s
	}

	newAccessToken, err := authsvc.CreateAccessToken(subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo token"})
		return
	}

	delete(user, "password_hash")

	cfg := config.Cfg
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"access_token": newAccessToken,
			"token_type":   "bearer",
			"expires_in":   cfg.AccessTokenExpireMinutes * 60,
			"user":         user,
		},
	})
}

// POST /api/auth/logout
func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng xuất thành công",
	})
}

// PUT /api/auth/change-password  (JSON body)
func ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}

	db := database.GetClient()
	var users []map[string]interface{}
	db.From("users").Select("*", "", false).Eq("id", fmt.Sprintf("%v", user["id"])).ExecuteTo(&users)
	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy user"})
		return
	}

	dbUser := users[0]
	passwordHash, _ := dbUser["password_hash"].(string)
	if !authsvc.VerifyPassword(req.OldPassword, passwordHash) {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Password hiện tại không đúng"})
		return
	}

	newHash, err := authsvc.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi hash password"})
		return
	}

	db.From("users").Update(map[string]interface{}{
		"password_hash": newHash,
		"updated_at":    time.Now().Format(time.RFC3339),
	}, "", "").Eq("id", fmt.Sprintf("%v", user["id"])).ExecuteTo(nil)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đổi password thành công",
	})
}

// POST /api/auth/forgot-password
func ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	var users []map[string]interface{}
	db.From("users").Select("id,email,full_name,username", "", false).Eq("username", req.Username).ExecuteTo(&users)
	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Username không tồn tại trong hệ thống"})
		return
	}

	user := users[0]
	userEmail, _ := user["email"].(string)
	if !strings.EqualFold(userEmail, req.OTPEmail) {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Email nhận OTP không khớp với email của tài khoản này"})
		return
	}

	otp := generateOTP()
	if err := authsvc.SaveOTP(req.Username, req.OTPEmail, otp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo mã OTP"})
		return
	}

	if err := authsvc.SendOTPEmail(req.OTPEmail, otp); err != nil {
		authsvc.DeleteOTP(req.Username)
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Không thể gửi email OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Mã OTP đã được gửi đến email của bạn",
		"data": gin.H{
			"username":           req.Username,
			"otp_email":          req.OTPEmail,
			"otp_expiry_minutes": 10,
		},
	})
}

// POST /api/auth/verify-otp
func VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	ok, msg, _ := authsvc.VerifyOTP(req.Username, req.OTP)
	if !ok {
		statusCode := http.StatusBadRequest
		if strings.Contains(msg, "không tồn tại") {
			statusCode = http.StatusNotFound
		} else if strings.Contains(msg, "vượt quá") {
			statusCode = http.StatusTooManyRequests
		}
		c.JSON(statusCode, gin.H{"detail": msg})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": msg,
		"data": gin.H{
			"username":    req.Username,
			"is_verified": true,
		},
	})
}

// POST /api/auth/reset-password
func ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Mật khẩu mới và xác nhận mật khẩu không khớp"})
		return
	}

	ok, msg, _ := authsvc.VerifyOTP(req.Username, req.OTP)
	if !ok {
		statusCode := http.StatusBadRequest
		if strings.Contains(msg, "không tồn tại") {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{"detail": msg})
		return
	}

	db := database.GetClient()
	var users []map[string]interface{}
	db.From("users").Select("id,username", "", false).Eq("username", req.Username).ExecuteTo(&users)
	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy tài khoản"})
		return
	}

	newHash, err := authsvc.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi hash password"})
		return
	}

	user := users[0]
	db.From("users").Update(map[string]interface{}{
		"password_hash": newHash,
		"updated_at":    time.Now().Format(time.RFC3339),
	}, "", "").Eq("id", fmt.Sprintf("%v", user["id"])).ExecuteTo(nil)

	authsvc.DeleteOTP(req.Username)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đặt lại mật khẩu thành công",
		"data":    gin.H{"username": req.Username},
	})
}

// GET /api/auth/otp-status/:username
func GetOTPStatus(c *gin.Context) {
	username := c.Param("username")
	status := authsvc.GetOTPStatus(username)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy trạng thái OTP thành công",
		"data":    status,
	})
}
