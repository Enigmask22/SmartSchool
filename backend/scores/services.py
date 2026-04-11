"""
Scores Services
"""

from typing import List, Optional, Dict
from pathlib import Path
from datetime import datetime, timedelta
from core.logger import setup_logger

logger = setup_logger("scores_service")

def calculate_final_grade(score_data: dict, score_config: dict = None) -> float:
    """Tính điểm tổng kết dựa trên score_data và config"""
    try:
        # Helper function to flatten nested score_config
        def flatten_score_config(config):
            """Flatten nested config structure to handle child columns"""
            flattened = {}
            for column_name, column_config in config.items():
                if isinstance(column_config, dict) and 'data' in column_config:
                    # Parent column with children - extract each child
                    for child_key, child_config in column_config['data'].items():
                        flattened[child_key] = child_config
                else:
                    # Regular column
                    flattened[column_name] = column_config
            return flattened
        
        if score_config:
            # Flatten the config first to handle nested structures
            flat_config = flatten_score_config(score_config)
            
            # Gom tất cả các cột điểm thường xuyên (Diem_tx*)
            tx_scores = []
            # Gom các cột điểm thi
            giua_ki_score = None
            giua_ki_weight = 0
            cuoi_ki_score = None
            cuoi_ki_weight = 0
            
            # Kiểm tra xem tất cả điểm có phải là chữ không
            is_all_letter_grades = True
            has_any_grade = False
            
            for column_name, column_config in flat_config.items():
                if column_name in score_data and "Diem" in score_data[column_name]:
                    has_any_grade = True
                    diem_value = score_data[column_name]["Diem"]
                    is_letter = isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']
                    if not is_letter:
                        is_all_letter_grades = False
            
            if not has_any_grade:
                return 0.0
            
            for column_name, column_config in flat_config.items():
                if column_name in score_data and "Diem" in score_data[column_name]:
                    diem_value = score_data[column_name]["Diem"]
                    
                    # Nếu là điểm chữ, convert sang số
                    if is_all_letter_grades and isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        score = 1.0 if diem_value == 'Đ' else 0.0
                    elif isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        continue  # Skip nếu không phải tất cả là chữ
                    else:
                        score = float(diem_value)
                    weight = float(column_config.get("he_so", 1))
                    
                    # Phân loại theo loại cột
                    if column_name.startswith('Diem_tx'):
                        # Điểm thường xuyên
                        tx_scores.append(score)
                    elif column_name == 'Diem_thi_giua_ki':
                        # Điểm giữa kì
                        giua_ki_score = score
                        giua_ki_weight = weight
                    elif column_name == 'Diem_thi_cuoi_ki':
                        # Điểm cuối kì
                        cuoi_ki_score = score
                        cuoi_ki_weight = weight
            
            # Tính điểm thường xuyên trung bình
            tx_average = 0
            if tx_scores:
                tx_average = sum(tx_scores) / len(tx_scores)
            
            # Áp dụng công thức: (Điểm_thường_xuyên × 1 + Điểm_giữa_kì × 2 + Điểm_cuối_kì × 3) / 6
            total_score = 0
            total_weight = 0
            
            if tx_scores:
                total_score += tx_average * 1
                total_weight += 1
            
            if giua_ki_score is not None:
                total_score += giua_ki_score * giua_ki_weight
                total_weight += giua_ki_weight
            
            if cuoi_ki_score is not None:
                total_score += cuoi_ki_score * cuoi_ki_weight
                total_weight += cuoi_ki_weight
            
            if total_weight > 0:
                # Nếu là điểm chữ, không chia cho total_weight, so sánh trực tiếp với 5
                if is_all_letter_grades:
                    return "Đ" if total_score >= 5 else "KĐ"
                final_numeric_score = total_score / total_weight
                return round(final_numeric_score, 2)
            return 0.0
        else:
            # Use weights from score_data
            # Gom tất cả các cột điểm thường xuyên (Diem_tx*)
            tx_scores = []
            # Gom các cột điểm thi
            giua_ki_score = None
            giua_ki_weight = 0
            cuoi_ki_score = None
            cuoi_ki_weight = 0
            
            # Kiểm tra xem tất cả điểm có phải là chữ không
            is_all_letter_grades = True
            has_any_grade = False
            
            for column_name, value in score_data.items():
                if isinstance(value, dict) and "Diem" in value:
                    has_any_grade = True
                    diem_value = value.get("Diem", 0)
                    is_letter = isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']
                    if not is_letter:
                        is_all_letter_grades = False
            
            if not has_any_grade:
                return 0.0
            
            for column_name, value in score_data.items():
                if isinstance(value, dict) and "Diem" in value:
                    diem_value = value.get("Diem", 0)
                    
                    # Nếu là điểm chữ, convert sang số
                    if is_all_letter_grades and isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        score = 1.0 if diem_value == 'Đ' else 0.0
                    elif isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        continue  # Skip nếu không phải tất cả là chữ
                    else:
                        score = float(diem_value)
                    weight = float(value.get("He_so", 1))
                    
                    # Phân loại theo loại cột
                    if column_name.startswith('Diem_tx'):
                        # Điểm thường xuyên
                        tx_scores.append(score)
                    elif column_name == 'Diem_thi_giua_ki':
                        # Điểm giữa kì
                        giua_ki_score = score
                        giua_ki_weight = weight
                    elif column_name == 'Diem_thi_cuoi_ki':
                        # Điểm cuối kì
                        cuoi_ki_score = score
                        cuoi_ki_weight = weight
            
            # Tính điểm thường xuyên trung bình
            tx_average = 0
            if tx_scores:
                tx_average = sum(tx_scores) / len(tx_scores)
            
            # Áp dụng công thức: (Điểm_thường_xuyên × 1 + Điểm_giữa_kì × 2 + Điểm_cuối_kì × 3) / 6
            total_score = 0
            total_weight = 0
            
            if tx_scores:
                total_score += tx_average * 1
                total_weight += 1
            
            if giua_ki_score is not None:
                total_score += giua_ki_score * giua_ki_weight
                total_weight += giua_ki_weight
            
            if cuoi_ki_score is not None:
                total_score += cuoi_ki_score * cuoi_ki_weight
                total_weight += cuoi_ki_weight
            
            if total_weight > 0:
                # Nếu là điểm chữ, không chia cho total_weight, so sánh trực tiếp với 5
                if is_all_letter_grades:
                    return "Đ" if total_score >= 5 else "KĐ"
                final_numeric_score = total_score / total_weight
                return round(final_numeric_score, 2)
            return 0.0
    except Exception as e:
        logger.error(f"Error calculating score: {str(e)}")
        return 0.0


def _infer_column_stage_priority(column_key: str, column_label: str = "") -> int:
    """Gán mức ưu tiên theo giai đoạn kiểm tra để sắp xếp chuỗi thời gian.
    Giá trị nhỏ hơn xuất hiện sớm hơn trong học kỳ.
    """
    key = (column_key or "").lower()
    label = (column_label or "").lower()
    text = f"{key} {label}"
    # Ưu tiên theo từ khóa phổ biến trong tên cột
    # 0-1: thường xuyên/miệng/15p, 2: giữa kỳ, 3: cuối kỳ/học kỳ
    if any(k in text for k in ["thuong", "tx", "mieng", "15", "kiem_tra_ngan", "practice"]):
        return 0
    if any(k in text for k in ["giua", "giuaki", "mid"]):
        return 2
    if any(k in text for k in ["cuoi", "cuoiki", "hk", "final", "tong_ket"]):
        return 3
    # Mặc định coi là điểm quá trình
    return 1


# def _extract_ordered_points(score_data: dict, score_config: Optional[dict]) -> List[dict]:
#     """Trả về danh sách điểm đã sắp theo thời gian với trọng số.
#     Mỗi phần tử: {name, score, weight, stage}
#     - Hỗ trợ format grade_settings: nhiều cột thường xuyên (Diem_tx1, Diem_tx2, ...)
#     - Nếu có score_config: flatten để lấy đúng he_so/label cả cho cột con
#     - Bỏ qua cột thiếu điểm hoặc không phải số (ví dụ Đ/KĐ)
#     """
#     # Flatten config nếu có (để map trực tiếp theo key con như Diem_tx1, ...)
#     flat_config: Dict[str, Dict] = {}
#     if score_config and isinstance(score_config, dict):
#         for col_key, col_cfg in score_config.items():
#             if isinstance(col_cfg, dict) and "data" in col_cfg:
#                 for child_key, child_cfg in (col_cfg.get("data") or {}).items():
#                     flat_config[child_key] = child_cfg or {}
#             else:
#                 flat_config[col_key] = col_cfg or {}

#     points: List[dict] = []
#     for column_name, value in (score_data or {}).items():
#         try:
#             if not isinstance(value, dict) or "Diem" not in value:
#                 continue
#             diem_value = value.get("Diem")
#             # Bỏ qua điểm chữ (Đ/KĐ) trong phân tích xu hướng
#             if isinstance(diem_value, str):
#                 try:
#                     score = float(diem_value)
#                 except Exception:
#                     continue
#             else:
#                 score = float(diem_value)

#             weight = None
#             label = ""
#             cfg = flat_config.get(column_name)
#             if cfg is not None:
#                 weight = cfg.get("he_so")
#                 label = cfg.get("label", "")
#             if weight is None:
#                 weight = value.get("He_so", 1)
#             weight = float(weight) if weight is not None else 1.0

#             stage = _infer_column_stage_priority(column_name, label)
#             points.append({
#                 "name": column_name,
#                 "score": score,
#                 "weight": weight,
#                 "stage": stage
#             })
#         except Exception:
#             continue
#     # Sắp xếp theo stage rồi tới tên cột để ổn định thứ tự thời gian
#     points.sort(key=lambda p: (p["stage"], p["name"]))
#     return points


# def analyze_grade_trend(score_data: dict, score_config: Optional[dict] = None) -> dict:
#     """Phân tích xu hướng điểm trong một môn dựa trên chuỗi cột điểm.

#     Thuật toán: hồi quy tuyến tính có trọng số (x = 1..n, y = điểm, w = hệ số).
#     - slope > +epsilon  => xu hướng tăng
#     - slope < -epsilon  => xu hướng giảm
#     - |slope| <= epsilon => ổn định

#     Trả về: {
#         direction: up|down|stable,
#         slope: float,
#         confidence: float (0..1),
#         ordered_points: [...],
#         reason: str
#     }
#     """
#     points = _extract_ordered_points(score_data, score_config)
#     logger.info(f"Points: {points}")
#     n = len(points)
#     if n < 2:
#         return {
#             "direction": "stable",
#             "slope": 0.0,
#             "confidence": 0.0,
#             "ordered_points": points,
#             "reason": "Không đủ dữ liệu để xác định xu hướng"
#         }

#     # Chuẩn bị dữ liệu hồi quy
#     xs = [i + 1 for i in range(n)]
#     ys = [p["score"] for p in points]
#     ws = [max(float(p["weight"]), 0.0001) for p in points]

#     # Tính slope theo công thức hồi quy tuyến tính có trọng số
#     W = sum(ws)
#     x_bar = sum(w * x for w, x in zip(ws, xs)) / W
#     y_bar = sum(w * y for w, y in zip(ws, ys)) / W
#     s_xx = sum(w * (x - x_bar) * (x - x_bar) for w, x in zip(ws, xs))
#     s_xy = sum(w * (x - x_bar) * (y - y_bar) for w, x, y in zip(ws, xs, ys))
#     slope = s_xy / s_xx if s_xx != 0 else 0.0

#     # Ước lượng độ tin cậy: dựa vào tương quan tuyến tính (R^2) và số điểm
#     ss_tot = sum(w * (y - y_bar) * (y - y_bar) for w, y in zip(ws, ys))
#     ss_res = sum(w * (y - (y_bar + slope * (x - x_bar))) ** 2 for w, x, y in zip(ws, xs, ys))
#     r2 = 0.0 if ss_tot == 0 else max(0.0, 1.0 - (ss_res / ss_tot))
#     confidence = max(0.0, min(1.0, 0.4 + 0.5 * r2 + 0.1 * (n - 2)))  # Heuristic nhẹ

#     epsilon = 0.15  # Ngưỡng để coi là tăng/giảm có ý nghĩa
#     if slope > epsilon:
#         direction = "up"
#     elif slope < -epsilon:
#         direction = "down"
#     else:
#         direction = "stable"

#     # Sinh mô tả ngắn gọn
#     first_avg = ys[0]
#     last_avg = ys[-1]
#     delta = last_avg - first_avg
#     if direction == "up":
#         reason = f"Điểm tăng từ {round(first_avg, 2)} lên {round(last_avg, 2)} (Δ={round(delta, 2)}); các cột sau có xu hướng cao hơn."
#     elif direction == "down":
#         reason = f"Điểm giảm từ {round(first_avg, 2)} xuống {round(last_avg, 2)} (Δ={round(delta, 2)}); các cột sau có xu hướng thấp hơn."
#     else:
#         reason = f"Điểm ổn định quanh {round(y_bar, 2)}; biến động nhỏ giữa các cột."

#     return {
#         "direction": direction,
#         "slope": round(float(slope), 3),
#         "confidence": round(float(confidence), 2),
#         "ordered_points": points,
#         "reason": reason
#     }


def cleanup_old_score_sheets(max_age_hours: int = 24) -> int:
    """
    Dọn dẹp các ảnh score sheets đã cũ hơn max_age_hours
    
    Args:
        max_age_hours: Số giờ tối đa để giữ file (mặc định: 24 giờ)
    
    Returns:
        Số lượng files đã xóa
    """
    deleted_count = 0
    try:
        upload_dir = Path("uploads/score_sheets")
        if not upload_dir.exists():
            return 0
        
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        for file_path in upload_dir.glob("score_sheet_*"):
            try:
                # Lấy thời gian modified của file
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                
                if file_mtime < cutoff_time:
                    file_path.unlink()
                    deleted_count += 1
                    logger.debug(f"Đã xóa score sheet cũ: {file_path.name}")
                    
            except Exception as e:
                logger.error(f"Lỗi xóa file {file_path}: {str(e)}")
        
        if deleted_count > 0:
            logger.info(f"🧹 Đã dọn dẹp {deleted_count} ảnh score sheets cũ (>{max_age_hours}h)")
        
    except Exception as e:
        logger.error(f"❌ Lỗi dọn dẹp score sheets: {str(e)}")
    
    return deleted_count
