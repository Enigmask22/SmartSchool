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
                if column_name == "is_char":
                    continue
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
                return None

            # Điểm chữ (Đ/KĐ): chỉ cần 1 cột KĐ là KĐ, không quan tâm hệ số
            if is_all_letter_grades:
                # Kiểm tra tất cả cột đã có giá trị
                for column_name in flat_config:
                    val = score_data.get(column_name, {}).get("Diem")
                    if val is None or val == "":
                        return None
                # Nếu có bất kỳ KĐ → KĐ, ngược lại Đ
                for column_name in flat_config:
                    if score_data[column_name]["Diem"] == "KĐ":
                        return "KĐ"
                return "Đ"

            for column_name, column_config in flat_config.items():
                if column_name in score_data and "Diem" in score_data[column_name]:
                    diem_value = score_data[column_name]["Diem"]

                    # Skip letter grades in mixed subjects
                    if isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        continue
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
                return None

            # Điểm chữ (Đ/KĐ): chỉ cần 1 cột KĐ là KĐ, không quan tâm hệ số
            if is_all_letter_grades:
                # Kiểm tra tất cả cột đã có giá trị
                for column_name, value in score_data.items():
                    if isinstance(value, dict):
                        val = value.get("Diem")
                        if val is None or val == "":
                            return None
                # Nếu có bất kỳ KĐ → KĐ, ngược lại Đ
                for column_name, value in score_data.items():
                    if isinstance(value, dict) and "Diem" in value:
                        if value["Diem"] == "KĐ":
                            return "KĐ"
                return "Đ"

            for column_name, value in score_data.items():
                if isinstance(value, dict) and "Diem" in value:
                    diem_value = value.get("Diem", 0)

                    # Skip letter grades in mixed subjects
                    if isinstance(diem_value, str) and diem_value in ['Đ', 'KĐ']:
                        continue
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
                final_numeric_score = total_score / total_weight
                return round(final_numeric_score, 2)
            return None
    except Exception as e:
        logger.error(f"Error calculating score: {str(e)}")
        return None


def _infer_column_stage_priority(column_key: str, column_label: str = "") -> int:
    """Gán mức ưu tiên theo giai đoạn kiểm tra để sắp xếp chuỗi thời gian.
    Giá trị nhỏ hơn xuất hiện sớm hơn trong học kỳ.
    """
    key = (column_key or "").lower()
    label = (column_label or "").lower()
    text = f"{key} {label}"
    if any(k in text for k in ["thuong", "tx", "mieng", "15", "kiem_tra_ngan", "practice"]):
        return 0
    if any(k in text for k in ["giua", "giuaki", "mid"]):
        return 2
    if any(k in text for k in ["cuoi", "cuoiki", "hk", "final", "tong_ket"]):
        return 3
    return 1


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
