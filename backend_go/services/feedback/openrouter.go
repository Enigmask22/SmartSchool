package feedbacksvc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"smart_school_go/config"
)

type OpenRouterRequest struct {
	Model    string              `json:"model"`
	Messages []OpenRouterMessage `json:"messages"`
}

type OpenRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func GenerateStudentFeedbackOpenRouter(studentName string, score float64, attendanceRate int, topSubjects, weakSubjects []string, notes string) (string, error) {
	cfg := config.Cfg
	if cfg.OpenRouterAPIKey == "" {
		return "", fmt.Errorf("OPENROUTER_API_KEY không được cấu hình")
	}

	prompt := buildFeedbackPrompt(studentName, score, attendanceRate, topSubjects, weakSubjects, notes)

	reqBody := OpenRouterRequest{
		Model: cfg.OpenRouterModel,
		Messages: []OpenRouterMessage{
			{Role: "user", Content: prompt},
		},
	}

	b, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.OpenRouterAPIKey)
	req.Header.Set("HTTP-Referer", cfg.OpenRouterSiteURL)
	req.Header.Set("X-Title", cfg.OpenRouterAppName)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var orResp OpenRouterResponse
	if err := json.Unmarshal(body, &orResp); err != nil {
		return "", fmt.Errorf("parse error: %w", err)
	}

	if orResp.Error != nil {
		return "", fmt.Errorf("OpenRouter error: %s", orResp.Error.Message)
	}

	if len(orResp.Choices) == 0 {
		return "", fmt.Errorf("Không có phản hồi từ OpenRouter")
	}

	return strings.TrimSpace(orResp.Choices[0].Message.Content), nil
}
