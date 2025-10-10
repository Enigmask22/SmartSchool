"""
Service xử lý OCR cho bảng điểm viết tay sử dụng Google Gemini Vision API
"""

import os
import json
from typing import List, Dict, Optional
import google.generativeai as genai
from PIL import Image
import re

from utils.logger import setup_logger

logger = setup_logger()


class GradeSheetOCRService:
    """
    Service để phân tích bảng điểm viết tay sử dụng Gemini Vision API
    Hỗ trợ:
    - Đọc bảng điểm với độ chính xác cao
    - Trích xuất cấu trúc bảng tự động
    - Parse thành structured data
    """
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash"):
        """
        Khởi tạo Gemini OCR Service
        
        Args:
            api_key: API key cho Google AI Studio
            model_name: Tên model Gemini để sử dụng
        """
        self.api_key = api_key or self._load_api_key()
        self.model_name = model_name
        self.model = None
        
        if not self.api_key:
            raise ValueError("API key không được tìm thấy. Vui lòng cấu hình GEMINI_API_KEY.")
        
        self._initialize_model()
        logger.info("GradeSheetOCRService initialized successfully with Gemini Vision API")
    
    def _load_api_key(self) -> Optional[str]:
        """
        Tải API key từ biến môi trường
        
        Returns:
            API key nếu tìm thấy, None nếu không
        """
        # Thử lấy từ biến môi trường
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            return api_key
        
        # Fallback API key (chỉ dùng cho development)
        return 'AIzaSyAJLXNgLaKPxTv_rn_iERKxgiUhMPvLlMw'
    
    def _initialize_model(self):
        """
        Khởi tạo model Gemini với Vision capability
        """
        try:
            # Cấu hình API key
            genai.configure(api_key=self.api_key)
            
            # Khởi tạo model với vision capability
            self.model = genai.GenerativeModel(self.model_name)
            
            # Cấu hình generation
            self.generation_config = genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=4096,
                temperature=0.1,  # Low temperature for accuracy
            )
            
            logger.info(f"Đã kết nối thành công với {self.model_name}")
            
        except Exception as e:
            logger.error(f"ERROR: Lỗi khi khởi tạo Gemini model: {e}")
            raise
    
    def _create_ocr_prompt(self) -> str:
        """
        Tạo prompt chi tiết cho Gemini để đọc bảng điểm
        
        Returns:
            Prompt đã được định dạng
        """
        prompt = """
Bạn là một hệ thống OCR chuyên nghiệp. Nhiệm vụ của bạn là đọc bảng điểm học sinh từ ảnh và trích xuất dữ liệu chính xác.

**YÊU CẦU QUAN TRỌNG:**

1. **Cấu trúc bảng điểm:**
   - Header gồm các cột: id, ho_va_ten, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki
   - Mỗi dòng là thông tin của một học sinh

2. **Quy tắc đọc dữ liệu:**
   - **ID học sinh**: Thường có dạng SV001, SV002,... hoặc chỉ số như 001, 002,...
   - **Họ và tên**: Tên đầy đủ của học sinh (chữ tiếng Việt có dấu)
   - **Điểm số**: 
     * Là số thập phân từ 0 đến 10
     * Bước nhảy 0.25 (ví dụ: 0, 0.25, 0.5, 0.75, 1.0, ..., 9.75, 10)
     * Giáo viên có thể viết 0.5 hoặc 0,5 (dấu chấm hoặc phẩy đều được)
     * Hãy chuẩn hóa tất cả điểm số về dạng số thập phân với dấu chấm

3. **Xử lý lỗi OCR thường gặp:**
   - Số 1 có thể bị nhầm với chữ I, l
   - Số 0 có thể bị nhầm với chữ O
   - Số 5 có thể bị nhầm với chữ S
   - Số 7 có thể bị nhầm với dấu /
   - Hãy sửa các lỗi này khi đọc điểm số

4. **Format output (BẮT BUỘC):**
   Trả về JSON với cấu trúc sau:
   ```json
   {
     "success": true,
     "headers": ["id", "ho_va_ten", "diem_thuong_xuyen", "diem_thi_giua_ki", "diem_thi_cuoi_ki"],
     "rows": [
       {
         "student_id": "SV001",
         "ho_va_ten": "Nguyễn Văn A",
         "diem_thuong_xuyen": 8.5,
         "diem_thi_giua_ki": 7.0,
         "diem_thi_cuoi_ki": 9.0
       },
       {
         "student_id": "SV002",
         "ho_va_ten": "Trần Thị B",
         "diem_thuong_xuyen": 6.5,
         "diem_thi_giua_ki": 7.5,
         "diem_thi_cuoi_ki": 8.0
       }
     ],
     "total_rows": 2,
     "errors": []
   }
   ```

5. **Xử lý trường hợp đặc biệt:**
   - Nếu ô điểm để trống, bỏ qua trường đó (không có trong JSON)
   - Nếu không đọc được ID học sinh, ghi vào errors
   - Nếu điểm số không hợp lệ (< 0 hoặc > 10), ghi vào errors

**CHỈ TRẢ VỀ JSON, KHÔNG THÊM BẤT KỲ VÁN BẢN NÀO KHÁC.**

Bây giờ hãy đọc bảng điểm trong ảnh và trả về dữ liệu theo format trên.
"""
        return prompt.strip()
    
    def parse_grade_sheet(self, image_path: str) -> Dict:
        """
        Phân tích toàn bộ bảng điểm sử dụng Gemini Vision API
        
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
            logger.info(f"Processing grade sheet with Gemini Vision API: {image_path}")
            
            # Bước 1: Mở và validate ảnh
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': [f'File không tồn tại: {image_path}'],
                    'total_rows': 0
                }
            
            # Bước 2: Đọc ảnh
            try:
                image = Image.open(image_path)
                logger.info(f"Loaded image: {image.size}, mode: {image.mode}")
            except Exception as e:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': [f'Không thể đọc file ảnh: {str(e)}'],
                    'total_rows': 0
                }
            
            # Bước 3: Tạo prompt
            prompt = self._create_ocr_prompt()
            
            # Bước 4: Gửi request đến Gemini
            logger.info("Sending image to Gemini Vision API...")
            response = self.model.generate_content(
                [prompt, image],
                generation_config=self.generation_config
            )
            
            if not response or not response.text:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': ['Không nhận được phản hồi từ Gemini API'],
                    'total_rows': 0
                }
            
            # Bước 5: Parse JSON response
            logger.info("Received response from Gemini, parsing...")
            parsed_data = self._parse_gemini_response(response.text)
            
            # Bước 6: Validate và chuẩn hóa dữ liệu
            validated_data = self._validate_and_normalize(parsed_data)
            
            logger.info(f"Successfully parsed {validated_data.get('total_rows', 0)} rows")
            return validated_data
            
        except Exception as e:
            logger.error(f"Error parsing grade sheet: {str(e)}", exc_info=True)
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f"Lỗi xử lý: {str(e)}"],
                'total_rows': 0
            }
    
    def _parse_gemini_response(self, response_text: str) -> Dict:
        """
        Parse JSON response từ Gemini
        
        Args:
            response_text: Text response từ Gemini API
            
        Returns:
            Parsed data dictionary
        """
        try:
            # Remove markdown code blocks nếu có
            response_text = response_text.strip()
            
            # Remove ```json và ``` nếu có
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            logger.info(f"Successfully parsed Gemini response: {data.get('total_rows', 0)} rows detected")
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Response text: {response_text[:500]}...")  # Log first 500 chars
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f'Không thể parse JSON từ Gemini: {str(e)}'],
                'total_rows': 0
            }
    
    def _validate_and_normalize(self, data: Dict) -> Dict:
        """
        Validate và chuẩn hóa dữ liệu từ Gemini
        
        Args:
            data: Raw data từ Gemini
            
        Returns:
            Validated và normalized data
        """
        errors = data.get('errors', [])
        rows = data.get('rows', [])
        validated_rows = []
        
        expected_headers = ['id', 'ho_va_ten', 'diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        
        for idx, row in enumerate(rows, start=1):
            try:
                validated_row = {}
                
                # Validate student_id
                student_id = row.get('student_id', '').strip()
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
                    validated_row['ho_va_ten'] = row['ho_va_ten'].strip()
                
                # Validate và normalize điểm số
                for grade_col in ['diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']:
                    if grade_col in row:
                        grade = self._normalize_grade(row[grade_col])
                        if grade is not None:
                            validated_row[grade_col] = grade
                        else:
                            errors.append(f"Row {idx}: {grade_col} không hợp lệ ({row[grade_col]})")
                
                # Phải có ít nhất student_id
                if validated_row.get('student_id'):
                    validated_rows.append(validated_row)
                    logger.info(f"Validated row {idx}: {validated_row}")
                
            except Exception as e:
                errors.append(f"Row {idx}: Lỗi validate - {str(e)}")
                logger.error(f"Error validating row {idx}: {e}")
        
        success = len(validated_rows) > 0
        
        return {
            'success': success,
            'headers': expected_headers,
            'rows': validated_rows,
            'errors': errors,
            'total_rows': len(validated_rows)
        }
    
    def _normalize_student_id(self, student_id: str) -> Optional[str]:
        """
        Chuẩn hóa student_id
        
        Args:
            student_id: Raw student ID
            
        Returns:
            Normalized student ID (format: SV001, SV002, ...)
        """
        student_id = student_id.strip().upper()
        
        # Pattern: SV + số
        match = re.search(r'(SV\d+)', student_id)
        if match:
            return match.group(1)
        
        # Pattern: chỉ số (001, 002, 1, 2, ...)
        match = re.search(r'(\d+)', student_id)
        if match:
            num = match.group(1)
            # Thêm prefix SV và pad với zeros
            if len(num) <= 4:
                return f"SV{num.zfill(3)}"
        
        return None
    
    def _normalize_grade(self, grade) -> Optional[float]:
        """
        Chuẩn hóa điểm số
        
        Args:
            grade: Raw grade (có thể là int, float, hoặc string)
            
        Returns:
            Normalized grade (0-10, bước 0.25)
        """
        try:
            # Convert to float
            if isinstance(grade, str):
                # Replace comma with dot
                grade = grade.replace(',', '.')
                grade = float(grade)
            elif isinstance(grade, (int, float)):
                grade = float(grade)
            else:
                return None
            
            # Validate range
            if not (0 <= grade <= 10):
                logger.warning(f"Grade {grade} out of range 0-10")
                return None
            
            # Round to nearest 0.25
            grade = round(grade * 4) / 4
            grade = min(10.0, max(0.0, grade))
            
            return grade
            
        except (ValueError, TypeError) as e:
            logger.error(f"Error normalizing grade '{grade}': {e}")
            return None
    
    def export_to_excel_format(self, parsed_data: Dict) -> List[Dict]:
        """
        Convert parsed data sang format phù hợp với bulk import
        Returns: List[{student_id, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki}]
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


# Singleton instance
_ocr_service_instance = None

def get_ocr_service() -> GradeSheetOCRService:
    """Get or create OCR service singleton"""
    global _ocr_service_instance
    if _ocr_service_instance is None:
        _ocr_service_instance = GradeSheetOCRService()
    return _ocr_service_instance

