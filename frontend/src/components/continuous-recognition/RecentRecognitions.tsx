// React already imported by JSX transform
import { Clock, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecognitionItem {
  student: {
    full_name: string;
    student_code?: string;
    id?: string;
  };
  confidence?: number;
  timestamp?: string;
  camera_id?: string;
  attendance?: {
    type: string;
  };
  id?: string;
}

interface RecentRecognitionsProps {
  recognitions: RecognitionItem[];
  maxItems?: number;
}

const RecentRecognitions = ({
  recognitions,
  maxItems = 20,
}: RecentRecognitionsProps) => {
  const displayItems = recognitions.slice(0, maxItems);

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 45) return <Badge className="bg-emerald-600">★★★★★</Badge>;
    if (confidence >= 35) return <Badge className="bg-green-600">★★★★☆</Badge>;
    if (confidence >= 25) return <Badge className="bg-blue-600">★★★☆☆</Badge>;
    if (confidence >= 20) return <Badge className="bg-yellow-600">★★☆☆☆</Badge>;
    return <Badge className="bg-orange-600">★☆☆☆☆</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Nhận Diện Gần Đây</span>
          <Badge variant="secondary">{recognitions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {recognitions.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-muted-foreground">Chưa có nhận diện nào</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Mã HS</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Mức độ khớp</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Camera</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.timestamp || new Date().toLocaleTimeString('vi-VN')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.student?.student_code || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.student?.full_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {getConfidenceBadge(item.confidence)}
                    {item.confidence && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.confidence.toFixed(1)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.attendance?.type || 'Nhận diện'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.camera_id || 'Webcam'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentRecognitions;
