// React already imported by JSX transform
import { Users, User, Plus, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ScoreTableProps {
  students: any[];
  totalStudents: number;
  scoreConfig: any;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditScore: (studentData: any) => void;
  getDisplayColumns: (config: Record<string, any>) => any[];
  calculateFinalScore: (scoreData: any) => string | number;
  gradeEditLocked?: boolean;
}

export default function ScoreTable({
  students,
  totalStudents,
  scoreConfig,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEditScore,
  getDisplayColumns,
  calculateFinalScore,
  gradeEditLocked = false,
}
: ScoreTableProps) 
{
  const displayColumns = getDisplayColumns(scoreConfig?.score_column_config || {});

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-md">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-900">
              Danh sách học sinh
            </h3>
            <span className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-full">
              {totalStudents} học sinh
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">
              Số lượng dòng/trang:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="min-w-16 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            <tr className="bg-muted/50">
              <th
                className="px-5 py-4 text-left border-b-2 border-gray-300"
                rowSpan={2}
              >
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-4 h-4" />
                  <span>Học sinh</span>
                </span>
              </th>
              {displayColumns.map((column: any) => {
                if (column.hasChildren) {
                  return (
                    <th
                      key={column.key}
                      colSpan={column.children.length}
                      className="px-4 py-4 text-center border-b-2 border-gray-300 border-x bg-muted/50"
                    >
                      <div className="text-xs font-semibold tracking-wider text-gray-700 uppercase">
                        {column.label}
                      </div>
                      <div className="text-xs text-gray-600 normal-case font-normal mt-0.5">
                        {column.children.length} điểm
                      </div>
                    </th>
                  );
                } else {
                  return (
                    <th
                      key={column.key}
                      rowSpan={2}
                      className="px-5 py-4 text-center border-b-2 border-gray-300 border-r-[1px]"
                    >
                      <div className="text-xs font-semibold tracking-wider text-gray-700 uppercase">
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
                className="px-5 py-4 text-left border-b-2 border-gray-300 border-r-[1px]"
                rowSpan={2}
              >
                <span className="text-xs text-center font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>ĐIỂM TỔNG KẾT</span>
                </span>
              </th>
              <th
                className="px-5 py-4 text-left border-b-2 border-gray-300"
                rowSpan={2}
              >
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>Tùy chọn</span>
                </span>
              </th>
            </tr>
            {/* Second header row: Child columns */}
            <tr className="bg-muted/50">
              {displayColumns.map((column: any) => {
                if (column.hasChildren) {
                  return column.children.map((child: any) => (
                    <th
                      key={child.key}
                      className="px-3 py-3 text-center border-b-2 border-gray-300 border-x bg-muted/50"
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
            {(() => {
              // Show empty state if no students
              if (totalStudents === 0) {
                return (
                  <tr>
                    <td colSpan={displayColumns.length + 7} className="px-5 py-12">
                      <div className="text-center space-y-3">
                        <Users className="w-12 h-12 text-gray-300 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-600">Chưa có dữ liệu học sinh</p>
                          <p className="text-sm text-gray-400 mt-1">Lớp này hiện chưa có học sinh</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              const startIndex = (currentPage - 1) * pageSize;

              return students.map((studentData: any, index: number) => (
                <tr
                  key={studentData.student.id}
                  className={`transition-colors ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  } hover:bg-gray-100`}
                >
                  <td className="px-5 py-4 relative">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center text-xs font-bold text-white bg-indigo-600 rounded px-2 py-1 min-w-[32px]">
                          {startIndex + index + 1}
                        </div>
                        <div className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded border border-gray-200 min-w-[60px] text-center">
                          {studentData.student.student_id}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {studentData.student.full_name}
                      </div>
                    </div>
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                  </td>
                  {displayColumns.map((column: any) => {
                    if (column.hasChildren) {
                      return column.children.map((child: any) => (
                        <td key={child.key} className="px-3 py-4 text-center relative">
                          {studentData.score?.score_data?.[child.key]?.Diem ? (
                            <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium border border-green-200 min-w-[50px] inline-block">
                              {
                                studentData.score.score_data[child.key].Diem
                              }
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm border border-gray-200 min-w-[50px] inline-block">
                              -
                            </span>
                          )}
                          <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                        </td>
                      ));
                    } else {
                      return (
                        <td key={column.key} className="px-5 py-4 text-center relative">
                          {studentData.score?.score_data?.[column.key]?.Diem ? (
                            <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium border border-green-200 min-w-[50px] inline-block">
                              {
                                studentData.score.score_data[column.key].Diem
                              }
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm border border-gray-200 min-w-[50px] inline-block">
                              -
                            </span>
                          )}
                          <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                        </td>
                      );
                    }
                  })}
                  <td className="px-5 py-4 relative text-center">
                    {studentData.score?.score_data ? (
                      <span className="bg-blue-50 text-blue-700 text-center px-3 py-1.5 rounded-md text-sm font-bold border border-blue-200 min-w-[60px] inline-block">
                        {calculateFinalScore(studentData.score.score_data)}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm border border-gray-200 min-w-[50px] inline-block">
                        -
                      </span>
                    )}
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onEditScore(studentData)}
                      disabled={gradeEditLocked}
                      title={
                        gradeEditLocked
                          ? 'Đã khóa sửa bảng điểm sau deadline'
                          : undefined
                      }
                      className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-lg font-medium text-sm transition-colors ${
                        gradeEditLocked
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {studentData.score ? (
                        <Pencil className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{studentData.score ? 'Sửa' : 'Thêm'}</span>
                    </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {(() => {
        const totalPages = Math.ceil(totalStudents / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        if (totalPages <= 1) return null;

        return (
          <div className="px-6 py-5 border-t border-gray-200 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                Hiển thị{" "}
                <span className="font-semibold">
                  {startIndex + 1}
                </span>{" "}
                đến{" "}
                <span className="font-semibold">
                  {Math.min(endIndex, totalStudents)}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">{totalStudents}</span> học
                sinh
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    onPageChange(Math.max(1, currentPage - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="inline-block w-4 h-4" /> Trước
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((pageNum) => {
                    const showPage =
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 &&
                        pageNum <= currentPage + 1);

                    if (!showPage) {
                      if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span
                            key={pageNum}
                            className="px-2 text-gray-500"
                          >
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
                            ? "bg-blue-600 text-white border border-blue-600"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau <ChevronRight className="inline-block w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const ScoreTableSkeleton = () => (
  <div className="overflow-hidden bg-white rounded-lg shadow-md">
    {/* Table Header - Static, no skeleton */}
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-800">
            Danh sách học sinh
          </h3>
          {/* <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
            ? học sinh
          </span> */}
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">
            Số lượng/trang:
          </label>
          <select
            disabled
            className="min-w-16 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50"
          >
            <option>10</option>
          </select>
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
      <div className="p-6 space-y-3 w-full">
        {/* Table header skeleton */}
        <div className="pb-3 border-b-2 border-gray-300 flex gap-3 w-full">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
        </div>

        {/* Table rows skeleton */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
          <div key={row} className="flex gap-3 w-full">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
