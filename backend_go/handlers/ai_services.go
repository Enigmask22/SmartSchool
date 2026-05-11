package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"smart_school_go/config"
	"smart_school_go/database"
	aiproxy "smart_school_go/services/ai"
)

// ---------------------------------------------------------------------------
// Global recognition state
// ---------------------------------------------------------------------------

type recognitionState struct {
	IsRunning         bool
	CooldownPeriod    int // seconds
	LastRecognition   map[string]time.Time // studentID -> last recognition time
	mu                sync.RWMutex
	TotalFrames       int64
	ActiveConnections int32
}

var recogState = &recognitionState{
	CooldownPeriod:  5,
	LastRecognition: make(map[string]time.Time),
}

// ---------------------------------------------------------------------------
// WebSocket upgrader
// ---------------------------------------------------------------------------

var wsUpgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// ---------------------------------------------------------------------------
// GET /api/ai/recognition/status
// ---------------------------------------------------------------------------

// AIRecognitionStatus returns the current recognition state and metrics.
// No authentication required.
func AIRecognitionStatus(c *gin.Context) {
	recogState.mu.RLock()
	isRunning := recogState.IsRunning
	cooldown := recogState.CooldownPeriod
	totalFrames := atomic.LoadInt64(&recogState.TotalFrames)
	activeConns := atomic.LoadInt32(&recogState.ActiveConnections)
	recogState.mu.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"is_running":         isRunning,
			"cooldown_period":    cooldown,
			"total_frames":       totalFrames,
			"active_connections": activeConns,
		},
	})
}

// ---------------------------------------------------------------------------
// PUT /api/ai/recognition/settings
// ---------------------------------------------------------------------------

// AIRecognitionSettings updates the cooldown period and persists it to DB.
func AIRecognitionSettings(c *gin.Context) {
	var req struct {
		CooldownPeriod int `json:"cooldown_period"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	recogState.mu.Lock()
	recogState.CooldownPeriod = req.CooldownPeriod
	recogState.mu.Unlock()

	// Persist to system_settings table
	db := database.GetClient()
	now := time.Now().Format(time.RFC3339)

	var existing []map[string]interface{}
	db.From("system_settings").Select("id", "", false).
		Eq("key", "recognition_cooldown_period").
		ExecuteTo(&existing)

	if len(existing) > 0 {
		db.From("system_settings").Update(map[string]interface{}{
			"value":      fmt.Sprintf("%d", req.CooldownPeriod),
			"updated_at": now,
		}, "", "").Eq("key", "recognition_cooldown_period").ExecuteTo(nil)
	} else {
		db.From("system_settings").Insert(map[string]interface{}{
			"key":        "recognition_cooldown_period",
			"value":      fmt.Sprintf("%d", req.CooldownPeriod),
			"created_at": now,
			"updated_at": now,
		}, false, "", "", "").ExecuteTo(nil)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật cài đặt nhận diện thành công",
		"data": gin.H{
			"cooldown_period": req.CooldownPeriod,
		},
	})
}

// ---------------------------------------------------------------------------
// POST /api/ai/recognition/control
// ---------------------------------------------------------------------------

// AIRecognitionControl starts or stops the recognition process.
func AIRecognitionControl(c *gin.Context) {
	var req struct {
		Action string `json:"action"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	switch req.Action {
	case "start":
		recogState.mu.Lock()
		recogState.IsRunning = true
		recogState.mu.Unlock()
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Bắt đầu nhận diện khuôn mặt", "is_running": true})
	case "stop":
		recogState.mu.Lock()
		recogState.IsRunning = false
		recogState.mu.Unlock()
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Dừng nhận diện khuôn mặt", "is_running": false})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"detail": "action phải là 'start' hoặc 'stop'"})
	}
}

// ---------------------------------------------------------------------------
// GET /api/ai/status
// ---------------------------------------------------------------------------

// AIStatus returns the face recognition service status from the sidecar.
func AIStatus(c *gin.Context) {
	if !aiproxy.IsAvailable() {
		c.JSON(http.StatusOK, gin.H{"available": false, "message": "AI Sidecar không khả dụng"})
		return
	}

	result, err := aiproxy.GetFaceStatus()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"available": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/recognize  (multipart file upload)
// ---------------------------------------------------------------------------

// AIRecognize receives a file upload and proxies it to the AI sidecar for recognition.
func AIRecognize(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Không tìm thấy file: " + err.Error()})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi đọc file: " + err.Error()})
		return
	}

	_ = header // filename available as header.Filename if needed
	imageB64 := base64.StdEncoding.EncodeToString(imageBytes)

	result, err := aiproxy.RecognizeFace(imageB64, 0.5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/recognize-base64
// ---------------------------------------------------------------------------

// AIRecognizeBase64 receives a base64-encoded image and proxies it for recognition.
func AIRecognizeBase64(c *gin.Context) {
	var req struct {
		ImageBase64 string  `json:"image_base64"`
		Threshold   float64 `json:"confidence_threshold"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}
	if req.ImageBase64 == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "image_base64 là bắt buộc"})
		return
	}
	if req.Threshold == 0 {
		req.Threshold = 0.5
	}

	result, err := aiproxy.RecognizeFace(req.ImageBase64, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/register/:student_id  (multipart file upload)
// ---------------------------------------------------------------------------

// AIRegister receives a file upload and registers the face for the given student.
func AIRegister(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	var studentID int
	if _, err := fmt.Sscan(studentIDStr, &studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id không hợp lệ"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Không tìm thấy file: " + err.Error()})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi đọc file: " + err.Error()})
		return
	}

	imageB64 := base64.StdEncoding.EncodeToString(imageBytes)

	result, err := aiproxy.RegisterFace(studentID, imageB64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/register-base64/:student_id
// ---------------------------------------------------------------------------

// AIRegisterBase64 receives a base64 image and registers the face for the given student.
func AIRegisterBase64(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	var studentID int
	if _, err := fmt.Sscan(studentIDStr, &studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id không hợp lệ"})
		return
	}

	var req struct {
		ImageBase64 string `json:"image_base64"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}
	if req.ImageBase64 == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "image_base64 là bắt buộc"})
		return
	}

	result, err := aiproxy.RegisterFace(studentID, req.ImageBase64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/register-multiple/:student_id
// ---------------------------------------------------------------------------

// imageDataEntry mirrors the JSON structure sent by the client.
type imageDataEntry struct {
	Filename string `json:"filename"`
	Data     string `json:"data"` // base64
}

// AIRegisterMultiple registers multiple face images for a single student.
// It calls RegisterFace sequentially for each image and aggregates results.
func AIRegisterMultiple(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	var studentID int
	if _, err := fmt.Sscan(studentIDStr, &studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id không hợp lệ"})
		return
	}

	var req struct {
		Images []imageDataEntry `json:"images"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}
	if len(req.Images) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "images là bắt buộc và không được rỗng"})
		return
	}

	var results []map[string]interface{}
	successCount := 0
	for _, img := range req.Images {
		res, err := aiproxy.RegisterFace(studentID, img.Data)
		if err != nil {
			results = append(results, map[string]interface{}{
				"filename": img.Filename,
				"success":  false,
				"error":    err.Error(),
			})
			continue
		}
		successCount++
		res["filename"] = img.Filename
		results = append(results, res)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       successCount > 0,
		"total":         len(req.Images),
		"success_count": successCount,
		"results":       results,
	})
}

// ---------------------------------------------------------------------------
// POST /api/ai/count-faces  (multipart file upload)
// ---------------------------------------------------------------------------

// AICountFaces counts the number of faces in an uploaded image.
func AICountFaces(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Không tìm thấy file: " + err.Error()})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Lỗi đọc file: " + err.Error()})
		return
	}

	imageB64 := base64.StdEncoding.EncodeToString(imageBytes)

	result, err := aiproxy.CountFaces(imageB64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// POST /api/ai/reload-models
// ---------------------------------------------------------------------------

// AIReloadModels reloads face encodings in the sidecar from Supabase storage.
func AIReloadModels(c *gin.Context) {
	var req struct {
		SupabaseURL string `json:"supabase_url"`
		SupabaseKey string `json:"supabase_key"`
	}
	// Optional body — ignore bind error intentionally
	_ = c.ShouldBindJSON(&req)

	cfg := config.Cfg
	if req.SupabaseURL == "" {
		req.SupabaseURL = cfg.SupabaseURL
	}
	if req.SupabaseKey == "" {
		req.SupabaseKey = cfg.SupabaseKey
	}

	result, err := aiproxy.ReloadFaces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/student/:student_id/encoding
// ---------------------------------------------------------------------------

// AIDeleteEncoding deletes the stored face encoding for a student.
func AIDeleteEncoding(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	var studentID int
	if _, err := fmt.Sscan(studentIDStr, &studentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "student_id không hợp lệ"})
		return
	}

	result, err := aiproxy.DeleteFace(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// GET /api/ai/debug-info
// ---------------------------------------------------------------------------

// AIDebugInfo returns debug information from the AI sidecar via a generic proxy call.
func AIDebugInfo(c *gin.Context) {
	result, err := aiproxy.ProxyRequest("GET", "/debug", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// WebSocket /api/ai/recognition/stream
// ---------------------------------------------------------------------------

// AIRecognitionStream handles a WebSocket connection that receives video frames
// and returns recognition results in real time.
func AIRecognitionStream(c *gin.Context) {
	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	atomic.AddInt32(&recogState.ActiveConnections, 1)
	defer atomic.AddInt32(&recogState.ActiveConnections, -1)

	// Rate limit: max ~30 fps per camera = min 33 ms between processed frames.
	lastFrameTime := time.Now()
	minFrameInterval := 33 * time.Millisecond

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if msgType != websocket.BinaryMessage && msgType != websocket.TextMessage {
			continue
		}

		// Rate limiting
		now := time.Now()
		if now.Sub(lastFrameTime) < minFrameInterval {
			continue
		}
		lastFrameTime = now

		// Read current state under lock
		recogState.mu.RLock()
		isRunning := recogState.IsRunning
		cooldown := recogState.CooldownPeriod
		recogState.mu.RUnlock()

		if !isRunning {
			_ = conn.WriteJSON(map[string]interface{}{"status": "idle", "message": "Recognition not running"})
			continue
		}

		// Try to parse message as JSON {image_base64: "..."}
		var parseJSON map[string]interface{}
		if err := json.Unmarshal(msg, &parseJSON); err == nil {
			if b64, ok := parseJSON["image_base64"].(string); ok {
				result, err := aiproxy.RecognizeFace(b64, 0.5)
				if err != nil {
					_ = conn.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
					continue
				}
				processRecognitionResult(conn, result, cooldown)
				continue
			}
		}

		// Treat as raw binary frame — encode to base64 before sending to sidecar
		if len(msg) == 0 {
			continue
		}
		imageB64 := base64.StdEncoding.EncodeToString(msg)

		result, err := aiproxy.RecognizeFace(imageB64, 0.5)
		if err != nil {
			_ = conn.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
			continue
		}

		processRecognitionResult(conn, result, cooldown)
		atomic.AddInt64(&recogState.TotalFrames, 1)
	}
}

// processRecognitionResult checks cooldowns, triggers attendance records and
// sends a response back over the WebSocket connection.
func processRecognitionResult(conn *websocket.Conn, result map[string]interface{}, cooldown int) {
	// The sidecar may return either a single face object or a list under "faces"
	// Normalise to a slice so we can iterate uniformly.
	var faces []map[string]interface{}

	if facesRaw, ok := result["faces"]; ok {
		if facesList, ok := facesRaw.([]interface{}); ok {
			for _, f := range facesList {
				if fm, ok := f.(map[string]interface{}); ok {
					faces = append(faces, fm)
				}
			}
		}
	} else {
		// Single-face response — treat the result itself as the face object
		if _, hasID := result["student_id"]; hasID {
			faces = []map[string]interface{}{result}
		}
	}

	if len(faces) == 0 {
		_ = conn.WriteJSON(map[string]interface{}{
			"success": false,
			"message": "Không tìm thấy khuôn mặt",
			"faces":   []interface{}{},
		})
		return
	}

	now := time.Now()
	cooldownDuration := time.Duration(cooldown) * time.Second
	var processed []map[string]interface{}

	for _, face := range faces {
		studentIDRaw, hasID := face["student_id"]
		if !hasID || studentIDRaw == nil {
			processed = append(processed, map[string]interface{}{
				"face":      face,
				"attended":  false,
				"reason":    "unknown_student",
			})
			continue
		}

		studentID := fmt.Sprintf("%v", studentIDRaw)

		// Check cooldown
		recogState.mu.RLock()
		lastTime, seen := recogState.LastRecognition[studentID]
		recogState.mu.RUnlock()

		if seen && now.Sub(lastTime) < cooldownDuration {
			processed = append(processed, map[string]interface{}{
				"student_id": studentID,
				"attended":   false,
				"reason":     "cooldown",
				"face":       face,
			})
			continue
		}

		// Update last recognition time
		recogState.mu.Lock()
		recogState.LastRecognition[studentID] = now
		recogState.mu.Unlock()

		// Create attendance record
		if err := createAutoAttendance(studentID); err != nil {
			processed = append(processed, map[string]interface{}{
				"student_id": studentID,
				"attended":   false,
				"reason":     "attendance_error",
				"error":      err.Error(),
				"face":       face,
			})
			continue
		}

		processed = append(processed, map[string]interface{}{
			"student_id": studentID,
			"attended":   true,
			"face":       face,
		})
	}

	_ = conn.WriteJSON(map[string]interface{}{
		"success": true,
		"faces":   processed,
		"count":   len(processed),
	})
}

// createAutoAttendance calls the Supabase RPC to record an automatic
// attendance check-in. On failure it falls back to a direct table insert.
func createAutoAttendance(studentID string) error {
	db := database.GetClient()
	now := time.Now()

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("UTC+7", 7*60*60)
	}
	vnNow := now.In(loc)
	currentDate := vnNow.Format("2006-01-02")
	currentTime := vnNow.Format(time.RFC3339)

	rpcResult := db.Rpc("process_attendance_checkin", "", map[string]interface{}{
		"p_student_id":        studentID,
		"p_date":              currentDate,
		"p_checkin_time":      currentTime,
		"p_confidence_score":  0.0,
		"p_recognition_model": "face_recognition",
		"p_device_info": map[string]interface{}{
			"source":    "auto_recognition",
			"timestamp": currentTime,
		},
	})
	var rpcResultData []map[string]interface{}
	if jsonErr := json.Unmarshal([]byte(rpcResult), &rpcResultData); jsonErr == nil && len(rpcResultData) > 0 {
		return nil
	}

	// Fallback: direct insert
	attendance := map[string]interface{}{
		"student_id":    studentID,
		"date":          currentDate,
		"status":        "present",
		"check_in_time": currentTime,
		"method":        "face_recognition",
		"created_at":    currentTime,
		"updated_at":    currentTime,
	}
	var inserted []map[string]interface{}
	db.From("attendance").Insert(attendance, false, "", "representation", "exact").ExecuteTo(&inserted)
	if len(inserted) == 0 {
		return fmt.Errorf("không thể tạo bản ghi điểm danh cho học sinh %s", studentID)
	}
	return nil
}
