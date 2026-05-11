package authsvc

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"smart_school_go/config"
)

type OTPData struct {
	Email       string    `json:"email"`
	OTPEmail    string    `json:"otp_email"`
	OTP         string    `json:"otp"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Attempts    int       `json:"attempts"`
	MaxAttempts int       `json:"max_attempts"`
	IsVerified  bool      `json:"is_verified"`
}

const otpDir = "./temp_otp"

func init() {
	os.MkdirAll(otpDir, 0755)
}

func otpFilePath(email string) string {
	hash := sha256.Sum256([]byte(email))
	return filepath.Join(otpDir, fmt.Sprintf("otp_%x.json", hash))
}

func SaveOTP(email, otpEmail, otp string) error {
	cfg := config.Cfg
	data := OTPData{
		Email:       email,
		OTPEmail:    otpEmail,
		OTP:         otp,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(time.Duration(cfg.OTPExpiryMinutes) * time.Minute),
		Attempts:    0,
		MaxAttempts: 3,
		IsVerified:  false,
	}
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(otpFilePath(email), b, 0644)
}

func GetOTPData(email string) (*OTPData, error) {
	path := otpFilePath(email)
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var data OTPData
	if err := json.Unmarshal(b, &data); err != nil {
		return nil, err
	}
	if time.Now().After(data.ExpiresAt) {
		os.Remove(path)
		return nil, fmt.Errorf("OTP expired")
	}
	return &data, nil
}

func VerifyOTP(email, otp string) (bool, string, *OTPData) {
	data, err := GetOTPData(email)
	if err != nil {
		return false, "Mã OTP không tồn tại hoặc đã hết hạn", nil
	}

	if data.Attempts >= data.MaxAttempts {
		DeleteOTP(email)
		return false, "Đã vượt quá số lần thử tối đa. Vui lòng yêu cầu mã OTP mới", nil
	}

	data.Attempts++

	if data.OTP == otp {
		data.IsVerified = true
		saveOTPData(email, data)
		return true, "Xác thực OTP thành công", data
	}

	saveOTPData(email, data)
	remaining := data.MaxAttempts - data.Attempts
	return false, fmt.Sprintf("Mã OTP không đúng. Còn lại %d lần thử", remaining), nil
}

func DeleteOTP(email string) {
	os.Remove(otpFilePath(email))
}

func saveOTPData(email string, data *OTPData) {
	b, _ := json.MarshalIndent(data, "", "  ")
	os.WriteFile(otpFilePath(email), b, 0644)
}

func GetOTPStatus(email string) map[string]interface{} {
	data, err := GetOTPData(email)
	if err != nil {
		return map[string]interface{}{
			"exists":      false,
			"is_expired":  true,
			"is_verified": false,
		}
	}
	return map[string]interface{}{
		"exists":      true,
		"is_expired":  time.Now().After(data.ExpiresAt),
		"is_verified": data.IsVerified,
		"expires_at":  data.ExpiresAt,
		"attempts":    data.Attempts,
		"max_attempts": data.MaxAttempts,
	}
}

func CleanupExpiredOTPs() int {
	count := 0
	entries, err := os.ReadDir(otpDir)
	if err != nil {
		return 0
	}
	for _, entry := range entries {
		if filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		path := filepath.Join(otpDir, entry.Name())
		b, err := os.ReadFile(path)
		if err != nil {
			os.Remove(path)
			count++
			continue
		}
		var data OTPData
		if err := json.Unmarshal(b, &data); err != nil || time.Now().After(data.ExpiresAt) {
			os.Remove(path)
			count++
		}
	}
	return count
}
