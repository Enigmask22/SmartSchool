"""
Service xử lý OCR cho bảng điểm viết tay sử dụng Vintern-1B-v3.5
Vision Language Model mạnh mẽ cho OCR tiếng Việt
Source: https://huggingface.co/5CD-AI/Vintern-1B-v3_5
"""

import os
import json
from typing import List, Dict, Optional
from PIL import Image
import re
import torch
import torchvision.transforms as T
from torchvision.transforms.functional import InterpolationMode
from transformers import AutoModel, AutoTokenizer

from utils.logger import setup_logger

logger = setup_logger()

# Constants từ Vintern example code
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def build_transform(input_size):
    """Build image transform pipeline"""
    MEAN, STD = IMAGENET_MEAN, IMAGENET_STD
    transform = T.Compose([
        T.Lambda(lambda img: img.convert('RGB') if img.mode != 'RGB' else img),
        T.Resize((input_size, input_size), interpolation=InterpolationMode.BICUBIC),
        T.ToTensor(),
        T.Normalize(mean=MEAN, std=STD)
    ])
    return transform


def find_closest_aspect_ratio(aspect_ratio, target_ratios, width, height, image_size):
    """Find closest aspect ratio from target ratios"""
    best_ratio_diff = float('inf')
    best_ratio = (1, 1)
    area = width * height
    for ratio in target_ratios:
        target_aspect_ratio = ratio[0] / ratio[1]
        ratio_diff = abs(aspect_ratio - target_aspect_ratio)
        if ratio_diff < best_ratio_diff:
            best_ratio_diff = ratio_diff
            best_ratio = ratio
        elif ratio_diff == best_ratio_diff:
            if area > 0.5 * image_size * image_size * ratio[0] * ratio[1]:
                best_ratio = ratio
    return best_ratio


def dynamic_preprocess(image, min_num=1, max_num=12, image_size=448, use_thumbnail=False):
    """Dynamic preprocess image based on aspect ratio"""
    orig_width, orig_height = image.size
    aspect_ratio = orig_width / orig_height

    target_ratios = set(
        (i, j) for n in range(min_num, max_num + 1) for i in range(1, n + 1) for j in range(1, n + 1) if
        i * j <= max_num and i * j >= min_num)
    target_ratios = sorted(target_ratios, key=lambda x: x[0] * x[1])

    target_aspect_ratio = find_closest_aspect_ratio(
        aspect_ratio, target_ratios, orig_width, orig_height, image_size)

    target_width = image_size * target_aspect_ratio[0]
    target_height = image_size * target_aspect_ratio[1]
    blocks = target_aspect_ratio[0] * target_aspect_ratio[1]

    resized_img = image.resize((target_width, target_height))
    processed_images = []
    for i in range(blocks):
        box = (
            (i % (target_width // image_size)) * image_size,
            (i // (target_width // image_size)) * image_size,
            ((i % (target_width // image_size)) + 1) * image_size,
            ((i // (target_width // image_size)) + 1) * image_size
        )
        split_img = resized_img.crop(box)
        processed_images.append(split_img)
    assert len(processed_images) == blocks
    if use_thumbnail and len(processed_images) != 1:
        thumbnail_img = image.resize((image_size, image_size))
        processed_images.append(thumbnail_img)
    return processed_images


def load_image_for_vintern(image, input_size=448, max_num=12):
    """Load and preprocess image for Vintern model"""
    transform = build_transform(input_size=input_size)
    images = dynamic_preprocess(image, image_size=input_size, use_thumbnail=True, max_num=max_num)
    pixel_values = [transform(img) for img in images]
    pixel_values = torch.stack(pixel_values)
    return pixel_values


class VinternOCRService:
    """
    Service để phân tích bảng điểm viết tay sử dụng Vintern-1B-v3.5
    Hỗ trợ:
    - Đọc bảng điểm với độ chính xác cao (Vi-MTVQA: 41.9%)
    - Trích xuất cấu trúc bảng tự động
    - Parse thành structured data
    - Chạy local trên GPU hoặc CPU
    
    Model: https://huggingface.co/5CD-AI/Vintern-1B-v3_5
    """
    
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Khởi tạo Vintern-1B-v3.5 OCR Service
        
        Args:
            model_path: Đường dẫn hoặc tên model (mặc định: "5CD-AI/Vintern-1B-v3_5")
            device: Device để chạy model ('cuda', 'cpu', hoặc None để auto-detect)
        """
        self.model_path = model_path or "5CD-AI/Vintern-1B-v3_5"
        
        # Auto-detect device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        self.model = None
        self.tokenizer = None
        
        logger.info(f"Initializing Vintern-1B-v3.5 OCR Service with device: {self.device}")
        self._initialize_model()
    
    def _initialize_model(self):
        """
        Khởi tạo Vintern-1B-v3.5 model và tokenizer
        """
        try:
            logger.info(f"Loading Vintern model from {self.model_path}...")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path,
                trust_remote_code=True,
                use_fast=False  # Vintern requires use_fast=False
            )
            
            # Load model
            torch_dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            self.model = AutoModel.from_pretrained(
                self.model_path,
                torch_dtype=torch_dtype,
                low_cpu_mem_usage=True,
                trust_remote_code=True,
                use_flash_attn=False  # Set False for compatibility
            )
            
            # Move to device
            if self.device == "cuda":
                self.model = self.model.cuda()
            
            # Set to eval mode
            self.model.eval()
            
            logger.info(f"Vintern-1B-v3.5 loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"ERROR: Lỗi khi khởi tạo Vintern model: {e}")
            raise
    
    def _create_ocr_prompt(self) -> str:
        """
        Tạo prompt chi tiết cho Vintern-1B-v3.5 để đọc bảng điểm
        
        Returns:
            Prompt đã được định dạng (với <image> tag)
        """
        # Vintern cần prompt NGẮN GỌN, TRỰC TIẾP
        prompt = """<image>
Đọc bảng điểm trong ảnh. Trích xuất CHÍNH XÁC thông tin từng dòng (KHÔNG BỊA RA).

Cấu trúc bảng: id | ho_va_ten | diem_thuong_xuyen | diem_thi_giua_ki | diem_thi_cuoi_ki

Quy tắc:
- ID: SV001, SV002, SV003... (hoặc 001, 002, 003...)
- Tên: Đọc ĐÚNG từ ảnh (có thể tiếng Việt hoặc tiếng Anh)
- Điểm: Số thập phân 0-10, dấu phẩy → dấu chấm
- Đọc TẤT CẢ các dòng trong bảng

Trả về JSON (CHỈ JSON, KHÔNG THÊM GÌ KHÁC):
```json
{
  "success": true,
  "headers": ["id", "ho_va_ten", "diem_thuong_xuyen", "diem_thi_giua_ki", "diem_thi_cuoi_ki"],
  "rows": [
    {"student_id": "SV001", "ho_va_ten": "...", "diem_thuong_xuyen": 7.25, "diem_thi_giua_ki": 8.5, "diem_thi_cuoi_ki": 9.75}
  ],
  "total_rows": 1,
  "errors": []
}
```"""
        return prompt
    
    def parse_grade_sheet(self, image_path: str) -> Dict:
        """
        Phân tích toàn bộ bảng điểm sử dụng VinternVL Vision API
        
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
            logger.info(f"Processing grade sheet with VinternVL: {image_path}")
            
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
                image = Image.open(image_path).convert('RGB')
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
            
            # Bước 4: Gửi request đến VinternVL
            logger.info("Processing image with VinternVL model...")
            response_text = self._generate_response(prompt, image)
            
            if not response_text:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': ['Không nhận được phản hồi từ VinternVL model'],
                    'total_rows': 0
                }
            
            # Bước 5: Parse JSON response
            logger.info("Received response from VinternVL, parsing...")
            parsed_data = self._parse_model_response(response_text)
            
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
    
    def _generate_response(self, prompt: str, image: Image.Image) -> str:
        """
        Generate response từ Vintern-1B-v3.5 model
        
        Args:
            prompt: Text prompt (với <image> tag)
            image: PIL Image
            
        Returns:
            Generated text response
        """
        try:
            # Preprocess image theo Vintern format
            # max_num=12 để model nhìn rõ hơn (tăng từ 6)
            pixel_values = load_image_for_vintern(image, max_num=12)
            
            # Move to device
            if self.device == "cuda":
                pixel_values = pixel_values.to(torch.bfloat16).cuda()
            else:
                pixel_values = pixel_values.to(torch.float32)
            
            # Generation config - tối ưu cho accuracy
            generation_config = dict(
                max_new_tokens=4096,  # Tăng để có thể return nhiều rows
                do_sample=False,  # Deterministic cho accuracy
                num_beams=5,  # Tăng từ 3 lên 5 cho chính xác hơn
                repetition_penalty=3.0,  # Tăng để giảm lặp lại
                temperature=0.1  # Low temperature cho factual output
            )
            
            # Generate response using Vintern's chat API
            # Format: model.chat(tokenizer, pixel_values, question, generation_config)
            response, _ = self.model.chat(
                self.tokenizer,
                pixel_values,
                prompt,
                generation_config,
                history=None,
                return_history=True
            )
            
            logger.info(f"Generated response length: {len(response)} chars")
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            return ""
    
    def _parse_model_response(self, response_text: str) -> Dict:
        """
        Parse JSON response từ VinternVL
        
        Args:
            response_text: Text response từ model
            
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
            
            logger.info(f"Successfully parsed VinternVL response: {data.get('total_rows', 0)} rows detected")
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Response text: {response_text[:500]}...")
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f'Không thể parse JSON từ VinternVL: {str(e)}'],
                'total_rows': 0
            }
    
    def _validate_and_normalize(self, data: Dict) -> Dict:
        """
        Validate và chuẩn hóa dữ liệu từ VinternVL
        
        Args:
            data: Raw data từ model
            
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
_vintern_ocr_service_instance = None

def get_vintern_ocr_service() -> VinternOCRService:
    """Get or create VinternVL OCR service singleton"""
    global _vintern_ocr_service_instance
    if _vintern_ocr_service_instance is None:
        _vintern_ocr_service_instance = VinternOCRService()
    return _vintern_ocr_service_instance

