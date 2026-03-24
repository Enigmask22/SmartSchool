import { AlertTriangle } from 'lucide-react';

export function ErrorState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="p-8 text-center bg-white border-2 border-red-200 shadow-lg rounded-2xl">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-50">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <p className="font-medium text-red-600">
          Không thể tải dữ liệu phân tích. Vui lòng thử lại.
        </p>
      </div>
    </div>
  );
}
