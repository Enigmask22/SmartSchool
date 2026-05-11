package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	// Server
	Host  string
	Port  string
	Debug bool
	Env   string

	// Database
	SupabaseURL string
	SupabaseKey string

	// Auth
	SecretKey                  string
	Algorithm                  string
	AccessTokenExpireMinutes   int
	RefreshTokenExpireDays     int
	OTPExpiryMinutes           int

	// Logging
	LogLevel string

	// AI/Feedback
	FeedbackProvider string
	GeminiAPIKey     string
	OpenRouterAPIKey string
	OpenRouterModel  string
	OpenRouterSiteURL string
	OpenRouterAppName string

	// OCR
	OCRDefaultEngine        string
	OCRAllowEngineOverride  bool
	GeminiOCRModel          string
	GeminiOCRMaxConcurrent  int
	GeminiOCRBatchSize      int
	GeminiOCRWindowSeconds  int
	GeminiOCRMaxQueueSize   int
	GeminiOCRAvgProcessSecs int

	// Qwen OCR
	QwenModelName     string
	QwenDevice        string
	QwenMaxImageWidth int
	QwenMaxNewTokens  int

	// Face Recognition
	InsightFaceDevice string
	FaissUseGPU       bool

	// Email (SMTP)
	SMTPServer     string
	SMTPPort       int
	SMTPEmail      string
	SMTPPassword   string
	SMTPSenderName string

	// AI Sidecar
	AISidecarURL     string
	AISidecarEnabled bool
}

var Cfg *AppConfig

func Load() *AppConfig {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := &AppConfig{
		Host:  getEnv("HOST", "0.0.0.0"),
		Port:  getEnv("PORT", "8000"),
		Debug: getEnvBool("DEBUG", true),
		Env:   getEnv("ENV", "development"),

		SupabaseURL: getEnv("SUPABASE_URL", ""),
		SupabaseKey: getEnv("SUPABASE_KEY", ""),

		SecretKey:                getEnv("SECRET_KEY", "your-secret-key-change-this-in-production"),
		Algorithm:                getEnv("ALGORITHM", "HS256"),
		AccessTokenExpireMinutes: getEnvInt("ACCESS_TOKEN_EXPIRE_MINUTES", 60),
		RefreshTokenExpireDays:   getEnvInt("REFRESH_TOKEN_EXPIRE_DAYS", 1),
		OTPExpiryMinutes:         getEnvInt("OTP_EXPIRY_MINUTES", 10),

		LogLevel: getEnv("LOG_LEVEL", "WARNING"),

		FeedbackProvider:  getEnv("FEEDBACK_PROVIDER", "openrouter"),
		GeminiAPIKey:      getEnv("GEMINI_API_KEY", ""),
		OpenRouterAPIKey:  getEnv("OPENROUTER_API_KEY", ""),
		OpenRouterModel:   getEnv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
		OpenRouterSiteURL: getEnv("OPENROUTER_SITE_URL", "http://localhost:3000"),
		OpenRouterAppName: getEnv("OPENROUTER_APP_NAME", "Smart School"),

		OCRDefaultEngine:        getEnv("OCR_DEFAULT_ENGINE", "gemini"),
		OCRAllowEngineOverride:  getEnvBool("OCR_ALLOW_ENGINE_OVERRIDE", true),
		GeminiOCRModel:          getEnv("GEMINI_OCR_MODEL", "gemini-2.0-flash"),
		GeminiOCRMaxConcurrent:  getEnvInt("GEMINI_OCR_MAX_CONCURRENT_REQUESTS", 10),
		GeminiOCRBatchSize:      getEnvInt("GEMINI_OCR_BATCH_SIZE_PER_WINDOW", 10),
		GeminiOCRWindowSeconds:  getEnvInt("GEMINI_OCR_WINDOW_SECONDS", 60),
		GeminiOCRMaxQueueSize:   getEnvInt("GEMINI_OCR_MAX_QUEUE_SIZE", 300),
		GeminiOCRAvgProcessSecs: getEnvInt("GEMINI_OCR_AVG_PROCESSING_SECONDS", 20),

		QwenModelName:     getEnv("QWEN_MODEL_NAME", "Qwen/Qwen2.5-VL-3B-Instruct"),
		QwenDevice:        getEnv("QWEN_DEVICE", "cuda"),
		QwenMaxImageWidth: getEnvInt("QWEN_MAX_IMAGE_WIDTH", 2048),
		QwenMaxNewTokens:  getEnvInt("QWEN_MAX_NEW_TOKENS", 7000),

		InsightFaceDevice: getEnv("INSIGHTFACE_DEVICE", "auto"),
		FaissUseGPU:       getEnvBool("FAISS_USE_GPU", false),

		SMTPServer:     getEnv("SMTP_SERVER", "smtp.gmail.com"),
		SMTPPort:       getEnvInt("SMTP_PORT", 587),
		SMTPEmail:      getEnv("SMTP_EMAIL", ""),
		SMTPPassword:   getEnv("SMTP_PASSWORD", ""),
		SMTPSenderName: getEnv("SMTP_SENDER_NAME", "SynapseS System"),

		AISidecarURL:     getEnv("AI_SIDECAR_URL", "http://localhost:8001"),
		AISidecarEnabled: getEnvBool("AI_SIDECAR_ENABLED", true),
	}

	Cfg = cfg
	return cfg
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return defaultVal
}
