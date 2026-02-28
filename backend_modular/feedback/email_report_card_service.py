"""
Email Report Card Service - Gửi phiếu điểm qua email cho phụ huynh
Tham khảo EmailService trong auth/services.py (gửi OTP email)
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Dict, Any, List, Optional

from core.logger import setup_logger

logger = setup_logger("email_report_card")


class EmailReportCardService:
    """Service gửi phiếu điểm học sinh qua email cho phụ huynh"""

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email = os.getenv("SMTP_EMAIL", "your-email@gmail.com")
        self.password = os.getenv("SMTP_PASSWORD", "your-app-password")
        self.sender_name = os.getenv("SMTP_SENDER_NAME", "SynapseS System")

    def _build_score_rows_html(self, scores: List[Dict]) -> str:
        """
        Tạo các dòng HTML cho bảng điểm

        Args:
            scores: List[{subject_name, final_score, score_data}]

        Returns:
            HTML string chứa các <tr> của bảng điểm
        """
        if not scores:
            return '<tr><td colspan="5" style="text-align:center; padding: 12px; color: #9ca3af;">Chưa có dữ liệu điểm</td></tr>'

        rows_html = ""
        for idx, score in enumerate(scores, start=1):
            subject_name = score.get("subject_name", "N/A")
            final_score = score.get("final_score")
            score_data = score.get("score_data", {})

            # Trích xuất TX, GK, CK từ score_data
            tx_scores = []
            gk_score = ""
            ck_score = ""

            if isinstance(score_data, dict):
                for key, value in score_data.items():
                    key_lower = key.lower()
                    diem = ""
                    if isinstance(value, dict):
                        diem = value.get("Diem", value.get("diem", ""))
                        # Trường hợp lồng: parent chứa children
                        if not diem and isinstance(value, dict):
                            for child_key, child_val in value.items():
                                if isinstance(child_val, dict):
                                    child_diem = child_val.get("Diem", child_val.get("diem", ""))
                                    if child_diem != "" and child_diem is not None:
                                        if "giua_ki" in child_key.lower() or "giua_ki" in key_lower:
                                            gk_score = str(child_diem)
                                        elif "cuoi_ki" in child_key.lower() or "cuoi_ki" in key_lower:
                                            ck_score = str(child_diem)
                                        else:
                                            tx_scores.append(str(child_diem))
                            continue
                    else:
                        diem = value

                    if diem == "" or diem is None:
                        continue

                    if "giua_ki" in key_lower:
                        gk_score = str(diem)
                    elif "cuoi_ki" in key_lower:
                        ck_score = str(diem)
                    elif "tx" in key_lower or "thuong_xuyen" in key_lower:
                        tx_scores.append(str(diem))

            tx_display = ", ".join(tx_scores) if tx_scores else "-"
            gk_display = gk_score if gk_score else "-"
            ck_display = ck_score if ck_score else "-"
            final_display = str(final_score) if final_score is not None else "-"

            # Màu cho điểm TBM HK
            score_color = "#1f2937"
            if final_score is not None and isinstance(final_score, (int, float)):
                if final_score >= 8.0:
                    score_color = "#059669"  # Xanh lá
                elif final_score >= 6.5:
                    score_color = "#2563eb"  # Xanh dương
                elif final_score >= 5.0:
                    score_color = "#d97706"  # Cam
                else:
                    score_color = "#dc2626"  # Đỏ

            bg_color = "#ffffff" if idx % 2 == 1 else "#f9fafb"

            rows_html += f"""
            <tr style="background-color: {bg_color};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{subject_name}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{tx_display}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{gk_display}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{ck_display}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; color: {score_color};">{final_display}</td>
            </tr>
            """

        return rows_html

    def create_report_card_html(
        self,
        student_name: str,
        student_code: str,
        class_name: str,
        grade: str,
        teacher_name: str,
        academic_year: str,
        semester: str,
        scores: List[Dict],
        overall_average: Optional[float],
        feedback: str,
    ) -> str:
        """
        Tạo HTML email phiếu điểm chuyên nghiệp (education format)

        Returns:
            HTML string cho email
        """
        score_rows = self._build_score_rows_html(scores)

        # Xếp loại học lực
        if overall_average is not None and isinstance(overall_average, (int, float)):
            if overall_average >= 8.0:
                rank = "Giỏi"
                rank_color = "#059669"
                rank_bg = "#ecfdf5"
            elif overall_average >= 6.5:
                rank = "Khá"
                rank_color = "#2563eb"
                rank_bg = "#eff6ff"
            elif overall_average >= 5.0:
                rank = "Trung bình"
                rank_color = "#d97706"
                rank_bg = "#fffbeb"
            else:
                rank = "Yếu"
                rank_color = "#dc2626"
                rank_bg = "#fef2f2"
            avg_display = f"{overall_average:.2f}"
        else:
            rank = "Chưa xếp loại"
            rank_color = "#6b7280"
            rank_bg = "#f3f4f6"
            avg_display = "N/A"

        semester_display = {
            "HK1": "Học kỳ 1",
            "HK2": "Học kỳ 2",
            "CN": "Cả năm",
        }.get(semester, semester)

        feedback_display = feedback if feedback else "Chưa có nhận xét."
        current_date = datetime.now().strftime("%d/%m/%Y")

        html = f"""
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Phiếu điểm học sinh - {student_name}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
            <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 30px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 12px;">🎓</div>
                    <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 4px 0; font-weight: 700;">PHIẾU ĐIỂM HỌC SINH</h1>
                    <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">{semester_display} - Năm học {academic_year}</p>
                </div>

                <!-- STUDENT INFO -->
                <div style="padding: 24px 30px 16px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 140px;">Họ và tên:</td>
                            <td style="padding: 6px 0; font-weight: 600; font-size: 15px;">{student_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Mã số:</td>
                            <td style="padding: 6px 0; font-weight: 500;">{student_code}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Lớp:</td>
                            <td style="padding: 6px 0; font-weight: 500;">{class_name} - Khối {grade}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Giáo viên CN:</td>
                            <td style="padding: 6px 0; font-weight: 500;">{teacher_name}</td>
                        </tr>
                    </table>
                </div>

                <!-- OVERALL AVERAGE -->
                <div style="margin: 0 30px; padding: 16px 20px; background-color: {rank_bg}; border-radius: 8px; border-left: 4px solid {rank_color};">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="font-size: 14px; color: #4b5563;">
                                Điểm trung bình: <strong style="color: {rank_color}; font-size: 20px;">{avg_display}</strong>
                            </td>
                            <td style="text-align: right;">
                                <span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: {rank_color}; background-color: rgba(255,255,255,0.7); border: 1px solid {rank_color};">{rank}</span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- SCORE TABLE -->
                <div style="padding: 24px 30px;">
                    <h2 style="font-size: 16px; color: #1f2937; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">📊 Bảng điểm chi tiết</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #4f46e5;">
                                <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 600; border-radius: 6px 0 0 0;">Môn học</th>
                                <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-weight: 600;">Thường xuyên</th>
                                <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-weight: 600;">Giữa kỳ</th>
                                <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-weight: 600;">Cuối kỳ</th>
                                <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-weight: 600; border-radius: 0 6px 0 0;">TBM HK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {score_rows}
                        </tbody>
                    </table>
                </div>

                <!-- FEEDBACK -->
                <div style="padding: 0 30px 24px;">
                    <h2 style="font-size: 16px; color: #1f2937; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">💬 Nhận xét của giáo viên</h2>
                    <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px 20px;">
                        <p style="margin: 0; color: #581c87; font-size: 14px; line-height: 1.7; font-style: italic;">
                            "{feedback_display}"
                        </p>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="font-size: 12px; color: #9ca3af;">
                                📧 Email tự động từ hệ thống <strong>SynapseS</strong><br>
                                Ngày gửi: {current_date}
                            </td>
                            <td style="text-align: right; font-size: 12px; color: #9ca3af;">
                                Nếu có thắc mắc, vui lòng liên hệ<br>giáo viên chủ nhiệm.
                            </td>
                        </tr>
                    </table>
                </div>

            </div>
        </body>
        </html>
        """
        return html

    def send_report_card_email(
        self,
        recipient_email: str,
        student_name: str,
        student_code: str,
        class_name: str,
        grade: str,
        teacher_name: str,
        academic_year: str,
        semester: str,
        scores: List[Dict],
        overall_average: Optional[float],
        feedback: str,
    ) -> Dict[str, Any]:
        """
        Gửi email phiếu điểm tới phụ huynh

        Returns:
            {"success": bool, "message": str}
        """
        try:
            logger.info(f"📧 Chuẩn bị gửi phiếu điểm cho {student_name} đến {recipient_email}")

            semester_display = {
                "HK1": "Học kỳ 1",
                "HK2": "Học kỳ 2",
                "CN": "Cả năm",
            }.get(semester, semester)

            # Tạo email
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{self.sender_name} <{self.email}>"
            msg["To"] = recipient_email
            msg["Subject"] = f"Phiếu điểm {semester_display} - {student_name} ({student_code}) - {class_name}"

            # Tạo HTML content
            html_content = self.create_report_card_html(
                student_name=student_name,
                student_code=student_code,
                class_name=class_name,
                grade=grade,
                teacher_name=teacher_name,
                academic_year=academic_year,
                semester=semester,
                scores=scores,
                overall_average=overall_average,
                feedback=feedback,
            )

            html_part = MIMEText(html_content, "html", "utf-8")
            msg.attach(html_part)

            # Gửi email qua SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email, self.password)
                server.send_message(msg)

            logger.info(f"✅ Đã gửi phiếu điểm thành công đến {recipient_email}")
            return {
                "success": True,
                "message": f"Đã gửi phiếu điểm đến {recipient_email}",
            }

        except smtplib.SMTPAuthenticationError:
            logger.error("❌ Lỗi xác thực SMTP - kiểm tra SMTP_EMAIL và SMTP_PASSWORD")
            return {
                "success": False,
                "message": "Lỗi xác thực email server. Vui lòng liên hệ quản trị viên.",
            }
        except smtplib.SMTPRecipientsRefused:
            logger.error(f"❌ Địa chỉ email không hợp lệ: {recipient_email}")
            return {
                "success": False,
                "message": f"Địa chỉ email không hợp lệ: {recipient_email}",
            }
        except Exception as e:
            logger.error(f"❌ Lỗi gửi email phiếu điểm: {str(e)}")
            return {
                "success": False,
                "message": f"Lỗi gửi email: {str(e)}",
            }


# Global instance
email_report_card_service = EmailReportCardService()
