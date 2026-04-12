import json
import logging
import os
import re
from typing import Any

from google import genai
from google.genai import types
from PIL import Image

logger = logging.getLogger(__name__)

_gemini_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _gemini_client

    if _gemini_client is not None:
        return _gemini_client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Thiếu GEMINI_API_KEY để chạy OCR Gemini")

    _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()


def _parse_json_rows(raw_text: str) -> list[dict[str, Any]]:
    cleaned = _strip_code_fences(raw_text)

    candidates = [cleaned]
    array_match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
    if array_match:
        candidates.append(array_match.group(0))

    object_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if object_match:
        candidates.append(object_match.group(0))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
            if isinstance(parsed, dict):
                if isinstance(parsed.get("rows"), list):
                    return [item for item in parsed["rows"] if isinstance(item, dict)]
                return [parsed]
        except json.JSONDecodeError:
            continue

    raise ValueError("Gemini trả về JSON không hợp lệ")


def _normalize_student_id(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).strip()
    if not text:
        return ""

    match = re.search(r"(\d{6})", text)
    if match:
        return match.group(1)

    match = re.search(r"(\d+)", text)
    if not match:
        return ""

    numeric = match.group(1)
    if len(numeric) <= 6:
        return numeric.zfill(6)

    return numeric


def _is_score_key(key: str) -> bool:
    lowered = key.lower()
    return (
        "diem" in lowered
        or lowered.startswith("tx")
        or lowered.endswith("gk")
        or lowered.endswith("ck")
        or "thuong_xuyen" in lowered
        or "giua_ki" in lowered
        or "cuoi_ki" in lowered
    )


def _normalize_score_value(value: Any) -> Any:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        numeric = float(value)
        if 0 <= numeric <= 10:
            return round(numeric * 4) / 4
        return None

    if not isinstance(value, str):
        return value

    text = value.strip()
    if not text:
        return None

    upper = text.upper()
    if upper in {"Đ", "D", "DAT", "ĐẠT"}:
        return "Đ"
    if upper in {"KĐ", "KD", "KHONG DAT", "KHÔNG ĐẠT", "KHONGDAT", "KHÔNG_ĐẠT"}:
        return "KĐ"

    try:
        numeric = float(text.replace(",", "."))
    except ValueError:
        return text

    if 0 <= numeric <= 10:
        return round(numeric * 4) / 4
    return None


def _normalize_row(row: dict[str, Any]) -> dict[str, Any] | None:
    normalized: dict[str, Any] = {}

    student_id = _normalize_student_id(row.get("id", row.get("student_id")))
    if not student_id:
        return None

    normalized["id"] = student_id

    if row.get("ho_va_ten") is not None:
        normalized["ho_va_ten"] = str(row.get("ho_va_ten", "")).strip()
    elif row.get("full_name") is not None:
        normalized["ho_va_ten"] = str(row.get("full_name", "")).strip()

    for key, value in row.items():
        key_text = str(key).strip()
        if not key_text or key_text in {"id", "student_id", "ho_va_ten", "full_name"}:
            continue

        if _is_score_key(key_text):
            score_value = _normalize_score_value(value)
            if score_value is not None:
                normalized[key_text] = score_value
            continue

        if value is None:
            continue

        if isinstance(value, str):
            cleaned_text = value.strip()
            if cleaned_text:
                normalized[key_text] = cleaned_text
        else:
            normalized[key_text] = value

    return normalized


def _build_prompt() -> str:
    return """
Bạn là hệ thống OCR bảng điểm học sinh tiếng Việt.

Yêu cầu:
1. Ảnh đầu tiên có header cột, các ảnh sau có thể không có header nhưng giữ nguyên thứ tự cột.
2. Trả về DUY NHẤT JSON là một mảng các object, mỗi object là 1 học sinh.
3. Giữ nguyên key cột theo header OCR được.
4. Hỗ trợ cả điểm số và điểm chữ:
   - Điểm số: 0-10
   - Điểm đạt: Đ, D, DAT, ĐẠT
   - Điểm không đạt: KĐ, KD, KHONG DAT, KHÔNG ĐẠT
5. Không bỏ sót học sinh trên tất cả ảnh.

Ví dụ đầu ra:
[
  {
    "id": "250001",
    "ho_va_ten": "Nguyễn Văn A",
    "Diem_tx1": 8.5,
    "Diem_thi_giua_ki": "Đ",
    "Diem_thi_cuoi_ki": 7.5
  }
]
""".strip()


def extract_all_grades(image_paths: list[str]) -> list[dict[str, Any]]:
    valid_paths = [path for path in image_paths if path and os.path.exists(path)]
    if not valid_paths:
        return []

    logger.info("Gemini OCR nhận %s ảnh", len(valid_paths))

    contents: list[Any] = []
    images: list[Image.Image] = []

    try:
        for index, path in enumerate(valid_paths, start=1):
            with Image.open(path) as image_file:
                images.append(image_file.convert("RGB"))
            contents.append(f"--- Hình Ảnh {index} ---")
            contents.append(images[-1])

        contents.append(_build_prompt())

        model_name = os.getenv("GEMINI_OCR_MODEL", "gemini-3.1-flash-lite-preview")
        client = _get_client()

        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        raw_text = response.text or ""
        parsed_rows = _parse_json_rows(raw_text)

        normalized_rows: list[dict[str, Any]] = []
        for row in parsed_rows:
            normalized = _normalize_row(row)
            if normalized:
                normalized_rows.append(normalized)

        logger.info("Gemini OCR parse thành công: %s dòng", len(normalized_rows))
        return normalized_rows

    except Exception as error:
        logger.error("Lỗi khi gọi Gemini OCR: %s", str(error))
        raise

    finally:
        for image in images:
            try:
                image.close()
            except Exception:
                pass
