"""
OCR bảng điểm bằng Qwen2.5-VL với cơ chế nhiều ảnh và merge kết quả.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from typing import Any, Optional

import torch
from PIL import Image
from qwen_vl_utils import process_vision_info
from transformers import AutoModelForVision2Seq, AutoProcessor

from core.logger import setup_logger

logger = setup_logger("qwen_ocr")


class QwenOCRService:
	"""OCR service cho Qwen local, tối ưu cho luồng parse nhiều ảnh."""

	def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
		self.model_path = model_path or os.getenv("QWEN_MODEL_NAME", "Qwen/Qwen2.5-VL-3B-Instruct")

		raw_device = (device or os.getenv("QWEN_DEVICE", "auto")).strip().lower()
		self.device = "cuda" if raw_device == "auto" and torch.cuda.is_available() else raw_device
		if self.device == "auto":
			self.device = "cpu"

		self.max_image_width = int(os.getenv("QWEN_MAX_IMAGE_WIDTH", "2048"))
		self.max_new_tokens = int(os.getenv("QWEN_MAX_NEW_TOKENS", "4096"))
		self.repetition_penalty = float(os.getenv("QWEN_REPETITION_PENALTY", "1.08"))

		self.model = None
		self.processor = None
		self._initialize_model()

	def _initialize_model(self) -> None:
		logger.info("Khởi tạo Qwen OCR model=%s device=%s", self.model_path, self.device)

		self.processor = AutoProcessor.from_pretrained(self.model_path, trust_remote_code=True)

		common_kwargs = {
			"trust_remote_code": True,
		}

		if self.device.startswith("cuda"):
			try:
				self.model = AutoModelForVision2Seq.from_pretrained(
					self.model_path,
					torch_dtype=torch.bfloat16,
					device_map="auto",
					attn_implementation="flash_attention_2",
					**common_kwargs,
				)
				logger.info("Qwen dùng flash_attention_2")
			except Exception as flash_error:
				logger.warning("flash_attention_2 không khả dụng, fallback eager: %s", str(flash_error))
				self.model = AutoModelForVision2Seq.from_pretrained(
					self.model_path,
					torch_dtype=torch.bfloat16,
					device_map="auto",
					**common_kwargs,
				)
		else:
			self.model = AutoModelForVision2Seq.from_pretrained(
				self.model_path,
				torch_dtype=torch.float32,
				device_map="cpu",
				**common_kwargs,
			)

		self.model.eval()

	def _strip_code_fences(self, text: str) -> str:
		cleaned = text.strip()
		if cleaned.startswith("```json"):
			cleaned = cleaned[7:]
		elif cleaned.startswith("```"):
			cleaned = cleaned[3:]

		if cleaned.endswith("```"):
			cleaned = cleaned[:-3]

		return cleaned.strip()

	def _parse_json_rows(self, response_text: str) -> list[dict[str, Any]]:
		cleaned = self._strip_code_fences(response_text)
		candidates = [cleaned]

		match_array = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
		if match_array:
			candidates.append(match_array.group(0))

		match_object = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
		if match_object:
			candidates.append(match_object.group(0))

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

		raise ValueError("Qwen trả về JSON không hợp lệ")

	def _normalize_student_id(self, value: Any) -> str:
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

	def _is_score_key(self, key: str) -> bool:
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

	def _normalize_score_value(self, value: Any) -> Any:
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

	def _normalize_row(self, row: dict[str, Any]) -> dict[str, Any] | None:
		normalized: dict[str, Any] = {}

		student_id = self._normalize_student_id(row.get("id", row.get("student_id")))
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

			if self._is_score_key(key_text):
				score_value = self._normalize_score_value(value)
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

	def _build_prompt(self, header_hint: Optional[list[str]] = None, force_full_table: bool = False) -> str:
		header_note = ""
		if header_hint:
			header_note = (
				"\nHeader chuẩn từ ảnh trước: "
				+ ", ".join(header_hint)
				+ ". Giữ nguyên thứ tự/key theo header này nếu ảnh hiện tại thiếu tiêu đề."
			)

		full_table_note = ""
		if force_full_table:
			full_table_note = (
				"\nBẮT BUỘC đọc toàn bộ các dòng học sinh trong ảnh, kể cả các dòng cuối trang. "
				"Không được chỉ trả vài dòng đầu. "
				"Nếu ảnh có 20+ dòng thì phải trả đúng toàn bộ số dòng nhìn thấy."
			)

		return (
			"Bạn là OCR bảng điểm tiếng Việt. "
			"Hãy trích xuất các dòng học sinh trong ảnh và trả về DUY NHẤT JSON là mảng object. "
			"Mỗi object gồm id, ho_va_ten và các cột điểm đọc được. "
			"Điểm có thể là số 0-10 hoặc Đ/KĐ. "
			"Không trả về markdown, không thêm giải thích."
			+ header_note
			+ full_table_note
		)

	def _prepare_image_for_ocr(self, image_path: str) -> tuple[str, Optional[str]]:
		"""Resize ảnh quá rộng để tăng độ rõ chữ cho Qwen OCR."""
		if self.max_image_width <= 0:
			return image_path, None

		with Image.open(image_path) as image_file:
			image = image_file.convert("RGB")
			width, height = image.size

			if width <= self.max_image_width:
				return image_path, None

			ratio = self.max_image_width / float(width)
			new_width = self.max_image_width
			new_height = max(1, int(height * ratio))
			resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

			fd, temp_path = tempfile.mkstemp(suffix="_qwen_ocr.jpg")
			os.close(fd)
			resized.save(temp_path, format="JPEG", quality=95, optimize=True)

			logger.info(
				"Qwen resize OCR image: %sx%s -> %sx%s",
				width,
				height,
				new_width,
				new_height,
			)
			return temp_path, temp_path

	def _generate_single_image_once(
		self,
		image_path: str,
		header_hint: Optional[list[str]] = None,
		max_new_tokens: Optional[int] = None,
		force_full_table: bool = False,
	) -> list[dict[str, Any]]:
		prompt = self._build_prompt(header_hint, force_full_table=force_full_table)
		prepared_image_path, temp_image_path = self._prepare_image_for_ocr(image_path)

		try:
			messages = [
				{
					"role": "user",
					"content": [
						{"type": "image", "image": prepared_image_path},
						{"type": "text", "text": prompt},
					],
				}
			]

			text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
			image_inputs, video_inputs = process_vision_info(messages)

			inputs = self.processor(
				text=[text],
				images=image_inputs,
				videos=video_inputs,
				padding=True,
				return_tensors="pt",
			)
			inputs = inputs.to(self.device)

			with torch.inference_mode():
				generated_ids = self.model.generate(
					**inputs,
					max_new_tokens=max_new_tokens or self.max_new_tokens,
					do_sample=False,
					num_beams=1,
					repetition_penalty=self.repetition_penalty,
					pad_token_id=self.processor.tokenizer.pad_token_id,
					eos_token_id=self.processor.tokenizer.eos_token_id,
				)

			generated_ids_trimmed = [
				out_ids[len(in_ids):]
				for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
			]

			response_text = self.processor.batch_decode(
				generated_ids_trimmed,
				skip_special_tokens=True,
				clean_up_tokenization_spaces=False,
			)[0]

			logger.info(
				"Qwen OCR response length=%s chars (tokens_limit=%s)",
				len(response_text),
				max_new_tokens or self.max_new_tokens,
			)

			return self._parse_json_rows(response_text)
		finally:
			if temp_image_path and os.path.exists(temp_image_path):
				try:
					os.remove(temp_image_path)
				except Exception:
					logger.warning("Không xóa được ảnh tạm Qwen OCR: %s", temp_image_path)

	def _generate_single_image(self, image_path: str, header_hint: Optional[list[str]] = None) -> list[dict[str, Any]]:
		"""Thử OCR 2 lần nếu lần đầu trả quá ít dòng."""
		first_limit = self.max_new_tokens
		second_limit = max(self.max_new_tokens, 8192)

		rows = self._generate_single_image_once(
			image_path,
			header_hint=header_hint,
			max_new_tokens=first_limit,
			force_full_table=False,
		)

		if len(rows) <= 2:
			logger.warning(
				"Qwen OCR trả về %s dòng (ít bất thường), retry với prompt chặt hơn và token lớn hơn",
				len(rows),
			)
			rows_retry = self._generate_single_image_once(
				image_path,
				header_hint=header_hint,
				max_new_tokens=second_limit,
				force_full_table=True,
			)
			if len(rows_retry) >= len(rows):
				return rows_retry

		return rows

	def extract_all_grades(self, image_paths: list[str]) -> list[dict[str, Any]]:
		valid_paths = [path for path in image_paths if path and os.path.exists(path)]
		if not valid_paths:
			return []

		logger.info("Qwen OCR nhận %s ảnh", len(valid_paths))

		all_rows: list[dict[str, Any]] = []
		header_hint: Optional[list[str]] = None

		for index, image_path in enumerate(valid_paths, start=1):
			try:
				rows = self._generate_single_image(image_path, header_hint)
			except Exception as image_error:
				logger.error("Qwen OCR lỗi ở ảnh #%s: %s", index, str(image_error))
				continue

			normalized_rows = []
			for row in rows:
				if not isinstance(row, dict):
					continue
				normalized = self._normalize_row(row)
				if normalized:
					normalized_rows.append(normalized)

			if not header_hint and normalized_rows:
				first_row = normalized_rows[0]
				header_hint = [key for key in first_row.keys() if key not in {"id", "ho_va_ten"}]

			all_rows.extend(normalized_rows)

		logger.info("Qwen OCR parse thành công: %s dòng", len(all_rows))
		return all_rows


_qwen_ocr_service_instance: QwenOCRService | None = None


def get_qwen_ocr_service() -> QwenOCRService:
	global _qwen_ocr_service_instance
	if _qwen_ocr_service_instance is None:
		_qwen_ocr_service_instance = QwenOCRService()
	return _qwen_ocr_service_instance


def extract_all_grades(image_paths: list[str]) -> list[dict[str, Any]]:
	return get_qwen_ocr_service().extract_all_grades(image_paths)

