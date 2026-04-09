import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function LoadingCard() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50"
      style={{ backgroundImage: 'url(/background_login.jpg)' }}
      >
      <Card className="w-96">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </CardContent>
      </Card>
    </div>
  );
}
