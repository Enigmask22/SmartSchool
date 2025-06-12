@echo off
echo Starting Smart School System...
echo.

echo Starting Backend...
cd backend
start "Smart School Backend" cmd /k "venv\Scripts\activate && python main.py"

timeout /t 3 /nobreak > nul

echo Starting Frontend...
cd ..\frontend  
start "Smart School Frontend" cmd /k "npm start"

echo.
echo Smart School System is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause
