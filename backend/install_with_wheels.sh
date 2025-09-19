#!/bin/bash
# install_with_wheels.sh
# Render deployment script with wheel support

echo "🚀 Installing dependencies with wheels support..."

# Upgrade pip first
pip install --upgrade pip wheel

# Install from wheels directory (for problematic packages)
echo "📦 Installing from pre-built wheels..."
pip install --find-links wheels --no-index --no-deps wheels/*.whl

# Install remaining dependencies from PyPI
echo "📦 Installing remaining packages from PyPI..."
pip install -r requirements-wheels.txt

echo "✅ Installation complete!"
