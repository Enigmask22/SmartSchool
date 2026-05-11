package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/middleware"
	ocrqueue "smart_school_go/services/ocr"
)

// requireTeacherOrAdmin returns true when the current user exists and has
// role "teacher" or "admin" / "super_admin".  It writes a 401/403 and returns
// false when the check fails.
func requireTeacherOrAdmin(c *gin.Context) bool {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Không xác thực"})
		return false
	}
	role, _ := user["role"].(string)
	if role != "teacher" && role != "admin" && role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Không có quyền truy cập"})
		return false
	}
	return true
}

// ── POST /api/scores/ ─────────────────────────────────────────────────────────

func CreateScore(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	data := map[string]interface{}{
		"student_id":    req["student_id"],
		"subject_id":    req["subject_id"],
		"class_id":      req["class_id"],
		"semester":      req["semester"],
		"score_type":    req["score_type"],
		"score_value":   req["score_value"],
		"teacher_id":    req["teacher_id"],
		"academic_year": req["academic_year"],
		"is_active":     true,
		"created_at":    nowStr(),
		"updated_at":    nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("scores").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi tạo điểm"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": inserted[0]})
}

// ── POST /api/scores/bulk ─────────────────────────────────────────────────────

func BulkCreateScores(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	scoresRaw, _ := req["scores"].([]interface{})
	if len(scoresRaw) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "scores array là bắt buộc"})
		return
	}

	db := database.GetClient()
	createdCount := 0
	var errors []string

	for _, s := range scoresRaw {
		scoreMap, ok := s.(map[string]interface{})
		if !ok {
			errors = append(errors, "Dữ liệu điểm không hợp lệ")
			continue
		}
		scoreMap["is_active"] = true
		scoreMap["created_at"] = nowStr()
		scoreMap["updated_at"] = nowStr()

		var inserted []map[string]interface{}
		_, err := db.From("scores").Insert(scoreMap, false, "", "", "").ExecuteTo(&inserted)
		if err != nil {
			errors = append(errors, err.Error())
		} else {
			createdCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"created_count": createdCount,
		"errors":        errors,
	})
}

// ── GET /api/scores/ ──────────────────────────────────────────────────────────

func ListScores(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Không xác thực"})
		return
	}

	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	studentID := c.Query("student_id")
	subjectID := c.Query("subject_id")
	classID := c.Query("class_id")
	semester := c.Query("semester")
	academicYear := c.Query("academic_year")

	db := database.GetClient()
	query := db.From("scores").Select("*", "", false)

	// Teachers can only see their own subjects unless admin
	role, _ := user["role"].(string)
	if role == "teacher" {
		teacherID := toStr(user["id"])
		if teacherID != "" {
			query = query.Eq("teacher_id", teacherID)
		}
	}

	if studentID != "" {
		query = query.Eq("student_id", studentID)
	}
	if subjectID != "" {
		query = query.Eq("subject_id", subjectID)
	}
	if classID != "" {
		query = query.Eq("class_id", classID)
	}
	if semester != "" {
		query = query.Eq("semester", semester)
	}
	if academicYear != "" {
		query = query.Eq("academic_year", academicYear)
	}

	query = query.Order("created_at", nil)
	if limit > 0 {
		query = query.Range(skip, skip+limit-1, "")
	}

	var results []map[string]interface{}
	_, err := query.ExecuteTo(&results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if results == nil {
		results = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
		"total":   len(results),
	})
}

// ── GET /api/scores/:score_id ─────────────────────────────────────────────────

func GetScore(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Không xác thực"})
		return
	}

	scoreID := c.Param("score_id")
	db := database.GetClient()

	var results []map[string]interface{}
	_, err := db.From("scores").Select("*", "", false).Eq("id", scoreID).ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy điểm"})
		return
	}

	// Teacher can only see scores they own
	role, _ := user["role"].(string)
	if role == "teacher" {
		teacherID := toStr(user["id"])
		if toStr(results[0]["teacher_id"]) != teacherID {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Không có quyền xem điểm này"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results[0]})
}

// ── PUT /api/scores/:score_id ─────────────────────────────────────────────────

func UpdateScore(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	scoreID := c.Param("score_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	req["updated_at"] = nowStr()
	delete(req, "id")
	delete(req, "created_at")

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("scores").Update(req, "representation", "exact").Eq("id", scoreID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy điểm"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated[0]})
}

// ── DELETE /api/scores/:score_id ──────────────────────────────────────────────

func DeleteScore(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	scoreID := c.Param("score_id")
	db := database.GetClient()

	var updated []map[string]interface{}
	_, err := db.From("scores").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", scoreID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy điểm"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa điểm thành công"})
}

// ── POST /api/scores/ocr/upload ───────────────────────────────────────────────

func ScoreOCRUpload(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Không tìm thấy file upload"})
		return
	}
	defer file.Close()

	engine := c.DefaultPostForm("engine", "gemini")

	reqID := ocrqueue.SubmitOCRJob(file, header, engine)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"request_id": reqID,
		"status":     "pending",
	})
}

// ── GET /api/scores/ocr/result/:id ───────────────────────────────────────────

func ScoreOCRResult(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	id := c.Param("id")
	req, ok := ocrqueue.GetOCRRequest(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy OCR request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"request_id": id,
		"status":     string(req.Status),
		"result":     req.Result,
		"error":      req.Error,
	})
}

// ── GET /api/scores/ocr/status/:id ───────────────────────────────────────────

func ScoreOCRStatus(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	id := c.Param("id")
	req, ok := ocrqueue.GetOCRRequest(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy OCR request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"request_id": id,
		"status":     string(req.Status),
	})
}

// ── POST /api/scores/calculate-final ─────────────────────────────────────────

func CalculateFinalScore(c *gin.Context) {
	if !requireTeacherOrAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	params := map[string]interface{}{
		"p_student_id":    req["student_id"],
		"p_subject_id":    req["subject_id"],
		"p_class_id":      req["class_id"],
		"p_semester":      req["semester"],
		"p_academic_year": req["academic_year"],
	}

	db := database.GetClient()
	rpcResult := db.Rpc("calculate_final_score", "", params)
	var rpcData []map[string]interface{}
	json.Unmarshal([]byte(rpcResult), &rpcData)

	// If RPC fails or returns nothing, fall back to simple average
	if len(rpcData) == 0 {
		studentID := toStr(req["student_id"])
		subjectID := toStr(req["subject_id"])
		semester := toStr(req["semester"])

		query := db.From("scores").Select("score_value", "", false).
			Eq("student_id", studentID).
			Eq("subject_id", subjectID).
			Eq("is_active", "true")
		if semester != "" {
			query = query.Eq("semester", semester)
		}

		var scores []map[string]interface{}
		query.ExecuteTo(&scores)

		var total float64
		count := 0
		for _, s := range scores {
			switch v := s["score_value"].(type) {
			case float64:
				total += v
				count++
			case string:
				if f, err2 := strconv.ParseFloat(v, 64); err2 == nil {
					total += f
					count++
				}
			}
		}

		finalScore := 0.0
		if count > 0 {
			finalScore = total / float64(count)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"final_score": finalScore},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"final_score": nil},
	})
}

// ── GET /api/scores/subjects ──────────────────────────────────────────────────

func ListScoreSubjects(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Không xác thực"})
		return
	}

	grade := c.Query("grade")
	isActiveStr := c.DefaultQuery("is_active", "true")

	db := database.GetClient()
	query := db.From("subjects").Select("*", "", false).Eq("is_active", isActiveStr)

	if grade != "" {
		query = query.Eq("grade", grade)
	}

	query = query.Order("subject_name", &postgrest.OrderOpts{Ascending: true})

	var subjects []map[string]interface{}
	_, err := query.ExecuteTo(&subjects)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if subjects == nil {
		subjects = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": subjects})
}

// ── GET /api/scores/teacher-dashboard ────────────────────────────────────────

func TeacherScoreDashboard(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Không xác thực"})
		return
	}

	role, _ := user["role"].(string)

	// Resolve teacher_id: query param takes precedence for admin, otherwise use current user id
	teacherID := c.Query("teacher_id")
	if teacherID == "" || (role != "admin" && role != "super_admin") {
		teacherID = toStr(user["id"])
	}

	classID := c.Query("class_id")
	subjectID := c.Query("subject_id")
	semester := c.Query("semester")
	academicYear := c.Query("academic_year")

	db := database.GetClient()
	query := db.From("scores").Select("*", "", false)

	if teacherID != "" {
		query = query.Eq("teacher_id", teacherID)
	}
	if classID != "" {
		query = query.Eq("class_id", classID)
	}
	if subjectID != "" {
		query = query.Eq("subject_id", subjectID)
	}
	if semester != "" {
		query = query.Eq("semester", semester)
	}
	if academicYear != "" {
		query = query.Eq("academic_year", academicYear)
	}

	var scores []map[string]interface{}
	_, err := query.ExecuteTo(&scores)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if scores == nil {
		scores = []map[string]interface{}{}
	}

	// Aggregate: group counts by class_id + subject_id
	type groupKey struct{ classID, subjectID string }
	groupCounts := make(map[groupKey]int)
	var totalScore float64
	scoredCount := 0

	for _, s := range scores {
		cid := toStr(s["class_id"])
		sid := toStr(s["subject_id"])
		groupCounts[groupKey{cid, sid}]++

		switch v := s["score_value"].(type) {
		case float64:
			totalScore += v
			scoredCount++
		case string:
			if f, err2 := strconv.ParseFloat(v, 64); err2 == nil {
				totalScore += f
				scoredCount++
			}
		}
	}

	avgScore := 0.0
	if scoredCount > 0 {
		avgScore = totalScore / float64(scoredCount)
	}

	var groups []map[string]interface{}
	for k, cnt := range groupCounts {
		groups = append(groups, map[string]interface{}{
			"class_id":    k.classID,
			"subject_id":  k.subjectID,
			"score_count": cnt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"teacher_id":   teacherID,
			"total_scores": len(scores),
			"average_score": avgScore,
			"groups":       groups,
		},
	})
}

// ── Route registration ────────────────────────────────────────────────────────

// RegisterScoreRoutes wires up all /api/scores endpoints onto the provided
// RouterGroup.  Static/fixed paths are registered before parameterised ones so
// that Gin does not misroute e.g. GET /subjects into /:score_id.
func RegisterScoreRoutes(rg *gin.RouterGroup) {
	// Static routes first
	rg.POST("/bulk", BulkCreateScores)
	rg.POST("/calculate-final", CalculateFinalScore)
	rg.GET("/subjects", ListScoreSubjects)
	rg.GET("/teacher-dashboard", TeacherScoreDashboard)

	// OCR sub-routes (static before parameterised)
	rg.POST("/ocr/upload", ScoreOCRUpload)
	rg.GET("/ocr/result/:id", ScoreOCRResult)
	rg.GET("/ocr/status/:id", ScoreOCRStatus)

	// Collection
	rg.POST("/", CreateScore)
	rg.GET("/", ListScores)

	// Parameterised last
	rg.GET("/:score_id", GetScore)
	rg.PUT("/:score_id", UpdateScore)
	rg.DELETE("/:score_id", DeleteScore)
}
