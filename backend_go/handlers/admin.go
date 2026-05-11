package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/middleware"
	authsvc "smart_school_go/services/auth"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func toStr(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

func requireAdmin(c *gin.Context) bool {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return false
	}
	role, _ := user["role"].(string)
	if role != "admin" && role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{"detail": "Yêu cầu quyền admin"})
		return false
	}
	return true
}

func nowStr() string {
	return time.Now().Format(time.RFC3339)
}

// ── Users CRUD ────────────────────────────────────────────────────────────────

// GET /api/admin/users
func AdminListUsers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	search := c.Query("search")

	db := database.GetClient()
	query := db.From("users").Select("*", "", false)

	if search != "" {
		query = query.Or(
			"full_name.ilike.%"+search+"%,email.ilike.%"+search+"%,username.ilike.%"+search+"%",
			"",
		)
	}

	query = query.Order("created_at", nil)

	if limit > 0 {
		query = query.Range(skip, skip+limit-1, "")
	}

	var users []map[string]interface{}
	_, err := query.ExecuteTo(&users)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	for _, u := range users {
		delete(u, "password_hash")
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

// POST /api/admin/users
func AdminCreateUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	email, _ := req["email"].(string)
	username, _ := req["username"].(string)
	password, _ := req["password"].(string)
	if email == "" || username == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "email, username và password là bắt buộc"})
		return
	}

	db := database.GetClient()

	var existing []map[string]interface{}
	db.From("users").Select("id", "", false).Eq("email", email).ExecuteTo(&existing)
	if len(existing) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Email đã được sử dụng"})
		return
	}

	hashedPwd, err := authsvc.HashPassword(password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi mã hóa mật khẩu"})
		return
	}

	role, _ := req["role"].(string)
	if role == "" {
		role = "teacher"
	}

	isActive := true
	if v, ok := req["is_active"].(bool); ok {
		isActive = v
	}

	userData := map[string]interface{}{
		"email":         email,
		"username":      username,
		"password_hash": hashedPwd,
		"full_name":     req["full_name"],
		"role":          role,
		"is_active":     isActive,
		"created_at":    nowStr(),
		"updated_at":    nowStr(),
	}

	var inserted []map[string]interface{}
	_, err = db.From("users").Insert(userData, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo user"})
		return
	}
	delete(inserted[0], "password_hash")
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo user thành công", "data": inserted[0]})
}

// PUT /api/admin/users/:user_id
func AdminUpdateUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	userID := c.Param("user_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	updateData := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"username", "email", "full_name", "role", "phone"} {
		if v, ok := req[field]; ok && v != nil && toStr(v) != "" {
			updateData[field] = v
		}
	}
	if v, ok := req["is_active"]; ok && v != nil {
		updateData["is_active"] = v
	}
	if pwd, ok := req["password"].(string); ok && pwd != "" {
		hashed, err := authsvc.HashPassword(pwd)
		if err == nil {
			updateData["password_hash"] = hashed
		}
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("users").Update(updateData, "representation", "exact").Eq("id", userID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy user"})
		return
	}
	delete(updated[0], "password_hash")
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật user thành công", "data": updated[0]})
}

// DELETE /api/admin/users/:user_id  (soft delete)
func AdminDeleteUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	userID := c.Param("user_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("users").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", userID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa user thành công"})
}

// POST /api/admin/users/:user_id/restore
func AdminRestoreUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	userID := c.Param("user_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("users").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", userID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy user"})
		return
	}
	delete(updated[0], "password_hash")
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục user thành công", "data": updated[0]})
}

// DELETE /api/admin/users/:user_id/permanent
func AdminPermanentDeleteUser(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	userID := c.Param("user_id")
	db := database.GetClient()
	_, err := db.From("users").Delete("", "").Eq("id", userID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn user thành công"})
}

// ── Teachers CRUD ─────────────────────────────────────────────────────────────

// GET /api/admin/teachers
func AdminListTeachers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var teachers []map[string]interface{}
	_, err := db.From("teachers").Select("*", "", false).Order("full_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&teachers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": teachers})
}

// POST /api/admin/teachers
func AdminCreateTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	isActive := true
	if v, ok := req["is_active"].(bool); ok {
		isActive = v
	}

	data := map[string]interface{}{
		"teacher_code":  req["teacher_code"],
		"full_name":     req["full_name"],
		"email":         req["email"],
		"phone":         req["phone"],
		"date_of_birth": req["date_of_birth"],
		"gender":        req["gender"],
		"user_id":       req["user_id"],
		"is_active":     isActive,
		"created_at":    nowStr(),
		"updated_at":    nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("teachers").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo giáo viên thành công", "data": inserted[0]})
}

// PUT /api/admin/teachers/:teacher_id
func AdminUpdateTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	teacherID := c.Param("teacher_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"teacher_code", "full_name", "email", "phone", "date_of_birth", "gender", "user_id"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}
	if v, ok := req["is_active"]; ok && v != nil {
		data["is_active"] = v
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("teachers").Update(data, "representation", "exact").Eq("id", teacherID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật giáo viên thành công", "data": updated[0]})
}

// DELETE /api/admin/teachers/:teacher_id  (soft delete)
func AdminDeleteTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	teacherID := c.Param("teacher_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("teachers").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", teacherID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa giáo viên thành công"})
}

// POST /api/admin/teachers/:teacher_id/restore
func AdminRestoreTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	teacherID := c.Param("teacher_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("teachers").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", teacherID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy giáo viên"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục giáo viên thành công", "data": updated[0]})
}

// DELETE /api/admin/teachers/:teacher_id/permanent
func AdminPermanentDeleteTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	teacherID := c.Param("teacher_id")
	db := database.GetClient()
	_, err := db.From("teachers").Delete("", "").Eq("id", teacherID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn giáo viên thành công"})
}

// GET /api/admin/users/teachers  → users with teacher role
func AdminListUsersTeachers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var users []map[string]interface{}
	_, err := db.From("users").Select("id,username,email,full_name,role,is_active,created_at", "", false).
		Eq("role", "teacher").
		Order("full_name", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&users)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

// GET /api/admin/teachers/next-code
func AdminNextTeacherCode(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var teachers []map[string]interface{}
	db.From("teachers").Select("teacher_code", "", false).Order("teacher_code", nil).Range(0, 0, "").ExecuteTo(&teachers)

	nextCode := "GV001"
	if len(teachers) > 0 {
		lastCode, _ := teachers[0]["teacher_code"].(string)
		// Extract numeric suffix and increment
		if len(lastCode) >= 2 {
			prefix := ""
			numStr := lastCode
			for i, ch := range lastCode {
				if ch >= '0' && ch <= '9' {
					prefix = lastCode[:i]
					numStr = lastCode[i:]
					break
				}
			}
			if n, err := strconv.Atoi(numStr); err == nil {
				nextCode = fmt.Sprintf("%s%03d", prefix, n+1)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "next_code": nextCode})
}

// POST /api/admin/teachers/import-from-users
func AdminImportTeachersFromUsers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()

	// Get all users with teacher role that don't have a teacher record
	var users []map[string]interface{}
	_, err := db.From("users").Select("id,email,full_name,role", "", false).
		Eq("role", "teacher").Eq("is_active", "true").
		ExecuteTo(&users)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	// Get existing teacher user_ids
	var existingTeachers []map[string]interface{}
	db.From("teachers").Select("user_id", "", false).ExecuteTo(&existingTeachers)
	existingUserIDs := make(map[string]bool)
	for _, t := range existingTeachers {
		if uid := toStr(t["user_id"]); uid != "" {
			existingUserIDs[uid] = true
		}
	}

	created := 0
	skipped := 0
	for _, u := range users {
		uid := toStr(u["id"])
		if existingUserIDs[uid] {
			skipped++
			continue
		}
		teacherData := map[string]interface{}{
			"full_name":  u["full_name"],
			"email":      u["email"],
			"user_id":    u["id"],
			"is_active":  true,
			"created_at": nowStr(),
			"updated_at": nowStr(),
		}
		var inserted []map[string]interface{}
		db.From("teachers").Insert(teacherData, false, "", "", "").ExecuteTo(&inserted)
		created++
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã tạo %d giáo viên, bỏ qua %d (đã tồn tại)", created, skipped),
		"created": created,
		"skipped": skipped,
	})
}

// GET /api/admin/teachers/homeroom
func AdminListHomeroomTeachers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var classes []map[string]interface{}
	db.From("classes").Select("id,class_name,homeroom_teacher_id,academic_year", "", false).ExecuteTo(&classes)

	var teachers []map[string]interface{}
	db.From("teachers").Select("id,full_name,teacher_code,email", "", false).Eq("is_active", "true").ExecuteTo(&teachers)

	teacherMap := make(map[string]map[string]interface{})
	for _, t := range teachers {
		teacherMap[toStr(t["id"])] = t
	}

	var result []map[string]interface{}
	for _, cls := range classes {
		hid := toStr(cls["homeroom_teacher_id"])
		entry := map[string]interface{}{
			"class_id":     cls["id"],
			"class_name":   cls["class_name"],
			"academic_year": cls["academic_year"],
			"teacher":      teacherMap[hid],
		}
		result = append(result, entry)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// ── Subjects CRUD ─────────────────────────────────────────────────────────────

// GET /api/admin/subjects
func AdminListSubjects(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var subjects []map[string]interface{}
	_, err := db.From("subjects").Select("*", "", false).Order("subject_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&subjects)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": subjects})
}

// POST /api/admin/subjects
func AdminCreateSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	if toStr(req["subject_name"]) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "subject_name là bắt buộc"})
		return
	}

	isActive := true
	if v, ok := req["is_active"].(bool); ok {
		isActive = v
	}

	data := map[string]interface{}{
		"subject_code":        req["subject_code"],
		"subject_name":        req["subject_name"],
		"is_active":           isActive,
		"score_column_config": req["score_column_config"],
		"created_at":          nowStr(),
		"updated_at":          nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("subjects").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo môn học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo môn học thành công", "data": inserted[0]})
}

// PUT /api/admin/subjects/:subject_id
func AdminUpdateSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	subjectID := c.Param("subject_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"subject_code", "subject_name", "score_column_config"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}
	if v, ok := req["is_active"]; ok && v != nil {
		data["is_active"] = v
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subjects").Update(data, "representation", "exact").Eq("id", subjectID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật môn học thành công", "data": updated[0]})
}

// DELETE /api/admin/subjects/:subject_id  (soft delete)
func AdminDeleteSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subjects").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", subjectID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa môn học thành công"})
}

// POST /api/admin/subjects/:subject_id/restore
func AdminRestoreSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subjects").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", subjectID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy môn học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục môn học thành công", "data": updated[0]})
}

// DELETE /api/admin/subjects/:subject_id/permanent
func AdminPermanentDeleteSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	subjectID := c.Param("subject_id")
	db := database.GetClient()
	_, err := db.From("subjects").Delete("", "").Eq("id", subjectID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn môn học thành công"})
}

// ── Classes CRUD ──────────────────────────────────────────────────────────────

// GET /api/admin/classes
func AdminListClasses(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	academicYear := c.Query("academic_year")
	db := database.GetClient()
	query := db.From("classes").Select("*", "", false)
	if academicYear != "" {
		query = query.Eq("academic_year", academicYear)
	}
	query = query.Order("class_name", &postgrest.OrderOpts{Ascending: true})

	var classes []map[string]interface{}
	_, err := query.ExecuteTo(&classes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	// Attach student counts
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

// GET /api/admin/classes/academic-years
func AdminListAcademicYears(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var classes []map[string]interface{}
	db.From("classes").Select("academic_year", "", false).Order("academic_year", nil).ExecuteTo(&classes)

	seen := make(map[string]bool)
	var years []string
	for _, cls := range classes {
		if ay, ok := cls["academic_year"].(string); ok && ay != "" && !seen[ay] {
			seen[ay] = true
			years = append(years, ay)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": years})
}

// GET /api/admin/classes/:class_id/students
func AdminGetClassStudents(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Param("class_id")
	db := database.GetClient()

	// Get class info
	var classes []map[string]interface{}
	db.From("classes").Select("*", "", false).Eq("id", classID).ExecuteTo(&classes)
	if len(classes) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy lớp học"})
		return
	}
	className, _ := classes[0]["class_name"].(string)

	var students []map[string]interface{}
	_, err := db.From("students").Select("*", "", false).
		Eq("class_name", className).
		Eq("is_active", "true").
		Order("full_name", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&students)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": students, "class": classes[0]})
}

// GET /api/admin/classes/default-academic-year
func AdminGetDefaultAcademicYear(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	now := time.Now()
	year := now.Year()
	// Academic year starts in September
	if now.Month() < 9 {
		year--
	}
	defaultYear := fmt.Sprintf("%d-%d", year, year+1)
	c.JSON(http.StatusOK, gin.H{"success": true, "academic_year": defaultYear})
}

// POST /api/admin/classes
func AdminCreateClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	if toStr(req["class_name"]) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_name là bắt buộc"})
		return
	}

	data := map[string]interface{}{
		"class_name":          req["class_name"],
		"grade":               req["grade"],
		"homeroom_teacher_id": req["homeroom_teacher_id"],
		"academic_year":       req["academic_year"],
		"created_at":          nowStr(),
		"updated_at":          nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("classes").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo lớp học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo lớp học thành công", "data": inserted[0]})
}

// PUT /api/admin/classes/:class_id
func AdminUpdateClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Param("class_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"class_name", "grade", "homeroom_teacher_id", "academic_year"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("classes").Update(data, "representation", "exact").Eq("id", classID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy lớp học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật lớp học thành công", "data": updated[0]})
}

// DELETE /api/admin/classes/:class_id  (soft delete via is_active)
func AdminDeleteClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Param("class_id")
	db := database.GetClient()
	_, err := db.From("classes").Delete("", "").Eq("id", classID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa lớp học thành công"})
}

// POST /api/admin/classes/:class_id/restore
func AdminRestoreClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Param("class_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("classes").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", classID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy lớp học"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục lớp học thành công", "data": updated[0]})
}

// DELETE /api/admin/classes/:class_id/permanent
func AdminPermanentDeleteClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Param("class_id")
	db := database.GetClient()
	_, err := db.From("classes").Delete("", "").Eq("id", classID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn lớp học thành công"})
}

// ── Subject-Teachers CRUD ─────────────────────────────────────────────────────

// GET /api/admin/subject-teachers
func AdminListSubjectTeachers(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var rows []map[string]interface{}
	_, err := db.From("subject_teachers").Select("*", "", false).Order("created_at", nil).ExecuteTo(&rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

// POST /api/admin/subject-teachers
func AdminCreateSubjectTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	isActive := true
	if v, ok := req["is_active"].(bool); ok {
		isActive = v
	}

	data := map[string]interface{}{
		"teacher_id": req["teacher_id"],
		"subject_id": req["subject_id"],
		"is_active":  isActive,
		"created_at": nowStr(),
		"updated_at": nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("subject_teachers").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo subject-teacher"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo thành công", "data": inserted[0]})
}

// PUT /api/admin/subject-teachers/:subject_teacher_id
func AdminUpdateSubjectTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	stID := c.Param("subject_teacher_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"teacher_id", "subject_id"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}
	if v, ok := req["is_active"]; ok && v != nil {
		data["is_active"] = v
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subject_teachers").Update(data, "representation", "exact").Eq("id", stID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật thành công", "data": updated[0]})
}

// DELETE /api/admin/subject-teachers/:subject_teacher_id  (soft delete)
func AdminDeleteSubjectTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	stID := c.Param("subject_teacher_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subject_teachers").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", stID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa thành công"})
}

// POST /api/admin/subject-teachers/:subject_teacher_id/restore
func AdminRestoreSubjectTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	stID := c.Param("subject_teacher_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("subject_teachers").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", stID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục thành công", "data": updated[0]})
}

// DELETE /api/admin/subject-teachers/:subject_teacher_id/permanent
func AdminPermanentDeleteSubjectTeacher(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	stID := c.Param("subject_teacher_id")
	db := database.GetClient()
	_, err := db.From("subject_teachers").Delete("", "").Eq("id", stID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn thành công"})
}

// ── Class-Subjects CRUD ───────────────────────────────────────────────────────

// GET /api/admin/class-subjects
func AdminListClassSubjects(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	classID := c.Query("class_id")
	db := database.GetClient()
	query := db.From("class_subjects").Select("*", "", false)
	if classID != "" {
		query = query.Eq("class_id", classID)
	}
	query = query.Order("created_at", nil)

	var rows []map[string]interface{}
	_, err := query.ExecuteTo(&rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

// POST /api/admin/class-subjects
func AdminCreateClassSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	isActive := true
	if v, ok := req["is_active"].(bool); ok {
		isActive = v
	}

	data := map[string]interface{}{
		"class_id":   req["class_id"],
		"subject_id": req["subject_id"],
		"teacher_id": req["teacher_id"],
		"is_active":  isActive,
		"created_at": nowStr(),
		"updated_at": nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("class_subjects").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo class-subject"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo thành công", "data": inserted[0]})
}

// POST /api/admin/class-subjects/bulk
func AdminBulkCreateClassSubjects(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var items []map[string]interface{}
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	now := nowStr()
	for i := range items {
		items[i]["created_at"] = now
		items[i]["updated_at"] = now
		if items[i]["is_active"] == nil {
			items[i]["is_active"] = true
		}
	}

	var inserted []map[string]interface{}
	_, err := db.From("class_subjects").Insert(items, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": fmt.Sprintf("Tạo %d class-subject thành công", len(inserted)), "data": inserted})
}

// PUT /api/admin/class-subjects/bulk-update
func AdminBulkUpdateClassSubjects(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var items []map[string]interface{}
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	updated := 0
	for _, item := range items {
		id := toStr(item["id"])
		if id == "" {
			continue
		}
		item["updated_at"] = nowStr()
		delete(item, "id")
		var result []map[string]interface{}
		db.From("class_subjects").Update(item, "", "").Eq("id", id).ExecuteTo(&result)
		updated++
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": fmt.Sprintf("Cập nhật %d class-subject thành công", updated)})
}

// PUT /api/admin/class-subjects/:class_subject_id
func AdminUpdateClassSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	csID := c.Param("class_subject_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"class_id", "subject_id", "teacher_id"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}
	if v, ok := req["is_active"]; ok && v != nil {
		data["is_active"] = v
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("class_subjects").Update(data, "representation", "exact").Eq("id", csID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật thành công", "data": updated[0]})
}

// DELETE /api/admin/class-subjects/:class_subject_id  (soft delete)
func AdminDeleteClassSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	csID := c.Param("class_subject_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("class_subjects").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", csID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa thành công"})
}

// POST /api/admin/class-subjects/:class_subject_id/restore
func AdminRestoreClassSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	csID := c.Param("class_subject_id")
	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("class_subjects").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": nowStr(),
	}, "representation", "exact").Eq("id", csID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục thành công", "data": updated[0]})
}

// DELETE /api/admin/class-subjects/:class_subject_id/permanent
func AdminPermanentDeleteClassSubject(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	csID := c.Param("class_subject_id")
	db := database.GetClient()
	_, err := db.From("class_subjects").Delete("", "").Eq("id", csID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn thành công"})
}

// ── Admin Students CRUD ───────────────────────────────────────────────────────

// GET /api/admin/students
func AdminListStudents(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	search := c.Query("search")
	isActiveStr := c.DefaultQuery("is_active", "")

	db := database.GetClient()
	query := db.From("students").Select("*", "", false)

	if search != "" {
		query = query.Or(
			"full_name.ilike.%"+search+"%,student_id.ilike.%"+search+"%,email.ilike.%"+search+"%",
			"",
		)
	}
	if isActiveStr != "" {
		query = query.Eq("is_active", isActiveStr)
	}

	query = query.Order("full_name", &postgrest.OrderOpts{Ascending: true})
	if limit > 0 {
		query = query.Range(skip, skip+limit-1, "")
	}

	var students []map[string]interface{}
	_, err := query.ExecuteTo(&students)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	// Attach parent_contacts for each student
	for _, s := range students {
		sid := toStr(s["id"])
		var parentInfo []map[string]interface{}
		db.From("parent_info").Select("*", "", false).Eq("student_id", sid).ExecuteTo(&parentInfo)
		if parentInfo == nil {
			parentInfo = []map[string]interface{}{}
		}
		s["parent_contacts"] = parentInfo
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": students})
}

// GET /api/admin/students/by-grade
func AdminListStudentsByGrade(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	grade := c.Query("grade")
	db := database.GetClient()
	query := db.From("students").Select("*", "", false).Eq("is_active", "true")
	if grade != "" {
		query = query.Eq("grade", grade)
	}
	query = query.Order("full_name", &postgrest.OrderOpts{Ascending: true})

	var students []map[string]interface{}
	_, err := query.ExecuteTo(&students)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": students})
}

// POST /api/admin/students
func AdminCreateStudent(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	// Delegate to the shared CreateStudent logic
	CreateStudent(c)
}

// PUT /api/admin/students/:student_id
func AdminUpdateStudent(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	studentID := c.Param("student_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	req["updated_at"] = nowStr()
	delete(req, "id")
	delete(req, "created_at")

	// Handle parent_contacts separately
	parentContacts, hasParents := req["parent_contacts"]
	delete(req, "parent_contacts")

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("students").Update(req, "representation", "exact").Eq("id", studentID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}

	// Update parent_contacts if provided
	if hasParents {
		if pcs, ok := parentContacts.([]interface{}); ok {
			db.From("parent_info").Delete("", "").Eq("student_id", studentID).ExecuteTo(nil)
			var parentRecords []map[string]interface{}
			for _, pc := range pcs {
				if pcMap, ok := pc.(map[string]interface{}); ok {
					name, _ := pcMap["name"].(string)
					phone, _ := pcMap["phone"].(string)
					if name != "" || phone != "" {
						relation, _ := pcMap["relation"].(string)
						if relation == "" {
							relation = "parent"
						}
						parentRecords = append(parentRecords, map[string]interface{}{
							"student_id": studentID,
							"relation":   relation,
							"name":       name,
							"phone":      phone,
						})
					}
				}
			}
			if len(parentRecords) > 0 {
				db.From("parent_info").Insert(parentRecords, false, "", "", "").ExecuteTo(nil)
			}
		}
	}

	student := updated[0]
	var parentInfo []map[string]interface{}
	db.From("parent_info").Select("*", "", false).Eq("student_id", studentID).ExecuteTo(&parentInfo)
	if parentInfo == nil {
		parentInfo = []map[string]interface{}{}
	}
	student["parent_contacts"] = parentInfo

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật học sinh thành công", "data": student})
}

// DELETE /api/admin/students/:student_id  (soft delete)
func AdminDeleteStudent(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	// Delegate to the shared soft-delete handler
	DeleteStudent(c)
}

// POST /api/admin/students/:student_id/restore
func AdminRestoreStudent(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	RestoreStudent(c)
}

// DELETE /api/admin/students/:student_id/permanent
func AdminPermanentDeleteStudent(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}
	HardDeleteStudent(c)
}

// POST /api/admin/students/bulk-import
func AdminBulkImportStudents(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var students []map[string]interface{}
	if err := c.ShouldBindJSON(&students); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()
	now := nowStr()
	createdCount := 0
	failedCount := 0
	var errors []string

	for _, s := range students {
		s["created_at"] = now
		s["updated_at"] = now
		if s["is_active"] == nil {
			s["is_active"] = true
		}

		// Remove non-student fields
		delete(s, "parent_contacts")
		delete(s, "class_id")

		var inserted []map[string]interface{}
		_, err := db.From("students").Insert(s, false, "", "", "").ExecuteTo(&inserted)
		if err != nil {
			failedCount++
			errors = append(errors, fmt.Sprintf("Lỗi tạo học sinh '%v': %v", s["full_name"], err.Error()))
		} else {
			createdCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Import %d thành công, %d thất bại", createdCount, failedCount),
		"created": createdCount,
		"failed":  failedCount,
		"errors":  errors,
	})
}

// POST /api/admin/students/move-class
func AdminMoveStudentsClass(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	newClassName, _ := req["class_name"].(string)
	newClassID, _ := req["class_id"]
	studentIDsRaw, _ := req["student_ids"].([]interface{})

	if newClassName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_name là bắt buộc"})
		return
	}
	if len(studentIDsRaw) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_ids là bắt buộc"})
		return
	}

	studentIDs := make([]string, 0, len(studentIDsRaw))
	for _, sid := range studentIDsRaw {
		studentIDs = append(studentIDs, toStr(sid))
	}

	db := database.GetClient()

	// Get class info
	var classInfo map[string]interface{}
	if newClassID != nil && toStr(newClassID) != "" {
		var classes []map[string]interface{}
		db.From("classes").Select("*", "", false).Eq("id", toStr(newClassID)).ExecuteTo(&classes)
		if len(classes) > 0 {
			classInfo = classes[0]
		}
	}

	updateData := map[string]interface{}{
		"class_name": newClassName,
		"updated_at": nowStr(),
	}
	if classInfo != nil {
		if grade := classInfo["grade"]; grade != nil {
			updateData["grade"] = grade
		}
	}

	movedCount := 0
	for _, sid := range studentIDs {
		var result []map[string]interface{}
		_, err := db.From("students").Update(updateData, "", "").Eq("id", sid).ExecuteTo(&result)
		if err == nil {
			movedCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Chuyển %d học sinh sang lớp %s thành công", movedCount, newClassName),
		"moved":   movedCount,
	})
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GET /api/admin/dashboard/overview
func AdminDashboardOverview(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()

	var users []map[string]interface{}
	db.From("users").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&users)

	var teachers []map[string]interface{}
	db.From("teachers").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&teachers)

	var students []map[string]interface{}
	db.From("students").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&students)

	var classes []map[string]interface{}
	db.From("classes").Select("id", "", false).ExecuteTo(&classes)

	// Attendance for current week
	now := time.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	var weekAttendance []map[string]interface{}
	db.From("attendance").Select("status", "", false).
		Gte("date", weekStart.Format("2006-01-02")).
		Lte("date", now.Format("2006-01-02")).
		ExecuteTo(&weekAttendance)

	presentCount := 0
	for _, a := range weekAttendance {
		if a["status"] == "present" {
			presentCount++
		}
	}
	attendanceRate := 0.0
	if len(weekAttendance) > 0 {
		attendanceRate = float64(presentCount) / float64(len(weekAttendance)) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_users":    len(users),
			"total_teachers": len(teachers),
			"total_students": len(students),
			"total_classes":  len(classes),
			"attendance_this_week": gin.H{
				"present":         presentCount,
				"total":           len(weekAttendance),
				"attendance_rate": fmt.Sprintf("%.1f", attendanceRate),
			},
		},
	})
}

// GET /api/admin/dashboard/attendance-trends
func AdminDashboardAttendanceTrends(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days <= 0 {
		days = 30
	}

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	db := database.GetClient()
	var attendance []map[string]interface{}
	db.From("attendance").Select("date,status", "", false).
		Gte("date", startDate.Format("2006-01-02")).
		Lte("date", endDate.Format("2006-01-02")).
		ExecuteTo(&attendance)

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

// GET /api/admin/dashboard/class-performance
func AdminDashboardClassPerformance(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var classes []map[string]interface{}
	db.From("classes").Select("*", "", false).Order("class_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&classes)

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

// GET /api/admin/dashboard/academic-years
func AdminDashboardAcademicYears(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var classes []map[string]interface{}
	db.From("classes").Select("academic_year", "", false).Order("academic_year", nil).ExecuteTo(&classes)

	seen := make(map[string]bool)
	var years []string
	for _, cls := range classes {
		if ay, ok := cls["academic_year"].(string); ok && ay != "" && !seen[ay] {
			seen[ay] = true
			years = append(years, ay)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": years})
}

// GET /api/admin/dashboard/system-health
func AdminDashboardSystemHealth(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"uptime":    time.Now().Format(time.RFC3339),
			"services": gin.H{
				"database": "connected",
				"api":      "running",
			},
		},
	})
}

// ── System Settings ───────────────────────────────────────────────────────────

// GET /api/admin/system-settings
func AdminListSystemSettings(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	db := database.GetClient()
	var settings []map[string]interface{}
	_, err := db.From("system_settings").Select("*", "", false).Order("setting_key", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": settings})
}

// GET /api/admin/system-settings/:setting_key
func AdminGetSystemSetting(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	key := c.Param("setting_key")
	db := database.GetClient()
	var settings []map[string]interface{}
	_, err := db.From("system_settings").Select("*", "", false).Eq("setting_key", key).ExecuteTo(&settings)
	if err != nil || len(settings) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy setting"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": settings[0]})
}

// PUT /api/admin/system-settings/:setting_key
func AdminUpdateSystemSetting(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	key := c.Param("setting_key")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	updateData := map[string]interface{}{"updated_at": nowStr()}
	if v, ok := req["setting_value"]; ok {
		updateData["setting_value"] = v
	}
	if v, ok := req["description"]; ok && v != nil {
		updateData["description"] = v
	}

	db := database.GetClient()

	// Upsert: check if exists
	var existing []map[string]interface{}
	db.From("system_settings").Select("id", "", false).Eq("setting_key", key).ExecuteTo(&existing)

	var result []map[string]interface{}
	var err error
	if len(existing) == 0 {
		updateData["setting_key"] = key
		updateData["created_at"] = nowStr()
		_, err = db.From("system_settings").Insert(updateData, false, "", "representation", "exact").ExecuteTo(&result)
	} else {
		_, err = db.From("system_settings").Update(updateData, "representation", "exact").Eq("setting_key", key).ExecuteTo(&result)
	}

	if err != nil || len(result) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi cập nhật setting"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật setting thành công", "data": result[0]})
}

// ── Day-offs ──────────────────────────────────────────────────────────────────

// GET /api/admin/dayoffs
func AdminListDayoffs(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	academicYear := c.Query("academic_year")
	db := database.GetClient()
	query := db.From("dayoff_configs").Select("*", "", false)
	if academicYear != "" {
		query = query.Eq("academic_year", academicYear)
	}
	query = query.Order("date", &postgrest.OrderOpts{Ascending: true})

	var dayoffs []map[string]interface{}
	_, err := query.ExecuteTo(&dayoffs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": dayoffs})
}

// POST /api/admin/dayoffs
func AdminCreateDayoff(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{
		"date":          req["date"],
		"reason":        req["reason"],
		"academic_year": req["academic_year"],
		"day_type":      req["day_type"],
		"created_at":    nowStr(),
		"updated_at":    nowStr(),
	}

	db := database.GetClient()
	var inserted []map[string]interface{}
	_, err := db.From("dayoff_configs").Insert(data, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo ngày nghỉ"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tạo ngày nghỉ thành công", "data": inserted[0]})
}

// PUT /api/admin/dayoffs/:config_id
func AdminUpdateDayoff(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	configID := c.Param("config_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	data := map[string]interface{}{"updated_at": nowStr()}
	for _, field := range []string{"date", "reason", "academic_year", "day_type"} {
		if v, ok := req[field]; ok && v != nil {
			data[field] = v
		}
	}

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("dayoff_configs").Update(data, "representation", "exact").Eq("id", configID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy ngày nghỉ"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật ngày nghỉ thành công", "data": updated[0]})
}

// DELETE /api/admin/dayoffs/:config_id
func AdminDeleteDayoff(c *gin.Context) {
	if !requireAdmin(c) {
		return
	}

	configID := c.Param("config_id")
	db := database.GetClient()
	_, err := db.From("dayoff_configs").Delete("", "").Eq("id", configID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa ngày nghỉ thành công"})
}
