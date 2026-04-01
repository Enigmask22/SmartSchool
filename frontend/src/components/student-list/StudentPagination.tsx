import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Users, CheckCircle2, Trash2 } from "lucide-react";

interface StudentPaginationProps {
  totalStudents: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  startIndex: number;
  endIndex: number;
  // Summary props
  activeStudents: number;
  inactiveStudents: number;
  filteredCount: number;
  totalCount: number;
  searchTerm?: string;
  selectedClass?: string;
  loading?: boolean;
}

export function StudentPagination({
  totalStudents,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  viewMode,
  setViewMode,
  startIndex,
  endIndex,
  activeStudents,
  inactiveStudents,
  filteredCount,
  totalCount,
  searchTerm = "",
  selectedClass = "",
  loading = false,
}: StudentPaginationProps) {

  return (
    <Card className="shadow-md">
      <CardContent className="py-4">
        {/* Row 1: Summary, Pagination, and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
          {loading ? (
            <>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-48 flex-1" />
              <Skeleton className="h-10 w-32" />
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Hiển thị <span className="font-semibold">{startIndex + 1}</span>{" "}
                đến{" "}
                <span className="font-semibold">
                  {Math.min(endIndex, totalStudents)}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">{totalStudents}</span> học sinh
              </div>

              {/* Center: Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 flex-1">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1) as any)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft /> Trước
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 &&
                            pageNum <= currentPage + 1);

                        if (!showPage) {
                          // Show ellipsis for skipped pages
                          if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                          ) {
                            return (
                              <span
                                key={pageNum}
                                className="px-2 text-muted-foreground"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <Button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            variant={
                              currentPage === pageNum ? "default" : "outline"
                            }
                            size="sm"
                          >
                            {pageNum}
                          </Button>
                        );
                      },
                    )}
                  </div>

                  <Button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1) as any)
                    }
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Sau <ChevronRight />
                  </Button>
                </div>
              )}

              {/* Right: Controls */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-lg border-input">
                  <Button
                    onClick={() => setViewMode("grid")}
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode("list")}
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {/* Page Size Selector */}
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Số lượng/trang:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value) as any);
                      setCurrentPage(1 as any);
                    }}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Row 2: Summary Stats */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-6 pt-4">
            {/* Displayed count */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                Hiển thị <span className="font-semibold text-foreground">{filteredCount}</span> / <span className="font-semibold text-foreground">{totalCount}</span> học sinh
                {searchTerm && <span> với từ khóa <span className="font-semibold italic">"{searchTerm}"</span></span>}
                {selectedClass && <span> trong lớp <span className="font-semibold">{selectedClass}</span></span>}
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Active students count */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{activeStudents}</span> đang hoạt động
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Inactive students count */}
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{inactiveStudents}</span> đã xóa
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
