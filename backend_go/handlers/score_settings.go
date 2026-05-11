package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/middleware"
)

func getAdminUserForSettings(c *gin.Context) bool {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Unauthorized"})
		return false
	}
	role, _ := user["role"].(string)
	if role != "admin" && role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{"detail": "Chỉ admin mới có quyền truy cập score settings"})
		return false
	}
	return true
}

func transformSubjectToScoreSettings(subject map[string]interface{}) map[string]interface{} {
	config := subject["score_column_config"]
	if config == nil {
		config = map[string]interface{}{}
	}
	return map[string]interface{}{
		"id":                  subject["id"],
		"subject_id":          subject["id"],
		"subject_code":        subject["subject_code"],
		"subject_name":        subject["subject_name"],
		"score_column_config": config,
		"is_active":           subject["is_active"],
		"created_at":          subject["created_at"],
		"updated_at":          subject["updated_at"],
		"subjects": map[string]interface{}{
			"id":           subject["id"],
			"subject_code": subject["subject_code"],
			"subject_name": subject["subject_name"],
		},
	}
}

// GET /api/score-settings/
func GetAllScoreSettings(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	db := database.GetClient()
	skipStr := c.DefaultQuery("skip", "0")
	limitStr := c.DefaultQuery("limit", "100")
	isActiveStr := c.Query("is_active")

	skip, _ := strconv.Atoi(skipStr)
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100
	}

	var results []map[string]interface{}
	query := db.From("subjects").Select("id,subject_code,subject_name,score_column_config,is_active,created_at,updated_at", "", false)

	if isActiveStr != "" {
		isActive := isActiveStr == "true"
		query = query.Eq("is_active", strconv.FormatBool(isActive))
	}

	_, err := query.Order("id", &postgrest.OrderOpts{Ascending: true}).Range(skip, skip+limit-1, "").ExecuteTo(&results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	transformed := []map[string]interface{}{}
	for _, item := range results {
		if item["score_column_config"] != nil {
			transformed = append(transformed, transformSubjectToScoreSettings(item))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy danh sách score settings thành công",
		"data":    transformed,
	})
}

// GET /api/score-settings/:subject_id
func GetScoreSettingsBySubjectID(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()

	var results []map[string]interface{}
	_, err := db.From("subjects").Select("id,subject_code,subject_name,score_column_config,is_active,created_at,updated_at", "", false).
		Eq("id", subjectID).ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học với ID: " + subjectID})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy score settings thành công",
		"data":    transformSubjectToScoreSettings(results[0]),
	})
}

// GET /api/score-settings/subject/:subject_id (teacher read-only)
func GetScoreSettingsForTeacher(c *gin.Context) {
	subjectID := c.Param("subject_id")
	db := database.GetClient()

	var results []map[string]interface{}
	_, err := db.From("subjects").Select("id,subject_code,subject_name,score_column_config,is_active,created_at,updated_at", "", false).
		Eq("id", subjectID).Eq("is_active", "true").ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học ID: " + subjectID + " hoặc môn học không active"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy score settings thành công",
		"data":    transformSubjectToScoreSettings(results[0]),
	})
}

// POST /api/score-settings/
func CreateScoreSettings(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	subjectIDRaw, ok := req["subject_id"]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "subject_id is required"})
		return
	}
	subjectID := toStr(subjectIDRaw)

	db := database.GetClient()

	var existing []map[string]interface{}
	_, err := db.From("subjects").Select("id", "", false).Eq("id", subjectID).ExecuteTo(&existing)
	if err != nil || len(existing) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học với ID: " + subjectID})
		return
	}

	updateData := map[string]interface{}{
		"score_column_config": req["score_column_config"],
		"updated_at":          time.Now().Format(time.RFC3339),
	}
	if v, ok := req["is_active"]; ok {
		updateData["is_active"] = v
	}

	var results []map[string]interface{}
	_, err = db.From("subjects").Update(updateData, "", "").Eq("id", subjectID).ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi khi tạo score settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tạo/cập nhật score settings thành công",
		"data":    transformSubjectToScoreSettings(results[0]),
	})
}

// PUT /api/score-settings/:subject_id
func UpdateScoreSettings(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()

	var existing []map[string]interface{}
	_, err := db.From("subjects").Select("id", "", false).Eq("id", subjectID).ExecuteTo(&existing)
	if err != nil || len(existing) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học với ID: " + subjectID})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	updateData := map[string]interface{}{
		"updated_at": time.Now().Format(time.RFC3339),
	}
	if v, ok := req["score_column_config"]; ok {
		updateData["score_column_config"] = v
	}
	if v, ok := req["is_active"]; ok {
		updateData["is_active"] = v
	}

	var results []map[string]interface{}
	_, err = db.From("subjects").Update(updateData, "", "").Eq("id", subjectID).ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi khi cập nhật score settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật score settings thành công",
		"data":    transformSubjectToScoreSettings(results[0]),
	})
}

// DELETE /api/score-settings/:subject_id
func DeleteScoreSettings(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()

	var existing []map[string]interface{}
	_, err := db.From("subjects").Select("id", "", false).Eq("id", subjectID).ExecuteTo(&existing)
	if err != nil || len(existing) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học với ID: " + subjectID})
		return
	}

	updateData := map[string]interface{}{
		"score_column_config": nil,
		"updated_at":          time.Now().Format(time.RFC3339),
	}

	var results []map[string]interface{}
	_, err = db.From("subjects").Update(updateData, "", "").Eq("id", subjectID).ExecuteTo(&results)
	if err != nil || len(results) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi khi xóa score settings"})
		return
	}

	subject := results[0]
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa score settings thành công",
		"data": map[string]interface{}{
			"id":                  subject["id"],
			"subject_id":          subject["id"],
			"subject_code":        subject["subject_code"],
			"subject_name":        subject["subject_name"],
			"score_column_config": map[string]interface{}{},
			"is_active":           subject["is_active"],
			"created_at":          subject["created_at"],
			"updated_at":          subject["updated_at"],
		},
	})
}

// POST /api/score-settings/bulk-create
func BulkCreateScoreSettings(c *gin.Context) {
	if !getAdminUserForSettings(c) {
		return
	}

	var settingsList []map[string]interface{}
	if err := c.ShouldBindJSON(&settingsList); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	createdCount := 0
	var errors []string

	for _, settings := range settingsList {
		subjectID := toStr(settings["subject_id"])

		var existing []map[string]interface{}
		_, err := db.From("subjects").Select("id", "", false).Eq("id", subjectID).ExecuteTo(&existing)
		if err != nil || len(existing) == 0 {
			errors = append(errors, "Subject ID "+subjectID+" không tồn tại")
			continue
		}

		updateData := map[string]interface{}{
			"score_column_config": settings["score_column_config"],
			"updated_at":          time.Now().Format(time.RFC3339),
		}
		if v, ok := settings["is_active"]; ok {
			updateData["is_active"] = v
		}

		var results []map[string]interface{}
		_, err = db.From("subjects").Update(updateData, "", "").Eq("id", subjectID).ExecuteTo(&results)
		if err != nil {
			errors = append(errors, "Lỗi khi tạo score settings cho subject ID "+subjectID+": "+err.Error())
			continue
		}
		createdCount++
	}

	errInterface := interface{}(nil)
	if len(errors) > 0 {
		errInterface = errors
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tạo thành công " + strconv.Itoa(createdCount) + "/" + strconv.Itoa(len(settingsList)) + " score settings",
		"data": map[string]interface{}{
			"created_count": createdCount,
			"error_count":   len(errors),
			"errors":        errInterface,
		},
	})
}
