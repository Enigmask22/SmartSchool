# Sử dụng một image Python chính thức làm nền tảng.
# Chọn phiên bản Python bạn đang dùng, ví dụ 3.9. Dùng 'slim' cho nhẹ.
FROM python:3.12-slim

# Thiết lập biến môi trường để Python không buffer output
ENV PYTHONUNBUFFERED 1

# Cài đặt các gói hệ thống cần thiết (đây là bước quan trọng!)
# Chúng ta có toàn quyền chạy apt-get ở đây.
RUN apt-get update && apt-get install -y \
    build-essential \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Tạo và thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép tệp requirements vào trước để tận dụng cache của Docker
COPY requirements.txt .

# Cài đặt các thư viện Python
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn còn lại của bạn vào container
COPY . .

# (Quan trọng) Đặt biến môi trường cho insightface nếu cần
# Bạn vẫn sẽ cần đặt giá trị cụ thể trong Settings của Render
# ENV INSIGHTFACE_HOME=/path/to/models

# Lệnh để chạy ứng dụng của bạn khi container khởi động
# Thay thế bằng lệnh khởi động của bạn (ví dụ Gunicorn cho FastAPI/Flask)
CMD ["gunicorn", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:10000", "app:app"]