#!/bin/bash
# Build Wheels Script for Linux/Ubuntu
# Tạo wheel files cho Linux deployment

echo "🛠️ Smart School Backend - Build Wheels for Linux"
echo "=================================================="

# Tạo thư mục wheels
mkdir -p wheels
echo "📁 Created wheels directory"

# Packages cần build cho Linux
PACKAGES=(
    "opencv-python-headless==4.8.1.78"
    "insightface==0.7.3"
    "onnxruntime>=1.17.0"
    "onnx>=1.15.0"
    "scikit-learn==1.3.2"
    "numpy>=1.21.0"
    "pandas>=2.0.0"
    "python-jose[cryptography]==3.3.0"
    "bcrypt==4.1.2"
    "Pillow==10.0.1"
)

echo "🔧 Building wheels for ${#PACKAGES[@]} packages..."

SUCCESS_COUNT=0
FAILED_PACKAGES=()

# Build wheels cho từng package
for PACKAGE in "${PACKAGES[@]}"; do
    echo ""
    echo "--- Processing: $PACKAGE ---"
    
    # Thử download pre-built wheel trước
    echo "📥 Trying to download pre-built wheel..."
    if pip3 download --dest wheels --only-binary=:all: "$PACKAGE" 2>/dev/null; then
        echo "✅ Downloaded pre-built wheel for: $PACKAGE"
        ((SUCCESS_COUNT++))
    else
        echo "📦 Building wheel from source..."
        # Build wheel từ source
        if pip3 wheel --wheel-dir wheels --no-deps "$PACKAGE"; then
            echo "✅ Built wheel for: $PACKAGE"
            ((SUCCESS_COUNT++))
        else
            echo "❌ Failed to build: $PACKAGE"
            FAILED_PACKAGES+=("$PACKAGE")
        fi
    fi
done

echo ""
echo "=================================================="
echo "📊 SUMMARY:"
echo "   ✅ Successful wheels: $SUCCESS_COUNT"
echo "   ❌ Failed packages: ${#FAILED_PACKAGES[@]}"

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
    echo ""
    echo "⚠️ Failed packages:"
    for pkg in "${FAILED_PACKAGES[@]}"; do
        echo "     - $pkg"
    done
fi

# List created wheels
echo ""
echo "📦 Created wheels:"
ls -la wheels/*.whl 2>/dev/null || echo "No wheel files found"

echo ""
echo "🚀 Next steps:"
echo "   1. Use wheels directory for deployment"
echo "   2. Install with: pip install --find-links wheels -r requirements-wheels.txt"

if [ ${#FAILED_PACKAGES[@]} -eq 0 ]; then
    echo "✅ All packages built successfully!"
    exit 0
else
    echo "⚠️ Some packages failed, but may install fine from PyPI"
    exit 1
fi
