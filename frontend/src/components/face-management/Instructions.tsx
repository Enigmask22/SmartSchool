import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default function Instructions() {
  return (
    <Card className="mt-6 shadow-md">
      <CardContent className="p-6">
        <h4 className="mb-2 text-lg font-semibold text-primary">
          Hướng dẫn sử dụng
        </h4>
        <div className="space-y-1 text-muted-foreground">
          <p>
            • Để đăng ký khuôn mặt cho học sinh, vào tab "Học sinh" và bấm nút
            "Đăng ký mặt"
          </p>
          <p>
            • Hệ thống sẽ mở camera để chụp ảnh khuôn mặt và lưu vào database
          </p>
          <p>
            • Sau khi đăng ký, học sinh có thể được nhận diện tự động trong
            chức năng điểm danh
          </p>
          <p>
            • Sử dụng nút "Reload Models" để cập nhật lại mô hình AI sau khi
            có thay đổi
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
