#!/bin/bash
# render-build.sh
# Build script cho Render deployment

set -e  # Exit on error

echo "🚀 Starting Render build process..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update

# Install system dependencies for computer vision
echo "🔧 Installing system dependencies..."
apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgthread-2.0-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libgtk-3-dev \
    libcanberra-gtk-module \
    libcanberra-gtk3-module

# Upgrade pip and install build tools
echo "🛠️ Upgrading pip and installing build tools..."
python -m pip install --upgrade pip
pip install setuptools wheel

# Install Python dependencies
echo "📚 Installing Python packages..."
pip install -r requirements-render.txt --no-cache-dir

echo "✅ Build completed successfully!"

# Verify critical packages
echo "🔍 Verifying installation..."
python -c "import cv2; print('OpenCV:', cv2.__version__)"
python -c "import insightface; print('InsightFace: OK')"
python -c "import onnxruntime; print('ONNX Runtime:', onnxruntime.__version__)"
python -c "import numpy; print('NumPy:', numpy.__version__)"
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"

echo "🎉 All packages verified successfully!"
