import React, { useState } from "react";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubjectGradeManagement } from "@/hooks/useSubjectGradeManagement";
import {
  GradeHeader,
  ClassSubjectSelector,
  GradeActionsBar,
  GradeTable,
  GradeEditDialog,
  ConfigEditorDialog,
  AddColumnDialog,
  ImportPreviewDialog,
} from "@/components/subjectGradeManagement";
import api from "@/services/api";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import logger from "@/utils/logger";

// Tạo danh sách năm học từ 2024-2025 đến 2035-2036
const generateAcademicYears = () => {
  const years = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

// Danh sách học kỳ cố định
const SEMESTERS = ["HK1", "HK2", "HK3"];
const ACADEMIC_YEARS = generateAcademicYears();

const GradeManagement = () => {
  const {
    loading,
    setLoading,
    teacherInfo,
    academicYear,
    semester,
    selectedClassSubject,
    students,
    scoreConfig,
    editingStudent,
    scoreForm,
    showConfigEditor,
    configForm,
    showAddColumnModal,
    newColumnForm,
    setAcademicYear,
    setSemester,
    setSelectedClassSubject,
    handleClassSubjectSelect,
    getDisplayColumns,
    flattenScoreColumns,
    calculateFinalGrade,
    handleEditScore,
    handleScoreInputChange,
    handleSaveScore,
    closeEditingStudent,
    handleShowConfigEditor,
    handleConfigInputChange,
    handleAddColumn,
    handleConfirmAddColumn,
    handleRemoveColumn,
    handleSaveConfig,
    setShowConfigEditor,
    setShowAddColumnModal,
    setNewColumnForm,
  } = useSubjectGradeManagement();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Pagination states (UI only)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // 20 students per page

  // Reset page when selectedClassSubject changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassSubject]);

  // Helper function to sort score columns in desired order (UI-only)
  const getSortedColumnNames = (scoreColumnConfig) => {
    if (!scoreColumnConfig) return [];

    const columnNames = Object.keys(scoreColumnConfig);

    // Define desired order: Điểm cuối kì -> Điểm giữa kì -> Điểm thường xuyên -> Others
    const orderPriority = {
      diem_thi_cuoi_ki: 1,
      Diem_thi_cuoi_ki: 1,
      diem_ck: 1,
      diem_thi_giua_ki: 2,
      Diem_thi_giua_ki: 2,
      diem_gk: 2,
      diem_thuong_xuyen: 3,
      Diem_thuong_xuyen: 3,
      diem_tx: 3,
    };

    return columnNames.sort((a, b) => {
      const priorityA = orderPriority[a] || 999;
      const priorityB = orderPriority[b] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority or no priority, maintain original order
      return 0;
    });
  };

  // Import điểm từ file
  const handleDownloadTemplate = async () => {
    try {
      await api.downloadScoreTemplate(selectedClassSubject.id);
      alert("✅ Tải template thành công!");
    } catch (error) {
      logger.error("Error downloading template:", error);
      alert("❌ Lỗi khi tải template!");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          alert("❌ Không thể đọc file!"); 
          return;
        }
        let arrayBuffer: ArrayBuffer;
        if (typeof e.target.result === 'string') {
          // Shouldn't happen, but handle gracefully
          alert("❌ File đọc thất bại: Không đúng định dạng dữ liệu!");
          return;
        } else {
          arrayBuffer = e.target.result;
        }
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate format
        const errors = [];
        const validData = [];

        if (jsonData.length === 0) {
          alert("❌ File không có dữ liệu!");
          return;
        }

        // Get all expected columns from scoreConfig (flattened)
        const flatColumns = flattenScoreColumns(
          scoreConfig?.score_column_config || {}
        );
        const expectedColumnKeys = flatColumns.map((col) => col.key);

        // Required columns
        const requiredColumns = ["id", "ho_va_ten", ...expectedColumnKeys];
        const firstRow = jsonData[0] as Record<string, unknown>;
        const missingColumns = requiredColumns.filter(
          (col) => !(col in firstRow)
        );

        if (missingColumns.length > 0) {
          alert(
            `❌ File thiếu các cột: ${missingColumns.join(
              ", "
            )}\n\nVui lòng tải template để có đúng định dạng!`
          );
          return;
        }

        // Validate từng dòng
        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // +2 vì dòng 1 là header, index bắt đầu từ 0

          // Kiểm tra ID
          const r = row as Record<string, unknown>;
          const studentId =
            r.id ||
            r.ID ||
            r["Id"] ||
            r["Mã học sinh"];
          if (!studentId) {
            errors.push(`Dòng ${rowNum}: Thiếu ID học sinh`);
            return;
          }


          // Validate điểm số for all columns
          const scores = {};
          expectedColumnKeys.forEach((key) => {
            scores[key] = row[key];
          });

          let hasInvalidScore = false;
          Object.entries(scores).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
              const valueStr = String(value).trim().toUpperCase();

              // Check if it's a letter grade (Đ or KĐ)
              const isLetterGrade =
                valueStr === "Đ" ||
                valueStr === "D" ||
                valueStr === "KĐ" ||
                valueStr === "KD" ||
                valueStr === "DAT" ||
                valueStr === "ĐẠT" ||
                valueStr === "KHONG_DAT" ||
                valueStr === "KHÔNG_ĐẠT" ||
                valueStr === "KHONGDAT" ||
                valueStr === "KHÔNG ĐẠT";

              // If it's not a letter grade, validate as number
              if (!isLetterGrade) {
                const score = parseFloat(String(value));
                if (isNaN(score) || score < 0 || score > 10) {
                  const r = row as Record<string, unknown>;
                  errors.push(
                    `Dòng ${rowNum} - ${
                      (r.ho_va_ten as string) || (r.id as string)
                    }: Điểm ${key} không hợp lệ (${value}). Điểm phải từ 0-10 hoặc Đ/KĐ.`
                  );
                  hasInvalidScore = true;
                }
              }
            }
          });

          if (!hasInvalidScore) {
            const r = row as Record<string, unknown>;
            const gradeData: Record<string, unknown> = {
              student_id: r.id,
              ho_va_ten: r.ho_va_ten,
            };

            // Add all grade columns (support both numbers and letter grades)
            expectedColumnKeys.forEach((key) => {
              const value = scores[key];
              if (value === "" || value === null || value === undefined) {
                gradeData[key] = null;
              } else {
                const valueStr = String(value).trim().toUpperCase();

                // Normalize letter grades
                if (
                  valueStr === "Đ" ||
                  valueStr === "D" ||
                  valueStr === "DAT" ||
                  valueStr === "ĐẠT"
                ) {
                  gradeData[key] = "Đ";
                } else if (
                  valueStr === "KĐ" ||
                  valueStr === "KD" ||
                  valueStr === "KHONG_DAT" ||
                  valueStr === "KHÔNG_ĐẠT" ||
                  valueStr === "KHONGDAT" ||
                  valueStr === "KHÔNG ĐẠT"
                ) {
                  gradeData[key] = "KĐ";
                } else {
                  // Parse as number
                  gradeData[key] = parseFloat(value);
                }
              }
            });

            validData.push(gradeData);
          }
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          alert(`❌ File có ${errors.length} lỗi. Vui lòng kiểm tra!`);
          return;
        }

        setImportedData(validData);
        setImportErrors([]);
        setShowImportModal(true);
      } catch (error) {
        logger.error("Error parsing file:", error);
        alert("❌ Lỗi khi đọc file! Vui lòng kiểm tra định dạng file.");
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input để có thể upload lại cùng file
    event.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      alert("Không có dữ liệu để import!");
      return;
    }

    try {
      setLoading(true);

      const importPayload = {
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grades: importedData,
      };

      const response = await api.bulkImportScores(importPayload);

      if (response.success) {
        alert(
          `✅ ${response.message}\n\nThành công: ${
            response.data.success_count
          } bản ghi${
            response.data.error_count > 0
              ? `\nLỗi: ${response.data.error_count} bản ghi`
              : ""
          }`
        );

        if (response.data.errors && response.data.errors.length > 0) {
          logger.debug("Import errors:", response.data.errors);
        }

        // Refresh data
        handleClassSubjectSelect(selectedClassSubject);
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        alert("❌ Lỗi khi import điểm: " + response.message);
      }
    } catch (error) {
      logger.error("Error importing grades:", error);
      alert("❌ Lỗi khi import điểm!");
    } finally {
      setLoading(false);
    }
  };

  // Function to export grades to Excel using ExcelJS
  const handleExportToExcel = async () => {
    if (!selectedClassSubject || !scoreConfig) {
      alert("Vui lòng chọn lớp và có cấu hình điểm!");
      return;
    }

    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Bảng điểm");
      // Cấu hình trang in A4 và tự co theo chiều ngang 1 trang
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

      // Get display columns (with hierarchy)
      const displayColumns = getDisplayColumns(
        scoreConfig?.score_column_config || {}
      );

      // Calculate total grade columns (flatten nested)
      let totalGradeColumns = 0;
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          totalGradeColumns += col.children.length;
        } else {
          totalGradeColumns += 1;
        }
      });

      // Calculate total columns: STT + Mã HS + Họ tên + grade columns + Điểm TB
      const totalColumns = 3 + totalGradeColumns + 1;

      // Set column widths
      const columnWidths = [
        { width: 5 }, // STT
        { width: 9 }, // Mã HS
        { width: 22 }, // Họ tên
      ];

      // Add widths for grade columns
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          col.children.forEach(() => columnWidths.push({ width: 8 }));
        } else {
          columnWidths.push({ width: 10 });
        }
      });

      columnWidths.push({ width: 9 }); // Điểm TB
      worksheet.columns = columnWidths;

      let currentRow = 1;

      // Title
      worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
      const titleCell = worksheet.getCell(currentRow, 1);
      titleCell.value = "BẢNG ĐIỂM HỌC SINH";
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(currentRow).height = 30;
      currentRow += 2;

      // Header information
      const headerInfo = [
        [`Giáo viên: ${teacherInfo.teacher.full_name}`],
        [
          `Lớp: ${selectedClassSubject.classes.class_name} (Khối ${selectedClassSubject.classes.grade})`,
        ],
        [`Môn học: ${selectedClassSubject.subjects.subject_name}`],
        [`Năm học: ${academicYear}     Học kỳ: ${semester}`],
      ];

      headerInfo.forEach((info) => {
        worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        const cell = worksheet.getCell(currentRow, 1);
        cell.value = info[0];
        cell.font = { size: 11 };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      });

      currentRow++; // Skip a row

      // Table headers - Row 1 (Parent columns)
      const headerRow1 = worksheet.getRow(currentRow);
      let colIndex = 1;

      // STT, Mã HS, Họ tên - rowspan 2
      const fixedHeaders = ["STT", "Mã HS", "Họ và tên"];
      fixedHeaders.forEach((header) => {
        const cell = worksheet.getCell(currentRow, colIndex);
        cell.value = header;
        worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);
        colIndex++;
      });

      // Grade columns
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          // Parent column - merge across children
          const startCol = colIndex;
          const endCol = colIndex + col.children.length - 1;
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
          const cell = worksheet.getCell(currentRow, startCol);
          cell.value = col.label;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDAE3F3" }, // Light blue for parent
          };
          colIndex += col.children.length;
        } else {
          // Regular column - rowspan 2
          const cell = worksheet.getCell(currentRow, colIndex);
          cell.value = col.label;
          worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);
          colIndex++;
        }
      });

      // Điểm TB - rowspan 2
      const tbCell = worksheet.getCell(currentRow, colIndex);
      tbCell.value = "Điểm TB";
      worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);

      // Style header row 1
      headerRow1.height = 25;
      headerRow1.font = { bold: true, size: 11 };
      headerRow1.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      headerRow1.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" },
      };

      // Apply borders to header row 1
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(currentRow, col);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      currentRow++;

      // Table headers - Row 2 (Child columns)
      const headerRow2 = worksheet.getRow(currentRow);
      colIndex = 4; // Start after STT, Mã HS, Họ tên

      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          // Render child column headers
          col.children.forEach((child) => {
            const cell = worksheet.getCell(currentRow, colIndex);
            // Convert "Điểm thường xuyên 1" -> "Điểm tx1", "Điểm thường xuyên 2" -> "Điểm tx2", etc.
            let exportLabel = child.label;
            if (exportLabel && col.label === "Điểm thường xuyên") {
              exportLabel = exportLabel.replace(
                /Điểm thường xuyên (\d+)/i,
                "Điểm tx$1"
              );
            }
            cell.value = exportLabel;
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAE3F3" },
            };
            colIndex++;
          });
        } else {
          // Regular columns already merged, skip
          colIndex++;
        }
      });

      // Style header row 2
      headerRow2.height = 25;
      headerRow2.font = { bold: true, size: 10 };
      headerRow2.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Apply borders to header row 2
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(currentRow, col);
        if (!cell.value) continue; // Skip merged cells
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      currentRow++;

      // Data rows
      students.forEach((studentData, index) => {
        const student = studentData.student;
        const score = studentData.score;

        const dataRow = worksheet.getRow(currentRow);
        const rowValues = [
          index + 1,
          student?.student_id || "",
          student?.full_name || "",
        ];

        // Add score columns (flattened)
        displayColumns.forEach((col) => {
          if (col.hasChildren) {
            col.children.forEach((child) => {
              const scoreValue = score?.score_data?.[child.key]?.Diem;
              rowValues.push(
                scoreValue !== undefined && scoreValue !== null
                  ? scoreValue
                  : ""
              );
            });
          } else {
            const scoreValue = score?.score_data?.[col.key]?.Diem;
            rowValues.push(
              scoreValue !== undefined && scoreValue !== null ? scoreValue : ""
            );
          }
        });

        // Add final score
        rowValues.push(
          score?.score_data ? calculateFinalGrade(score.score_data) : ""
        );

        dataRow.values = rowValues;
        dataRow.height = 20;

        // Apply styling and borders to all cells
        for (let col = 1; col <= totalColumns; col++) {
          const cell = worksheet.getCell(currentRow, col);

          // Alignment
          if (col === 1) {
            // STT - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (col === 2) {
            // Mã HS - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (col === 3) {
            // Họ tên - left
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            // Điểm - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Borders
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Highlight final grade column
          if (col === totalColumns && cell.value) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFCE4D6" },
            };
            cell.font = { bold: true };
          }

          // Highlight score cells with values
          if (col > 3 && col < totalColumns && cell.value !== "") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE2EFDA" },
            };
          }
        }

        // Alternating row colors for better readability
        if (index % 2 === 0) {
          for (let col = 1; col <= 3; col++) {
            const cell = worksheet.getCell(currentRow, col);
            if (!cell.fill || (cell.fill.type === "pattern" && !(cell.fill as any).fgColor)) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF2F2F2" },
              } as any;
            }
          }
        }

        currentRow++;
      });

      // Summary row
      currentRow++; // Skip a row
      worksheet.mergeCells(currentRow, 1, currentRow, 3);
      const summaryCell = worksheet.getCell(currentRow, 1);
      summaryCell.value = `Tổng số học sinh: ${students.length}`;
      summaryCell.font = { bold: true, size: 11 };
      summaryCell.alignment = { horizontal: "left", vertical: "middle" };

      // Calculate students with scores
      const studentsWithScores = students.filter(
        (s) =>
          s.score?.final_score !== undefined && s.score?.final_score !== null
      ).length;
      worksheet.mergeCells(currentRow, 4, currentRow, totalColumns);
      const scoresSummaryCell = worksheet.getCell(currentRow, 4);
      scoresSummaryCell.value = `Đã có điểm: ${studentsWithScores}/${students.length}`;
      scoresSummaryCell.font = {
        bold: true,
        size: 11,
        color: {
          argb:
            studentsWithScores === students.length ? "FF008000" : "FFFF0000",
        },
      };
      scoresSummaryCell.alignment = { horizontal: "right", vertical: "middle" };

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BangDiem_${selectedClassSubject.classes.class_name}_${selectedClassSubject.subjects.subject_name}_${academicYear}_${semester}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      alert("✅ Xuất file Excel thành công!");
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
      alert("❌ Lỗi khi xuất file Excel!");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center border bg-destructive/5 rounded-2xl border-destructive/20">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <p className="font-medium text-red-600">
            Không thể tải thông tin giáo viên. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card */}
        <GradeHeader
          teacherName={teacherInfo.teacher.full_name}
          academicYear={academicYear}
          semester={semester}
          academicYears={ACADEMIC_YEARS}
          semesters={SEMESTERS}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
        />

        {!selectedClassSubject ? (
          <ClassSubjectSelector
            classSubjects={teacherInfo.assigned_classes}
            academicYear={academicYear}
            onSelect={handleClassSubjectSelect}
          />
        ) : (
          <div className="space-y-6">
            {/* Navigation and Header */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setSelectedClassSubject(null)}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <span>←</span>
                        <span>Quay lại</span>
                      </Button>
                      <div className="w-px h-8 bg-border"></div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {selectedClassSubject.classes.class_name} -{" "}
                          {selectedClassSubject.subjects.subject_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Khối {selectedClassSubject.classes.grade}
                        </p>
                      </div>
                    </div>

                    {/* Hidden: Cấu hình cột điểm - now managed in Admin panel */}
                    {false && (
                      <Button
                        onClick={handleShowConfigEditor}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Cấu hình cột điểm</span>
                      </Button>
                    )}
                  </div>

                  {/* Import/Export Buttons */}
                  {scoreConfig && (
                    <GradeActionsBar
                      selectedClassSubject={selectedClassSubject}
                      academicYear={academicYear}
                      semester={semester}
                      onDownloadTemplate={handleDownloadTemplate}
                      onFileUpload={handleFileUpload}
                      onExportToExcel={handleExportToExcel}
                      onImportSuccess={() =>
                        handleClassSubjectSelect(selectedClassSubject)
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Config Editor Modal */}
            <ConfigEditorDialog
              open={showConfigEditor}
              onOpenChange={setShowConfigEditor}
              configForm={configForm}
              getSortedColumnNames={getSortedColumnNames}
              onConfigInputChange={handleConfigInputChange}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
              onSave={handleSaveConfig}
            />

            {/* Add Column Modal */}
            <AddColumnDialog
              open={showAddColumnModal}
              onOpenChange={setShowAddColumnModal}
              newColumnForm={newColumnForm}
              onFormChange={(field, value) =>
                setNewColumnForm((prev) => ({ ...prev, [field]: value }))
              }
              onConfirm={handleConfirmAddColumn}
            />

            {/* Students Grade Table */}
            <GradeTable
              students={students}
              scoreConfig={scoreConfig}
              currentPage={currentPage}
              pageSize={pageSize}
              getDisplayColumns={getDisplayColumns}
              calculateFinalGrade={calculateFinalGrade}
              onEditScore={handleEditScore}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              onShowConfigEditor={handleShowConfigEditor}
            />
          </div>
        )}

        {/* Grade Edit Modal */}
        <GradeEditDialog
          open={!!editingStudent}
          onOpenChange={(open) => {
            if (!open) closeEditingStudent();
          }}
          editingStudent={editingStudent}
          scoreConfig={scoreConfig}
          scoreForm={scoreForm}
          getDisplayColumns={getDisplayColumns}
          onScoreInputChange={handleScoreInputChange}
          onSave={handleSaveScore}
        />

        {/* Import Preview Modal */}
        <ImportPreviewDialog
          open={showImportModal}
          onOpenChange={setShowImportModal}
          importedData={importedData}
          importErrors={importErrors}
          scoreConfig={scoreConfig}
          flattenScoreColumns={flattenScoreColumns}
          onConfirm={handleConfirmImport}
          onCancel={() => {
            setShowImportModal(false);
            setImportedData([]);
            setImportErrors([]);
          }}
        />
      </div>
    </div>
  );
};

export default GradeManagement;
