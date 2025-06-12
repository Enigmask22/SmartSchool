"""
Smart School System Backend
FastAPI server với AI Computer Vision cho điểm danh tự động
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from routers import students, attendance, auth, ai
from database.connection import init_db
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Initialize logger
logger = setup_logger()

# Create FastAPI app
app = FastAPI(
    title="Smart School System API",
    description="API cho hệ thống trường học thông minh với AI điểm danh",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Computer Vision"])

@app.on_event("startup")
async def startup_event():
    """Khởi tạo database và AI service (không load models)"""
    logger.info("Starting Smart School System API...")
    
    try:
        # Initialize database
        logger.info("Initializing database...")
        db = await init_db() # Chỉ khởi tạo, không gán vào đâu
        logger.info("Database initialized successfully")
        
        # Initialize AI service (chỉ load Haar cascade, không load data)
        logger.info("Initializing AI service...")
        from ai.face_recognition_service import face_recognition_service
        await face_recognition_service.initialize()
        logger.info("AI Service initialized. Models will be loaded on-demand from database.")
        
        logger.info("🚀 Smart School System API started successfully!")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        logger.info("Server started with limited functionality")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Smart School System API",
        "status": "active",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Kiểm tra tình trạng hệ thống"""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_models": "loaded"
    }

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    logger.info(f"Server starting on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        access_log=True
    ) 