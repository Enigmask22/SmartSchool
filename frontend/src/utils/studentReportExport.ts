import ExcelJS from "exceljs";
import logger from "@/utils/logger";
import { toast } from "sonner";

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

    // Scores section
    if (feedbackScores.length > 0) {
      // Section title
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const scoreTitleCell = worksheet.getCell(`A${currentRow}`);
      scoreTitleCell.value = "BẢNG ĐIỂM TỔNG KẾT";
      scoreTitleCell.font = { bold: true, size: 11 };
      scoreTitleCell.alignment = { horizontal: "center", vertical: "middle" };
      currentRow += 2;

      // Calculate overall average
      const validScores = feedbackScores.filter(
        (g: any) => g.final_score !== null && g.final_score !== undefined,
      );
      const overallAverage =
        validScores.length > 0
          ? (
              validScores.reduce((sum: number, g: any) => sum + g.final_score, 0) /
              validScores.length
            ).toFixed(2)
          : "N/A";

      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `Điểm trung bình học kỳ: ${overallAverage}`;
      currentRow += 2;

      // Table headers
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = ["Môn học", "Điểm thường xuyên", "GK", "CK", "TBM HK"];
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8E8" },
      };

      ["A", "B", "C", "D", "E"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      currentRow++;

      // Score data rows
      feedbackScores.forEach((score: any) => {
        const { tx, gk, ck } = extractComponentScores(score.score_data);
        const dataRow = worksheet.getRow(currentRow);
        dataRow.values = [
          score.subject_name || "N/A",
          tx,
          gk,
          ck,
          score.final_score ?? "",
        ];

        ["A", "B", "C", "D", "E"].forEach((col) => {
          const cell = worksheet.getCell(`${col}${currentRow}`);
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
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
