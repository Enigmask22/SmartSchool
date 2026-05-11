package authsvc

import (
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	// bcrypt giới hạn 72 bytes (y hệt Python passlib)
	b := []byte(password)
	if len(b) > 72 {
		b = b[:72]
	}
	hashed, err := bcrypt.GenerateFromPassword(b, bcrypt.DefaultCost)
	return string(hashed), err
}

func VerifyPassword(plain, hashed string) bool {
	b := []byte(plain)
	if len(b) > 72 {
		b = b[:72]
	}
	err := bcrypt.CompareHashAndPassword([]byte(hashed), b)
	return err == nil
}
