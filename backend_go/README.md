# Smart School Backend Go

Backend Go cho hệ thống Smart School/SynapseS, được chuyển đổi từ FastAPI Python sang Gin. Backend này giữ nguyên cấu trúc API chính để frontend hiện tại có thể gọi tương thích, đồng thời tách các tác vụ AI nặng như nhận diện khuôn mặt và Qwen OCR sang Python AI Sidecar.

## Tổng quan

- HTTP server: Gin, mặc định chạy tại `http://localhost:8000`
- Database: Supabase PostgreSQL qua Supabase Go client
- Auth: JWT HS256, access token + refresh token
- Password: bcrypt, giới hạn 72 bytes để tương thích Python passlib
- Email: SMTP qua Gmail/App Password hoặc SMTP server cấu hình trong `.env`
- AI feedback: Gemini API và OpenRouter API
- OCR: Gemini Vision trực tiếp trong Go, Qwen OCR qua Python sidecar
- Face recognition: Python sidecar dùng InsightFace/FAISS
- Scheduler: tự động tạo vắng mặt hằng ngày lúc 18:24

## Cấu trúc thư mục

```text
backend_go/
├── main.go                    # Entry point Gin server
├── go.mod
├── go.sum
├── .env                       # Cấu hình runtime
├── config/                    # Load biến môi trường
├── database/                  # Supabase client singleton
├── middleware/                # JWT auth, CORS, timing
├── handlers/                  # REST API handlers
├── models/                    # Request/response structs
├── services/
│   ├── auth/                  # JWT, bcrypt, OTP, SMTP
│   ├── feedback/              # Gemini/OpenRouter feedback
│   ├── ocr/                   # Gemini OCR + async queue
│   ├── ai/                    # Proxy sang Python AI sidecar
│   └── scheduler/             # Auto absence scheduler
├── uploads/                   # Static uploaded files
├── temp_otp/                  # OTP JSON temporary files
└── ai_sidecar/
    ├── main.py                # FastAPI AI sidecar, port 8001
    └── requirements.txt       # Python AI dependencies
```

## Yêu cầu hệ thống

### Bắt buộc

- Go `1.21+` hoặc mới hơn
- Supabase project đã có schema/tables tương thích với backend Python cũ
- File `.env` hợp lệ

### Nếu dùng AI Sidecar

- Python `3.10+` khuyến nghị
- Virtual environment
- Các thư viện trong `ai_sidecar/requirements.txt`
- Với GPU/CUDA: cần cài CUDA/PyTorch/ONNXRuntime phù hợp môi trường máy

## Cài đặt Go backend

### 1. Đi tới thư mục backend_go

```bash
cd backend_go
```

Trên Windows PowerShell:

```powershell
cd D:\studioproj\smart_school\backend_go
```

Nếu Go không nằm trong PATH, thêm tạm thời trong Git Bash:

```bash
export PATH="$PATH:/d/Go/bin"
```

Hoặc PowerShell:

```powershell
$env:PATH += ";D:\Go\bin"
```

Kiểm tra Go:

```bash
go version
```

### 2. Cài dependencies

```bash
go mod tidy
```

### 3. Chuẩn bị file `.env`

Có thể copy từ backend Python cũ:

```bash
cp ../backend/.env .env
```

Trên PowerShell:

```powershell
Copy-Item ..\backend\.env .\.env
```

Sau đó đảm bảo `.env` có thêm cấu hình AI sidecar:

```ini
AI_SIDECAR_URL=http://localhost:8001
AI_SIDECAR_ENABLED=true
```

Các biến quan trọng cần có:

```ini
SUPABASE_URL=...
SUPABASE_KEY=...
SECRET_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=1
OTP_EXPIRY_MINUTES=10

GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=Smart School

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=...
SMTP_PASSWORD=...
SMTP_SENDER_NAME=SynapseS System

PORT=8000
AI_SIDECAR_URL=http://localhost:8001
AI_SIDECAR_ENABLED=true
```

## Chạy Go backend

### Chạy trực tiếp

```bash
go run main.go
```

Server sẽ chạy tại:

```text
http://localhost:8000
```

### Build binary

```bash
go build -o smart_school_go.exe .
```

Chạy binary trên Windows:

```powershell
.\smart_school_go.exe
```

Trên Linux/macOS:

```bash
go build -o smart_school_go .
./smart_school_go
```

## Kiểm tra backend

Health check:

```bash
curl http://localhost:8000/health
```

Kết quả mong đợi:

```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

Root endpoint:

```bash
curl http://localhost:8000/
```

Kết quả:

```json
{
  "message": "SynapseS Go API",
  "version": "1.0.0"
}
```

Test đăng nhập:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

## Setup và chạy AI Sidecar

AI Sidecar chỉ cần thiết khi dùng:

- Nhận diện khuôn mặt bằng InsightFace/FAISS
- Qwen OCR
- Các endpoint `/api/ai/*` cần model Python

### 1. Tạo virtual environment

Từ thư mục `backend_go/ai_sidecar`:

```bash
cd backend_go/ai_sidecar
python -m venv .venv
```

Kích hoạt trên Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Kích hoạt trên Git Bash:

```bash
source .venv/Scripts/activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

### 2. Cài Python dependencies

```bash
pip install -r requirements.txt
```

Lưu ý: các package AI như `torch`, `onnxruntime`, `insightface`, `faiss-cpu` có thể cần cấu hình riêng tùy CPU/GPU. Nếu chạy GPU, hãy cài PyTorch và ONNXRuntime bản CUDA phù hợp trước.

### 3. Chạy AI Sidecar

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

Kiểm tra sidecar:

```bash
curl http://localhost:8001/face/status
```

## Thứ tự chạy khuyến nghị

Nếu dùng đầy đủ AI:

Terminal 1:

```bash
cd backend_go/ai_sidecar
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8001
```

Terminal 2:

```bash
cd backend_go
go run main.go
```

Nếu không dùng AI:

```bash
cd backend_go
go run main.go
```

Các endpoint AI sẽ trả lỗi nếu sidecar chưa chạy, nhưng những API còn lại vẫn hoạt động.

## Các nhóm API chính

| Nhóm | Prefix |
|---|---|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Students | `/api/students` |
| Attendance | `/api/attendance` |
| Scores + OCR | `/api/scores` |
| Feedback | `/api/feedback` |
| Score Settings | `/api/score-settings` |
| Homeroom | `/api/homeroom` |
| Admin | `/api/admin` |
| AI Services | `/api/ai` |
| Cameras | `/api/cameras` |
| Static uploads | `/uploads` |

## Ghi chú tương thích frontend

Backend Go giữ các route chính tương thích với backend FastAPI cũ. Frontend có thể trỏ API base URL sang:

```text
http://localhost:8000
```

CORS mặc định cho phép:

```text
http://localhost:3000
http://127.0.0.1:3000
```

## Scheduler tự động vắng mặt

Khi Go server chạy, scheduler sẽ tự động kiểm tra mỗi 30 giây và chạy logic tạo bản ghi vắng mặt lúc `18:24` hằng ngày.

Luồng chính:

1. Kiểm tra bảng ngày nghỉ.
2. Lấy học sinh active theo khối 10/11/12.
3. Kiểm tra attendance trong ngày.
4. Insert trạng thái `absent` cho học sinh chưa có bản ghi.

## Troubleshooting

### `go` không được nhận diện

Thêm Go vào PATH:

```bash
export PATH="$PATH:/d/Go/bin"
```

Hoặc PowerShell:

```powershell
$env:PATH += ";D:\Go\bin"
```

### Lỗi kết nối Supabase

Kiểm tra `.env`:

```ini
SUPABASE_URL=...
SUPABASE_KEY=...
```

Đảm bảo key có quyền đọc/ghi các bảng cần dùng.

### Lỗi JWT hoặc token không hợp lệ

Đảm bảo `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` giống backend Python cũ.

### Lỗi gửi email OTP

Kiểm tra:

```ini
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=...
SMTP_PASSWORD=...
```

Nếu dùng Gmail, `SMTP_PASSWORD` phải là App Password, không phải mật khẩu tài khoản Google thông thường.

### AI sidecar không hoạt động

Kiểm tra sidecar đã chạy chưa:

```bash
curl http://localhost:8001/face/status
```

Kiểm tra Go `.env`:

```ini
AI_SIDECAR_URL=http://localhost:8001
AI_SIDECAR_ENABLED=true
```

Nếu lỗi dependency AI, thử chạy lại:

```bash
pip install -r requirements.txt
```

### Port 8000 đã bị chiếm

Đổi port trong `.env`:

```ini
PORT=8002
```

Sau đó chạy lại:

```bash
go run main.go
```

## Lệnh nhanh

```bash
# Cài Go dependencies
go mod tidy

# Build kiểm tra
go build ./...

# Build binary
go build -o smart_school_go.exe .

# Chạy server
go run main.go

# Health check
curl http://localhost:8000/health
```

## Trạng thái build hiện tại

Đã kiểm tra build thành công với:

```bash
go build -o smart_school_go.exe .
```
