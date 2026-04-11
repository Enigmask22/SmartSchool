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
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  totalItems: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  loading?: boolean;
  searchTerm?: string;
}

export function AdminPagination({
  totalItems,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  startIndex,
  endIndex,
  loading = false,
  searchTerm = "",
}: AdminPaginationProps) {
  return (
    <Card className="shadow-md mt-6">
      <CardContent className="py-4">
        {/* Row 1: Summary, Pagination, and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                  {Math.min(endIndex, totalItems)}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">{totalItems}</span> bản ghi
                {searchTerm && <span> (tìm kiếm: <span className="font-semibold italic">"{searchTerm}"</span>)</span>}
              </div>

              {/* Center: Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 flex-1">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Sau <ChevronRight />
                  </Button>
                </div>
              )}

              {/* Right: Page Size Selector */}
              <div className="flex items-center space-x-2">
                <Label className="text-sm whitespace-nowrap">Số lượng/trang:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
