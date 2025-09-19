#!/bin/bash
# install_with_wheels.sh
# Render deployment script with wheel support

echo "🚀 Installing dependencies with cross-platform support..."

# Upgrade pip first
pip install --upgrade pip wheel

# Check if we're on Linux (Render) vs Windows (local)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected - Installing from PyPI (wheels not compatible)"
    pip install -r requirements-wheels.txt
else
    echo "🪟 Windows detected - Attempting wheels first, fallback to PyPI"
    # Try wheels first on Windows, fallback to PyPI
    pip install --find-links wheels --no-deps wheels/*.whl 2>/dev/null || true
    pip install -r requirements-wheels.txt
fi

echo "✅ Installation complete!"
