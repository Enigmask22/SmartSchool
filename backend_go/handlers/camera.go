package handlers

import (
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"smart_school_go/database"
)

// ListCameras handles GET /api/cameras/
func ListCameras(c *gin.Context) {
	db := database.GetClient()

	var cameras []map[string]interface{}
	_, err := db.From("cameras").Select("*", "", false).
		Order("created_at", nil).
		ExecuteTo(&cameras)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	if cameras == nil {
		cameras = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": cameras})
}

// CreateCamera handles POST /api/cameras/
func CreateCamera(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	now := nowStr()
	req["created_at"] = now
	req["updated_at"] = now

	// Default is_active to true if not provided
	if _, ok := req["is_active"]; !ok {
		req["is_active"] = true
	}

	db := database.GetClient()
	var created []map[string]interface{}
	_, err := db.From("cameras").Insert(req, false, "", "representation", "exact").ExecuteTo(&created)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	if len(created) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "Không thể tạo camera"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": created[0]})
}

// GetCamera handles GET /api/cameras/:camera_id
func GetCamera(c *gin.Context) {
	cameraID := c.Param("camera_id")

	db := database.GetClient()
	var cameras []map[string]interface{}
	_, err := db.From("cameras").Select("*", "", false).Eq("id", cameraID).ExecuteTo(&cameras)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	if len(cameras) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy camera"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": cameras[0]})
}

// UpdateCamera handles PUT /api/cameras/:camera_id
func UpdateCamera(c *gin.Context) {
	cameraID := c.Param("camera_id")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	req["updated_at"] = nowStr()
	// Prevent overwriting id
	delete(req, "id")
	delete(req, "created_at")

	db := database.GetClient()
	var updated []map[string]interface{}
	_, err := db.From("cameras").Update(req, "", "representation").Eq("id", cameraID).ExecuteTo(&updated)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	if len(updated) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy camera"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated[0]})
}

// DeleteCamera handles DELETE /api/cameras/:camera_id
func DeleteCamera(c *gin.Context) {
	cameraID := c.Param("camera_id")

	db := database.GetClient()
	var deleted []map[string]interface{}
	_, err := db.From("cameras").Delete("", "").Eq("id", cameraID).ExecuteTo(&deleted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã xóa camera"})
}

// CameraStream handles GET /api/cameras/:camera_id/stream
// Redirects the client to the camera's stream_url.
func CameraStream(c *gin.Context) {
	cameraID := c.Param("camera_id")

	db := database.GetClient()
	var cameras []map[string]interface{}
	_, err := db.From("cameras").Select("stream_url,is_active", "", false).Eq("id", cameraID).ExecuteTo(&cameras)
	if err != nil || len(cameras) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy camera"})
		return
	}

	streamURL := toStr(cameras[0]["stream_url"])
	if streamURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Camera không có stream URL"})
		return
	}

	c.Redirect(http.StatusFound, streamURL)
}

// CameraSnapshot handles GET /api/cameras/:camera_id/snapshot
// Redirects the client to the camera's snapshot_url.
func CameraSnapshot(c *gin.Context) {
	cameraID := c.Param("camera_id")

	db := database.GetClient()
	var cameras []map[string]interface{}
	_, err := db.From("cameras").Select("snapshot_url,is_active", "", false).Eq("id", cameraID).ExecuteTo(&cameras)
	if err != nil || len(cameras) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy camera"})
		return
	}

	snapshotURL := toStr(cameras[0]["snapshot_url"])
	if snapshotURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Camera không có snapshot URL"})
		return
	}

	c.Redirect(http.StatusFound, snapshotURL)
}

// TestCamera handles POST /api/cameras/:camera_id/test
// Performs a quick HTTP GET to the camera's stream_url and returns latency.
func TestCamera(c *gin.Context) {
	cameraID := c.Param("camera_id")

	db := database.GetClient()
	var cameras []map[string]interface{}
	_, err := db.From("cameras").Select("stream_url", "", false).Eq("id", cameraID).ExecuteTo(&cameras)
	if err != nil || len(cameras) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"detail": "Không tìm thấy camera"})
		return
	}

	streamURL := toStr(cameras[0]["stream_url"])
	if streamURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Camera không có stream URL để kiểm tra"})
		return
	}

	// Validate URL
	if _, parseErr := url.ParseRequestURI(streamURL); parseErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "Stream URL không hợp lệ: " + parseErr.Error()})
		return
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	start := time.Now()
	resp, reqErr := client.Get(streamURL)
	latencyMs := time.Since(start).Milliseconds()

	if reqErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success":    false,
			"latency_ms": latencyMs,
			"error":      reqErr.Error(),
		})
		return
	}
	defer resp.Body.Close()

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"latency_ms":  latencyMs,
		"status_code": resp.StatusCode,
	})
}
