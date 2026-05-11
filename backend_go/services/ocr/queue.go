package ocrsvc

import (
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/semaphore"
	"smart_school_go/config"
	"smart_school_go/services/ai"
)

type OCRStatus string

const (
	StatusPending    OCRStatus = "pending"
	StatusProcessing OCRStatus = "processing"
	StatusDone       OCRStatus = "done"
	StatusError      OCRStatus = "error"
)

type OCRRequest struct {
	ID        string
	Status    OCRStatus
	Result    interface{}
	Error     string
	CreatedAt time.Time
}

var (
	ocrQueue  sync.Map
	requestID uint64
	geminiSem *semaphore.Weighted
)

func init() {
	geminiSem = semaphore.NewWeighted(int64(10))
}

func NewRequestID() string {
	id := atomic.AddUint64(&requestID, 1)
	return fmt.Sprintf("ocr_%d_%d", time.Now().UnixNano(), id)
}

func GetOCRRequest(id string) (*OCRRequest, bool) {
	v, ok := ocrQueue.Load(id)
	if !ok {
		return nil, false
	}
	return v.(*OCRRequest), true
}

func SubmitOCRJob(file multipart.File, header *multipart.FileHeader, engine string) string {
	reqID := NewRequestID()
	req := &OCRRequest{
		ID:        reqID,
		Status:    StatusPending,
		CreatedAt: time.Now(),
	}
	ocrQueue.Store(reqID, req)

	// Read file bytes
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		req.Status = StatusError
		req.Error = "Không thể đọc file"
		return reqID
	}

	imageBase64 := base64.StdEncoding.EncodeToString(fileBytes)

	// Determine MIME type
	mimeType := "image/jpeg"
	if header != nil {
		ct := header.Header.Get("Content-Type")
		if ct != "" {
			mimeType = ct
		}
	}

	go processOCRAsync(reqID, imageBase64, mimeType, engine)
	return reqID
}

func processOCRAsync(reqID, imageBase64, mimeType, engine string) {
	req, ok := ocrQueue.Load(reqID)
	if !ok {
		return
	}
	ocrReq := req.(*OCRRequest)
	ocrReq.Status = StatusProcessing

	cfg := config.Cfg
	if engine == "" {
		engine = cfg.OCRDefaultEngine
	}

	var result string
	var err error

	switch engine {
	case "qwen":
		// Proxy to Python AI sidecar
		result, err = ai.ProcessOCRViaSidecar(imageBase64, mimeType)
	default: // gemini
		if err2 := geminiSem.Acquire(nil, 1); err2 == nil {
			defer geminiSem.Release(1)
			result, err = ProcessOCRWithGemini(imageBase64, mimeType)
		} else {
			err = fmt.Errorf("OCR queue đầy, thử lại sau")
		}
	}

	if err != nil {
		ocrReq.Status = StatusError
		ocrReq.Error = err.Error()
	} else {
		ocrReq.Status = StatusDone
		ocrReq.Result = result
	}
}

func CleanupOldOCRRequests() {
	cutoff := time.Now().Add(-24 * time.Hour)
	ocrQueue.Range(func(k, v interface{}) bool {
		req := v.(*OCRRequest)
		if req.CreatedAt.Before(cutoff) {
			ocrQueue.Delete(k)
		}
		return true
	})
}
