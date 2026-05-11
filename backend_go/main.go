package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"smart_school_go/config"
	"smart_school_go/database"
	"smart_school_go/handlers"
	"smart_school_go/middleware"
	authsvc "smart_school_go/services/auth"
	"smart_school_go/services/scheduler"
)

func main() {
	// 1. Load config
	config.Load()

	// 2. Verify DB connection
	if _, err := database.GetClient().From("system_settings").Select("count", "", false).Limit(1, "").ExecuteTo(nil); err != nil {
		log.Printf("Warning: DB connection check failed: %v", err)
	}

	// 3. Cleanup expired OTPs
	authsvc.CleanupExpiredOTPs()

	// 4. Start auto-absence scheduler
	go scheduler.StartAutoAbsenceScheduler()

	// 5. Create Gin engine
	r := gin.Default()

	// 6. Apply middleware
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Requested-With"}
	corsConfig.AllowCredentials = true
	r.Use(cors.New(corsConfig))
	r.Use(middleware.TimingMiddleware())

	// 7. Register routes

	// Auth routes (public)
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", handlers.Register)
		authGroup.POST("/login", handlers.Login)
		authGroup.POST("/refresh", handlers.RefreshToken)
		authGroup.POST("/forgot-password", handlers.ForgotPassword)
		authGroup.POST("/verify-otp", handlers.VerifyOTP)
		authGroup.POST("/reset-password", handlers.ResetPassword)
		authGroup.GET("/otp-status/:username", handlers.GetOTPStatus)
	}

	// Auth routes (protected)
	authProtected := r.Group("/api/auth", middleware.AuthRequired())
	{
		authProtected.GET("/me", handlers.GetMe)
		authProtected.POST("/logout", handlers.Logout)
		authProtected.PUT("/change-password", handlers.ChangePassword)
	}

	// Users routes (protected)
	usersGroup := r.Group("/api/users", middleware.AuthRequired())
	{
		usersGroup.GET("/users", handlers.GetUsers)
		usersGroup.POST("/users", handlers.CreateUser)
		usersGroup.PUT("/users/:user_id", handlers.UpdateUser)
		usersGroup.DELETE("/users/:user_id", handlers.DeleteUser)
		usersGroup.GET("/teachers", handlers.GetTeachers)
		usersGroup.POST("/teachers", handlers.CreateTeacher)
		usersGroup.PUT("/teachers/:teacher_id", handlers.UpdateTeacher)
		usersGroup.DELETE("/teachers/:teacher_id", handlers.DeleteTeacher)
		usersGroup.GET("/classes", handlers.GetClasses)
		usersGroup.GET("/dashboard/overview", handlers.GetDashboardOverview)
		usersGroup.GET("/dashboard/attendance-trends", handlers.GetAttendanceTrends)
		usersGroup.GET("/dashboard/class-performance", handlers.GetClassPerformance)
		usersGroup.GET("/dashboard/teacher-performance", handlers.GetTeacherPerformance)
		usersGroup.GET("/dashboard/system-health", handlers.GetSystemHealth)
	}

	// Students routes (protected)
	studentsGroup := r.Group("/api/students", middleware.AuthRequired())
	{
		studentsGroup.GET("/subjects", handlers.GetSubjects)
		studentsGroup.GET("/classes/list", handlers.GetClassesList)
		studentsGroup.GET("/stats/summary", handlers.GetStudentStats)
		studentsGroup.GET("/by-prefix/:prefix", handlers.GetStudentsByPrefix)
		studentsGroup.POST("/", handlers.CreateStudent)
		studentsGroup.GET("/", handlers.GetStudents)
		studentsGroup.GET("/:student_id", handlers.GetStudent)
		studentsGroup.PUT("/:student_id", handlers.UpdateStudent)
		studentsGroup.DELETE("/:student_id", handlers.DeleteStudent)
		studentsGroup.POST("/:student_id/restore", handlers.RestoreStudent)
		studentsGroup.DELETE("/:student_id/permanent", handlers.HardDeleteStudent)
		studentsGroup.POST("/:student_id/upload-image", handlers.UploadStudentImage)
	}

	// Attendance routes (protected)
	attendGroup := r.Group("/api/attendance", middleware.AuthRequired())
	{
		attendGroup.POST("/check-in", handlers.CheckInAttendance)
		attendGroup.POST("/manual", handlers.CreateManualAttendance)
		attendGroup.GET("/report", handlers.GetFullAttendanceList)
		attendGroup.GET("/student/:student_id", handlers.GetStudentAttendance)
		attendGroup.GET("/:date/:class", handlers.GetTodayAttendance)
		attendGroup.POST("/:date/:class", handlers.RecalculateDailyAttendance)
		attendGroup.PUT("/:attendance_id", handlers.UpdateAttendance)
		attendGroup.DELETE("/:attendance_id", handlers.DeleteAttendance)
	}

	// Scores routes (protected)
	scoresGroup := r.Group("/api/scores", middleware.AuthRequired())
	{
		// Static routes first
		scoresGroup.GET("/subjects", handlers.ListScoreSubjects)
		scoresGroup.GET("/teacher-dashboard", handlers.TeacherScoreDashboard)
		scoresGroup.POST("/bulk", handlers.BulkCreateScores)
		scoresGroup.POST("/ocr/upload", handlers.ScoreOCRUpload)
		scoresGroup.GET("/ocr/result/:id", handlers.ScoreOCRResult)
		scoresGroup.GET("/ocr/status/:id", handlers.ScoreOCRStatus)
		scoresGroup.POST("/calculate-final", handlers.CalculateFinalScore)
		// Parameterized routes
		scoresGroup.POST("/", handlers.CreateScore)
		scoresGroup.GET("/", handlers.ListScores)
		scoresGroup.GET("/:score_id", handlers.GetScore)
		scoresGroup.PUT("/:score_id", handlers.UpdateScore)
		scoresGroup.DELETE("/:score_id", handlers.DeleteScore)
	}

	// Feedback routes (protected)
	feedbackGroup := r.Group("/api/feedback", middleware.AuthRequired())
	{
		feedbackGroup.POST("/generate-feedback", handlers.GenerateFeedback)
		feedbackGroup.POST("/generate-batch-feedback", handlers.GenerateBatchFeedback)
		feedbackGroup.POST("/send-sms", handlers.SendSMSFeedback)
		feedbackGroup.GET("/health", handlers.FeedbackHealth)
		feedbackGroup.POST("/comments", handlers.SaveComment)
		feedbackGroup.GET("/comments/:student_id", handlers.GetComment)
		feedbackGroup.GET("/comments/class/:class_id", handlers.GetClassComments)
		feedbackGroup.POST("/send-email-report-card", handlers.SendEmailReportCard)
	}

	// Score settings routes (protected)
	scoreSettingsGroup := r.Group("/api/score-settings", middleware.AuthRequired())
	{
		// Static routes first
		scoreSettingsGroup.POST("/bulk-create", handlers.BulkCreateScoreSettings)
		scoreSettingsGroup.GET("/subject/:subject_id", handlers.GetScoreSettingsForTeacher)
		// Admin routes
		scoreSettingsGroup.GET("/", handlers.GetAllScoreSettings)
		scoreSettingsGroup.GET("/:subject_id", handlers.GetScoreSettingsBySubjectID)
		scoreSettingsGroup.POST("/", handlers.CreateScoreSettings)
		scoreSettingsGroup.PUT("/:subject_id", handlers.UpdateScoreSettings)
		scoreSettingsGroup.DELETE("/:subject_id", handlers.DeleteScoreSettings)
	}

	// Homeroom routes (protected)
	homeroomGroup := r.Group("/api/homeroom", middleware.AuthRequired())
	{
		homeroomGroup.GET("/attendance/bootstrap", handlers.GetHomeroomAttendanceBootstrap)
		homeroomGroup.GET("/classes", handlers.GetHomeroomClasses)
		homeroomGroup.GET("/classes/:class_id/students", handlers.GetHomeroomClassStudents)
		homeroomGroup.POST("/classes/:class_id/students", handlers.AddStudentToHomeroomClass)
		homeroomGroup.DELETE("/classes/:class_id/students/:student_id", handlers.RemoveStudentFromHomeroomClass)
		homeroomGroup.GET("/students-history", handlers.GetHomeroomStudentsHistory)
		homeroomGroup.GET("/daily-dashboard", handlers.GetHomeroomDailyDashboard)
		homeroomGroup.GET("/monthly-trends", handlers.GetHomeroomMonthlyTrends)
		homeroomGroup.GET("/leave-requests", handlers.GetLeaveRequests)
		homeroomGroup.POST("/leave-requests", handlers.CreateLeaveRequest)
		homeroomGroup.DELETE("/leave-requests/:id", handlers.DeleteLeaveRequest)
	}

	// Subject import (at /api level)
	r.POST("/api/subject-import", middleware.AuthRequired(), handlers.ImportSubjectAssignments)

	// Admin routes (protected + admin role)
	adminGroup := r.Group("/api/admin", middleware.AuthRequired())
	{
		// Users
		adminGroup.GET("/users", handlers.AdminListUsers)
		adminGroup.POST("/users", handlers.AdminCreateUser)
		adminGroup.GET("/users/teachers", handlers.AdminListUsersTeachers)
		adminGroup.PUT("/users/:user_id", handlers.AdminUpdateUser)
		adminGroup.DELETE("/users/:user_id", handlers.AdminDeleteUser)
		adminGroup.POST("/users/:user_id/restore", handlers.AdminRestoreUser)
		adminGroup.DELETE("/users/:user_id/permanent", handlers.AdminPermanentDeleteUser)
		// Teachers
		adminGroup.GET("/teachers", handlers.AdminListTeachers)
		adminGroup.POST("/teachers", handlers.AdminCreateTeacher)
		adminGroup.GET("/teachers/next-code", handlers.AdminNextTeacherCode)
		adminGroup.POST("/teachers/import-from-users", handlers.AdminImportTeachersFromUsers)
		adminGroup.GET("/teachers/homeroom", handlers.AdminListHomeroomTeachers)
		adminGroup.PUT("/teachers/:teacher_id", handlers.AdminUpdateTeacher)
		adminGroup.DELETE("/teachers/:teacher_id", handlers.AdminDeleteTeacher)
		adminGroup.POST("/teachers/:teacher_id/restore", handlers.AdminRestoreTeacher)
		adminGroup.DELETE("/teachers/:teacher_id/permanent", handlers.AdminPermanentDeleteTeacher)
		// Subjects
		adminGroup.GET("/subjects", handlers.AdminListSubjects)
		adminGroup.POST("/subjects", handlers.AdminCreateSubject)
		adminGroup.PUT("/subjects/:subject_id", handlers.AdminUpdateSubject)
		adminGroup.DELETE("/subjects/:subject_id", handlers.AdminDeleteSubject)
		adminGroup.POST("/subjects/:subject_id/restore", handlers.AdminRestoreSubject)
		adminGroup.DELETE("/subjects/:subject_id/permanent", handlers.AdminPermanentDeleteSubject)
		// Classes
		adminGroup.GET("/classes", handlers.AdminListClasses)
		adminGroup.GET("/classes/academic-years", handlers.AdminListAcademicYears)
		adminGroup.GET("/classes/default-academic-year", handlers.AdminGetDefaultAcademicYear)
		adminGroup.GET("/classes/:class_id/students", handlers.AdminGetClassStudents)
		adminGroup.POST("/classes", handlers.AdminCreateClass)
		adminGroup.PUT("/classes/:class_id", handlers.AdminUpdateClass)
		adminGroup.DELETE("/classes/:class_id", handlers.AdminDeleteClass)
		adminGroup.POST("/classes/:class_id/restore", handlers.AdminRestoreClass)
		adminGroup.DELETE("/classes/:class_id/permanent", handlers.AdminPermanentDeleteClass)
		// Subject-Teachers
		adminGroup.GET("/subject-teachers", handlers.AdminListSubjectTeachers)
		adminGroup.POST("/subject-teachers", handlers.AdminCreateSubjectTeacher)
		adminGroup.PUT("/subject-teachers/:id", handlers.AdminUpdateSubjectTeacher)
		adminGroup.DELETE("/subject-teachers/:id", handlers.AdminDeleteSubjectTeacher)
		adminGroup.POST("/subject-teachers/:id/restore", handlers.AdminRestoreSubjectTeacher)
		adminGroup.DELETE("/subject-teachers/:id/permanent", handlers.AdminPermanentDeleteSubjectTeacher)
		// Class-Subjects
		adminGroup.GET("/class-subjects", handlers.AdminListClassSubjects)
		adminGroup.POST("/class-subjects", handlers.AdminCreateClassSubject)
		adminGroup.POST("/class-subjects/bulk", handlers.AdminBulkCreateClassSubjects)
		adminGroup.PUT("/class-subjects/bulk-update", handlers.AdminBulkUpdateClassSubjects)
		adminGroup.PUT("/class-subjects/:id", handlers.AdminUpdateClassSubject)
		adminGroup.DELETE("/class-subjects/:id", handlers.AdminDeleteClassSubject)
		adminGroup.POST("/class-subjects/:id/restore", handlers.AdminRestoreClassSubject)
		adminGroup.DELETE("/class-subjects/:id/permanent", handlers.AdminPermanentDeleteClassSubject)
		// Students
		adminGroup.GET("/students", handlers.AdminListStudents)
		adminGroup.GET("/students/by-grade", handlers.AdminListStudentsByGrade)
		adminGroup.POST("/students", handlers.AdminCreateStudent)
		adminGroup.POST("/students/bulk-import", handlers.AdminBulkImportStudents)
		adminGroup.POST("/students/move-class", handlers.AdminMoveStudentsClass)
		adminGroup.PUT("/students/:student_id", handlers.AdminUpdateStudent)
		adminGroup.DELETE("/students/:student_id", handlers.AdminDeleteStudent)
		adminGroup.POST("/students/:student_id/restore", handlers.AdminRestoreStudent)
		adminGroup.DELETE("/students/:student_id/permanent", handlers.AdminPermanentDeleteStudent)
		// Dashboard
		adminGroup.GET("/dashboard/overview", handlers.AdminDashboardOverview)
		adminGroup.GET("/dashboard/attendance-trends", handlers.AdminDashboardAttendanceTrends)
		adminGroup.GET("/dashboard/class-performance", handlers.AdminDashboardClassPerformance)
		adminGroup.GET("/dashboard/academic-years", handlers.AdminDashboardAcademicYears)
		adminGroup.GET("/dashboard/system-health", handlers.AdminDashboardSystemHealth)
		// System Settings
		adminGroup.GET("/system-settings", handlers.AdminListSystemSettings)
		adminGroup.GET("/system-settings/:setting_key", handlers.AdminGetSystemSetting)
		adminGroup.PUT("/system-settings/:setting_key", handlers.AdminUpdateSystemSetting)
		// Dayoffs
		adminGroup.GET("/dayoffs", handlers.AdminListDayoffs)
		adminGroup.POST("/dayoffs", handlers.AdminCreateDayoff)
		adminGroup.PUT("/dayoffs/:config_id", handlers.AdminUpdateDayoff)
		adminGroup.DELETE("/dayoffs/:config_id", handlers.AdminDeleteDayoff)
	}

	// AI routes (protected)
	aiGroup := r.Group("/api/ai", middleware.AuthRequired())
	{
		aiGroup.GET("/recognition/status", handlers.AIRecognitionStatus)
		aiGroup.PUT("/recognition/settings", handlers.AIRecognitionSettings)
		aiGroup.POST("/recognition/control", handlers.AIRecognitionControl)
		aiGroup.GET("/status", handlers.AIStatus)
		aiGroup.POST("/recognize", handlers.AIRecognize)
		aiGroup.POST("/recognize-base64", handlers.AIRecognizeBase64)
		aiGroup.POST("/register/:student_id", handlers.AIRegister)
		aiGroup.POST("/register-base64/:student_id", handlers.AIRegisterBase64)
		aiGroup.POST("/register-multiple/:student_id", handlers.AIRegisterMultiple)
		aiGroup.POST("/count-faces", handlers.AICountFaces)
		aiGroup.POST("/reload-models", handlers.AIReloadModels)
		aiGroup.DELETE("/student/:student_id/encoding", handlers.AIDeleteEncoding)
		aiGroup.GET("/debug-info", handlers.AIDebugInfo)
		aiGroup.GET("/recognition/stream", handlers.AIRecognitionStream)
	}

	// Camera routes (protected)
	cameraGroup := r.Group("/api/cameras", middleware.AuthRequired())
	{
		cameraGroup.GET("/", handlers.ListCameras)
		cameraGroup.POST("/", handlers.CreateCamera)
		cameraGroup.GET("/:camera_id", handlers.GetCamera)
		cameraGroup.PUT("/:camera_id", handlers.UpdateCamera)
		cameraGroup.DELETE("/:camera_id", handlers.DeleteCamera)
		cameraGroup.GET("/:camera_id/stream", handlers.CameraStream)
		cameraGroup.GET("/:camera_id/snapshot", handlers.CameraSnapshot)
		cameraGroup.POST("/:camera_id/test", handlers.TestCamera)
	}

	// 8. Static files
	r.Static("/uploads", "./uploads")

	// 9. Health and root endpoints
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "SynapseS Go API",
			"version": "1.0.0",
		})
	})

	// 10. Start server
	addr := fmt.Sprintf(":%s", config.Cfg.Port)
	log.Printf("Starting SynapseS Go API on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
