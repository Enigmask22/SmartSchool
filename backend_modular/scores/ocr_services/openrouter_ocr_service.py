"""
Service xử lý OCR cho bảng điểm viết tay sử dụng OpenRouter API (Gemma 3 27B)
Model: google/gemma-3-27b-it:free - Vision Language Model miễn phí qua OpenRouter
"""

import os
import json
import base64
from typing import List, Dict, Optional
from PIL import Image
import re
import io

from openai import OpenAI

from core.logger import setup_logger

logger = setup_logger("openrouter_ocr")


class OpenRouterOCRService:
    """
    Service để phân tích bảng điểm viết tay sử dụng OpenRouter API (Gemma 3 27B)
    
    Ưu điểm:
    - Miễn phí hoàn toàn (free tier trên OpenRouter)
    - Hỗ trợ Vision (multimodal) - đọc được ảnh
    - Không cần GPU local
    - Độ chính xác tốt với chữ viết tay
    
    Nhược điểm:
    - Phụ thuộc vào kết nối mạng
    - Rate limit của free tier
    - Tốc độ có thể chậm hơn Gemini
    
    Model: google/gemma-3-27b-it:free
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        """
        Khởi tạo OpenRouter OCR Service
        
        Args:
            api_key: OpenRouter API key
            model_name: Tên model trên OpenRouter (mặc định: google/gemma-3-27b-it:free)
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model_name = model_name or os.getenv(
            "OPENROUTER_OCR_MODEL", "google/gemma-3-27b-it:free"
        )
        
        if not self.api_key:
            raise ValueError(
                "OpenRouter API key không được tìm thấy. "
                "Vui lòng cấu hình OPENROUTER_API_KEY trong .env"
            )
        
        # Headers bắt buộc cho free models trên OpenRouter
        self.extra_headers = {
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "Smart School"),
        }
        
        # Sử dụng synchronous client (giống GeminiOCRService dùng sync API)
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
            default_headers=self.extra_headers,
        )
        
        logger.info(f"✅ OpenRouterOCRService initialized với model: {self.model_name}")
    
    def _create_ocr_prompt(self) -> str:
        """
        Tạo prompt chi tiết để model đọc bảng điểm
        (Dùng chung logic prompt với GeminiOCRService)
        
        Returns:
            Prompt đã được định dạng
        """
        prompt = """
Bạn là một hệ thống OCR chuyên nghiệp. Nhiệm vụ của bạn là đọc bảng điểm học sinh từ ảnh và trích xuất dữ liệu chính xác.

**YÊU CẦU QUAN TRỌNG:**

1. **Cấu trúc bảng điểm:**
   - Header có thể gồm các cột: id, ho_va_ten, Diem_tx1, Diem_tx2, Diem_tx3, Diem_tx4, Diem_thi_giua_ki, Diem_thi_cuoi_ki
   - HOẶC: id, ho_va_ten, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki (format cũ)
   - QUAN TRỌNG: Đọc chính xác tên cột từ header của ảnh, không tự ý thay đổi
   - Mỗi dòng là thông tin của một học sinh

2. **Quy tắc đọc dữ liệu:**
   - **ID học sinh**: Thường có dạng 6 số như 250001, 250002,...
   - **Họ và tên**: Tên đầy đủ của học sinh (chữ tiếng Việt có dấu)
   - **Điểm số - có 3 loại:**
     * **Điểm số (numeric)**: Số thập phân từ 0 đến 10, bước nhảy 0.25
       - Ví dụ: 0, 0.25, 0.5, 0.75, 1.0, ..., 9.75, 10
       - Giáo viên có thể viết 0.5 hoặc 0,5 (dấu chấm hoặc phẩy đều được)
       - Chuẩn hóa tất cả về dạng số thập phân với dấu chấm
     * **Điểm chữ Đ (Đạt)**: Viết là "Đ", "D", "Dat", "ĐẠT" - Chuẩn hóa thành chuỗi "Đ"
     * **Điểm chữ KĐ (Không Đạt)**: Viết là "KĐ", "KD", "Khong Dat", "KHÔNG ĐẠT" - Chuẩn hóa thành chuỗi "KĐ"

3. **Xử lý lỗi OCR thường gặp:**
   - Số 1 có thể bị nhầm với chữ I, l
   - Số 0 có thể bị nhầm với chữ O
   - Số 5 có thể bị nhầm với chữ S
   - Số 7 có thể bị nhầm với dấu /
   - Chữ "Đ" có thể bị nhầm với "D" hoặc "O"
   - Hãy sửa các lỗi này khi đọc điểm số

4. **Format output (BẮT BUỘC):**
   Trả về JSON với cấu trúc sau (ví dụ với nested columns):
   ```json
   {
     "success": true,
     "headers": ["id", "ho_va_ten", "Diem_tx1", "Diem_tx2", "Diem_tx3", "Diem_tx4", "Diem_thi_giua_ki", "Diem_thi_cuoi_ki"],
     "rows": [
       {
         "student_id": "250001",
         "ho_va_ten": "Nguyễn Văn A",
         "Diem_tx1": 8.5,
         "Diem_tx2": 9.0,
         "Diem_tx3": "Đ",
         "Diem_tx4": 7.5,
         "Diem_thi_giua_ki": 8.0,
         "Diem_thi_cuoi_ki": 9.0
       }
     ],
     "total_rows": 1,
     "errors": []
   }
   ```

5. **Xử lý trường hợp đặc biệt:**
   - Nếu ô điểm để trống, bỏ qua trường đó (không có trong JSON)
   - Nếu không đọc được ID học sinh, ghi vào errors
   - Nếu điểm số không hợp lệ (< 0 hoặc > 10 cho điểm số, hoặc không phải Đ/KĐ cho điểm chữ), ghi vào errors
   - Key của JSON phải CHÍNH XÁC theo tên cột trong header (viết hoa, viết thường, dấu gạch dưới)

**CHỈ TRẢ VỀ JSON, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC.**

Bây giờ hãy đọc bảng điểm trong ảnh và trả về dữ liệu theo format trên.
"""
        return prompt.strip()
    
    def _encode_image_to_base64(self, image_path: str) -> str:
        """
        Đọc ảnh và encode sang base64 data URL

        Args:
            image_path: Đường dẫn đến file ảnh

        Returns:
            Base64 data URL string (data:image/xxx;base64,...)
        """
        # Xác định MIME type
        ext = os.path.splitext(image_path)[1].lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")
        
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        b64 = base64.b64encode(image_data).decode("utf-8")
        return f"data:{mime_type};base64,{b64}"
    
    def parse_score_sheet(self, image_path: str) -> Dict:
        """
        Phân tích toàn bộ bảng điểm sử dụng OpenRouter Vision API (Gemma 3 27B)
        
        Args:
            image_path: Đường dẫn đến file ảnh bảng điểm
        
        Returns: {
            'success': bool,
            'headers': List[str],
            'rows': List[Dict],
            'errors': List[str],
            'total_rows': int
        }
        """
        try:
            logger.debug(f"Processing score sheet: {image_path}")
            
            # Bước 1: Validate file tồn tại
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': [f'File không tồn tại: {image_path}'],
                    'total_rows': 0
                }
            
            # Bước 2: Validate ảnh có mở được không
            try:
                image = Image.open(image_path)
                image.close()
            except Exception as e:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': [f'Không thể đọc file ảnh: {str(e)}'],
                    'total_rows': 0
                }
            
            # Bước 3: Encode ảnh sang base64
            image_data_url = self._encode_image_to_base64(image_path)
            
            # Bước 4: Tạo prompt
            prompt = self._create_ocr_prompt()
            
            # Bước 5: Gửi request đến OpenRouter (Gemma 3 27B vision)
            logger.info(f"🤖 [OpenRouter OCR] Gửi ảnh đến {self.model_name}...")
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_data_url,
                                },
                            },
                        ],
                    }
                ],
                max_tokens=7200,
                temperature=0.1,  # Low temperature cho OCR accuracy
            )
            
            if not response or not response.choices or not response.choices[0].message.content:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': ['Không nhận được phản hồi từ OpenRouter API'],
                    'total_rows': 0
                }
            
            response_text = response.choices[0].message.content
            logger.debug(f"OpenRouter response length: {len(response_text)} chars")
            
            # Bước 6: Parse JSON response
            parsed_data = self._parse_response(response_text)
            
            # Bước 7: Validate và chuẩn hóa dữ liệu
            validated_data = self._validate_and_normalize(parsed_data)
            
            logger.info(f"✅ [OpenRouter OCR] Parsed {validated_data.get('total_rows', 0)} rows")
            return validated_data
            
        except Exception as e:
            logger.error(f"❌ [OpenRouter OCR] Error parsing score sheet: {str(e)}", exc_info=True)
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f"Lỗi xử lý: {str(e)}"],
                'total_rows': 0
            }
    
    def _parse_response(self, response_text: str) -> Dict:
        """
        Parse JSON response từ OpenRouter model
        
        Args:
            response_text: Text response từ API
            
        Returns:
            Parsed data dictionary
        """
        try:
            # Remove markdown code blocks nếu có
            response_text = response_text.strip()
            
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            logger.debug(f"Parsed OpenRouter response: {data.get('total_rows', 0)} rows")
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.debug(f"Response text: {response_text[:500]}...")
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f'Không thể parse JSON từ OpenRouter: {str(e)}'],
                'total_rows': 0
            }
    
    def _validate_and_normalize(self, data: Dict) -> Dict:
        """
        Validate và chuẩn hóa dữ liệu từ model response
        (Logic giống GeminiOCRService._validate_and_normalize)
        
        Args:
            data: Raw data từ model
            
        Returns:
            Validated và normalized data
        """
        errors = data.get('errors', [])
        rows = data.get('rows', [])
        headers = data.get('headers', [])
        validated_rows = []
        
        # Lấy tất cả score columns (trừ id và ho_va_ten)
        score_columns = [col for col in headers if col not in ['id', 'ho_va_ten', 'student_id']]
        
        for idx, row in enumerate(rows, start=1):
            try:
                validated_row = {}
                
                # Validate student_id
                student_id = str(row.get('student_id', '')).strip()
                if not student_id:
                    errors.append(f"Row {idx}: Thiếu student_id")
                    continue
                
                # Chuẩn hóa student_id
                student_id = self._normalize_student_id(student_id)
                if not student_id:
                    errors.append(f"Row {idx}: student_id không hợp lệ")
                    continue
                
                validated_row['student_id'] = student_id
                
                # Validate ho_va_ten (optional)
                if 'ho_va_ten' in row:
                    validated_row['ho_va_ten'] = str(row['ho_va_ten']).strip()
                
                # Validate và normalize TẤT CẢ các cột điểm (dynamic)
                for score_col in score_columns:
                    if score_col in row:
                        score = self._normalize_score(row[score_col])
                        if score is not None:
                            validated_row[score_col] = score
                        else:
                            errors.append(f"Row {idx}: {score_col} không hợp lệ ({row[score_col]})")
                
                # Phải có ít nhất student_id
                if validated_row.get('student_id'):
                    validated_rows.append(validated_row)
                
            except Exception as e:
                errors.append(f"Row {idx}: Lỗi validate - {str(e)}")
                logger.error(f"❌ Error validating row {idx}: {e}")
        
        success = len(validated_rows) > 0
        
        return {
            'success': success,
            'headers': headers if headers else ['id', 'ho_va_ten'],
            'rows': validated_rows,
            'errors': errors,
            'total_rows': len(validated_rows)
        }
    
    def _normalize_student_id(self, student_id: str) -> Optional[str]:
        """
        Chuẩn hóa student_id
        (Logic giống GeminiOCRService._normalize_student_id)
        """
        student_id = student_id.strip().upper()
        
        # Pattern: 6 số
        match = re.search(r'(\d{6})', student_id)
        if match:
            return match.group(1)
        
        # Pattern: chỉ số (001, 002, 1, 2, ...)
        match = re.search(r'(\d+)', student_id)
        if match:
            num = match.group(1)
            if len(num) <= 4:
                return f"{num.zfill(6)}"
        
        return None
    
    def _normalize_score(self, score):
        """
        Chuẩn hóa điểm số - hỗ trợ cả điểm số (float) và điểm chữ (Đ, KĐ)
        (Logic giống GeminiOCRService._normalize_score)
        """
        try:
            if isinstance(score, str):
                score_str = score.strip().upper()
                
                # Điểm chữ "Đ" (Đạt)
                if score_str in ['Đ', 'D', 'DAT', 'ĐẠT']:
                    return 'Đ'
                
                # Điểm chữ "KĐ" (Không Đạt)
                if score_str in ['KĐ', 'KD', 'KHONG DAT', 'KHÔNG ĐẠT', 'KHONGDAT']:
                    return 'KĐ'
                
                # Thử convert sang số
                score = score.replace(',', '.')
                score = float(score)
            elif isinstance(score, (int, float)):
                score = float(score)
            else:
                return None
            
            # Validate range
            if not (0 <= score <= 10):
                logger.warning(f"⚠️ Score {score} out of range 0-10")
                return None
            
            # Round to nearest 0.25
            score = round(score * 4) / 4
            score = min(10.0, max(0.0, score))
            
            return score
            
        except (ValueError, TypeError) as e:
            logger.error(f"❌ Error normalizing score '{score}': {e}")
            return None
    
    def export_to_excel_format(self, parsed_data: Dict) -> List[Dict]:
        """
        Convert parsed data sang format phù hợp với bulk import
        (Tương thích với GeminiOCRService.export_to_excel_format)
        
        Args:
            parsed_data: Data từ parse_score_sheet()
            
        Returns:
            List[{student_id, ho_va_ten, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki}]
        """
        if not parsed_data.get('success'):
            return []
        
        excel_data = []
        for row in parsed_data.get('rows', []):
            excel_row = {
                'student_id': row.get('student_id'),
                'ho_va_ten': row.get('ho_va_ten', ''),
                'diem_thuong_xuyen': row.get('diem_thuong_xuyen'),
                'diem_thi_giua_ki': row.get('diem_thi_giua_ki'),
                'diem_thi_cuoi_ki': row.get('diem_thi_cuoi_ki')
            }
            excel_data.append(excel_row)
        
        return excel_data
