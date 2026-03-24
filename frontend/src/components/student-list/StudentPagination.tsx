import React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { LayoutGrid, List } from "lucide-react";

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
}: StudentPaginationProps) {
  if (totalStudents === 0) {
    return null;
  }

  return (
    <>
      {/* Summary Card */}
      {totalStudents > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Hiển thị <span className="font-semibold">{startIndex + 1}</span>{" "}
                đến{" "}
                <span className="font-semibold">
                  {Math.min(endIndex, totalStudents)}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">{totalStudents}</span> học sinh
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-center space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1) as any)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                ← Trước
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
                Sau →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
