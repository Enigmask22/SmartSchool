import { Camera, CameraOff, AlertCircle, Pause, CheckCircle } from 'lucide-react';
import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CameraViewProps {
  cameraSource: 'webcam' | 'managed';
  selectedCameraId: string | null;
  selectedMultiCameras: string[];
  useMultiCamera: boolean;
  availableCameras: any[];
  isCameraOn: boolean;
  isRunning: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraPreviews: Record<string, string>;
  cameraStats: Record<string, any>;
  recognizedStudents: any[];
  onCameraSourceChange: (source: 'webcam' | 'managed') => void;
  onSelectedCameraChange: (cameraId: string) => void;
  onMultiCameraToggle: (enabled: boolean) => void;
  onSelectedMultiCamerasChange: (cameras: string[]) => void;
}

const CameraView = ({
  cameraSource,
  selectedCameraId,
  selectedMultiCameras,
  useMultiCamera,
  availableCameras,
  isCameraOn,
  isRunning,
  videoRef,
  cameraPreviews,
  cameraStats,
  recognizedStudents,
  onCameraSourceChange,
  onSelectedCameraChange,
  onMultiCameraToggle,
}: CameraViewProps) => {
  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-6 h-6 text-primary" />
              <span>Camera Nhận Diện</span>
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Camera Source Selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Nguồn:</Label>
                <Select
                  value={cameraSource}
                  onValueChange={(value) => {
                    onCameraSourceChange(value as 'webcam' | 'managed');
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webcam">Webcam</SelectItem>
                    <SelectItem value="managed">
                      Camera Quản Lý
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Managed Camera Selector */}
              {cameraSource === "managed" && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Camera:</Label>
                  <Select
                    value={selectedCameraId || ""}
                    onValueChange={(value) => {
                      onSelectedCameraChange(value);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Chọn camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCameras.map((cam) => (
                        <SelectItem
                          key={cam.camera_id}
                          value={cam.camera_id}
                        >
                          {cam.name} ({cam.location || "N/A"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Multi-camera toggle */}
              {availableCameras.length > 0 && cameraSource === "managed" && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="multiCamera"
                    checked={useMultiCamera}
                    onChange={(e) => {
                      onMultiCameraToggle(e.target.checked);
                    }}
                    className="w-4 h-4 cursor-pointer"
                    disabled={availableCameras.length < 2}
                  />
                  <Label
                    htmlFor="multiCamera"
                    className={`text-sm font-medium cursor-pointer ${
                      availableCameras.length < 2
                        ? "text-gray-400"
                        : "text-blue-900"
                    }`}
                  >
                    Multi-Camera
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            {/* Show video for webcam mode */}
            {cameraSource === "webcam" && (
              <>
                <video
                  ref={videoRef}
                  className={`w-full h-auto bg-black rounded-lg ${
                    !isCameraOn ? "hidden" : ""
                  }`}
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Placeholder when camera is off */}
                {!isCameraOn && (
                  <div className="flex items-center justify-center w-full bg-gray-800 rounded-lg h-96">
                    <div className="text-center text-white">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="mb-2 text-xl font-semibold">
                        Camera đã tắt
                      </h3>
                      <p className="text-gray-300">
                        Nhấn nút "Bật Camera" để bắt đầu
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Show preview: single camera or multi-camera grid */}
            {cameraSource === "managed" &&
              cameraPreviews &&
              (useMultiCamera && selectedMultiCameras.length > 0 ? (
                // Multi-camera grid view
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedMultiCameras.map((cameraId) => {
                    const camera = availableCameras.find(
                      (c) => c.camera_id === cameraId
                    );
                    const preview = cameraPreviews[cameraId];
                    const stats = cameraStats[cameraId] || {
                      total: 0,
                      uniqueCount: 0,
                      lastFrame: null,
                    };

                    return (
                      <Card key={cameraId} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {camera?.name || `Camera ${cameraId}`}
                              </CardTitle>
                              {camera?.location && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {camera.location}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                camera?.status === "active"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {camera?.status === "active"
                                ? "✓ Active"
                                : "✗ Inactive"}
                            </Badge>
                          </div>
                          {isRunning && (
                            <div className="flex items-center gap-2 px-2 py-1 text-xs bg-green-100 rounded">
                              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                              <span className="font-medium text-green-700">
                                ĐANG NHẬN DIỆN
                              </span>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="p-0">
                          {preview ? (
                            <div className="relative bg-black">
                              <img
                                src={preview}
                                alt={`Camera ${cameraId}`}
                                className="w-full h-auto aspect-video object-cover"
                              />
                              <div className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                                {stats.total} nhận diện
                              </div>
                            </div>
                          ) : (
                            <div className="h-48 bg-gray-300 flex items-center justify-center text-gray-600">
                              Đang tải...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : selectedCameraId && cameraPreviews[selectedCameraId] ? (
                // Single managed camera
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img
                    src={cameraPreviews[selectedCameraId]}
                    alt="Camera feed"
                    className="w-full h-auto aspect-video object-cover"
                  />
                </div>
              ) : (
                <div className="h-96 bg-gray-300 flex items-center justify-center text-gray-600">
                  Chọn camera để xem preview
                </div>
              ))}

            {/* Status Overlay Badge - Webcam mode */}
            {cameraSource === "webcam" && (
              <div className="absolute top-4 left-4">
                <div
                  className={`px-3 py-2 rounded-lg text-white font-medium flex items-center space-x-2 ${
                    !isCameraOn
                      ? "bg-gray-600"
                      : isRunning
                      ? "bg-green-600"
                      : "bg-red-600"
                  }`}
                >
                  {!isCameraOn ? (
                    <>
                      <CameraOff size={18} />
                      <span>CAMERA TẮT</span>
                    </>
                  ) : isRunning ? (
                    <>
                      <AlertCircle size={18} className="animate-pulse" />
                      <span>ĐANG NHẬN DIỆN</span>
                    </>
                  ) : (
                    <>
                      <Pause size={18} />
                      <span>TẠM DỪNG</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Recognition Results Overlay */}
            {recognizedStudents.length > 0 && (
              <div className="absolute right-4 bottom-4 left-4">
                {recognizedStudents.slice(0, 3).map((recognition, index) => {
                  const confidence = recognition.confidence;
                  let bgColor = "bg-green-600";

                  if (confidence >= 45) {
                    bgColor = "bg-emerald-600";
                  } else if (confidence >= 35) {
                    bgColor = "bg-green-600";
                  } else if (confidence >= 25) {
                    bgColor = "bg-blue-600";
                  } else if (confidence >= 20) {
                    bgColor = "bg-yellow-600";
                  } else {
                    bgColor = "bg-orange-600";
                  }

                  return (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 mb-2 text-white rounded-lg ${bgColor}`}
                    >
                      <div>
                        <div className="font-semibold">
                          {recognition.student.full_name}
                        </div>
                        <div className="text-xs opacity-90">
                          {recognition.student.student_code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {(recognition.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs opacity-90">Độ khớp</div>
                      </div>
                      <CheckCircle size={24} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraView;
