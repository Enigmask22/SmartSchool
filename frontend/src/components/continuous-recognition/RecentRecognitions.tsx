// React already imported by JSX transform
import { Clock, AlertCircle, Settings, Camera, Square, Play, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    student_id?: string;
    code?: string;
    class?: string;
    class_name?: string;
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
  cooldownPeriod?: number;
  settingsError?: string;
  onCooldownChange?: (value: number) => void;
  onSaveSettings?: () => void;
  isCameraOn?: boolean;
  isRunning?: boolean;
  cameraSource?: 'webcam' | 'managed';
  onToggleCamera?: () => void;
  onToggleRecognition?: () => void;
}

const RecentRecognitions = ({
  recognitions,
  maxItems = 20,
  cooldownPeriod = 0,
  settingsError = "",
  onCooldownChange,
  onSaveSettings,
  isCameraOn = false,
  isRunning = false,
  cameraSource = 'webcam',
  onToggleCamera,
  onToggleRecognition,
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
    <div className="p-6 duration-200 bg-white border-2 shadow-md rounded-2xl hover:shadow-lg flex flex-col h-full max-h-[673px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-indigo-100 w-10 h-10 rounded-xl">
            <Clock className="text-indigo-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Nhận diện gần đây</h3>
            <p className="text-xs text-gray-500 mt-0.5">{recognitions.length} nhận diện</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-base font-semibold">
          {recognitions.length}
        </Badge>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {recognitions.length === 0 ? (
          <div className="py-24 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Chưa có nhận diện nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Thời gian</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Mã HS</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Họ tên</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Lớp</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase text-center">Mức độ khớp</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Loại</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase">Camera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item, index) => (
                  <TableRow 
                    key={item.id || index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="text-xs text-gray-500 font-mono">
                      {item.timestamp || new Date().toLocaleTimeString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-sm font-mono font-semibold text-gray-700">
                      {item.student?.student_code || item.student?.student_id || item.student?.code || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {item.student?.full_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {item.student?.class || item.student?.class_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getConfidenceBadge(item.confidence)}
                        {item.confidence && (
                          <span className="text-xs font-semibold text-gray-600">
                            {(item.confidence > 100 ? (item.confidence / 100).toFixed(2) : item.confidence.toFixed(2)).replace('.', ',')}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {item.attendance?.type || 'Nhận diện'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {item.camera_id || 'Webcam'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Control Buttons Section */}
      <div className="flex gap-2 pt-3 mt-3 border-t border-gray-200 flex-shrink-0 justify-between">
        {/* Camera Toggle Button - only for webcam mode */}
        {cameraSource === "webcam" && onToggleCamera && (
          <Button
            onClick={onToggleCamera}
            variant={isCameraOn ? "destructive" : "default"}
            className="flex items-center justify-center gap-2"
            size="lg"
          >
            {isCameraOn ? <Square size={16} /> : <Camera size={16} />}
            <span>{isCameraOn ? "Tắt" : "Bật"}</span>
          </Button>
        )}

         {/* Recognition Control Button */}
        {onToggleRecognition && (
          <Button
            onClick={onToggleRecognition}
            variant={isRunning ? "destructive" : "default"}
            className="flex items-center justify-center gap-2"
            size="lg"
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            <span>
              {isRunning ? "Dừng nhận diện" : "Bắt đầu nhận diện"}
            </span>
          </Button>
        )}
      </div>

      {/* Settings Section - Fixed at bottom */}
      <div className="pt-3 mt-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-md font-semibold text-gray-700 whitespace-nowrap pr-2">Thời gian chờ:</span>
          <Input
            type="number"
            min="1"
            max="300"
            value={cooldownPeriod}
            onChange={(e) => onCooldownChange?.(parseInt(e.target.value) || 1)}
            className="focus-visible:outline-none border border-gray-300 rounded-lg h-8 flex-1"
            placeholder="Giây"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap pr-2">giây</span>
          <Button 
            onClick={onSaveSettings}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex-shrink-0"
          >
            Lưu
          </Button>
        </div>
        {settingsError && (
          <div className="p-2 mt-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700">{settingsError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentRecognitions;
