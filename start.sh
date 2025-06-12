#!/bin/bash
echo "Starting Smart School System..."

echo "Starting Backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Smart School System is starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"

# Function to cleanup processes
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
