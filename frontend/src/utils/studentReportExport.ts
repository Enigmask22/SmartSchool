import ExcelJS from "exceljs";
import logger from "@/utils/logger";
import { toast } from "sonner";

function mapRenLuyen(value: string): string {
  const mapping: Record<string, string> = { "1": "Tốt", "2": "Khá", "3": "Đạt", "4": "Chưa Đạt" };
  return mapping[value] || "";
}

interface StudentReportData {
  student: {
    id: number;
    student_id: string;
    full_name: string;
    class_name: string;
  };
  feedbackScores: any[];
  generatedFeedback: string;
  academicYear: string;
  semester: string;
  ketQuaRenLuyen?: string;
  hocLuc?: string;
  summaryData?: any;
  feedbackType?: string;
}

type ScoreCategory = "tx" | "gk" | "ck" | "skip";

/** Phân loại cột điểm theo tên field trong score_data */
const classifyScoreKey = (key: string): ScoreCategory => {
  const normalized = String(key || "").toLowerCase();
  if (normalized === "mon_hoc") return "skip";
  if (normalized.includes("giua")) return "gk";
  if (
    normalized.includes("cuoi") ||
    normalized.includes("_hk") ||
    normalized.endsWith("_hk") ||
    normalized.includes("final")
  ) {
    return "ck";
  }
  return "tx";
};

/** Trích xuất điểm thường xuyên, giữa kỳ, cuối kỳ từ score_data */
export const extractComponentScores = (
  scoreData: Record<string, any> | null | undefined,
): { tx: string; gk: string; ck: string } => {
  const txScores: string[] = [];
  let gkScore = "";
  let ckScore = "";

  if (!scoreData || typeof scoreData !== "object") {
    return { tx: "-", gk: "-", ck: "-" };
  }

  for (const [key, value] of Object.entries(scoreData)) {
    const category = classifyScoreKey(key);
    if (category === "skip" || typeof value !== "object" || value === null) {
      continue;
    }

    const rawScore = value.Diem ?? value.diem;
    if (rawScore === "" || rawScore === null || rawScore === undefined) {
      continue;
    }

    const scoreText = String(rawScore);
    if (category === "gk") {
      gkScore = scoreText;
    } else if (category === "ck") {
      ckScore = scoreText;
    } else {
      txScores.push(scoreText);
    }
  }

  return {
    tx: txScores.length > 0 ? txScores.join(", ") : "-",
    gk: gkScore || "-",
    ck: ckScore || "-",
  };
};

/**
 * Generate an Excel report card for a student
 * Handles layout, formatting, styling, and file download
 */
export const generateStudentReportCard = async (data: StudentReportData) => {
  try {
    const { student, feedbackScores, generatedFeedback, academicYear, semester } = data;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Phiếu điểm");

    // Page setup for A4 and fit-to-width
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
      horizontalCentered: true,
    };

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // A - Môn học
      { width: 18 }, // B - Điểm thường xuyên
      { width: 8 }, // C - GK
      { width: 8 }, // D - CK
      { width: 10 }, // E - TBM HK
    ];

    let currentRow = 1;

    // Title
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = "PHIẾU ĐIỂM HỌC SINH";
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 2;

    // Teacher name (placeholder - will be filled later)
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `Giáo viên chủ nhiệm: `;
    currentRow++;

    // Class
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `Lớp: ${student.class_name || ""}`;
    currentRow++;

    // Academic year and semester
    worksheet.getCell(`A${currentRow}`).value = `Năm học: ${academicYear}`;
    const semesterCell = worksheet.getCell(`E${currentRow}`);
    semesterCell.value = `Học kỳ: ${semester}`;
    semesterCell.alignment = { horizontal: "right", vertical: "middle" };
    currentRow += 2;

    // Student info
    worksheet.getCell(`A${currentRow}`).value = `Học sinh: ${student.full_name}`;
    const studentIdCell = worksheet.getCell(`E${currentRow}`);
    studentIdCell.value = `Mã số: ${student.student_id}`;
    studentIdCell.alignment = { horizontal: "right", vertical: "middle" };
    currentRow += 2;

    // Scores section — CN có format riêng
    if (data.feedbackType === "CN" && data.summaryData) {
      const sd = data.summaryData;
      const lbl = (v: string) => mapRenLuyen(v);
      const titleMap: Record<string, string> = { "1": "Học sinh Xuất sắc", "2": "Học sinh Giỏi" };

      // ── Section header ──
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const cnHeader = worksheet.getCell(`A${currentRow}`);
      cnHeader.value = "TỔNG KẾT CẢ NĂM";
      cnHeader.font = { bold: true, size: 14, color: { argb: "FF065F46" } };
      cnHeader.alignment = { horizontal: "center", vertical: "middle" };
      cnHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      worksheet.getRow(currentRow).height = 28;
      currentRow += 2;

      // ── Summary table ──
      // A = Kỳ, B = Điểm TB, C = Học lực, D = KQRL, E = (spacer)
      const shCols = ["A", "B", "C", "D"];
      const shLabels = ["Kỳ", "Điểm trung bình", "Học lực", "KQ Rèn luyện"];
      shCols.forEach((col, i) => {
        const c = worksheet.getCell(`${col}${currentRow}`);
        c.value = shLabels[i];
        c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
        c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      worksheet.mergeCells(`E${currentRow}:E${currentRow}`);
      const spacerHdr = worksheet.getCell(`E${currentRow}`);
      spacerHdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      spacerHdr.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      worksheet.getRow(currentRow).height = 22;
      currentRow++;

      const summaryRows = [
        { label: "HK1", vals: [sd.hk1_avg_score ?? "—", lbl(sd.hk1_hoc_luc) || "—", lbl(sd.hk1_ren_luyen) || "—"] },
        { label: "HK2", vals: [sd.hk2_avg_score ?? "—", lbl(sd.hk2_hoc_luc) || "—", lbl(sd.hk2_ren_luyen) || "—"] },
        { label: "Cả năm", vals: [sd.year_avg_score ?? "—", lbl(sd.year_hoc_luc) || "—", lbl(sd.year_ren_luyen) || "—"] },
      ];

      summaryRows.forEach((row, ri) => {
        const isYear = ri === 2;
        const bgColor = isYear ? "FFF0FDF4" : "FFFFFFFF";
        const textColor = isYear ? "FF065F46" : "FF1F2937";

        ["A", "B", "C", "D", "E"].forEach((col) => {
          const c = worksheet.getCell(`${col}${currentRow}`);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          c.border = { left: { style: "thin" }, right: { style: "thin" }, bottom: { style: isYear ? "medium" : "thin" } };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.font = { bold: isYear, size: 11, color: { argb: textColor } };
        });

        worksheet.getCell(`A${currentRow}`).value = row.label;
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 10, color: { argb: textColor } };
        row.vals.forEach((val, vi) => {
          worksheet.getCell(`${["B", "C", "D"][vi]}${currentRow}`).value = val;
        });

        worksheet.getRow(currentRow).height = 20;
        currentRow++;
      });
      currentRow++;

      // Danh hiệu row
      if (sd.title && titleMap[sd.title]) {
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = `Danh hiệu: ${titleMap[sd.title]}`;
        titleCell.font = { bold: true, size: 12, color: { argb: "FFB45309" } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        titleCell.border = { left: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" } };
        worksheet.getRow(currentRow).height = 24;
        currentRow++;
      }
      currentRow++;

      // ── Subject details table ──
      const subjects = sd.subject_details || [];
      if (subjects.length > 0) {
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const subTitle = worksheet.getCell(`A${currentRow}`);
        subTitle.value = "CHI TIẾT TỪNG MÔN";
        subTitle.font = { bold: true, size: 12, color: { argb: "FF065F46" } };
        subTitle.alignment = { horizontal: "center", vertical: "middle" };
        subTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
        worksheet.getRow(currentRow).height = 24;
        currentRow++;

        // Header row
        const hdrCols = [
          { col: "A", w: 22, label: "Môn học" },
          { col: "B", w: 10, label: "HK1" },
          { col: "C", w: 10, label: "HK2" },
          { col: "D", w: 12, label: "Cả năm" },
          { col: "E", w: 10, label: "Ghi chú" },
        ];
        hdrCols.forEach(({ col, label }) => {
          const c = worksheet.getCell(`${col}${currentRow}`);
          c.value = label;
          c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
          c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "medium" }, right: { style: "thin" } };
        });
        worksheet.getRow(currentRow).height = 22;
        currentRow++;

        // Data rows
        subjects.forEach((s: any, i: number) => {
          const yearAvg = s.year_avg;
          const note = s.is_char ? "(Điểm chữ)" : "";
          const isLast = i === subjects.length - 1;
          const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";

          const vals = [s.subject_name, s.hk1_score || "—", s.hk2_score || "—", yearAvg || "—", note];
          ["A", "B", "C", "D", "E"].forEach((col, ci) => {
            const c = worksheet.getCell(`${col}${currentRow}`);
            c.value = vals[ci];
            c.alignment = { horizontal: col === "A" ? "left" : "center", vertical: "middle" };
            c.font = { size: 10, bold: col === "D" };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            c.border = {
              left: { style: "thin" },
              right: { style: "thin" },
              bottom: { style: isLast ? "medium" : "thin" },
            };
          });
          worksheet.getRow(currentRow).height = 18;
          currentRow++;
        });
        currentRow++;
      }
    } else if (feedbackScores.length > 0) {
      // GK / CK: Bảng điểm học kỳ
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const scoreTitleCell = worksheet.getCell(`A${currentRow}`);
      scoreTitleCell.value = "BẢNG ĐIỂM TỔNG KẾT";
      scoreTitleCell.font = { bold: true, size: 11 };
      scoreTitleCell.alignment = { horizontal: "center", vertical: "middle" };
      currentRow += 2;

      const validScores = feedbackScores.filter(
        (g: any) => g.final_score !== null && g.final_score !== undefined,
      );
      const overallAverage =
        validScores.length > 0
          ? (validScores.reduce((sum: number, g: any) => sum + g.final_score, 0) / validScores.length).toFixed(2)
          : "N/A";

      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `Điểm trung bình học kỳ: ${overallAverage}`;
      currentRow++;

      const ketQuaRenLuyen = data.ketQuaRenLuyen;
      const hocLuc = data.hocLuc;
      if (ketQuaRenLuyen) {
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = `Kết quả rèn luyện: ${mapRenLuyen(ketQuaRenLuyen)}`;
        worksheet.getRow(currentRow).font = { bold: false, size: 11 };
        worksheet.getRow(currentRow).alignment = { horizontal: "left", vertical: "middle" };
        currentRow++;
      }
      if (hocLuc) {
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = `Học lực: ${mapRenLuyen(hocLuc)}`;
        worksheet.getRow(currentRow).font = { bold: false, size: 11 };
        worksheet.getRow(currentRow).alignment = { horizontal: "left", vertical: "middle" };
        currentRow++;
      }
      currentRow++;

      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = ["Môn học", "Điểm thường xuyên", "GK", "CK", "TBM HK"];
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
      ["A", "B", "C", "D", "E"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      currentRow++;

      feedbackScores.forEach((score: any) => {
        const { tx, gk, ck } = extractComponentScores(score.score_data);
        const dataRow = worksheet.getRow(currentRow);
        dataRow.values = [score.subject_name || "N/A", tx, gk, ck, score.final_score ?? ""];
        ["A", "B", "C", "D", "E"].forEach((col) => {
          const cell = worksheet.getCell(`${col}${currentRow}`);
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
        currentRow++;
      });
      currentRow++;
    }

    // Comments section
    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const commentTitleCell = worksheet.getCell(`A${currentRow}`);
    commentTitleCell.value = "NHẬN XÉT CỦA GIÁO VIÊN";
    commentTitleCell.font = { bold: true, size: 11 };
    commentTitleCell.alignment = { horizontal: "center", vertical: "middle" };
    const remarksTitleRow = currentRow;
    currentRow += 2;

    // Feedback text with wrapping
    const feedbackText = generatedFeedback || "Chưa có nhận xét";
    const wrapText = (text: string, maxLength = 70) => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + word).length <= maxLength) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);

      return lines;
    };

    const feedbackLines = wrapText(feedbackText);
    feedbackLines.forEach((line) => {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const feedbackCell = worksheet.getCell(`A${currentRow}`);
      feedbackCell.value = line;
      feedbackCell.alignment = {
        horizontal: "center",
        vertical: "top",
        wrapText: true,
      };
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    });
    const remarksEndRow = currentRow - 1;

    // Apply border
    for (let r = remarksTitleRow; r <= remarksEndRow; r++) {
      for (let c = 1; c <= 5; c++) {
        const cell = worksheet.getCell(r, c);
        const border: any = {};
        if (r === remarksTitleRow) border.top = { style: "thin" };
        if (r === remarksEndRow) border.bottom = { style: "thin" };
        if (c === 1) border.left = { style: "thin" };
        if (c === 5) border.right = { style: "thin" };
        cell.border = { ...cell.border, ...border };
      }
    }

    // Signature section
    currentRow += 3;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const sigLeftTitle = worksheet.getCell(`A${currentRow}`);
    sigLeftTitle.value = "Giáo viên chủ nhiệm";
    sigLeftTitle.font = { bold: true };
    sigLeftTitle.alignment = { horizontal: "left", vertical: "middle" };
    const sigRightTitle = worksheet.getCell(`D${currentRow}`);
    sigRightTitle.value = "Phụ huynh";
    sigRightTitle.font = { bold: true };
    sigRightTitle.alignment = { horizontal: "right", vertical: "middle" };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const sigLeftNote = worksheet.getCell(`A${currentRow}`);
    sigLeftNote.value = "(Ký và ghi rõ họ tên)";
    sigLeftNote.alignment = { horizontal: "left", vertical: "middle" };
    const sigRightNote = worksheet.getCell(`D${currentRow}`);
    sigRightNote.value = "(Ký và ghi rõ họ tên)";
    sigRightNote.alignment = { horizontal: "right", vertical: "middle" };

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PhieuDiem_${student.student_id}_${student.full_name}_${academicYear}_${semester}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("Xuất phiếu điểm thành công!");
  } catch (error) {
    logger.error("Error exporting report card:", error);
    toast.error(
      "Lỗi khi xuất phiếu điểm: " + (error instanceof Error ? error.message : "Unknown error"),
    );
  }
};
