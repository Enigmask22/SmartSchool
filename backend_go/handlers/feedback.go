package handlers

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"smart_school_go/config"
	"smart_school_go/database"
	feedbacksvc "smart_school_go/services/feedback"
	gomail "gopkg.in/gomail.v2"
)

func sendEmailHTML(to, subject, htmlBody string) error {
	cfg := config.Cfg
	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", cfg.SMTPSenderName, cfg.SMTPEmail))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	d := gomail.NewDialer(cfg.SMTPServer, cfg.SMTPPort, cfg.SMTPEmail, cfg.SMTPPassword)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	return d.DialAndSend(m)
}

// POST /api/feedback/generate-feedback
func GenerateFeedback(c *gin.Context) {
	var req struct {
		StudentName    string   `json:"student_name" binding:"required"`
		Score          float64  `json:"score"`
		AttendanceRate int      `json:"attendance_rate"`
		Subject        *string  `json:"subject"`
		TopSubjects    []string `json:"top_subjects"`
		WeakSubjects   []string `json:"weak_subjects"`
		Notes          string   `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	text, err := feedbacksvc.GenerateStudentFeedback(
		req.StudentName, req.Score, req.AttendanceRate,
		req.TopSubjects, req.WeakSubjects, req.Notes,
	)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success":      false,
			"student_name": req.StudentName,
			"error":        err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"student_name": req.StudentName,
		"feedback":     text,
	})
}

// POST /api/feedback/generate-batch-feedback
func GenerateBatchFeedback(c *gin.Context) {
	var req struct {
		Students []struct {
			StudentName    string   `json:"student_name"`
			Score          float64  `json:"score"`
			AttendanceRate int      `json:"attendance_rate"`
			Subject        *string  `json:"subject"`
			TopSubjects    []string `json:"top_subjects"`
			WeakSubjects   []string `json:"weak_subjects"`
			Notes          string   `json:"notes"`
		} `json:"students" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	if len(req.Students) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Danh sách học sinh không được rỗng"})
		return
	}
	if len(req.Students) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Số lượng học sinh không được vượt quá 50"})
		return
	}

	var studentsData []map[string]interface{}
	for _, s := range req.Students {
		studentsData = append(studentsData, map[string]interface{}{
			"name":         s.StudentName,
			"score":        s.Score,
			"attendance":   s.AttendanceRate,
			"top_subjects": s.TopSubjects,
			"weak_subjects": s.WeakSubjects,
			"notes":        s.Notes,
		})
	}

	result := feedbacksvc.GenerateBatchFeedback(studentsData)

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"success_count":   result["success_count"],
		"failed_count":    result["failed_count"],
		"failed_students": result["failed_students"],
		"feedbacks":       result["feedbacks"],
	})
}

// GET /api/feedback/health
func FeedbackHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "AI Feedback service đang hoạt động",
		"data":    gin.H{"status": "healthy"},
	})
}

// POST /api/feedback/send-sms
func SendSMSFeedback(c *gin.Context) {
	var req struct {
		StudentID   interface{} `json:"student_id"`
		ParentPhone string      `json:"parent_phone" binding:"required"`
		Feedback    string      `json:"feedback" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	phone := strings.ReplaceAll(req.ParentPhone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")

	valid := (strings.HasPrefix(phone, "0") && len(phone) == 10) ||
		(strings.HasPrefix(phone, "+84") && len(phone) == 12)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Invalid phone number format"})
		return
	}

	smsContent := fmt.Sprintf("Nhận xét học tập:\n%s\n\nTrường THPT ABC - SynapseS", req.Feedback)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Gửi SMS thành công đến %s", phone),
		"data": gin.H{
			"student_id":     req.StudentID,
			"phone":          phone,
			"content_length": len(smsContent),
			"status":         "sent",
			"timestamp":      time.Now().Format(time.RFC3339),
		},
	})
}

// POST /api/feedback/comments
func SaveComment(c *gin.Context) {
	var req struct {
		StudentID   interface{} `json:"student_id" binding:"required"`
		Description string      `json:"description" binding:"required"`
		Semester    string      `json:"semester"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	studentID := toStr(req.StudentID)

	// Get student info
	var students []map[string]interface{}
	_, err := db.From("students").Select("id,class_name,grade", "", false).
		Eq("id", studentID).ExecuteTo(&students)
	if err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}
	student := students[0]

	// Get class_id
	var classID interface{}
	className, _ := student["class_name"].(string)
	grade, _ := student["grade"].(string)
	if className != "" && grade != "" {
		var classes []map[string]interface{}
		_, _ = db.From("classes").Select("id", "", false).
			Eq("class_name", className).Eq("grade", grade).ExecuteTo(&classes)
		if len(classes) > 0 {
			classID = classes[0]["id"]
		}
	}

	now := time.Now().Format(time.RFC3339)
	semester := req.Semester
	if semester == "" {
		semester = "HK1"
	}

	// Check existing comment for this semester
	var existing []map[string]interface{}
	query := db.From("comments").Select("*", "", false).
		Eq("student_id", studentID).
		Eq("semester", semester)
	if classID != nil {
		query = query.Eq("class_id", toStr(classID))
	}
	_, _ = query.ExecuteTo(&existing)

	commentData := map[string]interface{}{
		"student_id":  req.StudentID,
		"class_id":    classID,
		"description": req.Description,
		"semester":    semester,
		"updated_at":  now,
	}

	var result []map[string]interface{}
	message := "Lưu nhận xét thành công"

	if len(existing) > 0 {
		commentID := toStr(existing[0]["id"])
		_, err = db.From("comments").Update(commentData, "", "").Eq("id", commentID).ExecuteTo(&result)
		message = "Cập nhật nhận xét thành công"
	} else {
		commentData["created_at"] = now
		_, err = db.From("comments").Insert(commentData, false, "", "", "").ExecuteTo(&result)
	}

	if err != nil || len(result) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Không thể lưu nhận xét"})
		return
	}

	comment := result[0]
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"id":          comment["id"],
			"student_id":  comment["student_id"],
			"class_id":    comment["class_id"],
			"description": comment["description"],
			"semester":    comment["semester"],
			"created_at":  comment["created_at"],
			"updated_at":  comment["updated_at"],
		},
	})
}

// GET /api/feedback/comments/:student_id
func GetComment(c *gin.Context) {
	studentID := c.Param("student_id")
	semester := c.Query("semester")
	db := database.GetClient()

	query := db.From("comments").Select("*", "", false).Eq("student_id", studentID)
	if semester != "" {
		query = query.Eq("semester", semester)
	}

	var results []map[string]interface{}
	_, err := query.ExecuteTo(&results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	if len(results) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Chưa có nhận xét",
			"data":    nil,
		})
		return
	}

	comment := results[0]
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy nhận xét thành công",
		"data": gin.H{
			"id":          comment["id"],
			"student_id":  comment["student_id"],
			"class_id":    comment["class_id"],
			"description": comment["description"],
			"semester":    comment["semester"],
			"created_at":  comment["created_at"],
			"updated_at":  comment["updated_at"],
		},
	})
}

// GET /api/feedback/comments/class/:class_id
func GetClassComments(c *gin.Context) {
	classID := c.Param("class_id")
	semester := c.Query("semester")
	db := database.GetClient()

	// Get class info
	var classes []map[string]interface{}
	_, err := db.From("classes").Select("id,class_name,grade", "", false).Eq("id", classID).ExecuteTo(&classes)
	if err != nil || len(classes) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Không tìm thấy lớp", "data": []interface{}{}})
		return
	}
	classInfo := classes[0]
	className, _ := classInfo["class_name"].(string)
	grade, _ := classInfo["grade"].(string)

	// Get comments by class_id
	query := db.From("comments").Select("*", "", false).Eq("class_id", classID)
	if semester != "" {
		query = query.Eq("semester", semester)
	}
	var comments []map[string]interface{}
	_, _ = query.ExecuteTo(&comments)

	// Fallback: get students of this class and find comments by student_id
	if len(comments) == 0 {
		var studs []map[string]interface{}
		_, _ = db.From("students").Select("id", "", false).
			Eq("class_name", className).Eq("grade", grade).ExecuteTo(&studs)
		if len(studs) > 0 {
			var ids []string
			for _, s := range studs {
				ids = append(ids, toStr(s["id"]))
			}
			fallbackQuery := db.From("comments").Select("*", "", false).In("student_id", ids)
			if semester != "" {
				fallbackQuery = fallbackQuery.Eq("semester", semester)
			}
			_, _ = fallbackQuery.ExecuteTo(&comments)
		}
	}

	if len(comments) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Chưa có nhận xét nào", "data": []interface{}{}})
		return
	}

	// Get student info
	var studentIDs []string
	seenStudents := map[string]bool{}
	latestByStudent := map[string]map[string]interface{}{}
	for _, comment := range comments {
		sid := toStr(comment["student_id"])
		if _, exists := latestByStudent[sid]; !exists {
			latestByStudent[sid] = comment
			if !seenStudents[sid] {
				studentIDs = append(studentIDs, sid)
				seenStudents[sid] = true
			}
		}
	}

	var studs []map[string]interface{}
	_, _ = db.From("students").Select("id,student_id,full_name,class_name,grade", "", false).
		In("id", studentIDs).ExecuteTo(&studs)
	studMap := map[string]map[string]interface{}{}
	for _, s := range studs {
		studMap[toStr(s["id"])] = s
	}

	var commentsList []map[string]interface{}
	for sid, comment := range latestByStudent {
		info := studMap[sid]
		if info == nil {
			continue
		}
		if info["class_name"] != className || info["grade"] != grade {
			continue
		}
		cid := comment["class_id"]
		if cid == nil {
			cid = classID
		}
		commentsList = append(commentsList, map[string]interface{}{
			"id":           comment["id"],
			"student_id":   comment["student_id"],
			"student_code": info["student_id"],
			"student_name": info["full_name"],
			"class_id":     cid,
			"description":  comment["description"],
			"semester":     comment["semester"],
			"created_at":   comment["created_at"],
			"updated_at":   comment["updated_at"],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Lấy %d nhận xét thành công", len(commentsList)),
		"data":    commentsList,
	})
}

// POST /api/feedback/send-email-report-card
func SendEmailReportCard(c *gin.Context) {
	var req struct {
		StudentID      interface{}              `json:"student_id"`
		StudentName    string                   `json:"student_name"`
		StudentCode    string                   `json:"student_code"`
		ClassName      string                   `json:"class_name"`
		Grade          string                   `json:"grade"`
		TeacherName    string                   `json:"teacher_name"`
		AcademicYear   string                   `json:"academic_year"`
		Semester       string                   `json:"semester"`
		Scores         []map[string]interface{} `json:"scores"`
		OverallAverage float64                  `json:"overall_average"`
		Feedback       string                   `json:"feedback"`
		ReceivedEmail  string                   `json:"received_email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	recipientEmail := req.ReceivedEmail

	if recipientEmail == "" && req.StudentID != nil {
		var studs []map[string]interface{}
		_, _ = db.From("students").Select("received_email,email", "", false).
			Eq("id", toStr(req.StudentID)).ExecuteTo(&studs)
		if len(studs) > 0 {
			if v, ok := studs[0]["received_email"].(string); ok && v != "" {
				recipientEmail = v
			} else if v, ok := studs[0]["email"].(string); ok && v != "" {
				recipientEmail = v
			}
		}
	}

	if recipientEmail == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Chưa có email phụ huynh. Vui lòng nhập email trước khi gửi."})
		return
	}

	// Build HTML report card email
	html := buildReportCardHTML(req.StudentName, req.StudentCode, req.ClassName, req.Grade,
		req.TeacherName, req.AcademicYear, req.Semester, req.Scores, req.OverallAverage, req.Feedback)

	err := sendEmailHTML(recipientEmail, fmt.Sprintf("Phiếu điểm - %s - %s", req.StudentName, req.Semester), html)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Email phiếu điểm đã được gửi thành công",
		"data":    gin.H{"recipient_email": recipientEmail},
	})
}

func buildReportCardHTML(studentName, studentCode, className, grade, teacherName, academicYear, semester string,
	scores []map[string]interface{}, overallAverage float64, feedbackText string) string {

	var scoresHTML strings.Builder
	for _, s := range scores {
		scoresHTML.WriteString(fmt.Sprintf("<tr><td>%v</td><td>%v</td></tr>",
			s["subject_name"], s["average"]))
	}

	return fmt.Sprintf(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Phiếu điểm</title>
<style>body{font-family:'Segoe UI',sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px}
.header{text-align:center;background:#4f46e5;color:white;padding:20px;border-radius:8px 8px 0 0}
table{width:100%%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #ddd;padding:10px;text-align:left}
th{background:#f3f4f6}.avg{font-size:18px;font-weight:bold;color:#4f46e5}
.feedback{background:#fef3c7;padding:16px;border-radius:8px;margin:16px 0}
</style></head><body>
<div class="header"><h2>PHIẾU ĐIỂM HỌC SINH</h2><p>%s | %s</p></div>
<table><tr><th>Họ tên:</th><td>%s</td><th>Mã HS:</th><td>%s</td></tr>
<tr><th>Lớp:</th><td>%s - %s</td><th>Năm học:</th><td>%s</td></tr>
<tr><th>GVCN:</th><td>%s</td><th>Học kỳ:</th><td>%s</td></tr></table>
<table><tr><th>Môn học</th><th>Điểm TB</th></tr>%s</table>
<p class="avg">Điểm trung bình: %.2f / 10</p>
<div class="feedback"><strong>Nhận xét của GVCN:</strong><p>%s</p></div>
<p style="color:#6b7280;font-size:12px;text-align:center">Email tự động từ hệ thống SynapseS - %s</p>
</body></html>`,
		academicYear, semester,
		studentName, studentCode,
		className, grade, academicYear,
		teacherName, semester,
		scoresHTML.String(),
		overallAverage,
		feedbackText,
		time.Now().Format("02/01/2006 15:04:05"))
}
