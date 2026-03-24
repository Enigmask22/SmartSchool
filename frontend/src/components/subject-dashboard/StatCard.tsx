import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  color?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'bg-blue-50',
}: StatCardProps) {
  return (
    <Card className={color}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <p
                className={`text-sm mt-1 ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {change >= 0 ? '+' : ''}{change}%
              </p>
            )}
          </div>
          {Icon && <Icon className="w-8 h-8 text-gray-400" />}
        </div>
      </CardContent>
    </Card>
  );
}
