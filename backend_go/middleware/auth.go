package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"smart_school_go/config"
	"smart_school_go/database"
)

type Claims struct {
	Sub  string `json:"sub"`
	Type string `json:"type"`
	jwt.RegisteredClaims
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Token không hợp lệ hoặc thiếu"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(config.Cfg.SecretKey), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Token không hợp lệ hoặc đã hết hạn"})
			c.Abort()
			return
		}

		if claims.Type != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Token type không hợp lệ"})
			c.Abort()
			return
		}

		// Load user from database
		db := database.GetClient()
		var users []map[string]interface{}
		_, err = db.From("users").Select("*", "", false).Eq("username", claims.Sub).ExecuteTo(&users)
		if err != nil || len(users) == 0 {
			// Try by email
			_, err = db.From("users").Select("*", "", false).Eq("email", claims.Sub).ExecuteTo(&users)
			if err != nil || len(users) == 0 {
				c.JSON(http.StatusUnauthorized, gin.H{"detail": "Người dùng không tồn tại"})
				c.Abort()
				return
			}
		}

		user := users[0]
		isActive, _ := user["is_active"].(bool)
		if !isActive {
			c.JSON(http.StatusForbidden, gin.H{"detail": "Tài khoản đã bị vô hiệu hóa"})
			c.Abort()
			return
		}

		c.Set("current_user", user)
		c.Set("username", claims.Sub)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		AuthRequired()(c)
		if c.IsAborted() {
			return
		}

		user, exists := c.Get("current_user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
			c.Abort()
			return
		}

		userMap, ok := user.(map[string]interface{})
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"detail": "Không đủ quyền"})
			c.Abort()
			return
		}

		role, _ := userMap["role"].(string)
		if role != "admin" && role != "super_admin" {
			c.JSON(http.StatusForbidden, gin.H{"detail": "Yêu cầu quyền admin"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func GetCurrentUser(c *gin.Context) map[string]interface{} {
	user, _ := c.Get("current_user")
	if u, ok := user.(map[string]interface{}); ok {
		return u
	}
	return nil
}
