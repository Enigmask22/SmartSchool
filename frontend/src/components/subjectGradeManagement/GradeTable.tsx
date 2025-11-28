import React from "react";
import { Users, User, Star, Zap, Pencil, Plus, BarChart3, Settings } from "lucide-react";

interface DisplayColumn {
  key: string;
  label: string;
  he_so?: number;
  hasChildren?: boolean;
  children?: Array<{
    key: string;
    label: string;
    he_so: number;
  }>;
}

interface Student {
  id: number;
  student_id: string;
  full_name: string;
}

interface Score {
  score_data?: {
    [key: string]: {
      Diem: string | number;
    };
  };
}

interface StudentData {
  student: Student;
  score?: Score;
}

interface GradeTableProps {
  students: StudentData[];
  scoreConfig: {
    score_column_config: any;
  } | null;
  currentPage: number;
  pageSize: number;
  getDisplayColumns: (config: any) => DisplayColumn[];
  calculateFinalGrade: (gradeData: any) => string | number;
  onEditScore: (studentData: StudentData) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onShowConfigEditor: () => void;
}

export const GradeTable: React.FC<GradeTableProps> = ({
  students,
  scoreConfig,
  currentPage,
  pageSize,
  getDisplayColumns,
  calculateFinalGrade,
  onEditScore,
  onPageChange,
  onPageSizeChange,
  onShowConfigEditor,
}) => {
  if (!scoreConfig) {
    return (
      <div className="py-12 text-center bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-800">
          Chưa có cấu hình cột điểm
        </h3>
        <p className="mb-6 text-gray-600">
          Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt đầu nhập
          điểm.
        </p>
        <button
          onClick={onShowConfigEditor}
          className="inline-flex items-center px-6 py-3 space-x-2 font-medium text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md"
        >
          <Settings className="w-4 h-4" />
          <span>Tạo cấu hình cột điểm</span>
        </button>
      </div>
    );
  }

  const totalStudents = students.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = students.slice(startIndex, endIndex);
  const displayColumns = getDisplayColumns(scoreConfig.score_column_config);

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-800">
              Danh sách học sinh
            </h3>
            <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
              {students.length} học sinh
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Số lượng/trang:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            {/* First header row: Parent columns */}
            <tr className="bg-gray-50">
              <th
                className="px-5 py-3 text-left border-b-2 border-gray-300"
                rowSpan={2}
              >
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-4 h-4" />
                  <span>Học sinh</span>
                </span>
              </th>
              {displayColumns.map((column) => {
                if (column.hasChildren) {
                  return (
                    <th
                      key={column.key}
                      colSpan={column.children?.length || 0}
                      className="px-3 py-3 text-center border-b-2 border-gray-300 border-x bg-gray-50"
                    >
                      <div className="text-xs font-semibold tracking-wider text-gray-700 uppercase">
                        {column.label}
                      </div>
                      <div className="text-xs text-gray-600 normal-case font-normal mt-0.5">
                        {column.children?.length} điểm
                      </div>
                    </th>
                  );
                } else {
                  return (
                    <th
                      key={column.key}
                      rowSpan={2}
                      className="px-5 py-3 text-center border-b-2 border-gray-300"
                    >
                      <div className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
                        {column.label}
                      </div>
                      <div className="text-xs text-blue-600 normal-case font-normal mt-0.5">
                        Hệ số: {column.he_so}
                      </div>
                    </th>
                  );
                }
              })}
              <th
                className="px-5 py-3 text-left border-b-2 border-gray-300"
                rowSpan={2}
              >
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <Star className="w-4 h-4" />
                  <span>Điểm TB</span>
                </span>
              </th>
              <th
                className="px-5 py-3 text-left border-b-2 border-gray-300"
                rowSpan={2}
              >
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Thao tác</span>
                </span>
              </th>
            </tr>
            {/* Second header row: Child columns */}
            <tr className="bg-gray-50">
              {displayColumns.map((column) => {
                if (column.hasChildren) {
                  return column.children?.map((child) => (
                    <th
                      key={child.key}
                      className="px-3 py-2 text-center border-b-2 border-gray-300 border-x bg-gray-50"
                    >
                      <div className="text-xs font-medium text-gray-700">
                        {child.label}
                      </div>
                      <div className="text-xs text-gray-600 normal-case font-normal mt-0.5">
                        Hệ số: {child.he_so}
                      </div>
                    </th>
                  ));
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedStudents.map((studentData, index) => (
              <tr
                key={studentData.student.id}
                className="transition-colors hover:bg-gray-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center justify-center text-sm font-bold text-white bg-blue-600 rounded-lg w-9 h-9">
                      {startIndex + index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {studentData.student.full_name}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
                        {studentData.student.student_id}
                      </div>
                    </div>
                  </div>
                </td>
                {displayColumns.map((column) => {
                  if (column.hasChildren) {
                    return column.children?.map((child) => (
                      <td key={child.key} className="px-3 py-3 text-center">
                        {studentData.score?.score_data?.[child.key]?.Diem ? (
                          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                            {studentData.score.score_data[child.key].Diem}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                            -
                          </span>
                        )}
                      </td>
                    ));
                  } else {
                    return (
                      <td key={column.key} className="px-5 py-3 text-center">
                        {studentData.score?.score_data?.[column.key]?.Diem ? (
                          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                            {studentData.score.score_data[column.key].Diem}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                            -
                          </span>
                        )}
                      </td>
                    );
                  }
                })}
                <td className="px-5 py-3">
                  {studentData.score?.score_data ? (
                    <span className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold">
                      {calculateFinalGrade(studentData.score.score_data)}
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                      -
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => onEditScore(studentData)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                  >
                    {studentData.score ? (
                      <Pencil className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{studentData.score ? "Sửa" : "Nhập điểm"}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              Hiển thị <span className="font-semibold">{startIndex + 1}</span> đến{" "}
              <span className="font-semibold">
                {Math.min(endIndex, totalStudents)}
              </span>{" "}
              trong tổng số <span className="font-semibold">{totalStudents}</span>{" "}
              học sinh
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => {
                    const showPage =
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                    if (!showPage) {
                      if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span key={pageNum} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

