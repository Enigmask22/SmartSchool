package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	postgrest "github.com/supabase-community/postgrest-go"
	"smart_school_go/database"
	"smart_school_go/middleware"
)

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------

func homeroomToStr(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

// unique de-duplicates a string slice while preserving order.
func unique(ss []string) []string {
	seen := make(map[string]struct{}, len(ss))
	out := ss[:0:0]
	for _, s := range ss {
		if _, ok := seen[s]; !ok {
			seen[s] = struct{}{}
			out = append(out, s)
		}
	}
	return out
}

// --------------------------------------------------------------------------
// GET /api/homeroom/attendance/bootstrap
// --------------------------------------------------------------------------

func GetHomeroomAttendanceBootstrap(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}

	targetDate := c.DefaultQuery("target_date", time.Now().Format("2006-01-02"))
	academicYearParam := c.Query("academic_year")
	classNameParam := c.Query("class_name")
	classIDParam := c.Query("class_id")

	db := database.GetClient()

	// 1. Resolve teacher_id from current user
	var teachers []map[string]interface{}
	db.From("teachers").Select("id", "", false).
		Eq("user_id", homeroomToStr(user["id"])).
		ExecuteTo(&teachers)

	emptyResult := gin.H{
		"academic_years": []interface{}{},
		"classes":        []interface{}{},
		"selected_class": nil,
		"records":        []interface{}{},
		"stats": gin.H{
			"total_students": 0,
			"present_count":  0,
			"absent_count":   0,
			"late_count":     0,
		},
	}

	if len(teachers) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": emptyResult})
		return
	}
	teacherID := homeroomToStr(teachers[0]["id"])

	// 2. Get all class_ids this teacher manages
	var historyRows []map[string]interface{}
	db.From("homeroom_students_history").Select("class_id", "", false).
		Eq("teacher_id", teacherID).
		ExecuteTo(&historyRows)

	rawClassIDs := make([]string, 0, len(historyRows))
	for _, row := range historyRows {
		if cid := homeroomToStr(row["class_id"]); cid != "" && cid != "<nil>" {
			rawClassIDs = append(rawClassIDs, cid)
		}
	}
	classIDs := unique(rawClassIDs)

	if len(classIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": emptyResult})
		return
	}

	// 3. Load all matching classes
	var allClasses []map[string]interface{}
	db.From("classes").Select("id,class_name,academic_year,grade", "", false).
		In("id", classIDs).
		ExecuteTo(&allClasses)

	// 4. Collect distinct academic years
	yearSet := make(map[string]struct{})
	for _, cls := range allClasses {
		if ay := homeroomToStr(cls["academic_year"]); ay != "" && ay != "<nil>" {
			yearSet[ay] = struct{}{}
		}
	}
	academicYears := make([]string, 0, len(yearSet))
	for y := range yearSet {
		academicYears = append(academicYears, y)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(academicYears)))

	// 5. Resolve active academic year
	resolvedYear := academicYearParam
	if resolvedYear == "" {
		// Try system_settings default
		var settings []map[string]interface{}
		db.From("system_settings").Select("setting_value", "", false).
			Eq("setting_key", "academic_year").
			Limit(1, "").
			ExecuteTo(&settings)
		if len(settings) > 0 {
			resolvedYear = homeroomToStr(settings[0]["setting_value"])
		}
	}
	if resolvedYear == "" && len(academicYears) > 0 {
		resolvedYear = academicYears[0]
	}

	// 6. Filter classes by resolved academic year
	var filteredClasses []map[string]interface{}
	for _, cls := range allClasses {
		if resolvedYear == "" || homeroomToStr(cls["academic_year"]) == resolvedYear {
			filteredClasses = append(filteredClasses, cls)
		}
	}

	// 7. Resolve selected class
	var selectedClass map[string]interface{}
	if classIDParam != "" {
		for _, cls := range filteredClasses {
			if homeroomToStr(cls["id"]) == classIDParam {
				selectedClass = cls
				break
			}
		}
	}
	if selectedClass == nil && classNameParam != "" {
		for _, cls := range filteredClasses {
			if homeroomToStr(cls["class_name"]) == classNameParam {
				selectedClass = cls
				break
			}
		}
	}
	if selectedClass == nil && len(filteredClasses) > 0 {
		selectedClass = filteredClasses[0]
	}

	if selectedClass == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"academic_years": academicYears,
				"classes":        filteredClasses,
				"selected_class": nil,
				"records":        []interface{}{},
				"stats": gin.H{
					"total_students": 0,
					"present_count":  0,
					"absent_count":   0,
					"late_count":     0,
				},
			},
		})
		return
	}

	selectedClassID := homeroomToStr(selectedClass["id"])

	// 8. Get student_ids in the selected class
	var classStudentRows []map[string]interface{}
	db.From("homeroom_students_history").Select("student_id", "", false).
		Eq("class_id", selectedClassID).
		Eq("teacher_id", teacherID).
		ExecuteTo(&classStudentRows)

	rawStudentIDs := make([]string, 0, len(classStudentRows))
	for _, row := range classStudentRows {
		if sid := homeroomToStr(row["student_id"]); sid != "" && sid != "<nil>" {
			rawStudentIDs = append(rawStudentIDs, sid)
		}
	}
	studentIDs := unique(rawStudentIDs)

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"academic_years": academicYears,
				"classes":        filteredClasses,
				"selected_class": gin.H{"id": selectedClass["id"], "class_name": selectedClass["class_name"]},
				"records":        []interface{}{},
				"stats": gin.H{
					"total_students": 0,
					"present_count":  0,
					"absent_count":   0,
					"late_count":     0,
				},
			},
		})
		return
	}

	// 9. Get students info
	var students []map[string]interface{}
	db.From("students").Select("id,student_id,full_name,class_name", "", false).
		In("id", studentIDs).
		ExecuteTo(&students)

	studentMap := make(map[string]map[string]interface{}, len(students))
	for _, s := range students {
		studentMap[homeroomToStr(s["id"])] = s
	}

	// 10. Get attendance for target_date
	var attendanceRecords []map[string]interface{}
	db.From("attendance").Select("*", "", false).
		Eq("date", targetDate).
		In("student_id", studentIDs).
		ExecuteTo(&attendanceRecords)

	attMap := make(map[string]map[string]interface{}, len(attendanceRecords))
	for _, a := range attendanceRecords {
		attMap[homeroomToStr(a["student_id"])] = a
	}

	// 11. Build records list
	className := homeroomToStr(selectedClass["class_name"])
	records := make([]map[string]interface{}, 0, len(studentIDs))
	present, absent, late := 0, 0, 0

	for _, sid := range studentIDs {
		s := studentMap[sid]
		if s == nil {
			s = map[string]interface{}{}
		}
		a := attMap[sid]

		status := "absent"
		checkInTime := interface{}(nil)
		note := interface{}(nil)
		attendanceID := interface{}(nil)

		if a != nil {
			if st, ok := a["status"].(string); ok && st != "" {
				status = st
			}
			checkInTime = a["check_in_time"]
			note = a["notes"]
			attendanceID = a["id"]
		}

		switch status {
		case "present":
			present++
		case "absent":
			absent++
		case "late":
			late++
		}

		rec := map[string]interface{}{
			"student_id":    sid,
			"student_code":  s["student_id"],
			"student_name":  s["full_name"],
			"class_name":    className,
			"status":        status,
			"check_in_time": checkInTime,
			"note":          note,
			"attendance_id": attendanceID,
		}
		records = append(records, rec)
	}

	// Sort by student_code
	sort.Slice(records, func(i, j int) bool {
		a := homeroomToStr(records[i]["student_code"])
		b := homeroomToStr(records[j]["student_code"])
		return a < b
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"academic_years": academicYears,
			"classes":        filteredClasses,
			"selected_class": gin.H{"id": selectedClass["id"], "class_name": selectedClass["class_name"]},
			"records":        records,
			"stats": gin.H{
				"total_students": len(studentIDs),
				"present_count":  present,
				"absent_count":   absent,
				"late_count":     late,
			},
		},
	})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/classes
// --------------------------------------------------------------------------

func GetHomeroomClasses(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}

	academicYear := c.Query("academic_year")
	db := database.GetClient()

	// Resolve teacher
	var teachers []map[string]interface{}
	db.From("teachers").Select("id", "", false).
		Eq("user_id", homeroomToStr(user["id"])).
		ExecuteTo(&teachers)

	if len(teachers) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	teacherID := homeroomToStr(teachers[0]["id"])

	// Get class_ids
	var historyRows []map[string]interface{}
	db.From("homeroom_students_history").Select("class_id", "", false).
		Eq("teacher_id", teacherID).
		ExecuteTo(&historyRows)

	rawClassIDs := make([]string, 0, len(historyRows))
	for _, row := range historyRows {
		if cid := homeroomToStr(row["class_id"]); cid != "" && cid != "<nil>" {
			rawClassIDs = append(rawClassIDs, cid)
		}
	}
	classIDs := unique(rawClassIDs)

	if len(classIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}

	// Fetch class info
	classQuery := db.From("classes").Select("*", "", false).In("id", classIDs)
	if academicYear != "" {
		classQuery = classQuery.Eq("academic_year", academicYear)
	}

	var classes []map[string]interface{}
	classQuery.Order("class_name", &postgrest.OrderOpts{Ascending: true}).ExecuteTo(&classes)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": classes})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/classes/:class_id/students
// --------------------------------------------------------------------------

func GetHomeroomClassStudents(c *gin.Context) {
	classID := c.Param("class_id")
	db := database.GetClient()

	// Get student_ids in this class
	var historyRows []map[string]interface{}
	db.From("homeroom_students_history").Select("student_id", "", false).
		Eq("class_id", classID).
		ExecuteTo(&historyRows)

	rawStudentIDs := make([]string, 0, len(historyRows))
	for _, row := range historyRows {
		if sid := homeroomToStr(row["student_id"]); sid != "" && sid != "<nil>" {
			rawStudentIDs = append(rawStudentIDs, sid)
		}
	}
	studentIDs := unique(rawStudentIDs)

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}

	// Get students info
	var students []map[string]interface{}
	db.From("students").Select("*", "", false).
		In("id", studentIDs).
		ExecuteTo(&students)

	// Bulk load parent_contacts
	var allParents []map[string]interface{}
	db.From("parent_info").Select("*", "", false).
		In("student_id", studentIDs).
		ExecuteTo(&allParents)

	parentMap := make(map[string][]map[string]interface{})
	for _, p := range allParents {
		sid := homeroomToStr(p["student_id"])
		parentMap[sid] = append(parentMap[sid], p)
	}

	for _, s := range students {
		sid := homeroomToStr(s["id"])
		if contacts, ok := parentMap[sid]; ok {
			s["parent_contacts"] = contacts
		} else {
			s["parent_contacts"] = []interface{}{}
		}
	}

	// Sort by student_id (student code)
	sort.Slice(students, func(i, j int) bool {
		a := homeroomToStr(students[i]["student_id"])
		b := homeroomToStr(students[j]["student_id"])
		return a < b
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "data": students})
}

// --------------------------------------------------------------------------
// POST /api/homeroom/classes/:class_id/students
// --------------------------------------------------------------------------

func AddStudentToHomeroomClass(c *gin.Context) {
	classID := c.Param("class_id")
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}

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

	// Resolve teacher
	var teachers []map[string]interface{}
	db.From("teachers").Select("id", "", false).
		Eq("user_id", homeroomToStr(user["id"])).
		ExecuteTo(&teachers)

	var teacherID interface{}
	if len(teachers) > 0 {
		teacherID = teachers[0]["id"]
	}

	// Insert into homeroom_students_history
	payload := map[string]interface{}{
		"class_id":   classID,
		"student_id": studentID,
		"teacher_id": teacherID,
		"created_at": time.Now().Format(time.RFC3339),
	}

	var inserted []map[string]interface{}
	_, err := db.From("homeroom_students_history").
		Insert(payload, false, "", "representation", "exact").
		ExecuteTo(&inserted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": fmt.Sprintf("Lỗi thêm học sinh vào lớp: %v", err)})
		return
	}

	// Optionally update student.class_id
	db.From("students").Update(map[string]interface{}{
		"updated_at": time.Now().Format(time.RFC3339),
	}, "", "").Eq("id", homeroomToStr(studentID)).ExecuteTo(nil)

	result := interface{}(nil)
	if len(inserted) > 0 {
		result = inserted[0]
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Thêm học sinh vào lớp thành công",
		"data":    result,
	})
}

// --------------------------------------------------------------------------
// DELETE /api/homeroom/classes/:class_id/students/:student_id
// --------------------------------------------------------------------------

func RemoveStudentFromHomeroomClass(c *gin.Context) {
	classID := c.Param("class_id")
	studentID := c.Param("student_id")
	db := database.GetClient()

	// Build a filter: class_id AND student_id
	// Supabase-go chained Eq calls are ANDed.
	_, err := db.From("homeroom_students_history").
		Delete("", "").
		Eq("class_id", classID).
		Eq("student_id", studentID).
		ExecuteTo(nil)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": fmt.Sprintf("Lỗi xóa học sinh khỏi lớp: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa học sinh khỏi lớp thành công",
	})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/students-history
// --------------------------------------------------------------------------

func GetHomeroomStudentsHistory(c *gin.Context) {
	classIDParam := c.Query("class_id")
	teacherIDParam := c.Query("teacher_id")

	if classIDParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_id là bắt buộc"})
		return
	}

	db := database.GetClient()
	query := db.From("homeroom_students_history").Select("*", "", false).
		Eq("class_id", classIDParam)

	if teacherIDParam != "" {
		query = query.Eq("teacher_id", teacherIDParam)
	}

	var rows []map[string]interface{}
	query.ExecuteTo(&rows)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

// --------------------------------------------------------------------------
// POST /api/subject-import  (prefix /api, not /api/homeroom)
// --------------------------------------------------------------------------

func ImportSubjectAssignments(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	classID := req["class_id"]
	teacherID := req["teacher_id"]
	academicYear, _ := req["academic_year"].(string)

	if classID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_id là bắt buộc"})
		return
	}

	db := database.GetClient()

	// Support single subject_id or list subject_ids
	var subjectIDs []interface{}
	if sid, ok := req["subject_id"]; ok && sid != nil {
		subjectIDs = []interface{}{sid}
	}
	if sids, ok := req["subject_ids"].([]interface{}); ok {
		subjectIDs = append(subjectIDs, sids...)
	}

	if len(subjectIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "subject_id hoặc subject_ids là bắt buộc"})
		return
	}

	inserted := make([]interface{}, 0)
	skipped := make([]interface{}, 0)

	for _, subjectID := range subjectIDs {
		// Check if class_subject already exists
		checkQuery := db.From("class_subjects").Select("id", "", false).
			Eq("class_id", homeroomToStr(classID)).
			Eq("subject_id", homeroomToStr(subjectID))
		if academicYear != "" {
			checkQuery = checkQuery.Eq("academic_year", academicYear)
		}

		var existing []map[string]interface{}
		checkQuery.ExecuteTo(&existing)

		if len(existing) > 0 {
			skipped = append(skipped, subjectID)
			continue
		}

		payload := map[string]interface{}{
			"class_id":   classID,
			"subject_id": subjectID,
			"created_at": time.Now().Format(time.RFC3339),
		}
		if teacherID != nil {
			payload["teacher_id"] = teacherID
		}
		if academicYear != "" {
			payload["academic_year"] = academicYear
		}

		var result []map[string]interface{}
		db.From("class_subjects").Insert(payload, false, "", "representation", "exact").ExecuteTo(&result)
		if len(result) > 0 {
			inserted = append(inserted, result[0])
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã thêm %d môn học, bỏ qua %d môn đã tồn tại", len(inserted), len(skipped)),
		"data": gin.H{
			"inserted": inserted,
			"skipped":  skipped,
		},
	})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/daily-dashboard
// --------------------------------------------------------------------------

func GetHomeroomDailyDashboard(c *gin.Context) {
	classID := c.Query("class_id")
	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_id là bắt buộc"})
		return
	}
	targetDate := c.DefaultQuery("target_date", time.Now().Format("2006-01-02"))

	db := database.GetClient()

	// Get student_ids for this class
	var historyRows []map[string]interface{}
	db.From("homeroom_students_history").Select("student_id", "", false).
		Eq("class_id", classID).
		ExecuteTo(&historyRows)

	rawStudentIDs := make([]string, 0, len(historyRows))
	for _, row := range historyRows {
		if sid := homeroomToStr(row["student_id"]); sid != "" && sid != "<nil>" {
			rawStudentIDs = append(rawStudentIDs, sid)
		}
	}
	studentIDs := unique(rawStudentIDs)

	totalStudents := len(studentIDs)

	if totalStudents == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"total_students":     0,
				"present_count":      0,
				"absent_count":       0,
				"late_count":         0,
				"attendance_rate":    "0.0",
				"students_with_status": []interface{}{},
			},
		})
		return
	}

	// Get students info
	var students []map[string]interface{}
	db.From("students").Select("id,student_id,full_name,class_name", "", false).
		In("id", studentIDs).
		ExecuteTo(&students)

	studentMap := make(map[string]map[string]interface{}, len(students))
	for _, s := range students {
		studentMap[homeroomToStr(s["id"])] = s
	}

	// Get attendance
	var attendanceRecords []map[string]interface{}
	db.From("attendance").Select("*", "", false).
		Eq("date", targetDate).
		In("student_id", studentIDs).
		ExecuteTo(&attendanceRecords)

	attMap := make(map[string]map[string]interface{}, len(attendanceRecords))
	for _, a := range attendanceRecords {
		attMap[homeroomToStr(a["student_id"])] = a
	}

	present, absent, late := 0, 0, 0
	studentsWithStatus := make([]map[string]interface{}, 0, totalStudents)

	for _, sid := range studentIDs {
		s := studentMap[sid]
		if s == nil {
			s = map[string]interface{}{}
		}
		a := attMap[sid]

		status := "absent"
		if a != nil {
			if st, ok := a["status"].(string); ok && st != "" {
				status = st
			}
		}

		switch status {
		case "present":
			present++
		case "absent":
			absent++
		case "late":
			late++
		}

		entry := map[string]interface{}{
			"student_id":   sid,
			"student_code": s["student_id"],
			"student_name": s["full_name"],
			"status":       status,
		}
		if a != nil {
			entry["check_in_time"] = a["check_in_time"]
			entry["attendance_id"] = a["id"]
		} else {
			entry["check_in_time"] = nil
			entry["attendance_id"] = nil
		}
		studentsWithStatus = append(studentsWithStatus, entry)
	}

	sort.Slice(studentsWithStatus, func(i, j int) bool {
		a := homeroomToStr(studentsWithStatus[i]["student_code"])
		b := homeroomToStr(studentsWithStatus[j]["student_code"])
		return a < b
	})

	rate := 0.0
	if totalStudents > 0 {
		rate = float64(present) / float64(totalStudents) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_students":       totalStudents,
			"present_count":        present,
			"absent_count":         absent,
			"late_count":           late,
			"attendance_rate":      fmt.Sprintf("%.1f", rate),
			"students_with_status": studentsWithStatus,
		},
	})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/monthly-trends
// --------------------------------------------------------------------------

func GetHomeroomMonthlyTrends(c *gin.Context) {
	classID := c.Query("class_id")
	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "class_id là bắt buộc"})
		return
	}

	monthParam := c.DefaultQuery("month", time.Now().Format("2006-01"))
	// Parse YYYY-MM to get date range
	t, err := time.Parse("2006-01", monthParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Định dạng month không hợp lệ (YYYY-MM)"})
		return
	}
	dateFrom := t.Format("2006-01-02")
	// Last day of month
	lastDay := t.AddDate(0, 1, -1)
	dateTo := lastDay.Format("2006-01-02")

	db := database.GetClient()

	// Get student_ids for this class
	var historyRows []map[string]interface{}
	db.From("homeroom_students_history").Select("student_id", "", false).
		Eq("class_id", classID).
		ExecuteTo(&historyRows)

	rawStudentIDs := make([]string, 0, len(historyRows))
	for _, row := range historyRows {
		if sid := homeroomToStr(row["student_id"]); sid != "" && sid != "<nil>" {
			rawStudentIDs = append(rawStudentIDs, sid)
		}
	}
	studentIDs := unique(rawStudentIDs)

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}

	// Get attendance for the whole month
	var attendanceRecords []map[string]interface{}
	db.From("attendance").Select("date,status", "", false).
		Gte("date", dateFrom).
		Lte("date", dateTo).
		In("student_id", studentIDs).
		ExecuteTo(&attendanceRecords)

	// Group by date
	type dayStat struct {
		Present int
		Absent  int
		Late    int
	}
	statsByDate := make(map[string]*dayStat)
	for _, a := range attendanceRecords {
		d := homeroomToStr(a["date"])
		if d == "" || d == "<nil>" {
			continue
		}
		if statsByDate[d] == nil {
			statsByDate[d] = &dayStat{}
		}
		switch a["status"] {
		case "present":
			statsByDate[d].Present++
		case "absent":
			statsByDate[d].Absent++
		case "late":
			statsByDate[d].Late++
		}
	}

	// Sort dates
	dates := make([]string, 0, len(statsByDate))
	for d := range statsByDate {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	trends := make([]map[string]interface{}, 0, len(dates))
	for _, d := range dates {
		st := statsByDate[d]
		trends = append(trends, map[string]interface{}{
			"date":          d,
			"present_count": st.Present,
			"absent_count":  st.Absent,
			"late_count":    st.Late,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": trends})
}

// --------------------------------------------------------------------------
// GET /api/homeroom/leave-requests
// --------------------------------------------------------------------------

func GetLeaveRequests(c *gin.Context) {
	classID := c.Query("class_id")
	db := database.GetClient()

	query := db.From("leave_requests").Select("*", "", false)
	if classID != "" {
		query = query.Eq("class_id", classID)
	}

	var rows []map[string]interface{}
	query.Order("created_at", nil).ExecuteTo(&rows)

	if rows == nil {
		rows = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

// --------------------------------------------------------------------------
// POST /api/homeroom/leave-requests
// --------------------------------------------------------------------------

func CreateLeaveRequest(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "Không xác thực"})
		return
	}

	// Multipart form — try to parse file if present, otherwise fall back to JSON
	classID := c.PostForm("class_id")
	studentID := c.PostForm("student_id")
	note := c.PostForm("note")

	// If no form fields, try JSON body
	if classID == "" {
		var req map[string]interface{}
		if err := c.ShouldBindJSON(&req); err == nil {
			classID = homeroomToStr(req["class_id"])
			studentID = homeroomToStr(req["student_id"])
			note = homeroomToStr(req["note"])
		}
	}

	db := database.GetClient()

	payload := map[string]interface{}{
		"class_id":   classID,
		"student_id": studentID,
		"note":       note,
		"created_by": user["id"],
		"created_at": time.Now().Format(time.RFC3339),
	}

	// Attempt file upload path — just store metadata; actual binary upload
	// requires Supabase Storage SDK which is not available here.
	_, header, fileErr := c.Request.FormFile("file")
	if fileErr == nil && header != nil {
		payload["file_name"] = header.Filename
		payload["image_url"] = fmt.Sprintf("(upload via Supabase Storage required for file: %s)", header.Filename)
	}

	var inserted []map[string]interface{}
	_, err := db.From("leave_requests").
		Insert(payload, false, "", "representation", "exact").
		ExecuteTo(&inserted)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"detail": fmt.Sprintf("Lỗi tạo leave request: %v", err),
		})
		return
	}

	result := interface{}(nil)
	if len(inserted) > 0 {
		result = inserted[0]
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo leave request thành công. Để upload ảnh thực sự, vui lòng sử dụng Supabase Storage API.",
		"data":    result,
	})
}

// --------------------------------------------------------------------------
// DELETE /api/homeroom/leave-requests/:id
// --------------------------------------------------------------------------

func DeleteLeaveRequest(c *gin.Context) {
	id := c.Param("id")
	db := database.GetClient()

	_, err := db.From("leave_requests").Delete("", "").Eq("id", id).ExecuteTo(nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": fmt.Sprintf("Lỗi xóa leave request: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa leave request thành công",
	})
}

// --------------------------------------------------------------------------
// Suppress unused import warnings
// --------------------------------------------------------------------------

var _ = strconv.Itoa
var _ = strings.TrimSpace
