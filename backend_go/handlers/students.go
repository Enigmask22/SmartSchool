package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/middleware"
)

// POST /api/students/
func CreateStudent(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	db := database.GetClient()

	// Check student_id uniqueness
	if sid, ok := req["student_id"].(string); ok && sid != "" {
		var existing []map[string]interface{}
		db.From("students").Select("id", "", false).Eq("student_id", sid).ExecuteTo(&existing)
		if len(existing) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"detail": "Mã học sinh đã tồn tại"})
			return
		}
	}

	// Check gender
	gender, _ := req["gender"].(string)
	if gender != "Nam" && gender != "Nữ" && gender != "Khác" && gender != "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Giới tính phải là Nam, Nữ hoặc Khác"})
		return
	}

	// Check duplicate name+dob
	forceCreate, _ := req["force_create"].(bool)
	fullName, _ := req["full_name"].(string)
	dob, _ := req["date_of_birth"].(string)
	if dob != "" && !forceCreate {
		var dups []map[string]interface{}
		db.From("students").Select("id,full_name", "", false).
			Eq("full_name", fullName).
			Eq("date_of_birth", dob).
			Eq("is_active", "true").
			ExecuteTo(&dups)
		if len(dups) > 0 {
			c.JSON(http.StatusConflict, gin.H{
				"detail": fmt.Sprintf("Học sinh cùng tên '%s' và cùng ngày sinh đã tồn tại. Vui lòng xác nhận để tiếp tục.", fullName),
			})
			return
		}
	}

	// Extract parent_contacts và class_id
	parentContacts, _ := req["parent_contacts"]
	classID, _ := req["class_id"]
	delete(req, "force_create")
	delete(req, "parent_contacts")
	delete(req, "class_id")

	req["created_at"] = time.Now().Format(time.RFC3339)
	req["updated_at"] = time.Now().Format(time.RFC3339)
	if req["is_active"] == nil {
		req["is_active"] = true
	}

	// Get class info if class_id provided
	var classInfo map[string]interface{}
	if classID != nil && classID != "" && classID != float64(0) {
		var classes []map[string]interface{}
		db.From("classes").Select("id,class_name,grade,homeroom_teacher_id", "", false).
			Eq("id", fmt.Sprintf("%v", classID)).ExecuteTo(&classes)
		if len(classes) > 0 {
			classInfo = classes[0]
		}
	}

	var inserted []map[string]interface{}
	_, err := db.From("students").Insert(req, false, "", "representation", "exact").ExecuteTo(&inserted)
	if err != nil || len(inserted) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi tạo học sinh"})
		return
	}

	studentRecord := inserted[0]
	newStudentID := studentRecord["id"]

	// Insert parent_contacts
	if pcs, ok := parentContacts.([]interface{}); ok {
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
						"student_id": newStudentID,
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

	// Insert homeroom_students_history
	if classInfo != nil {
		db.From("homeroom_students_history").Insert(map[string]interface{}{
			"teacher_id": classInfo["homeroom_teacher_id"],
			"class_id":   classInfo["id"],
			"student_id": newStudentID,
		}, false, "", "", "").ExecuteTo(nil)
	}

	// Fetch parent_info
	var parentInfo []map[string]interface{}
	db.From("parent_info").Select("*", "", false).Eq("student_id", fmt.Sprintf("%v", newStudentID)).ExecuteTo(&parentInfo)
	studentRecord["parent_contacts"] = parentInfo

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo học sinh thành công",
		"data":    studentRecord,
	})
}

// GET /api/students/
func GetStudents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	className := c.Query("class_name")
	grade := c.Query("grade")
	isActiveStr := c.DefaultQuery("is_active", "true")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	db := database.GetClient()
	query := db.From("students").Select("*", "", false)

	if search != "" {
		query = query.Or(
			"full_name.ilike.%"+search+"%,student_id.ilike.%"+search+"%,email.ilike.%"+search+"%",
			"",
		)
	}
	if className != "" {
		query = query.Eq("class_name", className)
	}
	if grade != "" {
		query = query.Eq("grade", grade)
	}
	if isActiveStr != "" {
		query = query.Eq("is_active", isActiveStr)
	}

	// Count total
	var all []map[string]interface{}
	query.ExecuteTo(&all)
	total := len(all)

	// Paginated
	offset := (page - 1) * pageSize
	var students []map[string]interface{}
	query.Order("created_at", nil).Range(offset, offset+pageSize-1, "").ExecuteTo(&students)

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      students,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GET /api/students/subjects
func GetSubjects(c *gin.Context) {
	db := database.GetClient()
	var subjects []map[string]interface{}
	_, err := db.From("subjects").Select("*", "", false).Eq("is_active", "true").Order("subject_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&subjects)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": subjects})
}

// GET /api/students/classes/list
func GetClassesList(c *gin.Context) {
	db := database.GetClient()
	var classes []map[string]interface{}
	db.From("classes").Select("*", "", false).Order("class_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&classes)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": classes})
}

// GET /api/students/stats/summary
func GetStudentStats(c *gin.Context) {
	db := database.GetClient()
	var allStudents []map[string]interface{}
	db.From("students").Select("is_active,grade,class_name", "", false).ExecuteTo(&allStudents)

	total := len(allStudents)
	active := 0
	gradeCount := make(map[string]int)
	classCount := make(map[string]int)

	for _, s := range allStudents {
		if isActive, ok := s["is_active"].(bool); ok && isActive {
			active++
		}
		if g, ok := s["grade"].(string); ok {
			gradeCount[g]++
		}
		if cn, ok := s["class_name"].(string); ok {
			classCount[cn]++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total":    total,
			"active":   active,
			"inactive": total - active,
			"by_grade": gradeCount,
			"by_class": classCount,
		},
	})
}

// GET /api/students/by-prefix/:prefix
func GetStudentsByPrefix(c *gin.Context) {
	prefix := c.Param("prefix")
	db := database.GetClient()
	var students []map[string]interface{}
	db.From("students").Select("*", "", false).
		Ilike("student_id", prefix+"%").
		Eq("is_active", "true").
		ExecuteTo(&students)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": students})
}

// GET /api/students/:student_id
func GetStudent(c *gin.Context) {
	studentID := c.Param("student_id")
	db := database.GetClient()

	var students []map[string]interface{}
	_, err := db.From("students").Select("*", "", false).Eq("id", studentID).ExecuteTo(&students)
	if err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}

	student := students[0]

	// Fetch parent_info
	var parentInfo []map[string]interface{}
	db.From("parent_info").Select("*", "", false).Eq("student_id", studentID).ExecuteTo(&parentInfo)
	student["parent_contacts"] = parentInfo

	c.JSON(http.StatusOK, gin.H{"success": true, "data": student})
}

// PUT /api/students/:student_id
func UpdateStudent(c *gin.Context) {
	studentID := c.Param("student_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	req["updated_at"] = time.Now().Format(time.RFC3339)
	delete(req, "id")
	delete(req, "created_at")

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("students").Update(req, "representation", "exact").Eq("id", studentID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated[0]})
}

// DELETE /api/students/:student_id (soft delete)
func DeleteStudent(c *gin.Context) {
	studentID := c.Param("student_id")
	db := database.GetClient()

	var updated []map[string]interface{}
	_, err := db.From("students").Update(map[string]interface{}{
		"is_active":  false,
		"updated_at": time.Now().Format(time.RFC3339),
	}, "representation", "exact").Eq("id", studentID).ExecuteTo(&updated)

	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa học sinh thành công (soft delete)"})
}

// POST /api/students/:student_id/restore
func RestoreStudent(c *gin.Context) {
	studentID := c.Param("student_id")
	db := database.GetClient()

	var updated []map[string]interface{}
	_, err := db.From("students").Update(map[string]interface{}{
		"is_active":  true,
		"updated_at": time.Now().Format(time.RFC3339),
	}, "representation", "exact").Eq("id", studentID).ExecuteTo(&updated)

	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy học sinh"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khôi phục học sinh thành công", "data": updated[0]})
}

// DELETE /api/students/:student_id/permanent
func HardDeleteStudent(c *gin.Context) {
	studentID := c.Param("student_id")
	db := database.GetClient()

	// Delete related data
	db.From("parent_info").Delete("", "").Eq("student_id", studentID).ExecuteTo(nil)
	db.From("face_embeddings").Delete("", "").Eq("student_id", studentID).ExecuteTo(nil)
	db.From("attendance").Delete("", "").Eq("student_id", studentID).ExecuteTo(nil)

	_, err := db.From("students").Delete("", "").Eq("id", studentID).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa vĩnh viễn học sinh thành công"})
}

// POST /api/students/:student_id/upload-image
func UploadStudentImage(c *gin.Context) {
	studentID := c.Param("student_id")
	_ = middleware.GetCurrentUser(c)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "File không hợp lệ"})
		return
	}
	defer file.Close()

	// Create uploads directory
	uploadDir := "./uploads/students"
	os.MkdirAll(uploadDir, 0755)

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("student_%s_%d%s", studentID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi đọc file"})
		return
	}
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi lưu file"})
		return
	}

	imageURL := "/uploads/students/" + filename

	// Update student profile_image
	db := database.GetClient()
	var updated []map[string]interface{}
	db.From("students").Update(map[string]interface{}{
		"profile_image": imageURL,
		"updated_at":    time.Now().Format(time.RFC3339),
	}, "representation", "exact").Eq("id", studentID).ExecuteTo(&updated)

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Upload ảnh thành công",
		"image_url": imageURL,
	})
}

// Unused import suppress
var _ = strings.TrimSpace
var _ = json.Marshal
var _ = fmt.Sprintf
