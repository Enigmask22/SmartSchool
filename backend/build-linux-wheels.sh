#!/bin/bash
# build-linux-wheels.sh
# Build Linux wheels using Docker

set -e

echo "🐳 Building Linux wheels using Docker..."

# Build wheels container
echo "🔨 Building Docker image for wheel creation..."
docker build -f Dockerfile.wheels -t smart-school-wheels .

# Create local wheels directory
mkdir -p wheels

# Run container and copy wheels
echo "📦 Creating wheels..."
docker run --rm -v "$(pwd)/wheels:/build/wheels" smart-school-wheels

# List created wheels
echo "✅ Linux wheels created:"
ls -la wheels/

echo "🚀 You can now use these wheels for Render deployment!"
echo "📝 Upload the 'wheels' directory with your code to Render"
