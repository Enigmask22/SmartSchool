from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import base64
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ai_sidecar")

app = FastAPI(title="SynapseS AI Sidecar", version="1.0.0")

face_service = None
ocr_service_instance = None


# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global face_service, ocr_service_instance

    try:
        from face_service import InsightFaceRecognitionService
        face_service = InsightFaceRecognitionService()
        logger.info("Face service initialized")
    except Exception as e:
        logger.warning(f"Face service unavailable: {e}")

    try:
        from ocr_service import QwenOCRService
        ocr_service_instance = QwenOCRService()
        logger.info("OCR service initialized")
    except Exception as e:
        logger.warning(f"OCR service unavailable: {e}")


# ── Request / Response models ─────────────────────────────────────────────────

class RecognizeRequest(BaseModel):
    image_base64: str
    threshold: float = 0.20


class RegisterRequest(BaseModel):
    image_base64: str


class ReloadRequest(BaseModel):
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None


class OCRRequest(BaseModel):
    image_base64: str
    engine: str = "qwen"


class CountFacesRequest(BaseModel):
    image_base64: str


class ImageData(BaseModel):
    data: str  # base64-encoded image


class RegisterMultipleRequest(BaseModel):
    images: List[ImageData]


# ── Helper ────────────────────────────────────────────────────────────────────

def _decode_image(image_base64: str):
    """Decode a base64 string to a numpy array (BGR, via OpenCV)."""
    import numpy as np
    import cv2

    # Strip data-URI prefix if present (e.g. "data:image/jpeg;base64,...")
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image from base64 data")
    return img


# ── Face endpoints ────────────────────────────────────────────────────────────

@app.post("/face/recognize")
async def recognize_face(req: RecognizeRequest):
    """Recognize faces in the provided image."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    try:
        img = _decode_image(req.image_base64)
        result = face_service.recognize(img, threshold=req.threshold)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"recognize_face error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/face/register/{student_id}")
async def register_face(student_id: str, req: RegisterRequest):
    """Register a face encoding for the given student."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    try:
        img = _decode_image(req.image_base64)
        result = face_service.register(student_id, img)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"register_face error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/face/register-multiple/{student_id}")
async def register_multiple_faces(student_id: str, req: RegisterMultipleRequest):
    """Register multiple face images for a single student."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    if not req.images:
        raise HTTPException(status_code=400, detail="images list must not be empty")

    results = []
    success_count = 0
    for idx, img_data in enumerate(req.images):
        try:
            img = _decode_image(img_data.data)
            result = face_service.register(student_id, img)
            result["index"] = idx
            results.append(result)
            success_count += 1
        except Exception as e:
            logger.warning(f"register_multiple image[{idx}] error: {e}")
            results.append({"index": idx, "success": False, "error": str(e)})

    return {
        "success": success_count > 0,
        "total": len(req.images),
        "success_count": success_count,
        "results": results,
    }


@app.post("/face/reload")
async def reload_faces(req: ReloadRequest = None):
    """Reload face encodings from the database / storage."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    try:
        kwargs = {}
        if req is not None:
            if req.supabase_url:
                kwargs["supabase_url"] = req.supabase_url
            if req.supabase_key:
                kwargs["supabase_key"] = req.supabase_key
        result = face_service.reload(**kwargs)
        return result
    except Exception as e:
        logger.error(f"reload_faces error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/face/{student_id}")
async def delete_face(student_id: str):
    """Delete the stored face encoding for the given student."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    try:
        result = face_service.delete(student_id)
        return result
    except Exception as e:
        logger.error(f"delete_face error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/face/status")
async def face_status():
    """Return face recognition service status."""
    if face_service is None:
        return {"available": False, "message": "Face service is not initialized"}

    try:
        status = face_service.get_status()
        return {"available": True, **status}
    except Exception as e:
        logger.error(f"face_status error: {e}", exc_info=True)
        return {"available": False, "error": str(e)}


@app.post("/face/count")
async def count_faces(req: CountFacesRequest):
    """Count the number of faces detected in the provided image."""
    if face_service is None:
        raise HTTPException(status_code=503, detail="Face service is not available")

    try:
        img = _decode_image(req.image_base64)
        result = face_service.count_faces(img)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"count_faces error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── OCR endpoint ──────────────────────────────────────────────────────────────

@app.post("/ocr/process")
async def process_ocr(req: OCRRequest):
    """Run OCR on the provided image using the specified engine."""
    if ocr_service_instance is None:
        raise HTTPException(status_code=503, detail="OCR service is not available")

    try:
        img = _decode_image(req.image_base64)
        result = ocr_service_instance.process(img, engine=req.engine)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"process_ocr error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Debug endpoint ────────────────────────────────────────────────────────────

@app.get("/debug")
async def debug_info():
    """Return debug information about loaded services."""
    import sys
    import platform

    face_info = None
    if face_service is not None:
        try:
            face_info = face_service.get_status()
        except Exception as e:
            face_info = {"error": str(e)}

    ocr_info = None
    if ocr_service_instance is not None:
        try:
            ocr_info = {"available": True}
        except Exception as e:
            ocr_info = {"error": str(e)}

    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "face_service_available": face_service is not None,
        "ocr_service_available": ocr_service_instance is not None,
        "face_service_info": face_info,
        "ocr_service_info": ocr_info,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
