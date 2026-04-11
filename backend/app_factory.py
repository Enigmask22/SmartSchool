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
from core.database import init_db  # get_school_db removed - single database mode
from core.config import LOG_LEVEL, ENV, SECRET_KEY, ALGORITHM

# Import routers từ các modules
from auth.api import router as auth_router
from admin.api import router as admin_router
from users.api import router as users_router
from students.api import router as students_router
from attendance.api import router as attendance_router
from scores.api import router as scores_router
from homeroom.api import router as homeroom_router
from homeroom.subject_import import router as homeroom_subject_router
from feedback.api import router as feedback_router
from ai_services.api import router as ai_router
from score_settings.api import router as score_settings_router
from camera_manager.api import router as camera_router
import threading
import datetime
import schedule
from core.database import db as core_db

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
            
            # try:
                # Decode JWT token (multi-database routing disabled)
                # username parsing disabled - single database mode
                # payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                # username = payload.get("sub")
                
                # Multi-school database routing disabled - using single database
                # if username:
                #     request.state.username = username
                #     db_client = get_school_db(username)  # DISABLED
                #     request.state.db = db_client
                # logger.debug(f"✅ Middleware set database for user: {username}")
                    
            # except jwt.JWTError as e:
            #     logger.debug(f"JWT decode failed: {str(e)}")
            #     # Không raise error, để endpoint tự xử lý authentication
            #     pass
            # except Exception as e:
            #     logger.error(f"Error in school_database_middleware: {str(e)}")
            #     pass
        
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
    app.include_router(scores_router, prefix="/api/scores", tags=["Scores"])
    app.include_router(homeroom_router, prefix="/api/homeroom", tags=["Homeroom"])
    app.include_router(homeroom_subject_router, prefix="/api", tags=["Homeroom Subject Import"])
    app.include_router(feedback_router, prefix="/api/feedback", tags=["AI Feedback"])
    app.include_router(ai_router, prefix="/api/ai", tags=["AI Services"])
    app.include_router(score_settings_router, prefix="/api/score-settings", tags=["Score Settings"])
    app.include_router(camera_router, prefix="/api/cameras", tags=["Camera Management"])
    
    # Startup event
    @app.on_event("startup")
    async def startup_event():
        """Khởi tạo khi start server"""
        logger.info("🚀 Starting Smart School System API - Modular Edition...")
        
        try:
            logger.info("Initializing database...")
            await init_db()
            logger.info("✅ Database initialized successfully")
            
            # Cleanup old files on startup
            from auth.services import OTPService
            from scores.services import cleanup_old_score_sheets
            
            # Cleanup expired OTPs
            otp_service = OTPService()
            otp_deleted = otp_service.cleanup_expired_otps()
            if otp_deleted > 0:
                logger.info(f"🧹 Cleaned up {otp_deleted} expired OTPs")
            
            # Cleanup old score sheets (older than 24 hours)
            sheets_deleted = cleanup_old_score_sheets(max_age_hours=24)
            if sheets_deleted > 0:
                logger.info(f"🧹 Cleaned up {sheets_deleted} old score sheets")
            
            # Load cameras from database (if any)
            try:
                from camera_manager.services import camera_manager
                from camera_manager.db_service import CameraDBService
                from core.database import db as core_db
                
                # Load cameras từ database (cần dùng .client để lấy Supabase Client)
                db_cameras = await CameraDBService.get_all_cameras(core_db.client, enabled_only=False)
                if db_cameras:
                    loaded_count = 0
                    for db_camera in db_cameras:
                        try:
                            config = CameraDBService.dict_to_config(db_camera)
                            # Chỉ load nếu enabled
                            if config.enabled:
                                camera_manager.add_camera(config, frame_callback=None)
                                loaded_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️ Không thể load camera {db_camera.get('camera_id')}: {e}")
                    
                    if loaded_count > 0:
                        logger.info(f"📹 Đã load {loaded_count}/{len(db_cameras)} cameras từ database")
            except Exception as e:
                logger.warning(f"⚠️ Không thể load cameras từ database (có thể bảng chưa tồn tại): {e}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {str(e)}")
            raise
        
        logger.info("🚀 Application startup complete!")

        # ================= Daily scheduler for auto-absence =================
        def run_daily_auto_absence():
            try:
                client = core_db.client
                today = datetime.date.today()
                y = today.year
                m = today.month
                d = today.day
                for grade in [10, 11, 12]:
                    # Check dayoff config
                    cfg = (
                        client.table("dayoff")
                        .select("dayoffs_list")
                        .eq("year", y)
                        .eq("month", m)
                        .eq("grade", grade)
                        .execute()
                    )
                    if cfg.data and cfg.data[0].get("dayoffs_list"):
                        try:
                            if d in (cfg.data[0]["dayoffs_list"] or []):
                                logger.info(f"Skip auto-absence for grade {grade} - dayoff {today}")
                                continue
                        except Exception:
                            pass
                    # Fetch students by grade (support both numeric and string)
                    students_resp = (
                        client.table("students")
                        .select("id, grade, is_active")
                        .or_(f"grade.eq.{grade},grade.eq.{str(grade)}")
                        .eq("is_active", True)
                        .execute()
                    )
                    student_ids = [s["id"] for s in (students_resp.data or [])]
                    if not student_ids:
                        continue
                    # Existing attendance for today
                    attend_resp = (
                        client.table("attendance")
                        .select("student_id")
                        .eq("date", today.isoformat())
                        .in_("student_id", student_ids)
                        .execute()
                    )
                    existing_ids = {r["student_id"] for r in (attend_resp.data or [])}
                    missing = [sid for sid in student_ids if sid not in existing_ids]
                    rows = [
                        {
                            "student_id": sid,
                            "date": today.isoformat(),
                            "status": "absent",
                            "method": "auto",
                            "created_at": datetime.datetime.now().isoformat(),
                        }
                        for sid in missing
                    ]
                    if rows:
                        client.table("attendance").insert(rows).execute()
                        logger.info(f"Auto-absence inserted: grade {grade} - {len(rows)} records on {today}")
            except Exception as e:
                logger.error(f"Auto-absence scheduler error: {str(e)}")

        # Schedule at 00:05 server time
        try:
            schedule.clear()
            schedule.every().day.at("18:24").do(run_daily_auto_absence)

            def scheduler_loop():
                while True:
                    schedule.run_pending()
                    time.sleep(60)

            t = threading.Thread(target=scheduler_loop, daemon=True)
            t.start()
            logger.info("✅ Daily auto-absence scheduler started (00:05)")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}")
    
    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup khi tắt server - non-blocking để tránh đơ khi reload"""
        import asyncio
        logger.info("Shutting down Smart School System API - Modular Edition...")
        
        # Cleanup cameras trong background để không block shutdown
        try:
            from camera_manager.services import camera_manager
            
            # Chạy cleanup trong executor để không block event loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, camera_manager.cleanup)
            logger.info("✅ All cameras cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up cameras: {e}")
    
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
