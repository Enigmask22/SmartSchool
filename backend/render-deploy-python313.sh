#!/bin/bash
# Render Deployment Script cho Python 3.13
# Sử dụng pre-built wheels từ PyPI thay vì wheels tự build

echo "🚀 Smart School - Deploying with Python 3.13 compatibility..."

# Kiểm tra Python version
echo "🐍 Python version: $(python --version 2>&1 || python3 --version)"
echo "📦 Pip version: $(pip --version 2>&1 || pip3 --version)"

# Upgrade pip và build tools
echo "⬆️ Upgrading pip and build tools..."
pip install --upgrade pip setuptools wheel

# Kiểm tra nếu có wheels directory (để backward compatibility)
if [ -d "wheels" ] && [ "$(ls -A wheels 2>/dev/null)" ]; then
    echo "⚠️  Found wheels directory, but using PyPI for Python 3.13 compatibility"
    echo "📦 $(ls wheels/*.whl 2>/dev/null | wc -l) wheel files found (will be ignored)"
fi

echo "📦 Installing from PyPI with Python 3.13 compatible versions..."

# Install packages with specific versions that support Python 3.13
pip install \
    "opencv-python-headless>=4.9.0" \
    "insightface>=0.7.3" \
    "onnxruntime>=1.18.0" \
    "onnx>=1.16.0" \
    "scikit-learn>=1.4.0" \
    "numpy>=1.26.0" \
    "pandas>=2.1.0" \
    --verbose

if [ $? -ne 0 ]; then
    echo "❌ Failed to install core ML packages"
    echo "🔄 Trying fallback installation..."
    pip install -r requirements-python313.txt --verbose
else
    echo "✅ Core ML packages installed successfully"
    echo "📦 Installing remaining packages..."
    pip install -r requirements-python313.txt --verbose
fi

if [ $? -eq 0 ]; then
    echo "✅ All packages installed successfully!"
    
    # Verify critical packages
    echo "🔍 Verifying critical imports..."
    python -c "
import cv2
import insightface  
import onnxruntime
import sklearn
import numpy
import pandas
print('✅ All critical packages can be imported!')
print(f'OpenCV: {cv2.__version__}')
print(f'InsightFace: {insightface.__version__}')
print(f'ONNXRuntime: {onnxruntime.__version__}')
print(f'Scikit-learn: {sklearn.__version__}')
print(f'NumPy: {numpy.__version__}')
print(f'Pandas: {pandas.__version__}')
"
    
    if [ $? -eq 0 ]; then
        echo "🎯 Deployment successful! All packages working correctly."
        exit 0
    else
        echo "❌ Package import verification failed"
        exit 1
    fi
else
    echo "❌ Package installation failed"
    exit 1
fi
