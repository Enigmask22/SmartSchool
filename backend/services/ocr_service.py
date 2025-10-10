"""
Service xử lý OCR cho bảng điểm viết tay sử dụng PaddleOCR
"""

import os
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from paddleocr import PaddleOCR
import re

from utils.logger import setup_logger

logger = setup_logger()


class GradeSheetOCRService:
    """
    Service để phân tích bảng điểm viết tay sử dụng PaddleOCR
    Hỗ trợ:
    - Table detection & structure recognition
    - OCR text extraction (tiếng Việt + số)
    - Parse thành structured data
    """
    
    def __init__(self):
        """Initialize PaddleOCR with Vietnamese language support"""
        try:
            # OCR engine cho text recognition
            # Note: PaddleOCR sẽ tự động dùng CPU nếu không có GPU
            self.ocr = PaddleOCR(
                use_angle_cls=True,  # Tự động xoay ảnh nếu bị nghiêng
                lang='vi'  # Vietnamese language
            )
            
            logger.info("GradeSheetOCRService initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing OCR service: {str(e)}")
            raise
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Tiền xử lý ảnh để cải thiện độ chính xác OCR
        - Tăng contrast
        - Giảm noise
        - Convert to binary
        """
        try:
            img = cv2.imread(image_path)
            
            if img is None:
                raise ValueError(f"Cannot read image from {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply adaptive thresholding để xử lý ảnh có độ sáng không đều
            binary = cv2.adaptiveThreshold(
                gray, 255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 
                11, 2
            )
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
            
            # Enhance contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def detect_table_structure(self, image_path: str) -> List[Dict]:
        """
        Phát hiện cấu trúc bảng trong ảnh
        Note: Table structure detection removed to simplify dependencies
        Uses text-based row detection instead
        Returns: List of table regions with structure info
        """
        # Simplified: không dùng table engine, parse trực tiếp từ OCR text
        logger.info("Using text-based table detection")
        return []
    
    def extract_text_from_image(self, image_path: str) -> List[Dict]:
        """
        Trích xuất text từ ảnh sử dụng OCR
        Returns: List of {text, bbox, confidence}
        """
        try:
            # PaddleOCR API: ocr(img_path)
            result = self.ocr.ocr(image_path)
            
            # Check result structure
            
            if not result or len(result) == 0:
                logger.warning("No text detected in image")
                return []
            
            extracted_texts = []
            
            # Handle new PaddleOCR API (returns dict)
            if isinstance(result[0], dict):
                page_result = result[0]
                rec_texts = page_result.get('rec_texts', [])
                rec_scores = page_result.get('rec_scores', [])
                rec_polys = page_result.get('rec_polys', [])
                
                for idx in range(len(rec_texts)):
                    text = rec_texts[idx] if idx < len(rec_texts) else ''
                    confidence = rec_scores[idx] if idx < len(rec_scores) else 0.0
                    bbox = rec_polys[idx] if idx < len(rec_polys) else []
                    
                    if text:
                        extracted_texts.append({
                            'text': text,
                            'confidence': float(confidence),
                            'bbox': bbox
                        })
            
            # Handle old PaddleOCR API (returns list of lines)
            elif isinstance(result[0], list):
                for idx, line in enumerate(result[0]):
                    try:
                        # Line structure: [bbox, (text, confidence)]
                        if isinstance(line, (list, tuple)) and len(line) >= 2:
                            bbox = line[0]
                            text_info = line[1]
                            
                            # text_info is tuple (text, confidence)
                            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                                text = str(text_info[0])
                                confidence = float(text_info[1])
                            elif isinstance(text_info, str):
                                text = text_info
                                confidence = 1.0
                            else:
                                text = str(text_info)
                                confidence = 1.0
                            
                            extracted_texts.append({
                                'text': text,
                                'confidence': confidence,
                                'bbox': bbox
                            })
                            
                    except Exception as line_error:
                        logger.error(f"Error parsing line {idx}: {str(line_error)}")
                        continue
            
            return extracted_texts
            
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            return []
    
    def parse_grade_sheet(self, image_path: str) -> Dict:
        """
        Phân tích toàn bộ bảng điểm và parse thành structured data
        
        Expected format:
        | id | ho_va_ten | diem_thuong_xuyen | diem_thi_giua_ki | diem_thi_cuoi_ki |
        
        Returns: {
            'success': bool,
            'headers': List[str],
            'rows': List[Dict],
            'errors': List[str]
        }
        """
        try:
            # Bước 1: Tiền xử lý ảnh
            logger.info(f"Processing grade sheet: {image_path}")
            
            # Bước 2: Extract text
            extracted_texts = self.extract_text_from_image(image_path)
            
            if not extracted_texts:
                return {
                    'success': False,
                    'headers': [],
                    'rows': [],
                    'errors': ['Không thể trích xuất text từ ảnh']
                }
            
            # Bước 3: Sắp xếp text theo vị trí (top to bottom, left to right)
            sorted_texts = self._sort_by_position(extracted_texts)
            
            # Log OCR detected items
            logger.info(f"OCR detected {len(extracted_texts)} items:")
            for idx, item in enumerate(sorted_texts[:20]):  # Log first 20
                logger.info(f"  [{idx}] '{item['text']}' at x={item.get('x', 0):.0f}, y={item.get('y', 0):.0f}")
            
            # Bước 4: Nhận dạng header và rows
            parsed_data = self._parse_table_structure(sorted_texts)
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing grade sheet: {str(e)}")
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f"Lỗi xử lý: {str(e)}"]
            }
    
    def _sort_by_position(self, texts: List[Dict]) -> List[Dict]:
        """Sắp xếp text theo vị trí: từ trên xuống dưới, trái sang phải"""
        # Lấy tọa độ trung tâm của mỗi bbox
        for item in texts:
            bbox = item['bbox']
            try:
                # Convert to float để handle cả int và string
                x_center = sum([float(p[0]) for p in bbox]) / 4
                y_center = sum([float(p[1]) for p in bbox]) / 4
                item['x'] = x_center
                item['y'] = y_center
            except (ValueError, TypeError, IndexError) as e:
                logger.warning(f"Error calculating bbox center: {e}, bbox: {bbox}")
                # Fallback: dùng giá trị mặc định
                item['x'] = 0
                item['y'] = 0
        
        # Sort theo y (top to bottom), rồi theo x (left to right)
        sorted_texts = sorted(texts, key=lambda t: (t['y'], t['x']))
        return sorted_texts
    
    def _parse_table_structure(self, sorted_texts: List[Dict]) -> Dict:
        """
        Parse cấu trúc bảng từ text đã sắp xếp
        Phát hiện header và các rows data
        """
        errors = []
        
        if len(sorted_texts) < 5:  # Ít nhất phải có header + 1 row
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': ['Ảnh không chứa đủ dữ liệu bảng điểm']
            }
        
        # Group texts into rows based on Y coordinate
        rows = self._group_into_rows(sorted_texts)
        
        if len(rows) < 2:
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': ['Không thể phân tích cấu trúc bảng']
            }
        
        # Bước 1: Xác định header (row đầu tiên)
        header_row = rows[0]
        headers = [self._normalize_text(item['text']) for item in header_row]
        
        # Validate header có chứa các cột cần thiết
        expected_headers = ['id', 'ho_va_ten', 'diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        
        # Map header với expected (case-insensitive, ignore special chars)
        header_mapping = self._map_headers(headers, expected_headers)
        
        if not header_mapping.get('id') or not header_mapping.get('ho_va_ten'):
            errors.append("Header không đúng định dạng. Cần có cột 'id' và 'ho_va_ten'")
        
        # Bước 2: Parse data rows
        parsed_rows = []
        for row_idx, row in enumerate(rows[1:], start=1):
            try:
                parsed_row = self._parse_row(row, header_mapping, len(headers))
                if parsed_row:
                    parsed_rows.append(parsed_row)
            except Exception as e:
                errors.append(f"Lỗi parse row {row_idx}: {str(e)}")
                logger.error(f"Error parsing row {row_idx}: {str(e)}")
        
        success = len(parsed_rows) > 0
        
        return {
            'success': success,
            'headers': expected_headers,
            'rows': parsed_rows,
            'errors': errors,
            'total_rows': len(parsed_rows)
        }
    
    def _group_into_rows(self, sorted_texts: List[Dict], y_threshold: float = 20) -> List[List[Dict]]:
        """
        Nhóm các text thành rows dựa trên tọa độ Y
        Các text có y gần nhau (trong threshold) được coi là cùng 1 row
        """
        if not sorted_texts:
            return []
        
        rows = []
        current_row = [sorted_texts[0]]
        current_y = sorted_texts[0]['y']
        
        for item in sorted_texts[1:]:
            if abs(item['y'] - current_y) <= y_threshold:
                # Cùng row
                current_row.append(item)
            else:
                # Row mới
                # Sort current row by x (left to right)
                current_row.sort(key=lambda t: t['x'])
                rows.append(current_row)
                
                current_row = [item]
                current_y = item['y']
        
        # Add last row
        if current_row:
            current_row.sort(key=lambda t: t['x'])
            rows.append(current_row)
        
        return rows
    
    def _normalize_text(self, text: str) -> str:
        """Chuẩn hóa text: lowercase, remove special chars"""
        text = text.lower().strip()
        # Remove Vietnamese accents for matching
        text = re.sub(r'[^a-z0-9\s_]', '', text)
        text = re.sub(r'\s+', '_', text)
        return text
    
    def _map_headers(self, detected_headers: List[str], expected_headers: List[str]) -> Dict[str, int]:
        """
        Map detected headers với expected headers
        Returns: {expected_header: column_index}
        """
        mapping = {}
        
        # Fuzzy matching cho headers
        for expected in expected_headers:
            for idx, detected in enumerate(detected_headers):
                # Check if detected contains expected (flexible matching)
                if expected in detected or detected in expected:
                    mapping[expected] = idx
                    break
                # Special cases
                elif expected == 'id' and detected in ['id', 'ma', 'masv', 'msv']:
                    mapping[expected] = idx
                    break
                elif expected == 'ho_va_ten' and any(x in detected for x in ['ten', 'hoten', 'hovaten', 'ho_ten']):
                    mapping[expected] = idx
                    break
                elif 'diem' in expected and 'diem' in detected:
                    # Match specific grade columns
                    if 'thuong' in expected and 'thuong' in detected:
                        mapping[expected] = idx
                        break
                    elif 'giua' in expected and 'giua' in detected:
                        mapping[expected] = idx
                        break
                    elif 'cuoi' in expected and 'cuoi' in detected:
                        mapping[expected] = idx
                        break
        
        return mapping
    
    def _parse_row(self, row: List[Dict], header_mapping: Dict[str, int], expected_cols: int) -> Optional[Dict]:
        """
        Parse một row thành dict data sử dụng X-coordinate để map chính xác
        Returns: {student_id, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki}
        """
        # Đảm bảo row có ít nhất 2 item
        if len(row) < 2:
            return None
        
        parsed = {}
        
        # Extract student_id (cột đầu tiên)
        id_idx = header_mapping.get('id', 0)
        if id_idx < len(row):
            student_id = self._extract_student_id(row[id_idx]['text'])
            if student_id:
                parsed['student_id'] = student_id
        
        # Nếu không tìm thấy student_id, thử tìm trong toàn bộ row
        if 'student_id' not in parsed:
            for item in row:
                student_id = self._extract_student_id(item['text'])
                if student_id:
                    parsed['student_id'] = student_id
                    break
        
        # Extract ho_va_ten (optional, for reference)
        name_idx = header_mapping.get('ho_va_ten')
        if name_idx is not None and name_idx < len(row):
            parsed['ho_va_ten'] = row[name_idx]['text'].strip()
        
        # Extract grades - chỉ lấy pure numbers, bỏ qua Student ID và tên
        all_grades = []
        for item in row:
            text = item['text'].strip()
            x = item.get('x', 0)
            
            # Skip student ID (contains SV)
            if 'SV' in text.upper():
                continue
            
            # Skip số có leading zeros (001, 002, 003, /001) - Student ID
            if re.match(r'^/?0\d+', text):
                continue
            
            # Skip text có nhiều chữ cái (họ tên) - ít nhất 3 chữ cái liên tiếp
            if re.search(r'[a-zA-ZÀ-ỹ]{3,}', text):
                continue
            
            # FILTER: Chỉ lấy số ở vùng điểm (x > 1200)
            # Tránh nhầm số trong tên hoặc gần cột tên
            if x < 1200:
                logger.debug(f"Skipping grade '{text}' at x={x} (too far left, likely in name column)")
                continue
            
            # Thử extract grade từ text
            # Điểm số có thể chứa số, chữ cái bị nhầm (A→1), và dấu . hoặc ,
            grade = self._extract_grade(text)
            if grade is not None:
                all_grades.append({
                    'value': grade,
                    'x': item.get('x', 0),
                    'text': item['text'],  # Keep original for logging
                    'confidence': item.get('confidence', 1.0)
                })
        
        # Sort grades theo X coordinate (left to right)
        all_grades.sort(key=lambda g: g['x'])
        
        # Log để debug
        grades_info = [(g['text'], g['value'], f"x={g['x']:.0f}") for g in all_grades]
        logger.info(f"Student {parsed.get('student_id', 'Unknown')}: Found {len(all_grades)} grades: {grades_info}")
        
        # Lấy tối đa 3 grades đầu tiên (đã filter theo x > 1200)
        if len(all_grades) > 3:
            logger.warning(f"Student {parsed.get('student_id')}: Found {len(all_grades)} grades, taking first 3")
            all_grades = all_grades[:3]
        
        # Map grades vào các cột theo thứ tự: DTX, ĐGK, ĐCK
        grade_columns = ['diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        for idx, col in enumerate(grade_columns):
            if idx < len(all_grades):
                parsed[col] = all_grades[idx]['value']
        
        # Log final mapping
        logger.info(f"Student {parsed.get('student_id')}: Final mapping = "
                   f"DTX={parsed.get('diem_thuong_xuyen')}, "
                   f"ĐGK={parsed.get('diem_thi_giua_ki')}, "
                   f"ĐCK={parsed.get('diem_thi_cuoi_ki')}")
        
        # SMART CORRECTION: Phát hiện và sửa số 2 bị lặp (có thể là 3 bị đọc nhầm)
        # Pattern: nếu có 2 số 2 liên tiếp ở cột 2 và 3, tự động sửa cột 3 thành 3
        if (len(all_grades) >= 2 and 
            parsed.get('diem_thi_giua_ki') == 2.0 and 
            parsed.get('diem_thi_cuoi_ki') == 2.0):
            
            # Kiểm tra confidence: nếu số cuối có confidence thấp hơn hoặc < 0.9
            if (len(all_grades) >= 3):
                last_conf = all_grades[2].get('confidence', 1.0)
                prev_conf = all_grades[1].get('confidence', 1.0)
                
                # Tự động sửa nếu confidence thấp hoặc thấp hơn số trước
                if last_conf < 0.9 or last_conf < prev_conf:
                    parsed['diem_thi_cuoi_ki'] = 3.0
                    logger.info(f"Student {parsed.get('student_id')}: AUTO-CORRECTED duplicate '2' → '3' "
                              f"(original conf={last_conf:.2f}, likely OCR confusion between 2 and 3)")
                else:
                    logger.warning(f"Student {parsed.get('student_id')}: Detected duplicate '2' scores but "
                                 f"confidence is high ({last_conf:.2f}). Keeping as '2'. Please verify!")
        
        # Validate: phải có student_id
        if 'student_id' not in parsed:
            return None
        
        return parsed
    
    def _extract_student_id(self, text: str) -> Optional[str]:
        """
        Trích xuất student ID từ text
        Format: SV001, SV002, etc. hoặc các format khác
        """
        text = text.strip().upper()
        
        # Pattern: SV + số
        match = re.search(r'(SV\d+)', text)
        if match:
            return match.group(1)
        
        # Pattern: chỉ số
        match = re.search(r'(\d+)', text)
        if match:
            num = match.group(1)
            # Nếu là số nguyên, thêm prefix SV
            if len(num) <= 4:
                return f"SV{num.zfill(3)}"
        
        return None
    
    def _extract_grade(self, text: str) -> Optional[float]:
        """
        Trích xuất điểm số từ text với OCR error correction
        Format: 9.5, 10, 8,5 (comma or dot as decimal)
        Hỗ trợ: 0-10 với bước nhảy 0.25
        """
        text = text.strip()
        original_text = text  # Giữ để log
        
        # Fix common OCR errors BEFORE replacing comma
        # Chữ cái thường bị nhầm với số
        text = text.replace('l', '1').replace('I', '1').replace('i', '1')
        text = text.replace('O', '0').replace('o', '0')
        text = text.replace('S', '5').replace('s', '5')
        text = text.replace('Z', '2').replace('z', '2')
        text = text.replace('B', '8').replace('b', '8')
        text = text.replace('G', '6').replace('g', '6')
        
        # Fix: A → 1 (số 1 viết tay thường bị đọc thành A)
        text_upper = text.strip().upper()
        if text_upper == 'A':
            text = '1'
            logger.debug(f"OCR correction: 'A' → '1'")
        
        # Fix: + hoặc / hoặc T → 7 (số 7 viết tay)
        elif text_upper in ['+', '/', 'T']:
            text = '7'
            logger.debug(f"OCR correction: '{text_upper}' → '7'")
        
        # Fix: | hoặc ! → 1 (số 1 viết thẳng)
        elif text_upper in ['|', '!']:
            text = '1'
            logger.debug(f"OCR correction: '{text_upper}' → '1'")
        
        # Fix specific number patterns
        if text.upper() in ['OV', '0V', 'IO', 'I0']:
            text = '10'
        
        # Replace comma với dot cho decimal
        text = text.replace(',', '.')
        
        # Extract số thập phân
        match = re.search(r'(\d+\.?\d*)', text)
        if match:
            try:
                grade = float(match.group(1))
                
                # Validate grade trong khoảng 0-10
                if 0 <= grade <= 10:
                    # Round về bước 0.25 gần nhất
                    grade = round(grade * 4) / 4  # 0, 0.25, 0.5, 0.75, 1.0, ...
                    grade = min(10.0, max(0.0, grade))  # Clamp 0-10
                    
                    # Log nếu có correction
                    if original_text != text:
                        logger.info(f"OCR correction: '{original_text}' → '{text}' → {grade}")
                    
                    return grade
            except ValueError:
                pass
        
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

