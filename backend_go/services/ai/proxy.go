package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"smart_school_go/config"
)

var aiHTTPClient = &http.Client{Timeout: 60 * time.Second}

func sidecarURL(path string) string {
	base := config.Cfg.AISidecarURL
	if base == "" {
		base = "http://localhost:8001"
	}
	return base + path
}

func ProxyRequest(method, path string, body interface{}) (map[string]interface{}, error) {
	if !config.Cfg.AISidecarEnabled {
		return map[string]interface{}{
			"success": false,
			"message": "AI Sidecar không được bật",
		}, nil
	}

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, sidecarURL(path), reqBody)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := aiHTTPClient.Do(req)
	if err != nil {
		return map[string]interface{}{
			"success":      false,
			"message":      fmt.Sprintf("AI Sidecar không khả dụng: %v", err),
			"is_available": false,
		}, nil
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse AI response: %w", err)
	}
	return result, nil
}

func RecognizeFace(imageBase64 string, threshold float64) (map[string]interface{}, error) {
	return ProxyRequest("POST", "/face/recognize", map[string]interface{}{
		"image_base64":         imageBase64,
		"confidence_threshold": threshold,
	})
}

func RegisterFace(studentID int, imageBase64 string) (map[string]interface{}, error) {
	return ProxyRequest("POST", fmt.Sprintf("/face/register/%d", studentID), map[string]interface{}{
		"image_base64": imageBase64,
	})
}

func DeleteFace(studentID int) (map[string]interface{}, error) {
	return ProxyRequest("DELETE", fmt.Sprintf("/face/%d", studentID), nil)
}

func ReloadFaces() (map[string]interface{}, error) {
	return ProxyRequest("POST", "/face/reload", map[string]interface{}{
		"supabase_url": config.Cfg.SupabaseURL,
		"supabase_key": config.Cfg.SupabaseKey,
	})
}

func GetFaceStatus() (map[string]interface{}, error) {
	return ProxyRequest("GET", "/face/status", nil)
}

func CountFaces(imageBase64 string) (map[string]interface{}, error) {
	return ProxyRequest("POST", "/face/count", map[string]interface{}{
		"image_base64": imageBase64,
	})
}

func ProcessOCRViaSidecar(imageBase64, mimeType string) (string, error) {
	result, err := ProxyRequest("POST", "/ocr/process", map[string]interface{}{
		"image_base64": imageBase64,
		"mime_type":    mimeType,
	})
	if err != nil {
		return "", err
	}
	if text, ok := result["result"].(string); ok {
		return text, nil
	}
	return "", fmt.Errorf("OCR sidecar trả về kết quả không hợp lệ")
}

func IsAvailable() bool {
	if !config.Cfg.AISidecarEnabled {
		return false
	}
	resp, err := aiHTTPClient.Get(sidecarURL("/health"))
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}
