#!/bin/bash
# Render Deployment với Pre-downloaded InsightFace Models
# Models đã được lưu trong repository với Git LFS

echo "🚀 Smart School - Deploying with pre-downloaded InsightFace models..."

# Kiểm tra Python và pip
echo "🐍 Python version: $(python --version 2>&1 || python3 --version)"
echo "📦 Pip version: $(pip --version 2>&1 || pip3 --version)"

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements-python313.txt

# Kiểm tra InsightFace models đã có
echo "🔍 Checking for pre-downloaded InsightFace models..."

MODEL_PATH="./insightface_cache/models/buffalo_l"
BACKEND_MODEL_PATH="./backend/insightface_cache/models/buffalo_l"

if [ -d "$MODEL_PATH" ] && [ -f "$MODEL_PATH/det_10g.onnx" ]; then
    echo "✅ Found models in: $MODEL_PATH"
    export INSIGHTFACE_HOME="./insightface_cache"
elif [ -d "$BACKEND_MODEL_PATH" ] && [ -f "$BACKEND_MODEL_PATH/det_10g.onnx" ]; then
    echo "✅ Found models in: $BACKEND_MODEL_PATH"
    export INSIGHTFACE_HOME="./backend/insightface_cache"
else
    echo "⚠️  No pre-downloaded models found, will download on first run"
    echo "💾 Available disk space:"
    df -h .
fi

# Verify models
if [ -n "$INSIGHTFACE_HOME" ]; then
    echo "📊 Model files:"
    find "$INSIGHTFACE_HOME" -name "*.onnx" -exec ls -lh {} \; 2>/dev/null || echo "No .onnx files found"
    find "$INSIGHTFACE_HOME" -name "*.zip" -exec ls -lh {} \; 2>/dev/null || echo "No .zip files found"
    
    echo "🎯 INSIGHTFACE_HOME set to: $INSIGHTFACE_HOME"
    echo "✅ Models ready for deployment!"
else
    echo "⚠️  Models will be downloaded on startup"
fi

echo "🎯 Deployment setup completed!"
exit 0
