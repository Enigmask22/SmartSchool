package scheduler

import (
	"fmt"
	"log"
	"time"

	"smart_school_go/database"
)

func StartAutoAbsenceScheduler() {
	go func() {
		log.Println("Auto-absence scheduler started (runs at 18:24 daily)")
		for {
			now := time.Now()
			if now.Hour() == 18 && now.Minute() == 24 {
				runDailyAutoAbsence()
				// Sleep 61 seconds to avoid double-run trong cùng phút
				time.Sleep(61 * time.Second)
			} else {
				time.Sleep(30 * time.Second)
			}
		}
	}()
}

func runDailyAutoAbsence() {
	db := database.GetClient()
	today := time.Now().Format("2006-01-02")
	year := time.Now().Year()
	month := int(time.Now().Month())
	day := time.Now().Day()

	log.Printf("Running auto-absence for date: %s", today)

	for _, grade := range []int{10, 11, 12} {
		// Check dayoff config
		var dayoffs []map[string]interface{}
		_, err := db.From("dayoff").Select("dayoffs_list", "", false).
			Eq("year", fmt.Sprintf("%d", year)).
			Eq("month", fmt.Sprintf("%d", month)).
			Eq("grade", fmt.Sprintf("%d", grade)).
			ExecuteTo(&dayoffs)
		if err == nil && len(dayoffs) > 0 {
			if dayoffsList, ok := dayoffs[0]["dayoffs_list"].([]interface{}); ok {
				for _, d := range dayoffsList {
					if dayInt, ok := d.(float64); ok && int(dayInt) == day {
						log.Printf("Skip auto-absence for grade %d - dayoff %s", grade, today)
						goto nextGrade
					}
				}
			}
		}

		{
			// Fetch active students by grade
			var students []map[string]interface{}
			_, err = db.From("students").Select("id,grade,is_active", "", false).
				Eq("is_active", "true").ExecuteTo(&students)
			if err != nil {
				log.Printf("Error fetching students for grade %d: %v", grade, err)
				goto nextGrade
			}

			// Filter by grade
			var gradeStudentIDs []interface{}
			for _, s := range students {
				sGrade := fmt.Sprintf("%v", s["grade"])
				if sGrade == fmt.Sprintf("%d", grade) {
					gradeStudentIDs = append(gradeStudentIDs, s["id"])
				}
			}

			if len(gradeStudentIDs) == 0 {
				goto nextGrade
			}

			// Get existing attendance for today
			var existing []map[string]interface{}
			// Build student_id list as strings
			var idStrs []string
			for _, id := range gradeStudentIDs {
				idStrs = append(idStrs, fmt.Sprintf("%v", id))
			}

			_, _ = db.From("attendance").Select("student_id", "", false).
				Eq("date", today).ExecuteTo(&existing)

			existingIDs := make(map[interface{}]bool)
			for _, e := range existing {
				existingIDs[e["student_id"]] = true
			}

			// Build absent records
			var rows []map[string]interface{}
			for _, sid := range gradeStudentIDs {
				sidStr := fmt.Sprintf("%v", sid)
				found := false
				for eid := range existingIDs {
					if fmt.Sprintf("%v", eid) == sidStr {
						found = true
						break
					}
				}
				if !found {
					rows = append(rows, map[string]interface{}{
						"student_id": sid,
						"date":       today,
						"status":     "absent",
						"method":     "auto",
						"created_at": time.Now().Format(time.RFC3339),
					})
				}
			}

			if len(rows) > 0 {
				_, err = db.From("attendance").Insert(rows, false, "planned", "", "").ExecuteTo(nil)
				if err != nil {
					log.Printf("Error inserting auto-absence for grade %d: %v", grade, err)
				} else {
					log.Printf("Auto-absence inserted: grade %d - %d records on %s", grade, len(rows), today)
				}
			}
			_ = idStrs
		}

	nextGrade:
	}
}
