package ocrsvc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"smart_school_go/config"
)

var ocrHTTPClient = &http.Client{Timeout: 120 * time.Second}

type GeminiOCRRequest struct {
	Contents         []GeminiOCRContent        `json:"contents"`
	GenerationConfig GeminiOCRGenerationConfig `json:"generationConfig"`
}

type GeminiOCRContent struct {
	Parts []GeminiOCRPart `json:"parts"`
}

type GeminiOCRPart struct {
	Text       string              `json:"text,omitempty"`
	InlineData *GeminiOCRInlineData `json:"inline_data,omitempty"`
}

type GeminiOCRInlineData struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type GeminiOCRGenerationConfig struct {
	MaxOutputTokens int     `json:"maxOutputTokens"`
	Temperature     float64 `json:"temperature"`
}

type GeminiOCRResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func ProcessOCRWithGemini(imageBase64, mimeType string) (string, error) {
	cfg := config.Cfg
	if cfg.GeminiAPIKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY không được cấu hình")
	}

	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	prompt := `Bạn là hệ thống OCR chuyên nghiệp. Hãy đọc và trích xuất toàn bộ nội dung từ ảnh bảng điểm này.

Yêu cầu:
1. Trích xuất tất cả thông tin: tên học sinh, mã học sinh, điểm số các môn
2. Giữ nguyên định dạng bảng (nếu có)
3. Trả về dữ liệu dạng JSON với cấu trúc:
{
  "students": [
    {
      "student_id": "...",
      "full_name": "...",
      "scores": [
        {"subject": "...", "score_type": "...", "value": ...}
      ]
    }
  ]
}
4. Nếu không nhận diện được rõ, ghi "unknown" cho trường đó
5. Điểm số phải là số (float hoặc int)`

	reqBody := GeminiOCRRequest{
		Contents: []GeminiOCRContent{
			{
				Parts: []GeminiOCRPart{
					{Text: prompt},
					{InlineData: &GeminiOCRInlineData{
						MimeType: mimeType,
						Data:     imageBase64,
					}},
				},
			},
		},
		GenerationConfig: GeminiOCRGenerationConfig{
			MaxOutputTokens: 8192,
			Temperature:     0.1,
		},
	}

	b, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	model := cfg.GeminiOCRModel
	if model == "" {
		model = "gemini-2.0-flash"
	}
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, cfg.GeminiAPIKey)

	resp, err := ocrHTTPClient.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var geminiResp GeminiOCRResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", fmt.Errorf("parse error: %w", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("Gemini OCR error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Không nhận được kết quả OCR")
	}

	return strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text), nil
}
