package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

func TimingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		elapsed := time.Since(start)
		c.Header("X-Process-Time", fmt.Sprintf("%.3f", elapsed.Seconds()))
	}
}
