package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
)

func getVietnamTime() time.Time {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("UTC+7", 7*60*60)
	}
	return time.Now().In(loc)
}

func getVietnamDateString() string {
	return getVietnamTime().Format("2006-01-02")
}

func getVietnamTimeString() string {
	return getVietnamTime().Format(time.RFC3339)
}

// POST /api/attendance/check-in hoặc POST /api/attendance/
func CheckInAttendance(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	studentID := req["student_id"]
	if studentID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id là bắt buộc"})
		return
	}

	db := database.GetClient()
	currentTime := getVietnamTimeString()
	currentDate := getVietnamDateString()

	confidenceScore, _ := req["confidence_score"].(float64)
	notes, _ := req["notes"].(string)
	status, _ := req["status"].(string)

	// Call RPC process_attendance_checkin
	rpcBody := db.Rpc("process_attendance_checkin", "", map[string]interface{}{
		"p_student_id":        studentID,
		"p_date":              currentDate,
		"p_checkin_time":      currentTime,
		"p_confidence_score":  confidenceScore,
		"p_recognition_model": "manual",
		"p_device_info": map[string]interface{}{
			"source":    "manual_checkin",
			"notes":     notes,
			"status":    status,
			"timestamp": currentTime,
		},
	})

	var rpcResult []map[string]interface{}
	if err := json.Unmarshal([]byte(rpcBody), &rpcResult); err != nil || len(rpcResult) == 0 {
		// Fallback: manual insert
		attendance := map[string]interface{}{
			"student_id":       studentID,
			"date":             currentDate,
			"status":           status,
			"check_in_time":    currentTime,
			"confidence_score": confidenceScore,
			"method":           "manual",
			"created_at":       currentTime,
			"updated_at":       currentTime,
		}
		var inserted []map[string]interface{}
		db.From("attendance").Insert(attendance, false, "", "representation", "exact").ExecuteTo(&inserted)
		if len(inserted) > 0 {
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "Điểm danh thành công", "data": inserted[0]})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi gọi database function"})
		}
		return
	}

	result := rpcResult[0]
	attendanceID := result["attendance_id"]
	isFirstCheckin, _ := result["is_first_checkin"].(bool)
	finalStatus, _ := result["final_status"].(string)

	// Override status nếu manual có status khác
	if status != "" && status != finalStatus {
		db.From("attendance").Update(map[string]interface{}{
			"status": status,
			"notes":  notes,
			"method": "manual",
		}, "", "").Eq("id", fmt.Sprintf("%v", attendanceID)).ExecuteTo(nil)
	}

	msg := "Điểm danh thành công"
	if !isFirstCheckin {
		msg = "Cập nhật giờ ra thành công"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": msg,
		"data": gin.H{
			"id":         attendanceID,
			"student_id": studentID,
			"status":     status,
			"method":     "manual",
		},
	})
}

// POST /api/attendance/manual
func CreateManualAttendance(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	studentID := req["student_id"]
	if studentID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id là bắt buộc"})
		return
	}

	db := database.GetClient()
	today := getVietnamDateString()
	nowTime := getVietnamTimeString()
	status, _ := req["status"].(string)
	notes, _ := req["notes"].(string)

	// Check existing
	var existing []map[string]interface{}
	db.From("attendance").Select("id,status,notes", "", false).
		Eq("student_id", fmt.Sprintf("%v", studentID)).
		Eq("date", today).
		Limit(1, "").
		ExecuteTo(&existing)

	if len(existing) > 0 {
		attID := existing[0]["id"]
		existingStatus, _ := existing[0]["status"].(string)
		if status == "" {
			status = existingStatus
		}
		if status == "" {
			status = "absent"
		}

		var updated []map[string]interface{}
		db.From("attendance").Update(map[string]interface{}{
			"status":     status,
			"notes":      notes,
			"method":     "manual",
			"updated_at": nowTime,
		}, "representation", "exact").Eq("id", fmt.Sprintf("%v", attID)).ExecuteTo(&updated)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Cập nhật trạng thái điểm danh thành công",
			"data": func() interface{} {
				if len(updated) > 0 {
					return updated[0]
				}
				return nil
			}(),
		})
		return
	}

	if status == "" {
		status = "absent"
	}
	payload := map[string]interface{}{
		"student_id": studentID,
		"date":       today,
		"status":     status,
		"notes":      notes,
		"method":     "manual",
		"created_at": nowTime,
		"updated_at": nowTime,
	}

	var inserted []map[string]interface{}
	db.From("attendance").Insert(payload, false, "", "representation", "exact").ExecuteTo(&inserted)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tạo bản ghi điểm danh thủ công thành công",
		"data": func() interface{} {
			if len(inserted) > 0 {
				return inserted[0]
			}
			return nil
		}(),
	})
}

// GET /api/attendance/ - list with filters
func GetAttendanceList(c *gin.Context) {
	db := database.GetClient()
	query := db.From("attendance").Select("*", "", false)

	if dateFrom := c.Query("date_from"); dateFrom != "" {
		query = query.Gte("date", dateFrom)
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		query = query.Lte("date", dateTo)
	}
	if studentID := c.Query("student_id"); studentID != "" {
		query = query.Eq("student_id", studentID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Eq("status", status)
	}

	var all []map[string]interface{}
	query.ExecuteTo(&all)
	total := len(all)

	page := 1
	pageSize := 20
	if p := c.Query("page"); p != "" {
		fmt.Sscan(p, &page)
	}
	if ps := c.Query("page_size"); ps != "" {
		fmt.Sscan(ps, &pageSize)
	}
	offset := (page - 1) * pageSize

	var records []map[string]interface{}
	query.Order("date", nil).Range(offset, offset+pageSize-1, "").ExecuteTo(&records)

	// Join with students
	if len(records) > 0 {
		var studentIDs []string
		seen := make(map[string]bool)
		for _, r := range records {
			sid := fmt.Sprintf("%v", r["student_id"])
			if !seen[sid] {
				studentIDs = append(studentIDs, sid)
				seen[sid] = true
			}
		}
		var students []map[string]interface{}
		db.From("students").Select("id,student_id,full_name,class_name,grade", "", false).In("id", studentIDs).ExecuteTo(&students)
		studentMap := make(map[string]map[string]interface{})
		for _, s := range students {
			studentMap[fmt.Sprintf("%v", s["id"])] = s
		}
		for _, r := range records {
			sid := fmt.Sprintf("%v", r["student_id"])
			r["students"] = studentMap[sid]
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      records,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GET /api/attendance/stats/today
func GetTodayAttendanceStats(c *gin.Context) {
	db := database.GetClient()
	today := getVietnamDateString()

	var attendance []map[string]interface{}
	db.From("attendance").Select("status", "", false).Eq("date", today).ExecuteTo(&attendance)

	var allStudents []map[string]interface{}
	db.From("students").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&allStudents)
	total := len(allStudents)

	present, absent, late := 0, 0, 0
	for _, a := range attendance {
		switch a["status"] {
		case "present":
			present++
		case "absent":
			absent++
		case "late":
			late++
		}
	}

	rate := 0.0
	if total > 0 {
		rate = float64(present) / float64(total) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lấy thống kê thành công",
		"data": gin.H{
			"total_students":  total,
			"present_today":   present,
			"absent_today":    absent,
			"late_today":      late,
			"attendance_rate": fmt.Sprintf("%.2f", rate),
		},
	})
}

// GET /api/attendance/today
func GetTodayAttendance(c *gin.Context) {
	className := c.Query("class_name")
	db := database.GetClient()
	today := time.Now().Format("2006-01-02")

	var attendance []map[string]interface{}
	db.From("attendance").Select("*", "", false).Eq("date", today).
		Order("check_in_time", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&attendance)

	if len(attendance) > 0 {
		var studentIDs []string
		seen := make(map[string]bool)
		for _, a := range attendance {
			sid := fmt.Sprintf("%v", a["student_id"])
			if !seen[sid] {
				studentIDs = append(studentIDs, sid)
				seen[sid] = true
			}
		}
		var students []map[string]interface{}
		db.From("students").Select("id,student_id,full_name,class_name,grade,profile_image", "", false).In("id", studentIDs).ExecuteTo(&students)
		studentMap := make(map[string]map[string]interface{})
		for _, s := range students {
			studentMap[fmt.Sprintf("%v", s["id"])] = s
		}
		for _, a := range attendance {
			a["students"] = studentMap[fmt.Sprintf("%v", a["student_id"])]
		}
	}

	if className != "" {
		var filtered []map[string]interface{}
		for _, a := range attendance {
			if s, ok := a["students"].(map[string]interface{}); ok {
				if cn, _ := s["class_name"].(string); cn == className {
					filtered = append(filtered, a)
				}
			}
		}
		attendance = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      attendance,
		"total":     len(attendance),
		"page":      1,
		"page_size": len(attendance),
	})
}

// GET /api/attendance/student/:student_id
func GetStudentAttendance(c *gin.Context) {
	studentID := c.Param("student_id")
	db := database.GetClient()
	query := db.From("attendance").Select("*", "", false).Eq("student_id", studentID)

	if df := c.Query("date_from"); df != "" {
		query = query.Gte("date", df)
	}
	if dt := c.Query("date_to"); dt != "" {
		query = query.Lte("date", dt)
	}

	var records []map[string]interface{}
	query.Order("date", nil).ExecuteTo(&records)

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      records,
		"total":     len(records),
		"page":      1,
		"page_size": len(records),
	})
}

// GET /api/attendance/stats
func GetAttendanceStats(c *gin.Context) {
	targetDate := c.DefaultQuery("target_date", time.Now().Format("2006-01-02"))
	db := database.GetClient()

	var allStudents []map[string]interface{}
	db.From("students").Select("id", "", false).Eq("is_active", "true").ExecuteTo(&allStudents)
	total := len(allStudents)

	var attendance []map[string]interface{}
	db.From("attendance").Select("status", "", false).Eq("date", targetDate).ExecuteTo(&attendance)

	present, absent, late := 0, 0, 0
	for _, a := range attendance {
		switch a["status"] {
		case "present":
			present++
		case "absent":
			absent++
		case "late":
			late++
		}
	}

	rate := 0.0
	if total > 0 {
		rate = float64(present) / float64(total) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true, "message": "Lấy thống kê thành công",
		"data": gin.H{
			"total_students": total, "present_count": present,
			"absent_count": absent, "late_count": late,
			"attendance_rate": fmt.Sprintf("%.1f", rate),
		},
	})
}

// GET /api/attendance/stats/range
func GetAttendanceStatsRange(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	if dateFrom == "" || dateTo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "date_from và date_to là bắt buộc"})
		return
	}

	db := database.GetClient()
	var attendance []map[string]interface{}
	db.From("attendance").Select("date,status", "", false).Gte("date", dateFrom).Lte("date", dateTo).ExecuteTo(&attendance)

	statsByDate := make(map[string]map[string]int)
	for _, a := range attendance {
		d, _ := a["date"].(string)
		s, _ := a["status"].(string)
		if statsByDate[d] == nil {
			statsByDate[d] = map[string]int{"present": 0, "absent": 0, "late": 0, "total": 0}
		}
		statsByDate[d][s]++
		statsByDate[d]["total"]++
	}

	var result []map[string]interface{}
	for d, stats := range statsByDate {
		result = append(result, map[string]interface{}{
			"date": d, "present": stats["present"],
			"absent": stats["absent"], "late": stats["late"], "total": stats["total"],
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// GET /api/attendance/full-list
func GetFullAttendanceList(c *gin.Context) {
	targetDate := c.DefaultQuery("target_date", time.Now().Format("2006-01-02"))
	className := c.Query("class_name")
	db := database.GetClient()

	studentsQuery := db.From("students").Select("id,student_id,full_name,class_name,grade,profile_image", "", false).Eq("is_active", "true")
	if className != "" {
		studentsQuery = studentsQuery.Eq("class_name", className)
	}

	var allStudents []map[string]interface{}
	studentsQuery.Order("class_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&allStudents)

	if len(allStudents) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}, "total": 0, "page": 1, "page_size": 0})
		return
	}

	var studentIDs []string
	for _, s := range allStudents {
		studentIDs = append(studentIDs, fmt.Sprintf("%v", s["id"]))
	}

	var attendanceRecords []map[string]interface{}
	db.From("attendance").Select("*", "", false).Eq("date", targetDate).In("student_id", studentIDs).ExecuteTo(&attendanceRecords)

	attendanceLookup := make(map[string]map[string]interface{})
	for _, a := range attendanceRecords {
		sid := fmt.Sprintf("%v", a["student_id"])
		attendanceLookup[sid] = a
	}

	var fullList []map[string]interface{}
	for _, student := range allStudents {
		sid := fmt.Sprintf("%v", student["id"])
		att := attendanceLookup[sid]
		record := map[string]interface{}{"student_id": student["id"], "date": targetDate, "students": student}
		if att != nil {
			for k, v := range att {
				record[k] = v
			}
		} else {
			record["id"] = nil
			record["check_in_time"] = nil
			record["check_out_time"] = nil
			record["status"] = "absent"
			record["method"] = nil
		}
		fullList = append(fullList, record)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true, "data": fullList, "total": len(fullList), "page": 1, "page_size": len(fullList),
	})
}

// PUT /api/attendance/:attendance_id
func UpdateAttendance(c *gin.Context) {
	attID := c.Param("attendance_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	req["updated_at"] = getVietnamTimeString()
	delete(req, "id")

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("attendance").Update(req, "representation", "exact").Eq("id", attID).ExecuteTo(&updated)
	if err != nil || len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy bản ghi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Cập nhật điểm danh thành công", "data": updated[0]})
}

// DELETE /api/attendance/:attendance_id
func DeleteAttendance(c *gin.Context) {
	attID := c.Param("attendance_id")
	db := database.GetClient()

	var deleted []map[string]interface{}
	_, err := db.From("attendance").Delete("representation", "exact").Eq("id", attID).ExecuteTo(&deleted)
	if err != nil || len(deleted) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy bản ghi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xóa bản ghi điểm danh thành công"})
}

// POST /api/attendance/recalculate/:attendance_id
func RecalculateAttendance(c *gin.Context) {
	attID := c.Param("attendance_id")
	db := database.GetClient()

	rpcBody1 := db.Rpc("recalculate_single_attendance", "", map[string]interface{}{
		"p_attendance_id": attID,
	})
	var result []map[string]interface{}
	json.Unmarshal([]byte(rpcBody1), &result)

	if len(result) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi gọi database function"})
		return
	}

	r := result[0]
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": r["message"],
		"data": gin.H{
			"attendance_id": attID,
			"old_status":    r["old_status"],
			"new_status":    r["new_status"],
			"changed":       r["old_status"] != r["new_status"],
		},
	})
}

// POST /api/attendance/recalculate/daily
func RecalculateDailyAttendance(c *gin.Context) {
	targetDate := c.DefaultQuery("target_date", time.Now().Format("2006-01-02"))
	db := database.GetClient()

	rpcBody2 := db.Rpc("recalculate_daily_attendance", "", map[string]interface{}{
		"p_date": targetDate,
	})
	var result []map[string]interface{}
	json.Unmarshal([]byte(rpcBody2), &result)

	if len(result) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi gọi database function"})
		return
	}

	r := result[0]
	totalChecked, _ := r["total_checked"].(float64)
	updatedCount, _ := r["updated_count"].(float64)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": r["message"],
		"data": gin.H{
			"date":          targetDate,
			"total_checked": int(totalChecked),
			"updated_count": int(updatedCount),
			"no_changes":    int(updatedCount) == 0,
		},
	})
}

// PATCH /api/attendance/:attendance_id/status
func UpdateAttendanceStatus(c *gin.Context) {
	attID := c.Param("attendance_id")
	status := c.Query("status")
	notes := c.Query("notes")

	validStatuses := map[string]bool{"present": true, "absent": true, "late": true}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Trạng thái không hợp lệ. Chỉ chấp nhận: present, absent, late"})
		return
	}

	db := database.GetClient()
	var existing []map[string]interface{}
	db.From("attendance").Select("*", "", false).Eq("id", attID).ExecuteTo(&existing)
	if len(existing) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy bản ghi điểm danh"})
		return
	}

	updateData := map[string]interface{}{
		"status":     status,
		"updated_at": getVietnamTimeString(),
	}
	if notes != "" {
		updateData["notes"] = notes
	}

	var updated []map[string]interface{}
	db.From("attendance").Update(updateData, "representation", "exact").Eq("id", attID).ExecuteTo(&updated)

	c.JSON(http.StatusOK, gin.H{
		"success": true, "message": "Cập nhật trạng thái điểm danh thành công",
		"data": func() interface{} {
			if len(updated) > 0 {
				return updated[0]
			}
			return nil
		}(),
	})
}

// POST /api/attendance/check-out/:attendance_id
func CheckOutAttendance(c *gin.Context) {
	attID := c.Param("attendance_id")
	db := database.GetClient()

	var existing []map[string]interface{}
	db.From("attendance").Select("*", "", false).Eq("id", attID).ExecuteTo(&existing)
	if len(existing) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy bản ghi điểm danh"})
		return
	}

	currentTime := getVietnamTimeString()
	var updated []map[string]interface{}
	db.From("attendance").Update(map[string]interface{}{
		"check_out_time": currentTime,
		"updated_at":     currentTime,
	}, "representation", "exact").Eq("id", attID).ExecuteTo(&updated)

	c.JSON(http.StatusOK, gin.H{
		"success": true, "message": "Check-out thành công",
		"data": func() interface{} {
			if len(updated) > 0 {
				return updated[0]
			}
			return nil
		}(),
	})
}

// Suppress unused imports
var _ = strings.TrimSpace
var _ = fmt.Sprintf
