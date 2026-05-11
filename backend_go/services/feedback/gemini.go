package feedbacksvc

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

type GeminiRequest struct {
	Contents         []GeminiContent        `json:"contents"`
	GenerationConfig GeminiGenerationConfig `json:"generationConfig"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text,omitempty"`
	InlineData *GeminiInlineData `json:"inline_data,omitempty"`
}

type GeminiInlineData struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type GeminiGenerationConfig struct {
	CandidateCount int     `json:"candidateCount"`
	MaxOutputTokens int    `json:"maxOutputTokens"`
	Temperature    float64 `json:"temperature"`
}

type GeminiResponse struct {
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

var httpClient = &http.Client{Timeout: 60 * time.Second}

func GenerateStudentFeedback(studentName string, score float64, attendanceRate int, topSubjects, weakSubjects []string, notes string) (string, error) {
	prompt := buildFeedbackPrompt(studentName, score, attendanceRate, topSubjects, weakSubjects, notes)
	return callGeminiAPI(prompt)
}

func buildFeedbackPrompt(studentName string, score float64, attendanceRate int, topSubjects, weakSubjects []string, notes string) string {
	topText := "Không có"
	if len(topSubjects) > 0 {
		limit := topSubjects
		if len(limit) > 5 {
			limit = limit[:5]
		}
		topText = strings.Join(limit, ", ")
	}
	weakText := "Không có"
	if len(weakSubjects) > 0 {
		limit := weakSubjects
		if len(limit) > 5 {
			limit = limit[:5]
		}
		weakText = strings.Join(limit, ", ")
	}

	negativeWords := []string{"vắng", "nghỉ", "trốn", "đi trễ", "không chuyên cần", "muộn học", "bỏ tiết", "trốn học", "cúp học"}
	negativeAttendance := false
	notesLower := strings.ToLower(notes)
	for _, w := range negativeWords {
		if strings.Contains(notesLower, w) {
			negativeAttendance = true
			break
		}
	}

	attendanceHint := ""
	if !negativeAttendance {
		attendanceHint = "- Lưu ý: Nếu không có ghi chú tiêu cực về chuyên cần, hãy TẶNG THÊM một câu khen em có ý thức đi học đầy đủ, đúng giờ, ngay sau câu khen về thành tích. Không cần sáng tạo thêm lý do hoặc chi tiết khác."
	}

	notesStr := notes
	if notesStr == "" {
		notesStr = "Không có"
	}

	return fmt.Sprintf(`Bạn là trợ lý AI của giáo viên chủ nhiệm. Hãy nhập vai giáo viên và viết nhận xét ngắn gọn, chuyên nghiệp cho học sinh (không phải sinh viên) để gửi cho phụ huynh.

**QUY TẮC BẮT BUỘC:**
- Chỉ trả lời đúng nội dung nhận xét, KHÔNG thêm lời chào hay tiêu đề.
- Văn phong: tích cực, mang tính xây dựng, khích lệ; nhưng rõ ràng và cụ thể.
- Nếu điểm trung bình < 7.0 hoặc có môn yếu thì cần đưa gợi ý cải thiện cụ thể.
- Mặc định chuyên cần tốt (đi học đầy đủ, đúng giờ); NẾU ghi chú nêu vắng/đi trễ thì phải đề cập và khuyến nghị khắc phục.
- Ưu tiên sử dụng thông tin môn mạnh/yếu nếu có; không suy diễn ngoài dữ liệu.
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng. Độ dài: 2–3 câu, không dùng markdown.
%s

**DỮ LIỆU HỌC SINH:**
- Tên: %s
- Điểm trung bình học kì: %.1f/10
- Môn học tốt: %s
- Môn học chưa tốt: %s
- Chuyên cần (mặc định tốt nếu không ghi chú tiêu cực): %d%%
- Ghi chú của GVCN (ưu tiên về chuyên cần): %s

Dựa trên dữ liệu trên, viết nhận xét cho học sinh này.`,
		attendanceHint, studentName, score, topText, weakText, attendanceRate, notesStr)
}

func callGeminiAPI(prompt string) (string, error) {
	cfg := config.Cfg
	if cfg.GeminiAPIKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY không được cấu hình")
	}

	model := "gemini-2.0-flash"
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, cfg.GeminiAPIKey)

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{Parts: []GeminiPart{{Text: prompt}}},
		},
		GenerationConfig: GeminiGenerationConfig{
			CandidateCount:  1,
			MaxOutputTokens: 2048,
			Temperature:     0.7,
		},
	}

	b, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	resp, err := httpClient.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", fmt.Errorf("parse response error: %w", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Không nhận được phản hồi từ Gemini API")
	}

	return strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text), nil
}

func GenerateBatchFeedback(students []map[string]interface{}) map[string]interface{} {
	var feedbacks []map[string]interface{}
	successCount := 0
	failedCount := 0
	var failedStudents []string

	for _, s := range students {
		name, _ := s["name"].(string)
		score, _ := s["score"].(float64)
		attendance, _ := s["attendance"].(float64)
		notes, _ := s["notes"].(string)

		var topSubjects []string
		if ts, ok := s["top_subjects"].([]interface{}); ok {
			for _, v := range ts {
				if str, ok := v.(string); ok {
					topSubjects = append(topSubjects, str)
				}
			}
		}
		var weakSubjects []string
		if ws, ok := s["weak_subjects"].([]interface{}); ok {
			for _, v := range ws {
				if str, ok := v.(string); ok {
					weakSubjects = append(weakSubjects, str)
				}
			}
		}

		text, err := GenerateStudentFeedback(name, score, int(attendance), topSubjects, weakSubjects, notes)
		if err != nil {
			failedCount++
			failedStudents = append(failedStudents, name)
			feedbacks = append(feedbacks, map[string]interface{}{
				"student_name": name,
				"feedback":     "",
				"success":      false,
				"error":        err.Error(),
			})
		} else {
			successCount++
			feedbacks = append(feedbacks, map[string]interface{}{
				"student_name": name,
				"feedback":     text,
				"success":      true,
				"error":        nil,
			})
		}
	}

	return map[string]interface{}{
		"success_count":   successCount,
		"failed_count":    failedCount,
		"failed_students": failedStudents,
		"feedbacks":       feedbacks,
	}
}
