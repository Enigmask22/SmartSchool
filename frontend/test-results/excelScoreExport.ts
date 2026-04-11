// import ExcelJS from 'exceljs';
// import logger from '@/utils/logger';
// import { toast } from 'sonner';

// export const exportToExcel = async (
//   students: any[],
//   scoreConfig: any,
//   selectedClassSubject: any,
//   academicYear: string,
//   semester: string,
//   getDisplayColumns: (config: Record<string, any>) => any[],
//   // _flattenScoreColumns: (config: Record<string, any>) => any[],
//   calculateFinalScore: (scoreData: any) => string | number
// ) => {
//   try {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Bảng điểm');

//     worksheet.pageSetup = {
//       paperSize: 9,
//       orientation: 'portrait',
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       margins: {
//         left: 0.3,
//         right: 0.3,
//         top: 0.5,
//         bottom: 0.5,
//         header: 0.2,
//         footer: 0.2,
//       },
//       horizontalCentered: true,
//     };

//     const displayColumns = getDisplayColumns(scoreConfig?.score_column_config || {});

//     let totalScoreColumns = 0;
//     displayColumns.forEach((col: any) => {
//       if (col.hasChildren) {
//         totalScoreColumns += col.children.length;
//       } else {
//         totalScoreColumns += 1;
//       }
//     });

//     const totalColumns = 3 + totalScoreColumns + 1;

//     // --- HEADER SECTION ---
//     let titleRow = worksheet.addRow([]);
//     titleRow.height = 25;
//     const titleCell = titleRow.getCell(1);
//     titleCell.value = selectedClassSubject.classes.class_name;
//     titleCell.font = { size: 18, bold: true };
//     titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
//     worksheet.mergeCells(1, 1, 1, totalColumns);

//     let subtitleRow = worksheet.addRow([]);
//     subtitleRow.height = 20;
//     const subtitleCell = subtitleRow.getCell(1);
//     subtitleCell.value = selectedClassSubject.subjects.subject_name;
//     subtitleCell.font = { size: 14, bold: true, color: { argb: 'FF1F4788' } };
//     subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
//     worksheet.mergeCells(2, 1, 2, totalColumns);

//     let infoRow = worksheet.addRow([]);
//     infoRow.height = 16;
//     const infoCell = infoRow.getCell(1);
//     infoCell.value = `Năm học: ${academicYear} | Học kỳ: ${semester}`;
//     infoCell.font = { size: 11, italic: true };
//     infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
//     worksheet.mergeCells(3, 1, 3, totalColumns);

//     worksheet.addRow([]);

//     // --- COLUMN HEADERS ---
//     const headerRow1 = worksheet.addRow([]);
//     headerRow1.height = 25;
//     headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
//     headerRow1.fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF1F4788' },
//     };
//     headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };

//     // Student name column
//     headerRow1.getCell(1).value = 'STT';
//     worksheet.getColumn(1).width = 7;
//     headerRow1.getCell(2).value = 'Mã HS';
//     worksheet.getColumn(2).width = 12;
//     headerRow1.getCell(3).value = 'Họ và tên';
//     worksheet.getColumn(3).width = 20;

//     let colCount = 3;

//     // Add score column headers
//     displayColumns.forEach((column: any) => {
//       colCount++;
//       if (column.hasChildren) {
//         headerRow1.getCell(colCount).value = column.label;
//         headerRow1.getCell(colCount).alignment = {
//           horizontal: 'center',
//           vertical: 'middle',
//           wrapText: true,
//         };
//         worksheet.getColumn(colCount).width = 15;
//       } else {
//         headerRow1.getCell(colCount).value = column.label;
//         headerRow1.getCell(colCount).alignment = {
//           horizontal: 'center',
//           vertical: 'middle',
//           wrapText: true,
//         };
//         worksheet.getColumn(colCount).width = 12;
//       }
//     });

//     // Average score column
//     colCount++;
//     headerRow1.getCell(colCount).value = 'Điểm TB';
//     worksheet.getColumn(colCount).width = 10;

//     // --- DATA ROWS ---
//     students.forEach((studentData, studentIndex) => {
//       const row = worksheet.addRow([]);
//       row.height = 20;
//       row.alignment = { horizontal: 'center', vertical: 'middle' };

//       // Row number
//       row.getCell(1).value = studentIndex + 1;
//       row.getCell(1).alignment = {
//         horizontal: 'center',
//         vertical: 'middle',
//       };

//       // Student ID
//       row.getCell(2).value = studentData.student.student_id;
//       row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

//       // Student name
//       row.getCell(3).value = studentData.student.full_name;
//       row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

//       let cellCount = 3;

//       // Score data
//       displayColumns.forEach((column: any) => {
//         cellCount++;

//         if (column.hasChildren) {
//           column.children.forEach((child: any, childIndex: number) => {
//             if (childIndex > 0) cellCount++;
//             const scoreValue = studentData.score?.score_data?.[child.key]?.Diem;
//             row.getCell(cellCount).value = scoreValue || '';
//             row.getCell(cellCount).alignment = {
//               horizontal: 'center',
//               vertical: 'middle',
//             };

//             if (scoreValue) {
//               row.getCell(cellCount).fill = {
//                 type: 'pattern',
//                 pattern: 'solid',
//                 fgColor: { argb: 'FFCCE5FF' },
//               };
//             }
//           });
//         } else {
//           const scoreValue = studentData.score?.score_data?.[column.key]?.Diem;
//           row.getCell(cellCount).value = scoreValue || '';
//           row.getCell(cellCount).alignment = {
//             horizontal: 'center',
//             vertical: 'middle',
//           };

//           if (scoreValue) {
//             row.getCell(cellCount).fill = {
//               type: 'pattern',
//               pattern: 'solid',
//               fgColor: { argb: 'FFCCE5FF' },
//             };
//           }
//         }
//       });

//       // Average score
//       cellCount++;
//       if (studentData.score?.score_data) {
//         const avgScore = calculateFinalScore(studentData.score.score_data);
//         row.getCell(cellCount).value = avgScore;
//         row.getCell(cellCount).font = { bold: true };
//         row.getCell(cellCount).alignment = {
//           horizontal: 'center',
//           vertical: 'middle',
//         };

//         const color =
//           typeof avgScore === 'string'
//             ? avgScore === 'Đ'
//               ? 'FF92D050'
//               : 'FFFF0000'
//             : avgScore >= 5
//             ? 'FF92D050'
//             : 'FFFF0000';

//         row.getCell(cellCount).fill = {
//           type: 'pattern',
//           pattern: 'solid',
//           fgColor: { argb: color },
//         };
//       }
//     });

//     // Generate Excel file
//     const buffer = await workbook.xlsx.writeBuffer();
//     const blob = new Blob([buffer], {
//       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//     });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `${selectedClassSubject.subjects.subject_name}_${academicYear}_${semester}.xlsx`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);

//     toast.success('Xuất Excel thành công!');
//   } catch (error) {
//     logger.error('Error exporting to Excel:', error);
//     toast.error('Lỗi khi xuất Excel!');
//   }
// };
