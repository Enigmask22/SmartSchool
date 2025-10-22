# Dockerfile for Hugging Face Spaces
# Smart School System - Modular Backend với InsightFace Face Recognition + Qwen2.5-VL OCR

# Sử dụng NVIDIA CUDA base image để hỗ trợ GPU cho Qwen OCR
FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3.12 và system dependencies
RUN apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y \
    python3.12 \
    python3.12-dev \
    python3.12-venv \
    python3-pip \
    build-essential \
    g++ \
    gcc \
    ninja-build \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgcc-s1 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgdk-pixbuf-xlib-2.0-0 \
    libfontconfig1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxtst6 \
    libxinerama1 \
    libxrender1 \
    libxt6 \
    libxxf86vm1 \
    libgl1 \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.12 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# Install pip for Python 3.12 using get-pip.py (distutils-free method)
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12

# Upgrade pip và install build tools
RUN python3.12 -m pip install --upgrade pip setuptools wheel

# Copy và install requirements trước (để tận dụng Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install FlashAttention-2 for Qwen (optional - tăng tốc 2x, giảm VRAM 30%)
# SKIP cài FlashAttention-2 trong build time để tránh timeout và OOM
# Sẽ install runtime hoặc code sẽ fallback về eager attention
# RUN pip install flash-attn --no-build-isolation || true
RUN echo "⏭️ Skipping FlashAttention-2 installation in build time (will use eager attention)"

# Copy source code - Modular structure
COPY __init__.py main.py app_factory.py ./
COPY admin/ ./admin/
COPY ai_services/ ./ai_services/
COPY attendance/ ./attendance/
COPY auth/ ./auth/
COPY core/ ./core/
COPY feedback/ ./feedback/
COPY grades/ ./grades/
COPY homeroom/ ./homeroom/
COPY school_config/ ./school_config/
COPY students/ ./students/
COPY users/ ./users/

# Copy environment file (if exists) - optional for local testing
# In Hugging Face Spaces, use Space secrets instead
# COPY .env* ./ 2>/dev/null || true
# Note: COPY doesn't support || operator, so we skip this
# Environment variables should be set via HF Spaces secrets or passed at runtime

# Tạo thư mục cần thiết
RUN mkdir -p uploads logs temp_otp ai_models

# Set environment variables
ENV INSIGHTFACE_HOME=/app/ai_models
ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

# GPU Configuration for Qwen OCR
ENV CUDA_VISIBLE_DEVICES=0
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility
# Set Qwen to use GPU (will auto-fallback to CPU if GPU not available)
ENV QWEN_DEVICE=cuda
ENV OCR_MODEL=qwen

# Kiểm tra và setup InsightFace models
RUN echo "🔍 Setting up InsightFace environment..." && \
    mkdir -p /app/ai_models/models && \
    if [ -d "/app/ai_models/models/buffalo_l" ] && [ -f "/app/ai_models/models/buffalo_l/det_10g.onnx" ]; then \
        echo "✅ Found pre-downloaded InsightFace models"; \
        echo "📊 Model files:"; \
        find /app/ai_models -name "*.onnx" -exec ls -lh {} \; 2>/dev/null || true; \
        echo "🎯 Models ready for deployment!"; \
    else \
        echo "⚠️  No pre-downloaded models found"; \
        echo "💾 InsightFace will download models on first startup"; \
        echo "📦 This may take a few minutes on first run"; \
    fi

# Create non-root user cho security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Health check with proper timeout for model loading
HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Command để chạy application
# Sử dụng uvicorn trực tiếp với modular structure
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--log-level", "info"]
