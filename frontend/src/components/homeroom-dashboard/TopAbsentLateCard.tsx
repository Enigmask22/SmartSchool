import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TopAbsentLateStudent } from '@/hooks/homeroom-dashboard/useHomeroomData';

interface TopAbsentLateCardProps {
  title: string;
  description: string;
  data: TopAbsentLateStudent[];
  badgeVariant: 'default' | 'destructive' | 'secondary' | 'warning' | 'outline';
  countKey: 'absent_count' | 'late_count';
  loading?: boolean;
}

export function TopAbsentLateCard({
  title,
  description,
  data,
  badgeVariant,
  countKey,
  loading = false,
}: TopAbsentLateCardProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="w-12 h-6" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Không có dữ liệu</div>
        ) : (
          <div className="space-y-2">
            {data.map((s, idx) => {
              const count = (s[countKey] as number) ?? 0;
              if (count > 0) {
                return (
                  <div
                    key={s.student_code || idx}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 text-xs font-bold text-center pt-1 rounded-full bg-muted">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium">{s.student_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.student_code} • Lớp {s.class_name}
                        </div>
                      </div>
                    </div>
                    <Badge variant={badgeVariant}>{count}</Badge>
                  </div>
                );
              }

              // Placeholder for empty slots (count === 0)
              return (
                <div
                  key={s.student_code || idx}
                  className="flex items-center justify-between p-2 border border-dashed rounded text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-3">
                      <span className="w-6 h-6 text-xs font-medium text-center pt-1 rounded-full bg-muted/50">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium h-5 mb-2">Không có học sinh vắng</div>
                        <div className="text-xs text-muted-foreground h-3">Không có học sinh vắng để hiển thị</div>
                      </div>
                    </div>
                  <div className="w-12 h-6" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
