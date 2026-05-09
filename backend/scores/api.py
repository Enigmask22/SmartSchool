"""
API Router cho Scores management
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, status, Form
from typing import Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
import os
import asyncio
import re
import time
import tempfile
from collections import deque
from dataclasses import dataclass

from scores.models import ScoreCreate, ScoreUpdate, ResponseModel
from scores.services import calculate_final_grade
from core.database import get_db
from core.logger import setup_logger
from core.system_settings import get_current_academic_year, get_current_semester
from core.dependencies import get_current_user
from core.edit_permissions import assert_can_edit_grade, is_grade_edit_locked_for_user

logger = setup_logger("scores_api")
router = APIRouter()

# Global dict to store OCR results (in production, use Redis or database)
ocr_results = {}


# OCR engines, swap config và queue theo từng engine
def _read_int_env(name: str, default_value: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default_value

    try:
        return int(raw_value)
    except ValueError:
        logger.warning("Giá trị env %s=%s không hợp lệ, dùng mặc định %s", name, raw_value, default_value)
        return default_value


def _read_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default_value

    return raw_value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class OCREngineConfig:
    name: str
    max_concurrent_requests: int
    batch_size_per_window: int
    window_seconds: int
    max_queue_size: int
    average_processing_seconds: int


@dataclass
class OCRQueueJob:
    request_id: str
    teacher_key: str
    teacher_name: str
    engine: str
    temp_paths: list[str]
    db_client: Any
    created_at: float


@dataclass
class OCREngineState:
    queue: deque[OCRQueueJob]
    active: dict[str, OCRQueueJob]
    current_window_key: int
    dispatched_in_window: int


OCR_DEFAULT_ENGINE = os.getenv("OCR_DEFAULT_ENGINE", "gemini").strip().lower()
OCR_ALLOW_ENGINE_OVERRIDE = _read_bool_env("OCR_ALLOW_ENGINE_OVERRIDE", True)

OCR_ENGINE_CONFIGS: dict[str, OCREngineConfig] = {
    "gemini": OCREngineConfig(
        name="gemini",
        max_concurrent_requests=_read_int_env("GEMINI_OCR_MAX_CONCURRENT_REQUESTS", 10),
        batch_size_per_window=_read_int_env("GEMINI_OCR_BATCH_SIZE_PER_WINDOW", 10),
        window_seconds=_read_int_env("GEMINI_OCR_WINDOW_SECONDS", 60),
        max_queue_size=_read_int_env("GEMINI_OCR_MAX_QUEUE_SIZE", 300),
        average_processing_seconds=_read_int_env("GEMINI_OCR_AVG_PROCESSING_SECONDS", 20),
    ),
    "qwen": OCREngineConfig(
        name="qwen",
        max_concurrent_requests=_read_int_env("QWEN_OCR_MAX_CONCURRENT_REQUESTS", 1),
        batch_size_per_window=_read_int_env("QWEN_OCR_BATCH_SIZE_PER_WINDOW", 1),
        window_seconds=_read_int_env("QWEN_OCR_WINDOW_SECONDS", 120),
        max_queue_size=_read_int_env("QWEN_OCR_MAX_QUEUE_SIZE", 100),
        average_processing_seconds=_read_int_env("QWEN_OCR_AVG_PROCESSING_SECONDS", 120),
    ),
}

if OCR_DEFAULT_ENGINE not in OCR_ENGINE_CONFIGS:
    logger.warning("OCR_DEFAULT_ENGINE=%s không hợp lệ, fallback về gemini", OCR_DEFAULT_ENGINE)
    OCR_DEFAULT_ENGINE = "gemini"


def _init_engine_state(engine_name: str) -> OCREngineState:
    config = OCR_ENGINE_CONFIGS[engine_name]
    current_window_key = int(time.time() // max(1, config.window_seconds))
    return OCREngineState(
        queue=deque(),
        active={},
        current_window_key=current_window_key,
        dispatched_in_window=0,
    )


ocr_engine_states: dict[str, OCREngineState] = {
    engine_name: _init_engine_state(engine_name)
    for engine_name in OCR_ENGINE_CONFIGS
}
ocr_state_lock = asyncio.Lock()
ocr_dispatcher_task: asyncio.Task | None = None

logger.info(
    "OCR engine configs loaded: default=%s, allow_override=%s, configs=%s",
    OCR_DEFAULT_ENGINE,
    OCR_ALLOW_ENGINE_OVERRIDE,
    {
        name: {
            "max_concurrent": config.max_concurrent_requests,
            "batch_per_window": config.batch_size_per_window,
            "window_seconds": config.window_seconds,
            "max_queue_size": config.max_queue_size,
            "avg_processing_seconds": config.average_processing_seconds,
        }
        for name, config in OCR_ENGINE_CONFIGS.items()
    },
)


def _sync_ocr_window_state_locked(engine_name: str) -> None:
    """Reset quota khi sang cửa sổ mới của engine."""
    config = OCR_ENGINE_CONFIGS[engine_name]
    state = ocr_engine_states[engine_name]
    now_window_key = int(time.time() // max(1, config.window_seconds))

    if now_window_key != state.current_window_key:
        state.current_window_key = now_window_key
        state.dispatched_in_window = 0
        logger.info("OCR window reset cho engine=%s", engine_name)


def _seconds_until_next_window(engine_name: str) -> int:
    config = OCR_ENGINE_CONFIGS[engine_name]
    seconds_left = config.window_seconds - int(time.time() % max(1, config.window_seconds))
    return max(1, seconds_left)


def _estimate_wait_seconds_locked(engine_name: str, position_in_queue: int) -> int:
    """Ước lượng thời gian chờ dựa trên quota còn lại của engine hiện tại."""
    if position_in_queue <= 0:
        return 0

    config = OCR_ENGINE_CONFIGS[engine_name]
    state = ocr_engine_states[engine_name]
    remaining_in_window = max(0, config.batch_size_per_window - state.dispatched_in_window)
    seconds_to_next_window = _seconds_until_next_window(engine_name)

    if remaining_in_window <= 0:
        requests_before = position_in_queue - 1
        full_windows_before = requests_before // max(1, config.batch_size_per_window)
        return seconds_to_next_window + (full_windows_before * config.window_seconds)

    if position_in_queue <= remaining_in_window:
        return 0

    requests_after_current_window = position_in_queue - remaining_in_window - 1
    full_windows_before = requests_after_current_window // max(1, config.batch_size_per_window)
    return seconds_to_next_window + (full_windows_before * config.window_seconds)


def _queue_position_locked(engine_name: str, request_id: str) -> Optional[int]:
    state = ocr_engine_states[engine_name]
    for index, job in enumerate(state.queue, start=1):
        if job.request_id == request_id:
            return index
    return None


def _build_engine_stats_locked(engine_name: str) -> dict:
    config = OCR_ENGINE_CONFIGS[engine_name]
    state = ocr_engine_states[engine_name]
    queued = len(state.queue)
    active = len(state.active)
    remaining_quota = max(0, config.batch_size_per_window - state.dispatched_in_window)

    return {
        "engine": engine_name,
        "queue_size": queued,
        "active_workers": active,
        "max_queue_size": config.max_queue_size,
        "max_concurrent": config.max_concurrent_requests,
        "batch_per_window": config.batch_size_per_window,
        "window_seconds": config.window_seconds,
        "processed_in_current_window": state.dispatched_in_window,
        "remaining_quota_in_window": remaining_quota,
        "next_window_in_seconds": _seconds_until_next_window(engine_name),
        "unique_teachers_waiting": len({job.teacher_key for job in state.queue}),
        "timestamp": datetime.now().isoformat(),
    }


def _build_queue_stats_locked(engine_name: Optional[str] = None) -> dict:
    if engine_name:
        return _build_engine_stats_locked(engine_name)

    per_engine_stats = {
        name: _build_engine_stats_locked(name)
        for name in OCR_ENGINE_CONFIGS
    }

    return {
        "queue_size": sum(item["queue_size"] for item in per_engine_stats.values()),
        "active_workers": sum(item["active_workers"] for item in per_engine_stats.values()),
        "max_queue_size": sum(item["max_queue_size"] for item in per_engine_stats.values()),
        "max_concurrent": sum(item["max_concurrent"] for item in per_engine_stats.values()),
        "default_engine": OCR_DEFAULT_ENGINE,
        "allow_engine_override": OCR_ALLOW_ENGINE_OVERRIDE,
        "per_engine": per_engine_stats,
        "timestamp": datetime.now().isoformat(),
    }


def _refresh_queued_metadata_locked(engine_name: str) -> None:
    """Cập nhật vị trí queue + ETA cho các request đang chờ theo engine."""
    next_window = _seconds_until_next_window(engine_name)
    state = ocr_engine_states[engine_name]

    for index, job in enumerate(state.queue, start=1):
        if job.request_id not in ocr_results:
            continue

        result_obj = ocr_results[job.request_id]
        if result_obj.get("status") != "queued":
            continue

        result_obj["position_in_queue"] = index
        result_obj["estimated_wait_seconds"] = _estimate_wait_seconds_locked(engine_name, index)
        result_obj["next_window_in_seconds"] = next_window
        result_obj["message"] = f"Đang chờ xử lý OCR ({engine_name}, vị trí #{index})"


def _cleanup_temp_paths(temp_paths: list[str]) -> None:
    for path in temp_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            logger.warning("Không thể xóa file tạm OCR: %s", path)


def _validate_ocr_rows(extracted_data: list[dict], db_client: Any) -> dict:
    """Đối chiếu dữ liệu OCR với học sinh trong DB và chuẩn hóa output."""
    validated_data = []
    validation_errors = []
    ocr_errors = []

    for row_index, row in enumerate(extracted_data, start=1):
        if not isinstance(row, dict):
            ocr_errors.append(f"Dòng {row_index}: Dữ liệu OCR không hợp lệ")
            continue

        raw_student_id = row.get("id", row.get("student_id", ""))
        student_id = str(raw_student_id).strip()
        if not student_id:
            validation_errors.append({
                "row": row_index,
                "error": "Không tìm thấy mã học sinh (id)",
            })
            continue

        student_resp = db_client.table("students").select(
            "id, student_id, full_name, class_name"
        ).eq("student_id", student_id).execute()

        if not student_resp.data:
            validation_errors.append({
                "row": row_index,
                "student_id": student_id,
                "error": f"Không tìm thấy học sinh {student_id} trong hệ thống",
            })
            continue

        student_info = student_resp.data[0]
        normalized_row = {
            "student_id": student_id,
            "student_db_id": student_info["id"],
            "full_name": student_info["full_name"],
            "class_name": student_info["class_name"],
            "ocr_name": row.get("ho_va_ten", row.get("full_name", "")),
        }

        for key, value in row.items():
            if key in ["id", "student_id", "ho_va_ten", "full_name"]:
                continue
            normalized_row[key] = value

        validated_data.append(normalized_row)

    return {
        "parsed_rows": validated_data,
        "validation_errors": validation_errors,
        "ocr_errors": ocr_errors,
        "total_parsed": len(extracted_data),
        "total_valid": len(validated_data),
        "total_errors": len(validation_errors) + len(ocr_errors),
    }


def _run_ocr_pipeline_sync(temp_paths: list[str], db_client: Any, engine_name: str) -> dict:
    """Pipeline OCR sync để chạy trong thread pool với engine có thể hoán đổi."""
    if engine_name == "qwen":
        from scores.ocr_services.qwen_ocr import extract_all_grades
    else:
        from scores.ocr_services.gemini_ocr import extract_all_grades

    extracted_data = extract_all_grades(temp_paths)
    return _validate_ocr_rows(extracted_data, db_client)


async def _process_ocr_job(job: OCRQueueJob) -> None:
    try:
        async with ocr_state_lock:
            if job.request_id in ocr_results:
                ocr_results[job.request_id].update({
                    "status": "processing",
                    "progress": 20,
                    "message": f"Đang xử lý OCR với {job.engine}...",
                    "started_at": datetime.now().isoformat(),
                })

        result_data = await asyncio.to_thread(
            _run_ocr_pipeline_sync,
            job.temp_paths,
            job.db_client,
            job.engine,
        )

        async with ocr_state_lock:
            if job.request_id in ocr_results:
                ocr_results[job.request_id].update({
                    "status": "completed",
                    "progress": 100,
                    "message": f"Hoàn thành OCR {job.engine}: {result_data['total_valid']} bản ghi hợp lệ",
                    "result": result_data,
                    "completed_at": datetime.now().isoformat(),
                })

    except Exception as process_error:
        logger.error("OCR processing failed for request %s: %s", job.request_id, str(process_error))
        async with ocr_state_lock:
            if job.request_id in ocr_results:
                ocr_results[job.request_id].update({
                    "status": "failed",
                    "progress": 0,
                    "message": "Xử lý OCR thất bại",
                    "error": str(process_error),
                    "failed_at": datetime.now().isoformat(),
                })

    finally:
        _cleanup_temp_paths(job.temp_paths)

        async with ocr_state_lock:
            state = ocr_engine_states.get(job.engine)
            if state and job.request_id in state.active:
                del state.active[job.request_id]
            _refresh_queued_metadata_locked(job.engine)


def _dispatch_jobs_for_engine_locked(engine_name: str) -> list[OCRQueueJob]:
    config = OCR_ENGINE_CONFIGS[engine_name]
    state = ocr_engine_states[engine_name]
    jobs_to_start: list[OCRQueueJob] = []

    available_slots = max(0, config.max_concurrent_requests - len(state.active))
    remaining_quota = max(0, config.batch_size_per_window - state.dispatched_in_window)
    dispatch_limit = min(available_slots, remaining_quota)

    if dispatch_limit <= 0 or not state.queue:
        _refresh_queued_metadata_locked(engine_name)
        return jobs_to_start

    active_teacher_keys = {job.teacher_key for job in state.active.values()}
    selected_teacher_keys: set[str] = set()
    deferred_jobs: list[OCRQueueJob] = []

    # Pass 1: ưu tiên tối đa 1 request/giáo viên cho mỗi đợt dispatch
    while state.queue and len(jobs_to_start) < dispatch_limit:
        job = state.queue.popleft()

        if job.teacher_key in active_teacher_keys or job.teacher_key in selected_teacher_keys:
            deferred_jobs.append(job)
            continue

        jobs_to_start.append(job)
        selected_teacher_keys.add(job.teacher_key)

    # Pass 2: nếu thiếu slot thì lấy request còn lại (trừ teacher đang active)
    while state.queue and len(jobs_to_start) < dispatch_limit:
        job = state.queue.popleft()
        if job.teacher_key in active_teacher_keys:
            deferred_jobs.append(job)
            continue
        jobs_to_start.append(job)

    remaining_jobs = list(state.queue)
    state.queue.clear()
    state.queue.extend(deferred_jobs)
    state.queue.extend(remaining_jobs)

    for job in jobs_to_start:
        state.active[job.request_id] = job
        state.dispatched_in_window += 1

        if job.request_id in ocr_results:
            ocr_results[job.request_id].update({
                "status": "processing",
                "progress": 10,
                "message": f"Được cấp slot {engine_name}, đang khởi chạy OCR...",
                "position_in_queue": None,
                "estimated_wait_seconds": 0,
                "next_window_in_seconds": _seconds_until_next_window(engine_name),
            })

    _refresh_queued_metadata_locked(engine_name)
    return jobs_to_start


async def _dispatch_ocr_jobs() -> None:
    """Dispatch theo queue riêng của từng engine, với quota và window độc lập."""
    jobs_to_start: list[OCRQueueJob] = []

    async with ocr_state_lock:
        for engine_name in OCR_ENGINE_CONFIGS:
            _sync_ocr_window_state_locked(engine_name)
            jobs_to_start.extend(_dispatch_jobs_for_engine_locked(engine_name))

    for job in jobs_to_start:
        asyncio.create_task(_process_ocr_job(job))


async def _ocr_dispatcher_loop() -> None:
    while True:
        try:
            await _dispatch_ocr_jobs()
        except Exception as dispatch_error:
            logger.error("OCR dispatcher loop error: %s", str(dispatch_error))

        await asyncio.sleep(1)


async def _ensure_ocr_dispatcher_running() -> None:
    global ocr_dispatcher_task

    async with ocr_state_lock:
        if ocr_dispatcher_task and not ocr_dispatcher_task.done():
            return

        ocr_dispatcher_task = asyncio.create_task(_ocr_dispatcher_loop())
        logger.info("OCR dispatcher started")



# Dependency: Get current teacher (supports both admin and teacher)
async def get_current_teacher(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Lấy thông tin giáo viên hiện tại (hỗ trợ cả admin và teacher)"""
    teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
    
    if not teacher_response.data:
        # Nếu không có record trong teachers table, tạo một mock teacher object cho admin
        if current_user.get("role") == "admin":
            return {
                "id": None,  # Admin không có teacher ID
                "user_id": current_user["id"],
                "full_name": current_user.get("full_name", ""),
                "email": current_user.get("email", ""),
                "phone": None,
                "teacher_code": None,
                "is_admin": True  # Flag để biết đây là admin
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải là giáo viên bộ môn"
            )
    
    teacher_data = teacher_response.data[0]
    teacher_data["is_admin"] = False  # Flag để biết đây là teacher thật
    return teacher_data


@router.get("/subjects")
async def get_subjects(db=Depends(get_db)):
    """Lấy danh sách môn học"""
    try:
        response = db.table("subjects").select("*").order("subject_code").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/students/{student_id}/scores")
async def get_student_scores(
    student_id: int,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    db=Depends(get_db)
):
    """Lấy điểm của học sinh"""
    try:
        query = db.table("scores").select("*").eq("student_id", student_id)
        
        if academic_year:
            query = query.eq("academic_year", academic_year)
        if semester:
            query = query.eq("semester", semester)
        
        response = query.execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting scores: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/student/{student_id}")
async def get_student_all_scores(
    student_id: int,
    academic_year: str = None,
    semester: str = None,
    db=Depends(get_db)
):
    """Lấy tất cả điểm của một học sinh (admin có thể xem)"""
    try:
        # Lấy giá trị mặc định từ system settings nếu không được cung cấp
        if academic_year is None:
            academic_year = get_current_academic_year()
        if semester is None:
            semester = get_current_semester()
        
        # Lấy thông tin học sinh (chỉ các field cần thiết)
        student = db.table("students").select("id, student_id, full_name, email, class_name, grade").eq("id", student_id).execute()
        
        if not student.data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy học sinh"
            )
        
        student_info = student.data[0]
        
        # Lấy tất cả điểm của học sinh với JOIN
        scores = db.table("scores").select("""
            *,
            class_subjects!inner(
                id,
                subjects!inner(subject_name),
                classes!inner(class_name),
                teachers!inner(full_name)
            )
        """).eq("student_id", student_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        student_scores = []
        
        if scores.data:
            for score_record in scores.data:
                class_subject = score_record.get("class_subjects", {})
                subject = class_subject.get("subjects", {})
                class_info = class_subject.get("classes", {})
                teacher = class_subject.get("teachers", {})
                
                student_scores.append({
                    "id": score_record["id"],
                    "class_subject_id": class_subject.get("id"),
                    "subject_name": subject.get("subject_name", "N/A"),
                    "class_name": class_info.get("class_name", "N/A"),
                    "teacher_name": teacher.get("full_name", "N/A"),
                    "academic_year": score_record["academic_year"],
                    "semester": score_record["semester"],
                    "score_data": score_record["score_data"],
                    "final_score": score_record["final_score"]
                })
        
        return {
            "success": True,
            "message": "Lấy điểm học sinh thành công",
            "data": {
                "student": student_info,
                "scores": student_scores,
                "academic_year": academic_year,
                "semester": semester
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student scores: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/")
async def create_score(
    score: ScoreCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Tạo điểm mới"""
    try:
        assert_can_edit_grade(current_user, db)
        score_data_dict = score.dict()
        final_score = calculate_final_grade(score_data_dict["score_data"])
        score_data_dict["final_score"] = final_score
        
        response = db.table("scores").insert(score_data_dict).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Tạo điểm thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi tạo điểm")
    except Exception as e:
        logger.error(f"Error creating score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.put("/{score_id}")
async def update_score(
    score_id: int,
    score: ScoreUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Cập nhật điểm"""
    try:
        assert_can_edit_grade(current_user, db)
        update_data = score.dict(exclude_unset=True)
        
        if "score_data" in update_data:
            update_data["final_score"] = calculate_final_grade(update_data["score_data"])
        
        response = db.table("scores").update(update_data).eq("id", score_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Cập nhật điểm thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy điểm")
    except Exception as e:
        logger.error(f"Error updating score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/teacher/info")
async def get_teacher_info(
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin giáo viên và các lớp/môn được phân công"""
    try:
        # Lấy giá trị mặc định từ system settings nếu không được cung cấp
        if academic_year is None:
            academic_year = get_current_academic_year()
        if semester is None:
            semester = get_current_semester()
        
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            return {
                "success": False,
                "message": "Bạn không phải là giáo viên bộ môn",
                "data": None
            }
        
        current_teacher = teacher_response.data[0]
        
        # Lấy các lớp-môn mà giáo viên được phân công, filter theo academic_year và semester
        query = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True)
        
        # Add filters
        query = query.eq("academic_year", academic_year).eq("semester", semester)
        
        class_subjects = query.execute()
        
        teacher_info = {
            "teacher": current_teacher,
            "assigned_classes": class_subjects.data if class_subjects.data else [],
            "grade_edit_locked": is_grade_edit_locked_for_user(current_user),
        }
        
        return {
            "success": True,
            "message": "Lấy thông tin giáo viên thành công",
            "data": teacher_info
        }
        
    except Exception as e:
        logger.error(f"Error getting teacher info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/teacher/personal-info")
async def get_personal_info(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin cá nhân đầy đủ của giáo viên (hỗ trợ cả admin)"""
    try:
        # Lấy thông tin user
        user_info = {
            "id": current_user["id"],
            "email": current_user.get("email"),
            "username": current_user.get("username"),
            "full_name": current_user.get("full_name"),
            "role": current_user.get("role")
        }
        
        # Lấy thông tin teacher
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        teacher_info = None
        if teacher_response.data:
            teacher_info = teacher_response.data[0]
        elif current_user.get("role") == "admin":
            # Tạo mock teacher info cho admin
            teacher_info = {
                "id": None,
                "user_id": current_user["id"],
                "full_name": current_user.get("full_name", ""),
                "email": current_user.get("email", ""),
                "phone": None,
                "teacher_code": None,
                "is_admin": True
            }
        
        # Lấy lớp chủ nhiệm nếu có
        homeroom_classes = []
        if teacher_info and teacher_info.get("id"):
            homeroom_response = db.table("classes").select("*").eq("homeroom_teacher_id", teacher_info["id"]).eq("is_active", True).execute()
            homeroom_classes = homeroom_response.data if homeroom_response.data else []
        
        # Lấy lớp-môn dạy nếu có
        subject_classes = []
        if teacher_info and teacher_info.get("id"):
            subject_response = db.table("class_subjects").select("""
                *,
                classes:class_id(id, class_name, grade),
                subjects:subject_id(id, subject_code, subject_name)
            """).eq("teacher_id", teacher_info["id"]).eq("is_active", True).execute()
            subject_classes = subject_response.data if subject_response.data else []
        
        personal_info = {
            "user": user_info,
            "teacher": teacher_info,
            "homeroom_classes": homeroom_classes,
            "subject_classes": subject_classes
        }
        
        return {
            "success": True,
            "message": "Lấy thông tin cá nhân thành công",
            "data": personal_info
        }
        
    except Exception as e:
        logger.error(f"Error getting personal info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/teacher/profile")
async def update_teacher_profile(
    profile_data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Cập nhật thông tin cá nhân của giáo viên (hỗ trợ cả admin)"""
    try:
        # Validate input data
        allowed_fields = ['full_name', 'email', 'phone', 'date_of_birth', 'gender']
        update_data = {}
        
        for field in allowed_fields:
            if field in profile_data:
                update_data[field] = profile_data[field]
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không có trường nào để cập nhật"
            )
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Xử lý khác nhau cho admin và teacher
        if current_teacher.get("is_admin"):
            # Admin: cập nhật trong bảng users (chỉ các cột có tồn tại)
            user_update_data = {}
            for field in allowed_fields:
                if field in profile_data and field not in ["phone", "date_of_birth", "gender"]:  # Bỏ các field không có trong users table
                    user_update_data[field] = profile_data[field]
            
            if user_update_data:
                user_update_data['updated_at'] = datetime.now().isoformat()
                response = db.table("users").update(user_update_data).eq("id", current_teacher["user_id"]).execute()
                
                if response.data:
                    return {
                        "success": True,
                        "message": "Cập nhật thông tin cá nhân thành công",
                        "data": response.data[0]
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy thông tin người dùng"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không có trường nào hợp lệ để cập nhật"
                )
        else:
            # Teacher: cập nhật trong bảng teachers
            response = db.table("teachers").update(update_data).eq("id", current_teacher["id"]).execute()
            
            if response.data:
                return {
                    "success": True,
                    "message": "Cập nhật thông tin cá nhân thành công",
                    "data": response.data[0]
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy thông tin giáo viên"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/homeroom-classes")
async def get_homeroom_classes(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách lớp chủ nhiệm của giáo viên"""
    try:
        # Lấy thông tin giáo viên
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            return {
                "success": True,
                "message": "Không phải là giáo viên",
                "data": []
            }
        
        teacher = teacher_response.data[0]
        
        # Lấy các lớp chủ nhiệm
        homeroom_classes = db.table("classes").select("*").eq("homeroom_teacher_id", teacher["id"]).eq("is_active", True).execute()
        
        return {
            "success": True,
            "message": "Lấy danh sách lớp chủ nhiệm thành công",
            "data": homeroom_classes.data
        }
        
    except Exception as e:
        logger.error(f"Error getting homeroom classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/subject-classes")
async def get_subject_classes(
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách lớp và môn học mà giáo viên đang dạy"""
    try:
        # Lấy các lớp-môn mà giáo viên được phân công
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).execute()
        
        return {
            "success": True,
            "message": "Lấy danh sách lớp-môn dạy thành công",
            "data": class_subjects.data
        }
        
    except Exception as e:
        logger.error(f"Error getting subject classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/students/{class_subject_id}")
async def get_students_by_class_subject(
    class_subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh của một lớp-môn cụ thể"""
    try:
        # Kiểm tra xem giáo viên có quyền truy cập lớp này không
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập lớp này"
            )
        
        class_subject_info = class_subject.data[0]
        
        # Lấy thông tin lớp học từ class_id
        class_data = db.table("classes").select("*").eq("id", class_subject_info["class_id"]).execute()
        
        if not class_data.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin lớp học"
            )
        
        class_info = class_data.data[0]
        
        # Lấy thông tin môn học
        subject_data = db.table("subjects").select("*").eq("id", class_subject_info["subject_id"]).execute()
        subject_info = subject_data.data[0] if subject_data.data else None
        
        # Lấy danh sách học sinh trong lớp theo class_name và grade (bao gồm subject_selected)
        students = db.table("students").select("id, student_id, full_name, class_name, grade, subject_selected, is_active").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).execute()
        
        # Filter học sinh theo subject_selected (core_subjects hoặc elective_subjects)
        filtered_students = []
        if students.data and subject_info:
            subject_code = subject_info.get("subject_code")
            
            for student in students.data:
                subject_selected = student.get("subject_selected")
                if subject_selected and isinstance(subject_selected, dict):
                    core_subjects = subject_selected.get("core_subjects", [])
                    elective_subjects = subject_selected.get("elective_subjects", [])
                    
                    # Kiểm tra xem học sinh có học môn này không
                    if subject_code in core_subjects or subject_code in elective_subjects:
                        filtered_students.append(student)
                # Nếu không có subject_selected, KHÔNG bao gồm học sinh
        else:
            # Nếu không có dữ liệu, giữ nguyên danh sách
            filtered_students = students.data or []
        
        # Lấy điểm của các học sinh cho môn này
        student_ids = [s["id"] for s in filtered_students]
        scores = db.table("scores").select("*").in_("student_id", student_ids).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        # Tạo dictionary để map điểm với học sinh
        scores_dict = {s["student_id"]: s for s in scores.data}
        
        # Combine student info with scores
        student_scores = []
        for student in filtered_students:
            student_score = {
                "student": student,
                "score": scores_dict.get(student["id"], None)
            }
            student_scores.append(student_score)
        
        return {
            "success": True,
            "message": "Lấy danh sách học sinh thành công",
            "data": {
                "class_subject": {
                    "id": class_subject_info["id"],
                    "academic_year": class_subject_info["academic_year"],
                    "semester": class_subject_info["semester"],
                    "class": class_info,
                    "subject": subject_info
                },
                "students": student_scores
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# SCORE MANAGEMENT ENDPOINTS
# ===============================================
# Note: ScoreConfig (score_column_config) đã được quản lý bởi admin module
# Admin quản lý score_column_config trực tiếp trong subjects table

@router.post("/score")
async def create_or_update_score(
    score: dict,
    current_user=Depends(get_current_user),
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo hoặc cập nhật điểm học sinh"""
    try:
        assert_can_edit_grade(current_user, db)
        from scores.models import ScoreCreate
        
        score_obj = ScoreCreate(**score)
        
        # Kiểm tra quyền truy cập class_subject
        class_subject = db.table("class_subjects").select("*").eq("id", score_obj.class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        # Lấy score_column_config từ subjects table để tính final_score
        subject_id = class_subject.data[0]["subject_id"]
        subject_resp = db.table("subjects").select("score_column_config, is_active").eq("id", subject_id).eq("is_active", True).execute()
        
        if subject_resp.data and subject_resp.data[0].get("score_column_config"):
            score_config = subject_resp.data[0]["score_column_config"]
            final_score = calculate_final_grade(score_obj.score_data, score_config)
            # logger.info(f"Final score: {final_score}")  
        else:
            final_score = 0.0
        
        # Kiểm tra xem đã có điểm chưa
        existing = db.table("scores").select("*").eq("student_id", score_obj.student_id).eq("class_subject_id", score_obj.class_subject_id).eq("academic_year", score_obj.academic_year).eq("semester", score_obj.semester).execute()
        
        if existing.data:
            # Update existing score
            update_data = {
                "score_data": score_obj.score_data,
                "final_score": final_score,
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("scores").update(update_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật điểm thành công"
        else:
            # Create new score
            score_data = {
                "student_id": score_obj.student_id,
                "class_subject_id": score_obj.class_subject_id,
                "academic_year": score_obj.academic_year,
                "semester": score_obj.semester,
                "score_data": score_obj.score_data,
                "final_score": final_score,
                "created_by": current_teacher["user_id"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("scores").insert(score_data).execute()
            message = "Tạo điểm thành công"
        
        return {
            "success": True,
            "message": message,
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/score/{student_id}/{class_subject_id}")
async def get_student_score(
    student_id: int,
    class_subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy điểm của một học sinh cho môn học cụ thể"""
    try:
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem điểm của lớp này"
            )
        
        score = db.table("scores").select("*").eq("student_id", student_id).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        if not score.data:
            return {
                "success": True,
                "message": "Chưa có điểm",
                "data": None
            }
        
        return {
            "success": True,
            "message": "Lấy điểm thành công",
            "data": score.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.delete("/score/{score_id}")
async def delete_score(
    score_id: int,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Xóa điểm"""
    try:
        # Kiểm tra quyền sở hữu
        score = db.table("scores").select("*, class_subjects!inner(teacher_id)").eq("id", score_id).execute()
        
        if not score.data or score.data[0]["class_subjects"]["teacher_id"] != current_teacher["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa điểm này"
            )
        
        response = db.table("scores").delete().eq("id", score_id).execute()
        
        return {
            "success": True,
            "message": "Xóa điểm thành công",
            "data": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# OCR ENDPOINTS
# ===============================================

@router.post("/ocr/parse-score-sheet")
async def parse_score_sheet_from_images(
    files: list[UploadFile] = File(...),
    ocr_engine: Optional[str] = Form(None),
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    temp_paths: list[str] = []

    try:
        request_id = str(uuid.uuid4())

        requested_engine = (ocr_engine or OCR_DEFAULT_ENGINE).strip().lower()
        if requested_engine not in OCR_ENGINE_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"OCR engine không hợp lệ: {requested_engine}. Hỗ trợ: {', '.join(OCR_ENGINE_CONFIGS.keys())}",
            )

        if not OCR_ALLOW_ENGINE_OVERRIDE and requested_engine != OCR_DEFAULT_ENGINE:
            raise HTTPException(
                status_code=403,
                detail=f"Hệ thống đang khóa OCR engine={OCR_DEFAULT_ENGINE}. Không cho phép override.",
            )

        engine_config = OCR_ENGINE_CONFIGS[requested_engine]

        # 1. Lưu file tạm
        for f in files:
            if not f.content_type or not f.content_type.startswith('image/'):
                continue

            fd, path = tempfile.mkstemp(suffix=f"_{f.filename}")
            with os.fdopen(fd, 'wb') as out:
                content = await f.read()
                out.write(content)
            temp_paths.append(path)

        if not temp_paths:
            raise HTTPException(status_code=400, detail="Không có file hợp lệ")

        teacher_key = str(current_teacher.get("id") or current_teacher.get("user_id") or "unknown")
        teacher_name = current_teacher.get("full_name") or "Giáo viên"

        queued_job = OCRQueueJob(
            request_id=request_id,
            teacher_key=teacher_key,
            teacher_name=teacher_name,
            engine=requested_engine,
            temp_paths=temp_paths,
            db_client=db,
            created_at=time.time(),
        )

        async with ocr_state_lock:
            _sync_ocr_window_state_locked(requested_engine)
            state = ocr_engine_states[requested_engine]

            current_load = len(state.queue) + len(state.active)
            if current_load >= engine_config.max_queue_size:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Hàng chờ OCR {requested_engine} đã đầy ({current_load}/{engine_config.max_queue_size}). Vui lòng thử lại sau."
                )

            ocr_results[request_id] = {
                "status": "queued",
                "progress": 0,
                "message": "Đã nhận ảnh, đang chờ vào lượt xử lý",
                "result": None,
                "error": None,
                "created_at": datetime.now().isoformat(),
                "position_in_queue": None,
                "estimated_wait_seconds": None,
                "next_window_in_seconds": _seconds_until_next_window(requested_engine),
                "teacher_key": teacher_key,
                "engine": requested_engine,
            }

            state.queue.append(queued_job)
            _refresh_queued_metadata_locked(requested_engine)

            queue_position = ocr_results[request_id].get("position_in_queue")
            estimated_wait_seconds = ocr_results[request_id].get("estimated_wait_seconds")
            next_window_in_seconds = ocr_results[request_id].get("next_window_in_seconds")
            queue_stats = _build_queue_stats_locked(requested_engine)

        await _ensure_ocr_dispatcher_running()

        return {
            "success": True,
            "message": "Đã thêm request vào hàng chờ OCR",
            "data": {
                "request_id": request_id,
                "status": "queued",
                "engine": requested_engine,
                "position_in_queue": queue_position,
                "estimated_wait_seconds": estimated_wait_seconds,
                "next_window_in_seconds": next_window_in_seconds,
                "queue_stats": queue_stats,
                "message": f"Đã thêm vào hàng chờ OCR {requested_engine} (vị trí #{queue_position})",
            }
        }

    except HTTPException:
        _cleanup_temp_paths(temp_paths)
        raise

    except Exception as e:
        logger.error(f"OCR enqueue error: {str(e)}")
        _cleanup_temp_paths(temp_paths)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ocr/status/{request_id}")
async def get_ocr_status(
    request_id: str,
    current_teacher=Depends(get_current_teacher)
):
    async with ocr_state_lock:
        if request_id not in ocr_results:
            raise HTTPException(status_code=404, detail="Không tìm thấy request")

        result = dict(ocr_results.get(request_id) or {})
        owner_teacher_key = str(result.get("teacher_key") or "")
        current_teacher_key = str(current_teacher.get("id") or current_teacher.get("user_id") or "")
        is_admin = bool(current_teacher.get("is_admin", False))

        if owner_teacher_key and not is_admin and current_teacher_key != owner_teacher_key:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem request OCR này")

        status_value = result.get("status")
        engine_name = result.get("engine", OCR_DEFAULT_ENGINE)

        if engine_name not in OCR_ENGINE_CONFIGS:
            engine_name = OCR_DEFAULT_ENGINE

        _sync_ocr_window_state_locked(engine_name)

        if status_value == "queued":
            queue_position = _queue_position_locked(engine_name, request_id)
            if queue_position is not None:
                result["position_in_queue"] = queue_position
                result["estimated_wait_seconds"] = _estimate_wait_seconds_locked(engine_name, queue_position)

            result["next_window_in_seconds"] = _seconds_until_next_window(engine_name)
            result["message"] = result.get("message") or "Đang chờ trong hàng đợi OCR"

        elif status_value == "processing":
            result["message"] = result.get("message") or "Đang xử lý OCR"
            result["next_window_in_seconds"] = _seconds_until_next_window(engine_name)

        result["queue_stats"] = _build_queue_stats_locked(engine_name)

    return {
        "success": True,
        "data": {
            "request_id": request_id,
            "status": status_value,
            "engine": engine_name,
            "progress": result.get("progress", 0),
            "message": result.get("message", ""),
            "position_in_queue": result.get("position_in_queue"),
            "estimated_wait_seconds": result.get("estimated_wait_seconds"),
            "next_window_in_seconds": result.get("next_window_in_seconds"),
            "result": result.get("result"),
            "error": result.get("error"),
            "queue_stats": result.get("queue_stats"),
            "created_at": result.get("created_at"),
            "started_at": result.get("started_at"),
            "completed_at": result.get("completed_at"),
        }
    }


# ===============================================
# ANALYTICS & TREND ENDPOINTS
# ===============================================

# @router.get("/score-trend/{student_id}/{class_subject_id}")
# async def get_student_score_trend(
#     student_id: int,
#     class_subject_id: int,
#     academic_year: str,
#     semester: str,
#     current_teacher=Depends(get_current_teacher),
#     db=Depends(get_db)
# ):
#     """Phân tích xu hướng điểm cho một học sinh trong một môn.

#     Dựa trên dữ liệu `score_data` và `score_config` của môn để ước lượng
#     xu hướng tăng/giảm/ổn định, trả về cả mô tả ngắn gọn cho UI.
#     """
#     try:
#         from scores.services import analyze_grade_trend
        
#         # Quyền truy cập
#         class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
#         if not class_subject.data:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Bạn không có quyền xem điểm của lớp này"
#             )

#         # Lấy điểm và cấu hình cột điểm
#         score_resp = db.table("scores").select("*").eq("student_id", student_id).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
#         if not score_resp.data:
#             return {
#                 "success": True,
#                 "message": "Chưa có điểm",
#                 "data": {
#                     "direction": "stable",
#                     "slope": 0,
#                     "confidence": 0,
#                     "reason": "Chưa có dữ liệu điểm"
#                 }
#             }

#         subject_id = class_subject.data[0]["subject_id"]
#         settings_resp = db.table("grade_settings").select("*").eq("subject_id", subject_id).eq("is_active", True).execute()
#         score_config = settings_resp.data[0]["score_column_config"] if settings_resp.data else None

#         score_record = score_resp.data[0]
#         trend = analyze_grade_trend(score_record.get("score_data", {}), score_config)

#         # Chuẩn hóa payload cho UI
#         color = "#16A34A" if trend["direction"] == "up" else ("#DC2626" if trend["direction"] == "down" else "#6B7280")
#         label = "Tăng" if trend["direction"] == "up" else ("Giảm" if trend["direction"] == "down" else "Ổn định")

#         return {
#             "success": True,
#             "message": "Phân tích xu hướng thành công",
#             "data": {
#                 "direction": trend["direction"],
#                 "label": label,
#                 "color": color,
#                 "slope": trend["slope"],
#                 "confidence": trend["confidence"],
#                 "reason": trend["reason"],
#                 "ordered_points": trend["ordered_points"],
#                 "final_score": score_record.get("final_score")
#             }
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error analyzing score trend: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/classes")
async def get_teacher_classes(
    academic_year: str = None,
    semester: str = None,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Lấy danh sách các lớp mà giáo viên đang dạy
    Dùng để tạo dropdown filter cho dashboard
    """
    try:
        # Lấy giá trị mặc định từ system settings nếu không được cung cấp
        if academic_year is None:
            academic_year = get_current_academic_year()
        if semester is None:
            semester = get_current_semester()
        
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        if not class_subjects.data:
            return {
                "success": True,
                "message": "Chưa có lớp được phân công",
                "data": []
            }
        
        # Tạo danh sách unique classes
        classes_dict = {}
        for cs in class_subjects.data:
            if cs.get("classes"):
                class_id = cs["classes"]["id"]
                if class_id not in classes_dict:
                    classes_dict[class_id] = {
                        "class_id": class_id,
                        "class_name": cs["classes"]["class_name"],
                        "grade": cs["classes"]["grade"],
                        "subjects": []
                    }
                
                # Thêm môn học vào lớp
                if cs.get("subjects"):
                    classes_dict[class_id]["subjects"].append({
                        "subject_id": cs["subjects"]["id"],
                        "subject_name": cs["subjects"]["subject_name"],
                        "subject_code": cs["subjects"]["subject_code"]
                    })
        
        classes_list = sorted(list(classes_dict.values()), key=lambda x: (x["grade"], x["class_name"]))
        
        return {
            "success": True,
            "message": f"Lấy danh sách lớp-môn dạy thành công",
            "data": class_subjects.data  # Trả về raw data để frontend tự xử lý
        }
        
    except Exception as e:
        logger.error(f"Error getting teacher classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/dashboard/analytics")
async def get_teacher_dashboard_analytics(
    academic_year: str = None,
    semester: str = None,
    class_id: Optional[int] = None,  # Thêm tham số filter theo lớp
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Lấy dữ liệu phân tích tổng hợp cho dashboard giáo viên bộ môn
    Bao gồm: tổng quan, phân nhóm học lực, xu hướng, top students, etc.
    
    Parameters:
    - class_id (optional): Filter theo lớp cụ thể. Nếu không truyền, hiển thị tất cả các lớp
    """
    try:
        # Lấy giá trị mặc định từ system settings nếu không được cung cấp
        if academic_year is None:
            academic_year = get_current_academic_year()
        if semester is None:
            semester = get_current_semester()
        
        # Lấy các lớp-môn mà giáo viên dạy
        query = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).eq("academic_year", academic_year).eq("semester", semester)
        
        # Filter theo class_id nếu có
        if class_id:
            query = query.eq("class_id", class_id)
        
        class_subjects = query.execute()
        
        if not class_subjects.data:
            return {
                "success": True,
                "message": "Chưa có lớp-môn được phân công",
                "data": {
                    "total_classes": 0,
                    "total_students": 0,
                    "overview": {},
                    "performance_groups": {},
                    "class_comparison": [],
                    "students_need_attention": [],
                    "top_students": []
                }
            }
        
        # Thu thập tất cả điểm số
        class_subject_ids = [cs["id"] for cs in class_subjects.data]
        
        all_grades = db.table("scores").select("""
            *,
            students:student_id(id, student_id, full_name, class_name, grade),
            class_subjects!inner(
                id,
                classes:class_id(class_name, grade),
                subjects:subject_id(subject_name)
            )
        """).in_("class_subject_id", class_subject_ids).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        scores_data = all_grades.data if all_grades.data else []
        
        # === TỔNG QUAN ===
        total_students_with_scores = len(scores_data)
        # Chỉ tính với các điểm số (bỏ qua giá trị chữ như "Đ", "KĐ")
        # Convert string numbers to float if possible
        numeric_scores = []
        for g in scores_data:
            final_score = g.get("final_score")
            if final_score is None:
                continue
            # Check if numeric (int, float, or string number)
            if isinstance(final_score, (int, float)):
                numeric_scores.append(final_score)
            elif isinstance(final_score, str):
                try:
                    numeric_scores.append(float(final_score))
                except (ValueError, TypeError):
                    pass  # Ignore non-numeric strings like "Đ", "KĐ"
        average_score = sum(numeric_scores) / len(numeric_scores) if len(numeric_scores) > 0 else 0
        
        # Lấy tổng số học sinh trong các lớp dạy
        total_students_count = 0
        for cs in class_subjects.data:
            if cs.get("classes"):
                students_in_class = db.table("students").select("id").eq("class_name", cs["classes"]["class_name"]).eq("grade", cs["classes"]["grade"]).eq("is_active", True).execute()
                total_students_count += len(students_in_class.data) if students_in_class.data else 0
        
        # === PHÂN NHÓM HỌC LỰC (theo tiêu chuẩn giáo dục VN) ===
        excellent = []  # Giỏi: 8.0 - 10
        good = []       # Khá: 6.5 - 7.9
        average = []    # Trung bình: 5.0 - 6.4
        weak = []       # Yếu: 3.5 - 4.9
        poor = []       # Kém: < 3.5
        
        for score in scores_data:
            final_score = score.get("final_score")
            if final_score is None:
                continue
            
            # Convert to float if string, skip if not convertible
            if isinstance(final_score, str):
                try:
                    final_score = float(final_score)
                except (ValueError, TypeError):
                    continue  # Ignore non-numeric strings like "Đ", "KĐ"
            elif not isinstance(final_score, (int, float)):
                continue  # Skip other non-numeric types
            
            # Now we can safely compare
            if final_score >= 8.0:
                excellent.append(score)
            elif final_score >= 6.5:
                good.append(score)
            elif final_score >= 5.0:
                average.append(score)
            elif final_score >= 3.5:
                weak.append(score)
            else:
                poor.append(score)
        
        performance_groups = {
            "excellent": {
                "count": len(excellent),
                "percentage": round(len(excellent) * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0,
                "label": "Giỏi (8.0 - 10)",
                "color": "#059669"
            },
            "good": {
                "count": len(good),
                "percentage": round(len(good) * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0,
                "label": "Khá (6.5 - 7.9)",
                "color": "#2563EB"
            },
            "average": {
                "count": len(average),
                "percentage": round(len(average) * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0,
                "label": "Trung bình (5.0 - 6.4)",
                "color": "#D97706"
            },
            "weak": {
                "count": len(weak),
                "percentage": round(len(weak) * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0,
                "label": "Yếu (3.5 - 4.9)",
                "color": "#EA580C"
            },
            "poor": {
                "count": len(poor),
                "percentage": round(len(poor) * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0,
                "label": "Kém (< 3.5)",
                "color": "#DC2626"
            }
        }
        
        # === SO SÁNH GIỮA CÁC LỚP ===
        class_comparison = []
        class_scores_map = {}
        
        for score in scores_data:
            # Chỉ xử lý điểm số (bỏ qua giá trị chữ như "Đ", "KĐ")
            final_score = score.get("final_score")
            if final_score is None:
                continue
            # Convert to float if string
            if isinstance(final_score, str):
                try:
                    final_score = float(final_score)
                except (ValueError, TypeError):
                    continue  # Ignore non-numeric strings like "Đ", "KĐ"
            
            class_name = score["class_subjects"]["classes"]["class_name"]
            if class_name not in class_scores_map:
                class_scores_map[class_name] = []
            class_scores_map[class_name].append(final_score)
        
        for class_name, scores_list in class_scores_map.items():
            # All scores in list are already validated and converted to numeric in the loop above
            # Double-check to ensure all are numeric before processing
            valid_scores = []
            for s in scores_list:
                if s is None:
                    continue
                if isinstance(s, str):
                    try:
                        valid_scores.append(float(s))
                    except (ValueError, TypeError):
                        continue
                elif isinstance(s, (int, float)):
                    valid_scores.append(s)
            
            if valid_scores:
                avg = sum(valid_scores) / len(valid_scores)
                highest = max(valid_scores)
                lowest = min(valid_scores)
                
                class_comparison.append({
                    "class_name": class_name,
                    "student_count": len(valid_scores),
                    "average_score": round(avg, 2),
                    "highest_score": round(highest, 2),
                    "lowest_score": round(lowest, 2),
                    "pass_rate": round(sum(1 for s in valid_scores if s >= 5.0) * 100 / len(valid_scores), 2)
                })
        
        # Sắp xếp theo điểm trung bình giảm dần
        class_comparison.sort(key=lambda x: x["average_score"], reverse=True)
        
        # === HỌC SINH CẦN QUAN TÂM (điểm yếu và kém) ===
        students_need_attention = []
        for score in weak + poor:
            student_info = score.get("students", {})
            class_info = score.get("class_subjects", {}).get("classes", {})
            
            # Helper để xác định category (Kém hoặc Yếu)
            final_score = score.get("final_score")
            numeric_grade = None
            if isinstance(final_score, (int, float)):
                numeric_grade = final_score
            elif isinstance(final_score, str):
                try:
                    numeric_grade = float(final_score)
                except (ValueError, TypeError):
                    numeric_grade = None
            
            category = "Yếu"  # default
            if numeric_grade is not None and numeric_grade < 3.5:
                category = "Kém"
            
            students_need_attention.append({
                "student_id": student_info.get("student_id"),
                "student_name": student_info.get("full_name"),
                "class_name": class_info.get("class_name"),
                "final_score": score.get("final_score"),
                "category": category,
                "score_data": score.get("score_data", {})
            })
        
        # Sắp xếp theo điểm tăng dần (yếu nhất lên đầu)
        def get_sort_key(item):
            final_score = item["final_score"]
            if final_score is None:
                return 0
            if isinstance(final_score, (int, float)):
                return final_score
            if isinstance(final_score, str):
                try:
                    return float(final_score)
                except (ValueError, TypeError):
                    return 0
            return 0
        
        students_need_attention.sort(key=get_sort_key)
        
        # === TOP HỌC SINH XUẤT SẮC ===
        # Sort key helper để xử lý TEXT column
        def top_student_sort_key(x):
            final_score = x.get("final_score", 0)
            if isinstance(final_score, (int, float)):
                return final_score
            if isinstance(final_score, str):
                try:
                    return float(final_score)
                except (ValueError, TypeError):
                    return 0
            return 0
        
        top_students = []
        for score in sorted(excellent, key=top_student_sort_key, reverse=True)[:10]:
            student_info = score.get("students", {})
            class_info = score.get("class_subjects", {}).get("classes", {})
            
            top_students.append({
                "student_id": student_info.get("student_id"),
                "student_name": student_info.get("full_name"),
                "class_name": class_info.get("class_name"),
                "final_score": score.get("final_score"),
                "score_data": score.get("score_data", {})
            })
        
        # === PHÂN BỐ ĐIỂM SỐ (Distribution) ===
        # Helper function to safely convert score to float (handle TEXT column type)
        def get_numeric_score(score_data):
            final_score = score_data.get("final_score")
            if final_score is None:
                return None
            if isinstance(final_score, (int, float)):
                return final_score
            if isinstance(final_score, str):
                try:
                    return float(final_score)
                except (ValueError, TypeError):
                    return None
            return None
        
        # Check if all scores are letter grades (Đ/KĐ)
        letter_score_count = 0
        for s in scores_data:
            final_score = s.get("final_score")
            if isinstance(final_score, str) and final_score in ['Đ', 'KĐ']:
                letter_score_count += 1
        
        is_all_letter_grades = letter_score_count == total_students_with_scores and total_students_with_scores > 0
        
        if is_all_letter_grades:
            # Trường hợp môn học với toàn điểm chữ (vd: GDTC)
            score_distribution = {
                "Đ (Đạt)": letter_score_count,  # Tất cả đạt
                "KĐ (Không đạt)": total_students_with_scores - letter_score_count,  # Không đạt
            }
            
            # Count Đ and KĐ
            pass_count = len([s for s in scores_data if s.get("final_score") == 'Đ'])
            fail_count = len([s for s in scores_data if s.get("final_score") == 'KĐ'])
        else:
            # Trường hợp môn học với điểm số
            score_distribution = {
                "9-10": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and sc >= 9]),
                "8-9": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and 8 <= sc < 9]),
                "7-8": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and 7 <= sc < 8]),
                "6-7": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and 6 <= sc < 7]),
                "5-6": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and 5 <= sc < 6]),
                "4-5": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and 4 <= sc < 5]),
                "0-4": len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and sc < 4])
            }
            
            # === THỐNG KÊ ĐẠT/KHÔNG ĐẠT ===
            pass_count = len([s for s in scores_data if (sc := get_numeric_score(s)) is not None and sc >= 5.0])
            fail_count = total_students_with_scores - pass_count
        
        analytics_data = {
            "academic_year": academic_year,
            "semester": semester,
            "class_filter": class_id,  # Thêm thông tin về class filter
            "total_classes": len(class_subjects.data),
            "total_students": total_students_count,
            "students_with_scores": total_students_with_scores,
            "students_without_scores": total_students_count - total_students_with_scores,
            "is_letter_grade_subject": is_all_letter_grades,  # Flag để frontend biết loại điểm
            "overview": {
                "average_score": round(average_score, 2) if numeric_scores else 0,
                "highest_score": round(max(numeric_scores), 2) if numeric_scores else 0,
                "lowest_score": round(min([s for s in numeric_scores if s > 0]), 2) if numeric_scores else 0,
                "pass_count": pass_count,
                "fail_count": fail_count,
                "pass_rate": round(pass_count * 100 / total_students_with_scores, 2) if total_students_with_scores > 0 else 0
            },
            "performance_groups": performance_groups,
            "score_distribution": score_distribution,
            "class_comparison": class_comparison,
            "students_need_attention": students_need_attention[:20],  # Top 20
            "top_students": top_students,
            "subjects": list(set([cs["subjects"]["subject_name"] for cs in class_subjects.data if cs.get("subjects")])),
            "classes_list": [  # Thêm danh sách các lớp để frontend tạo dropdown filter
                {
                    "class_id": cs["classes"]["id"],
                    "class_name": cs["classes"]["class_name"],
                    "grade": cs["classes"]["grade"]
                }
                for cs in class_subjects.data if cs.get("classes")
            ] if not class_id else None  # Chỉ trả về khi xem tổng hợp
        }
        
        return {
            "success": True,
            "message": "Lấy dữ liệu phân tích thành công",
            "data": analytics_data
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/template/download/{class_subject_id}")
async def download_score_template(
    class_subject_id: int,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Download template Excel để nhập điểm hàng loạt - supports nested columns"""
    try:
        import xlsxwriter
        import io
        from fastapi.responses import StreamingResponse
        
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập lớp này"
            )
        
        class_subject_info = class_subject.data[0]
        class_info = class_subject_info["classes"]
        subject_info = class_subject_info["subjects"]
        
        # Get score_column_config from subjects table
        subject_response = db.table("subjects").select("score_column_config, is_active").eq(
            "id", subject_info["id"]
        ).eq("is_active", True).execute()
        
        # Helper function to flatten nested columns with proper ordering
        def flatten_score_columns(score_column_config):
            """Extract all column keys (child columns from nested structure) in correct order"""
            if not score_column_config:
                return []
            
            # Define priority order for sorting
            priority_order = {
                'Diem_thuong_xuyen': 1,
                'diem_thuong_xuyen': 1,
                'diem_tx': 1,
                'Diem_thi_giua_ki': 2,
                'diem_thi_giua_ki': 2,
                'diem_gk': 2,
                'Diem_thi_cuoi_ki': 3,
                'diem_thi_cuoi_ki': 3,
                'diem_ck': 3,
            }
            
            # Sort parent columns first
            sorted_columns = sorted(
                score_column_config.items(),
                key=lambda x: priority_order.get(x[0], 999)
            )
            
            # Flatten while maintaining order
            flat_columns = []
            for column_name, column_config in sorted_columns:
                # Check if column has nested data (children)
                if isinstance(column_config, dict) and 'data' in column_config:
                    # Add all child column keys in order
                    child_items = list(column_config['data'].items())
                    # Sort children if they have numeric suffixes (tx1, tx2, tx3, tx4)
                    child_items.sort(key=lambda x: x[0])
                    for child_key, _ in child_items:
                        flat_columns.append(child_key)
                else:
                    # Regular column without children
                    flat_columns.append(column_name)
            
            return flat_columns
        
        # Determine column headers
        if subject_response.data and subject_response.data[0].get("score_column_config"):
            score_config = subject_response.data[0].get("score_column_config", {})
            score_columns = flatten_score_columns(score_config)
        else:
            # Fallback to default columns if no score_column_config
            score_columns = ['diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        
        # Lấy danh sách học sinh (bao gồm subject_selected)
        students = db.table("students").select("id, student_id, full_name, class_name, grade, subject_selected, is_active").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).order("student_id").execute()
        
        # Filter học sinh theo subject_selected
        filtered_students = []
        if students.data and subject_info:
            subject_code = subject_info.get("subject_code")
            
            for student in students.data:
                subject_selected = student.get("subject_selected")
                if subject_selected and isinstance(subject_selected, dict):
                    core_subjects = subject_selected.get("core_subjects", [])
                    elective_subjects = subject_selected.get("elective_subjects", [])
                    
                    # Kiểm tra xem học sinh có học môn này không
                    if subject_code in core_subjects or subject_code in elective_subjects:
                        filtered_students.append(student)
        else:
            # Nếu không có dữ liệu, giữ nguyên danh sách
            filtered_students = students.data or []
        
        # Tạo file Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Bảng điểm')
        
               # Tính toán kích thước cột để fit vào A4
        # A4 width: Portrait = 8.5 inches, Landscape = 11 inches
        # Margins: 0.5 inches mỗi bên
        # Usable width: Portrait = 7.5 inches, Landscape = 10 inches
        # Character unit = ~0.12 inches, so:
        # Portrait capacity: ~62 units, Landscape capacity: ~83 units
        
        id_width = 10  # Mã HS
        name_width = 22  # Họ và tên
        base_width = id_width + name_width  # Base columns width
        
        num_score_columns = len(score_columns)
        
        # Determine orientation based on total columns needed
        # If too many columns, use landscape
        portrait_capacity = 62
        landscape_capacity = 83
        
        estimated_width = base_width + (num_score_columns * 12)  # Initial estimate with 12-unit score columns
        
        is_landscape = estimated_width > portrait_capacity
        available_width = landscape_capacity if is_landscape else portrait_capacity
        
        # Calculate actual score column width to fit in page
        remaining_width = available_width - base_width
        score_column_width = max(8, int(remaining_width / max(num_score_columns, 1)))  # Minimum 8 units
        
        # Set page setup
        worksheet.set_paper(9)  # A4
        worksheet.set_portrait() if not is_landscape else worksheet.set_landscape()
        worksheet.set_margins(
            left=0.5,
            right=0.5,
            top=0.5,
            bottom=0.5
        )
        
        # Fit to page width
        worksheet.fit_to_pages(1, 0)  # Fit width to 1 page, unlimited pages height
        
        # Định dạng - Toàn bộ trắng để dễ OCR
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': 'white',
            'font_color': 'black',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'text_wrap': True
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': 'white',
            'text_wrap': True
        })
        
        # Header - Dynamic based on score settings
        headers = ['id', 'ho_va_ten'] + score_columns
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Set header row height
        worksheet.set_row(0, 30)
        
        # Dữ liệu học sinh (chỉ những học sinh có học môn này)
        for row, student in enumerate(filtered_students, start=1):
            worksheet.write(row, 0, student['student_id'], cell_format)
            worksheet.write(row, 1, student['full_name'], cell_format)
            # Empty cells for all score columns
            for col_idx in range(len(score_columns)):
                worksheet.write(row, col_idx + 2, '', cell_format)
            
            # Set data row height (2x normal - approximately 30 for data rows)
            worksheet.set_row(row, 30)
        
        # Điều chỉnh độ rộng cột để fit vào A4
        worksheet.set_column('A:A', id_width)  # Mã HS
        worksheet.set_column('B:B', name_width)  # Họ và tên
        # Set dynamic width for all score columns
        if score_columns:
            last_col_letter = chr(ord('C') + len(score_columns) - 1)
            worksheet.set_column(f'C:{last_col_letter}', score_column_width)
        
        # Định dạng - Toàn bộ trắng để dễ OCR
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': 'white',
            'font_color': 'black',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': 'white'
        })
        
        # Header - Dynamic based on score settings
        headers = ['id', 'ho_va_ten'] + score_columns
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Dữ liệu học sinh (chỉ những học sinh có học môn này)
        for row, student in enumerate(filtered_students, start=1):
            worksheet.write(row, 0, student['student_id'], cell_format)
            worksheet.write(row, 1, student['full_name'], cell_format)
            # Empty cells for all score columns
            for col_idx in range(len(score_columns)):
                worksheet.write(row, col_idx + 2, '', cell_format)
        
        # Điều chỉnh độ rộng cột
        worksheet.set_column('A:A', 12)  # id
        worksheet.set_column('B:B', 25)  # họ và tên
        # Set width for all score columns dynamically
        if score_columns:
            last_col_letter = chr(ord('C') + len(score_columns) - 1)
            worksheet.set_column(f'C:{last_col_letter}', 15)
        
        workbook.close()
        output.seek(0)
        
        # Tên file - encode properly for Content-Disposition header
        filename = f"Template_Diem_{class_info['class_name']}_{subject_info['subject_name']}_{len(filtered_students)}HS.xlsx"
        from urllib.parse import quote
        encoded_filename = quote(filename, encoding='utf-8')
        ascii_filename = filename.encode('ascii', errors='replace').decode('ascii')
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error generating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.post("/bulk-import")
async def bulk_import_grades(
    import_data: dict,
    current_user=Depends(get_current_user),
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Nhập điểm hàng loạt từ file Excel/CSV"""
    try:
        assert_can_edit_grade(current_user, db)
        class_subject_id = import_data.get("class_subject_id")
        scores_data = import_data.get("scores", []) or import_data.get("grades", [])  # Backward compatibility: support both "scores" and "grades"
        
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        subject_id = class_subject.data[0]["subject_id"]
        
        # Lấy thông tin subject để thêm Mon_hoc vào score_data
        subject_info = db.table("subjects").select("subject_name").eq("id", subject_id).execute()
        subject_name = subject_info.data[0]["subject_name"] if subject_info.data else ""
        
        # Lấy giá trị mặc định từ system settings
        academic_year = import_data.get("academic_year") or get_current_academic_year()
        semester = import_data.get("semester") or get_current_semester()
        
        # Lấy score_column_config từ subjects table
        subject_resp = db.table("subjects").select("score_column_config, is_active").eq("id", subject_id).eq("is_active", True).execute()
        
        if not subject_resp.data or not subject_resp.data[0].get("score_column_config"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chưa có cấu hình cột điểm (score_column_config) cho môn này. Vui lòng cấu hình trong subjects trước khi import."
            )
        
        score_column_config = subject_resp.data[0].get("score_column_config")
        
        if not score_column_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cấu hình cột điểm không hợp lệ"
            )
        
        imported_count = 0
        errors = []
        
        # Helper function to normalize score values (support both numbers and letter scores)
        def normalize_score_value(value):
            """
            Convert raw value to either float (numeric score) or string (letter score: Đ/KĐ)
            Returns: (normalized_value, is_valid)
            """
            if value is None or value == '':
                return None, True
            
            # Convert to string and normalize
            value_str = str(value).strip().upper()
            
            # Check for letter grades (Đ - Pass)
            if value_str in ['Đ', 'D', 'DAT', 'ĐẠT']:
                return 'Đ', True
            
            # Check for letter grades (KĐ - Not Pass)
            if value_str in ['KĐ', 'KD', 'KHONG_DAT', 'KHÔNG_ĐẠT', 'KHONGDAT', 'KHÔNG ĐẠT']:
                return 'KĐ', True
            
            # Try to parse as number
            try:
                numeric_value = float(value)
                if 0 <= numeric_value <= 10:
                    return numeric_value, True
                else:
                    return None, False
            except (ValueError, TypeError):
                return None, False
        
        # Build column mapping from score_column_config (dynamic)
        def get_column_mapping(score_column_config):
            """Generate mapping from import column names to score_column_config structure"""
            mapping = {}
            
            # Flatten the score_column_config to get all column names
            for column_name, column_config in score_column_config.items():
                if isinstance(column_config, dict) and 'data' in column_config:
                    # Parent column with children
                    for child_key in column_config['data'].keys():
                        mapping[child_key] = (column_name, child_key)
                else:
                    # Regular column
                    mapping[column_name] = (None, column_name)
            
            return mapping
        
        column_mapping = get_column_mapping(score_column_config)
        
        for score_record in scores_data:
            try:
                student_id = score_record.get("student_id")
                if not student_id:
                    continue
                
                # Lookup student từ DB để lấy database ID
                student = db.table("students").select("id, student_id, full_name").eq("student_id", student_id).execute()
                
                if not student.data:
                    errors.append(f"Không tìm thấy học sinh với ID: {student_id}")
                    continue
                
                student_db_id = student.data[0]['id']
                
                # Transform data từ flat structure thành nested structure với He_so
                score_data = {}
                
                # Process all columns from the import data
                for import_col_name, import_value in score_record.items():
                    if import_col_name in ['student_id', 'ho_va_ten']:
                        continue  # Skip student info columns
                    
                    # Normalize the score value
                    normalized_value, is_valid = normalize_score_value(import_value)
                    
                    if not is_valid:
                        errors.append(
                            f"Học sinh {student_id}: Điểm {import_col_name} không hợp lệ ({import_value}). "
                            f"Phải là số (0-10) hoặc Đ/KĐ."
                        )
                        continue
                    
                    if normalized_value is None:
                        continue  # Skip empty values
                    
                    # Find the config for this column
                    if import_col_name in column_mapping:
                        parent_col, child_col = column_mapping[import_col_name]
                        
                        if parent_col:
                            # This is a child column - save as flat structure with child name as key
                            # Ví dụ: Diem_tx1, Diem_tx2 thay vì Diem_thuong_xuyen->Diem_tx1
                            score_data[child_col] = {
                                'He_so': score_column_config[parent_col]['data'][child_col].get('he_so', 1),
                                'Diem': normalized_value
                            }
                        else:
                            # This is a regular column
                            score_data[import_col_name] = {
                                'He_so': score_column_config[import_col_name].get('he_so', 1),
                                'Diem': normalized_value
                            }
                    else:
                        # Xử lý các cột không có trong mapping (vd: Diem_tx1, Diem_tx2, Diem_tx3, Diem_tx4)
                        # Các cột Diem_tx* được coi là children của Diem_thuong_xuyen
                        if import_col_name.startswith('Diem_tx'):
                            # Tìm he_so từ Diem_thuong_xuyen config (nếu tồn tại)
                            he_so = 1  # Default
                            if 'Diem_thuong_xuyen' in score_column_config:
                                he_so = score_column_config['Diem_thuong_xuyen'].get('he_so', 1)
                            
                            score_data[import_col_name] = {
                                'He_so': he_so,
                                'Diem': normalized_value
                            }
                        # Bỏ qua các cột khác không có trong mapping
                
                # Thêm Mon_hoc vào score_data
                score_data['Mon_hoc'] = subject_name
                
                # Tính final score với transformed data
                final_score = calculate_final_grade(score_data, score_column_config)
                
                # Upsert score (sử dụng student_db_id thay vì student_id string)
                existing = db.table("scores").select("id").eq("student_id", student_db_id).eq("class_subject_id", class_subject_id).execute()
                
                if existing.data:
                    # Update existing
                    db.table("scores").update({
                        "score_data": score_data,
                        "final_score": final_score,
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", existing.data[0]["id"]).execute()
                else:
                    # Create new (sử dụng student_db_id)
                    db.table("scores").insert({
                        "student_id": student_db_id,
                        "class_subject_id": class_subject_id,
                        "academic_year": academic_year,
                        "semester": semester,
                        "score_data": score_data,
                        "final_score": final_score,
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }).execute()
                
                imported_count += 1
                
            except Exception as e:
                logger.error(f"Error importing score for student {score_record.get('student_id', 'N/A')}: {str(e)}")
                errors.append(f"Lỗi nhập điểm cho học sinh {score_record.get('student_id', 'N/A')}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Nhập điểm thành công {imported_count}/{len(scores_data)} học sinh",
            "data": {
                "success_count": imported_count,
                "error_count": len(errors),
                "total_count": len(scores_data),
                "errors": errors
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error bulk importing grades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.get("/ocr/queue-stats")
async def get_queue_stats(
    engine: Optional[str] = None,
    current_teacher=Depends(get_current_teacher)
):
    """Lấy thống kê queue OCR"""
    try:
        requested_engine = engine.strip().lower() if engine else None
        if requested_engine and requested_engine not in OCR_ENGINE_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Engine không hợp lệ: {requested_engine}",
            )

        async with ocr_state_lock:
            if requested_engine:
                _sync_ocr_window_state_locked(requested_engine)
            else:
                for engine_name in OCR_ENGINE_CONFIGS:
                    _sync_ocr_window_state_locked(engine_name)

            stats = _build_queue_stats_locked(requested_engine)
        
        return {
            "success": True,
            "message": "Lấy thống kê queue thành công",
            "data": {
                'queue_stats': stats,
                'config': {
                    name: {
                        'max_concurrent': config.max_concurrent_requests,
                        'max_queue_size': config.max_queue_size,
                        'batch_per_window': config.batch_size_per_window,
                        'window_seconds': config.window_seconds,
                        'average_processing_seconds': config.average_processing_seconds,
                    }
                    for name, config in OCR_ENGINE_CONFIGS.items()
                },
                'default_engine': OCR_DEFAULT_ENGINE,
                'allow_engine_override': OCR_ALLOW_ENGINE_OVERRIDE,
            }
        }

    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"ERROR: Error getting queue stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.post("/ocr/import-from-parsed")
async def import_grades_from_parsed_ocr(
    import_data: dict,
    current_user=Depends(get_current_user),
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Import điểm từ dữ liệu đã parse bởi OCR (sau khi review)
    Tái sử dụng logic bulk_import_grades
    """
    return await bulk_import_grades(import_data, current_user, current_teacher, db)


@router.post("/ocr/export-parsed-to-excel")
async def export_parsed_ocr_to_excel(
    data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Export dữ liệu đã parse từ OCR ra file Excel để người dùng tải về.
    Ưu tiên thứ tự cột điểm theo cấu hình môn học để giống template xuất điểm.
    """
    try:
        import xlsxwriter
        import io
        from fastapi.responses import StreamingResponse
        
        parsed_rows = data.get("parsed_rows", [])
        class_subject_id = data.get("class_subject_id")
        requested_score_columns = data.get("score_columns", [])

        if not isinstance(parsed_rows, list):
            raise HTTPException(
                status_code=400,
                detail="Dữ liệu export không hợp lệ"
            )

        parsed_rows = [row for row in parsed_rows if isinstance(row, dict)]

        if not parsed_rows:
            raise HTTPException(
                status_code=400,
                detail="Không có dữ liệu để export"
            )

        def normalize_key(key: str) -> str:
            return re.sub(r"[^a-z0-9]", "", str(key).lower())

        def flatten_score_columns(score_column_config: dict) -> list[str]:
            """Làm phẳng score_column_config theo đúng thứ tự template download."""
            if not score_column_config:
                return []

            priority_order = {
                "diem_thuong_xuyen": 1,
                "diem_tx": 1,
                "diem_thi_giua_ki": 2,
                "diem_gk": 2,
                "diem_thi_cuoi_ki": 3,
                "diem_ck": 3,
            }

            sorted_columns = sorted(
                score_column_config.items(),
                key=lambda item: priority_order.get(str(item[0]).lower(), 999)
            )

            flattened: list[str] = []
            for column_name, column_config in sorted_columns:
                if isinstance(column_config, dict) and "data" in column_config:
                    child_keys = list(column_config["data"].keys())
                    child_keys.sort(key=lambda item: str(item).lower())
                    flattened.extend(child_keys)
                else:
                    flattened.append(column_name)

            return flattened

        def infer_score_columns(rows: list[dict]) -> list[str]:
            excluded = {
                "id",
                "studentid",
                "studentdbid",
                "hovaten",
                "fullname",
                "classname",
                "lop",
                "ocrname",
            }

            found_columns: list[str] = []
            seen: set[str] = set()

            for row in rows:
                for key in row.keys():
                    normalized = normalize_key(key)
                    if not normalized or normalized in excluded or normalized in seen:
                        continue
                    seen.add(normalized)
                    found_columns.append(str(key))

            def sort_key(column: str) -> tuple[int, int, str]:
                normalized = normalize_key(column)
                lowered = str(column).lower()

                tx_match = re.search(r"(?:diem)?tx(\d+)", normalized)
                if normalized.startswith("diemtx") or "thuongxuyen" in normalized:
                    return (1, int(tx_match.group(1)) if tx_match else 0, lowered)
                if "giuaki" in normalized or normalized.endswith("gk"):
                    return (2, 0, lowered)
                if "cuoiki" in normalized or normalized.endswith("ck"):
                    return (3, 0, lowered)

                return (4, 0, lowered)

            return sorted(found_columns, key=sort_key)

        def merge_columns(primary: list[str], fallback: list[str]) -> list[str]:
            merged: list[str] = []
            seen: set[str] = set()

            for source in [primary, fallback]:
                for col in source:
                    if not isinstance(col, str):
                        continue
                    clean_col = col.strip()
                    normalized = normalize_key(clean_col)
                    if not clean_col or not normalized or normalized in seen:
                        continue

                    seen.add(normalized)
                    merged.append(clean_col)

            return merged

        def get_value_by_candidates(row: dict, candidates: list[str]):
            lookup = {normalize_key(k): v for k, v in row.items()}

            for candidate in candidates:
                if candidate in row and row.get(candidate) not in [None, ""]:
                    return row.get(candidate)

                normalized_candidate = normalize_key(candidate)
                if normalized_candidate in lookup and lookup[normalized_candidate] not in [None, ""]:
                    return lookup[normalized_candidate]

            return ""

        def normalize_score_value(value):
            if value is None:
                return ""
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                text = value.strip()
                if not text:
                    return ""

                try:
                    return float(text.replace(",", "."))
                except ValueError:
                    return text

            return value

        def normalize_student_id(value) -> str:
            if value in [None, ""]:
                return ""

            if isinstance(value, (int, float)):
                if float(value).is_integer():
                    return str(int(value))
                return str(value)

            text = str(value).strip()
            if re.fullmatch(r"\d+\.0+", text):
                return text.split(".")[0]

            return text

        score_columns_from_template: list[str] = []
        if class_subject_id is not None:
            try:
                class_subject_query = db.table("class_subjects").select("id, subject_id")
                if not current_teacher.get("is_admin"):
                    class_subject_query = class_subject_query.eq("teacher_id", current_teacher["id"])

                class_subject_response = class_subject_query.eq("id", class_subject_id).execute()

                if class_subject_response.data:
                    subject_id = class_subject_response.data[0].get("subject_id")
                    if subject_id:
                        subject_response = db.table("subjects").select("score_column_config, is_active").eq(
                            "id", subject_id
                        ).eq("is_active", True).execute()

                        if subject_response.data:
                            score_config = subject_response.data[0].get("score_column_config") or {}
                            score_columns_from_template = flatten_score_columns(score_config)
            except Exception as config_error:
                logger.warning(f"Không lấy được score config cho OCR export: {str(config_error)}")

        valid_requested_columns = requested_score_columns if isinstance(requested_score_columns, list) else []
        inferred_columns = infer_score_columns(parsed_rows)
        fallback_columns = merge_columns(valid_requested_columns, inferred_columns)
        score_columns = merge_columns(score_columns_from_template, fallback_columns)

        has_class_column = any(
            get_value_by_candidates(row, ["class_name", "lop"]) not in [None, ""]
            for row in parsed_rows
        )

        def sort_student_rows(row: dict):
            student_id = normalize_student_id(get_value_by_candidates(row, ["student_id", "id"]))
            return (0, int(student_id)) if student_id.isdigit() else (1, student_id)

        sorted_rows = sorted(parsed_rows, key=sort_student_rows)
        
        # Tạo file Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {"in_memory": True})
        worksheet = workbook.add_worksheet("Bảng điểm OCR")
        
        # Định dạng đồng bộ với template download
        header_format = workbook.add_format({
            "bold": True,
            "bg_color": "white",
            "font_color": "black",
            "border": 1,
            "align": "center",
            "valign": "vcenter"
        })
        
        cell_format = workbook.add_format({
            "border": 1,
            "align": "center",
            "valign": "vcenter",
            "bg_color": "white"
        })
        
        # Header động
        headers = ["id", "ho_va_ten"]
        if has_class_column:
            headers.append("lop")
        headers.extend(score_columns)

        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Dữ liệu
        for row_idx, row in enumerate(sorted_rows, start=1):
            worksheet.write(row_idx, 0, normalize_student_id(get_value_by_candidates(row, ["student_id", "id"])), cell_format)
            worksheet.write(row_idx, 1, str(get_value_by_candidates(row, ["full_name", "ho_va_ten", "ocr_name"])), cell_format)

            score_start_col = 2
            if has_class_column:
                worksheet.write(row_idx, 2, str(get_value_by_candidates(row, ["class_name", "lop"])), cell_format)
                score_start_col = 3

            for score_index, score_column in enumerate(score_columns):
                score_value = normalize_score_value(get_value_by_candidates(row, [score_column]))
                write_col = score_start_col + score_index

                if isinstance(score_value, (int, float)):
                    worksheet.write_number(row_idx, write_col, score_value, cell_format)
                else:
                    worksheet.write(row_idx, write_col, score_value, cell_format)
        
        # Điều chỉnh độ rộng cột
        worksheet.set_column(0, 0, 12)
        worksheet.set_column(1, 1, 25)

        first_score_col = 2
        if has_class_column:
            worksheet.set_column(2, 2, 12)
            first_score_col = 3

        if score_columns:
            worksheet.set_column(first_score_col, first_score_col + len(score_columns) - 1, 15)
        
        workbook.close()
        output.seek(0)
        
        # Tên file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Bang_diem_OCR_{timestamp}.xlsx"
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error exporting parsed OCR data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi export file: {str(e)}"
        )


@router.get("/teacher/available-periods")
async def get_teacher_available_periods(
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách năm học và học kỳ có dữ liệu cho giáo viên"""
    try:
        # Nếu là admin, lấy tất cả periods từ class_subjects
        if current_teacher.get("is_admin"):
            response = db.table("class_subjects").select("academic_year, semester").execute()
        else:
            # Nếu là teacher, chỉ lấy periods của giáo viên đó
            response = db.table("class_subjects").select("academic_year, semester").eq("teacher_id", current_teacher["id"]).execute()
        
        if not response.data:
            return {
                "success": True,
                "data": {
                    "academic_years": [],
                    "semesters": []
                }
            }
        
        # Extract unique academic years and semesters
        academic_years = sorted(list(set([item["academic_year"] for item in response.data if item.get("academic_year")])), reverse=True)
        semesters = sorted(list(set([item["semester"] for item in response.data if item.get("semester")])))
        
        return {
            "success": True,
            "data": {
                "academic_years": academic_years,
                "semesters": semesters
            }
        }
    except Exception as e:
        logger.error(f"Error getting available periods: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/available-periods-scores")
async def get_teacher_available_periods_scores(
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách năm học và học kỳ có dữ liệu điểm cho giáo viên"""
    try:
        # Lấy class_subject_ids của giáo viên
        if current_teacher.get("is_admin"):
            # Admin có thể xem tất cả
            cs_response = db.table("class_subjects").select("id").execute()
        else:
            cs_response = db.table("class_subjects").select("id").eq("teacher_id", current_teacher["id"]).execute()
        
        if not cs_response.data:
            return {
                "success": True,
                "data": {
                    "academic_years": [],
                    "semesters": []
                }
            }
        
        class_subject_ids = [cs["id"] for cs in cs_response.data]
        
        # Lấy grades theo class_subject_ids
        grades_response = db.table("scores").select("academic_year, semester").in_("class_subject_id", class_subject_ids).execute()
        
        if not grades_response.data:
            return {
                "success": True,
                "data": {
                    "academic_years": [],
                    "semesters": []
                }
            }
        
        # Extract unique academic years and semesters
        academic_years = sorted(list(set([item["academic_year"] for item in grades_response.data if item.get("academic_year")])), reverse=True)
        semesters = sorted(list(set([item["semester"] for item in grades_response.data if item.get("semester")])))
        
        return {
            "success": True,
            "data": {
                "academic_years": academic_years,
                "semesters": semesters
            }
        }
    except Exception as e:
        logger.error(f"Error getting available periods for grades: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")