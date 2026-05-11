package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/models"
	authsvc "smart_school_go/services/auth"
)

// GET /api/users/users
func GetUsers(c *gin.Context) {
	db := database.GetClient()
	var users []map[string]interface{}
	_, err := db.From("users").Select("*", "", false).Order("created_at", nil).ExecuteTo(&users)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	for _, u := range users {
		delete(u, "password_hash")
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

// POST /api/users/users
func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()

	var existing []map[string]interface{}
	db.From("users").Select("id", "", false).Eq("email", req.Email).ExecuteTo(&existing)
	if len(existing) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Email đã được sử dụng"})
		return
	}

	hashedPwd, _ := authsvc.HashPassword(req.Password)
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	role := req.Role
	if role == "" {
		role = "teacher"
	}

	userData := map[string]interface{}{
		"email":         req.Email,
		"username":      req.Username,
		"password_hash": hashedPwd,
		"full_name":     req.FullName,
		"role":          role,
		"is_active":     isActive,
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	var inserted []map[string]interface{}
	_, err := db.From("users").Insert(userData, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo user"})
		return
	}
	delete(inserted[0], "password_hash")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": inserted[0]})
}

// PUT /api/users/users/:user_id
func UpdateUser(c *gin.Context) {
	userID := c.Param("user_id")
	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	updateData := map[string]interface{}{
		"updated_at": time.Now().Format(time.RFC3339),
	}
	if req.Username != "" {
		updateData["username"] = req.Username
	}
	if req.Email != "" {
		updateData["email"] = req.Email
	}
	if req.FullName != "" {
		updateData["full_name"] = req.FullName
	}
	if req.Role != "" {
		updateData["role"] = req.Role
	}
	if req.IsActive != nil {
		updateData["is_active"] = *req.IsActive
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("users").Update(updateData, "representation", "exact").Eq("id", userID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy user"})
		return
	}
	delete(updated[0], "password_hash")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated[0]})
}

// DELETE /api/users/users/:user_id
func DeleteUser(c *gin.Context) {
	userID := c.Param("user_id")
	db := database.GetClient()
	var deleted []map[string]interface{}
	_, err := db.From("users").Delete("representation", "exact").Eq("id", userID).ExecuteTo(&deleted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa user thành công"})
}

// GET /api/users/teachers
func GetTeachers(c *gin.Context) {
	db := database.GetClient()
	var teachers []map[string]interface{}
	_, err := db.From("teachers").Select("*", "", false).Order("full_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&teachers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": teachers})
}

// POST /api/users/teachers
func CreateTeacher(c *gin.Context) {
	var req models.CreateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	data := map[string]interface{}{
		"teacher_code":  req.TeacherCode,
		"full_name":     req.FullName,
		"email":         req.Email,
		"phone":         req.Phone,
		"date_of_birth": req.DateOfBirth,
		"gender":        req.Gender,
		"user_id":       req.UserID,
		"is_active":     isActive,
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("teachers").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": inserted[0]})
}

// PUT /api/users/teachers/:teacher_id
func UpdateTeacher(c *gin.Context) {
	teacherID := c.Param("teacher_id")
	var req models.UpdateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": time.Now().Format(time.RFC3339)}
	if req.TeacherCode != "" {
		data["teacher_code"] = req.TeacherCode
	}
	if req.FullName != "" {
		data["full_name"] = req.FullName
	}
	if req.Email != "" {
		data["email"] = req.Email
	}
	if req.Phone != "" {
		data["phone"] = req.Phone
	}
	if req.DateOfBirth != "" {
		data["date_of_birth"] = req.DateOfBirth
	}
	if req.Gender != "" {
		data["gender"] = req.Gender
	}
	if req.UserID != nil {
		data["user_id"] = *req.UserID
	}
	if req.IsActive != nil {
		data["is_active"] = *req.IsActive
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("teachers").Update(data, "representation", "exact").Eq("id", teacherID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated[0]})
}

// DELETE /api/users/teachers/:teacher_id
func DeleteTeacher(c *gin.Context) {
	teacherID := c.Param("teacher_id")
	db := database.GetClient()
	_, err := db.From("teachers").Delete("", "").Eq("id", teacherID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa giáo viên thành công"})
}

// GET /api/users/classes
func GetClasses(c *gin.Context) {
	db := database.GetClient()
	var classes []map[string]interface{}
	_, err := db.From("classes").Select("*", "", false).Order("class_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&classes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	// Get student counts per class
	var students []map[string]interface{}
	db.From("students").Select("class_name", "", false).Eq("is_active", "true").ExecuteTo(&students)

	countMap := make(map[string]int)
	for _, s := range students {
		if cn, ok := s["class_name"].(string); ok {
			countMap[cn]++
		}
	}

	for _, cls := range classes {
		if cn, ok := cls["class_name"].(string); ok {
			cls["student_count"] = countMap[cn]
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": classes})
}

// GET /api/users/dashboard/overview
func GetDashboardOverview(c *gin.Context) {
	db := database.GetClient()

	var students []map[string]interface{}
	db.From("students").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&students)

	var teachers []map[string]interface{}
	db.From("teachers").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&teachers)

	var classes []map[string]interface{}
	db.From("classes").Select("id", "", false).ExecuteTo(&classes)

	today := time.Now().Format("2006-01-02")
	var todayAttendance []map[string]interface{}
	db.From("attendance").Select("status", "", false).Eq("date", today).ExecuteTo(&todayAttendance)

	presentCount := 0
	for _, a := range todayAttendance {
		if a["status"] == "present" {
			presentCount++
		}
	}

	attendanceRate := 0.0
	if len(students) > 0 {
		attendanceRate = float64(presentCount) / float64(len(students)) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_students": len(students),
			"total_teachers": len(teachers),
			"total_classes":  len(classes),
			"attendance_today": gin.H{
				"present":         presentCount,
				"total":           len(students),
				"attendance_rate": fmt.Sprintf("%.1f", attendanceRate),
			},
		},
	})
}

// GET /api/users/dashboard/attendance-trends
func GetAttendanceTrends(c *gin.Context) {
	db := database.GetClient()

	// Last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	var attendance []map[string]interface{}
	db.From("attendance").Select("date,status", "", false).
		Gte("date", startDate.Format("2006-01-02")).
		Lte("date", endDate.Format("2006-01-02")).
		ExecuteTo(&attendance)

	// Group by date
	dateStats := make(map[string]map[string]int)
	for _, a := range attendance {
		dateStr, _ := a["date"].(string)
		status, _ := a["status"].(string)
		if dateStats[dateStr] == nil {
			dateStats[dateStr] = map[string]int{"present": 0, "absent": 0, "late": 0, "total": 0}
		}
		dateStats[dateStr][status]++
		dateStats[dateStr]["total"]++
	}

	var trends []map[string]interface{}
	for d, stats := range dateStats {
		trends = append(trends, map[string]interface{}{
			"date":    d,
			"present": stats["present"],
			"absent":  stats["absent"],
			"late":    stats["late"],
			"total":   stats["total"],
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": trends})
}

// GET /api/users/dashboard/class-performance
func GetClassPerformance(c *gin.Context) {
	db := database.GetClient()

	var classes []map[string]interface{}
	db.From("classes").Select("*", "", false).ExecuteTo(&classes)

	var result []map[string]interface{}
	for _, cls := range classes {
		className, _ := cls["class_name"].(string)
		var students []map[string]interface{}
		db.From("students").Select("id", "", false).Eq("class_name", className).Eq("is_active", "true").ExecuteTo(&students)
		cls["student_count"] = len(students)
		result = append(result, cls)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// GET /api/users/dashboard/teacher-performance
func GetTeacherPerformance(c *gin.Context) {
	db := database.GetClient()
	var teachers []map[string]interface{}
	db.From("teachers").Select("*", "", false).Eq("is_active", "true").ExecuteTo(&teachers)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": teachers})
}

// GET /api/users/dashboard/system-health
func GetSystemHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"services": gin.H{
				"database": "connected",
				"api":      "running",
			},
		},
	})
}
