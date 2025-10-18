import React, { useState, useRef, useEffect } from 'react';
import ApiService from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const AICamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecognition, setLastRecognition] = useState(null);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({
    width: 1280,
    height: 720,
    facingMode: 'user' // 'user' for front camera, 'environment' for back camera
  });

  useEffect(() => {
    return () => {
      // Cleanup: stop camera when component unmounts
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: cameraSettings.width,
          height: cameraSettings.height,
          facingMode: cameraSettings.facingMode
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Không thể truy cập camera. Bạn có thể sử dụng chế độ demo để test bằng cách upload ảnh.');
      setDemoMode(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreamActive(false);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Capture frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        try {
          const result = await ApiService.uploadImageForRecognition(blob);
          setLastRecognition(result);
          
          if (result.recognized && result.student) {
            // Auto mark attendance
            try {
              await ApiService.markAttendance(
                result.student.id, 
                'present', 
                `Điểm danh tự động bằng AI - Confidence: ${result.confidence}%`
              );
              console.log('✅ Đã đánh dấu điểm danh tự động cho:', result.student.full_name);
            } catch (attendanceError) {
              console.error('❌ Lỗi đánh dấu điểm danh:', attendanceError);
              setError('Nhận diện thành công nhưng không thể đánh dấu điểm danh');
            }
          }
        } catch (error) {
          console.error('Recognition failed:', error);
          setError('Nhận diện thất bại. Vui lòng thử lại.');
        } finally {
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Capture failed:', error);
      setError('Không thể chụp ảnh từ camera.');
      setIsProcessing(false);
    }
  };

  const uploadImageForRecognition = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);

      const result = await ApiService.uploadImageForRecognition(file);
      setLastRecognition(result);
      
      if (result.recognized && result.student) {
        // Auto mark attendance
        try {
          await ApiService.markAttendance(
            result.student.id, 
            'present', 
            `Điểm danh tự động bằng AI - Confidence: ${result.confidence}%`
          );
          console.log('✅ Đã đánh dấu điểm danh tự động cho:', result.student.full_name);
        } catch (attendanceError) {
          console.error('❌ Lỗi đánh dấu điểm danh:', attendanceError);
          setError('Nhận diện thành công nhưng không thể đánh dấu điểm danh');
        }
      }
    } catch (error) {
      console.error('Recognition failed:', error);
      setError('Nhận diện thất bại. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="ai-camera">
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">AI Camera</CardTitle>
            <CardDescription>Điểm danh tự động bằng nhận diện khuôn mặt</CardDescription>
            {error && (
              <div className="p-3 mt-2 text-destructive bg-destructive/10 rounded border border-destructive/20">
                {error}
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Camera Section */}
        <Card>
          <CardHeader>
            <CardTitle>Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden relative bg-muted rounded-lg" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="object-cover w-full h-full"
                style={{ display: isStreamActive ? 'block' : 'none' }}
              />
              
              {!isStreamActive && (
                <div className="flex absolute inset-0 justify-center items-center text-muted-foreground">
                  <div className="text-center">
                    <span className="block mb-4 text-6xl">📷</span>
                    <p>Camera chưa được bật</p>
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                {!isStreamActive ? (
                  <Button
                    onClick={startCamera}
                    className="flex-1"
                  >
                    📷 Bật Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={captureAndRecognize}
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? '⏳ Đang xử lý...' : '🎯 Chụp & Nhận diện'}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="destructive"
                    >
                      ❌ Tắt Camera
                    </Button>
                  </>
                )}
              </div>
              
              {/* Demo Mode - Upload Image */}
              {(demoMode || !isStreamActive) && (
                <div className="pt-2 border-t">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadImageForRecognition}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '📁 Upload ảnh để test (Demo)'}
                  </Button>
                  <p className="mt-1 text-xs text-center text-muted-foreground">
                    Hỗ trợ: JPG, PNG, WebP
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Kết quả nhận diện</CardTitle>
          </CardHeader>
          <CardContent>
            {!lastRecognition ? (
              <div className="py-8 text-center text-muted-foreground">
                <span className="block mb-2 text-4xl">🔍</span>
                <p>Chưa có kết quả nhận diện</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lastRecognition.recognized ? (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <span className="mr-2 text-xl text-green-600">✅</span>
                      <span className="font-semibold text-green-800">Nhận diện thành công</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Tên:</strong> {lastRecognition.student?.full_name}</p>
                      <p><strong>Mã HS:</strong> {lastRecognition.student?.student_id}</p>
                      <p><strong>Lớp:</strong> {lastRecognition.student?.class_name}</p>
                      <p><strong>Độ chính xác:</strong> {lastRecognition.confidence}%</p>
                      <p><strong>Thời gian:</strong> {new Date().toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center mb-2">
                      <span className="mr-2 text-xl text-yellow-600">❓</span>
                      <span className="font-semibold text-yellow-800">Không nhận diện được</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Không tìm thấy khuôn mặt đã đăng ký trong hệ thống
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">⚙️ Cài đặt Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium">Độ phân giải:</label>
                <select 
                  value={`${cameraSettings.width}x${cameraSettings.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setCameraSettings(prev => ({...prev, width, height}));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="640x480">640x480 (Thấp)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Camera:</label>
                <select 
                  value={cameraSettings.facingMode}
                  onChange={(e) => setCameraSettings(prev => ({...prev, facingMode: e.target.value}))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="user">Camera trước</option>
                  <option value="environment">Camera sau</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    if (isStreamActive) {
                      stopCamera();
                      setTimeout(startCamera, 500);
                    }
                  }}
                  className="w-full"
                >
                  🔄 Áp dụng
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-blue-800">Hướng dẫn sử dụng:</CardTitle>
            <Button
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="text-blue-600 hover:text-blue-800"
            >
              ⚙️ Cài đặt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>1. Nhấn "Bật Camera" để kích hoạt camera</li>
            <li>2. Đưa khuôn mặt vào vùng camera, đảm bảo ánh sáng đủ</li>
            <li>3. Nhấn "Chụp & Nhận diện" để thực hiện điểm danh</li>
            <li>4. Hệ thống sẽ tự động đánh dấu điểm danh nếu nhận diện thành công</li>
          </ul>
          <div className="pt-3 mt-3 border-t">
            <p className="text-xs text-blue-600">
              💡 <strong>Mẹo:</strong> Nếu không nhận diện được, thử điều chỉnh góc độ, ánh sáng hoặc biểu cảm tự nhiên hơn.
              Hệ thống đã được tối ưu để nhận diện linh hoạt với các thay đổi nhỏ về góc chụp và biểu cảm.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              🎯 <strong>Production:</strong> Với camera thật, độ chính xác sẽ cao hơn nhờ chất lượng ảnh tốt và góc chụp cố định.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICamera; 