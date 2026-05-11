package authsvc

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"smart_school_go/config"
)

type Claims struct {
	Sub  string `json:"sub"`
	Type string `json:"type"`
	jwt.RegisteredClaims
}

func CreateAccessToken(subject string) (string, error) {
	cfg := config.Cfg
	expiry := time.Duration(cfg.AccessTokenExpireMinutes) * time.Minute
	claims := Claims{
		Sub:  subject,
		Type: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.SecretKey))
}

func CreateRefreshToken(subject string) (string, error) {
	cfg := config.Cfg
	expiry := time.Duration(cfg.RefreshTokenExpireDays) * 24 * time.Hour
	claims := Claims{
		Sub:  subject,
		Type: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.SecretKey))
}

func ValidateToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.Cfg.SecretKey), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}
