"""
FastAPI Application Factory
Tạo và cấu hình FastAPI app cho backend modular
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import time
from fastapi import Request
import jwt
from typing import Optional

# Import core
from core.logger import setup_logger
from core.database import init_db, get_school_db
from core.config import LOG_LEVEL, ENV, SECRET_KEY, ALGORITHM

# Import routers từ các modules
from auth.api import router as auth_router
from admin.api import router as admin_router
from users.api import router as users_router
from students.api import router as students_router
from attendance.api import router as attendance_router
from grades.api import router as grades_router
from homeroom.api import router as homeroom_router
from feedback.api import router as feedback_router
from school_config.api import router as school_config_router
from ai_services.api import router as ai_router

logger = setup_logger(level=LOG_LEVEL)

def create_app() -> FastAPI:
    """
    Tạo và cấu hình FastAPI application
    """
    
    # Create FastAPI app
    app = FastAPI(
        title="Smart School System API - Modular Edition",
        description="API cho hệ thống trường học thông minh - Kiến trúc Modular Monolithic",
        version="2.0.0-modular",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json" if ENV == "development" else None,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "ws://localhost:3000",
            "ws://127.0.0.1:3000"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Performance monitoring middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        """Đo thời gian xử lý request"""
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        
        if process_time > 1.0 and LOG_LEVEL != "WARNING":
            logger.warning(f"Slow request: {request.url.path} took {process_time:.3f}s")
        
        return response
    
    # Multi-school database routing middleware
    @app.middleware("http")
    async def school_database_middleware(request: Request, call_next):
        """
        Middleware tự động detect và set database client cho mỗi request
        Dựa trên JWT token trong Authorization header
        """
        # Initialize với None
        request.state.db = None
        request.state.username = None
        
        # Chỉ xử lý cho API endpoints (bỏ qua /docs, /health, static files)
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Bỏ qua các endpoint không cần auth
        public_endpoints = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"]
        if request.url.path in public_endpoints:
            return await call_next(request)
        
        # Extract JWT token từ Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            try:
                # Decode JWT để lấy username
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                username = payload.get("sub")
                
                if username:
                    # Lưu username vào request.state
                    request.state.username = username
                    
                    # Get database client cho school này (CACHED by school_db_manager)
                    # Chỉ gọi 1 lần mỗi request, sau đó endpoints dùng request.state.db
                    db_client = get_school_db(username)
                    request.state.db = db_client
                    
                    logger.debug(f"✅ Middleware set database for user: {username}")
                    
            except jwt.JWTError as e:
                logger.debug(f"JWT decode failed: {str(e)}")
                # Không raise error, để endpoint tự xử lý authentication
                pass
            except Exception as e:
                logger.error(f"Error in school_database_middleware: {str(e)}")
                pass
        
        response = await call_next(request)
        return response
    
    # Static files
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    
    # Register routers
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(admin_router, prefix="/api/admin", tags=["Admin Management"])
    app.include_router(users_router, prefix="/api/users", tags=["Users"])
    app.include_router(students_router, prefix="/api/students", tags=["Students"])
    app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
    app.include_router(grades_router, prefix="/api/grades", tags=["Grades"])
    app.include_router(homeroom_router, prefix="/api/homeroom", tags=["Homeroom"])
    app.include_router(feedback_router, prefix="/api/feedback", tags=["AI Feedback"])
    app.include_router(school_config_router, prefix="/api/school-days-config", tags=["School Config"])
    app.include_router(ai_router, prefix="/api/ai", tags=["AI Services"])
    
    # Startup event
    @app.on_event("startup")
    async def startup_event():
        """Khởi tạo database và các services"""
        logger.info("Starting Smart School System API - Modular Edition...")
        
        try:
            logger.info("Initializing database...")
            await init_db()
            logger.info("✅ Database initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {str(e)}")
            raise
        
        logger.info("🚀 Application startup complete!")
    
    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup khi tắt server"""
        logger.info("Shutting down Smart School System API - Modular Edition...")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "version": "2.0.0-modular",
            "architecture": "modular-monolithic"
        }
    
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": "Smart School System API - Modular Edition",
            "version": "2.0.0-modular",
            "docs": "/docs",
            "health": "/health"
        }
    
    return app
