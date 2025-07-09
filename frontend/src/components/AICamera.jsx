import React, { useState, useRef, useEffect } from 'react';
import ApiService from '../services/api';

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
        <h2 className="text-3xl font-bold text-gray-800 mb-2">AI Camera</h2>
        <p className="text-gray-600">Điểm danh tự động bằng nhận diện khuôn mặt</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Camera</h3>
          
          <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: isStreamActive ? 'block' : 'none' }}
            />
            
            {!isStreamActive && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <span className="text-6xl mb-4 block">📷</span>
                  <p>Camera chưa được bật</p>
                </div>
              </div>
            )}
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              {!isStreamActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  📷 Bật Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={captureAndRecognize}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '🎯 Chụp & Nhận diện'}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    ❌ Tắt Camera
                  </button>
                </>
              )}
            </div>
            
            {/* Demo Mode - Upload Image */}
            {(demoMode || !isStreamActive) && (
              <div className="border-t border-gray-200 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadImageForRecognition}
                  disabled={isProcessing}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {isProcessing ? '⏳ Đang xử lý...' : '📁 Upload ảnh để test (Demo)'}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Hỗ trợ: JPG, PNG, WebP
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Kết quả nhận diện</h3>
          
          {!lastRecognition ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-2">🔍</span>
              <p>Chưa có kết quả nhận diện</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lastRecognition.recognized ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 text-xl mr-2">✅</span>
                    <span className="font-semibold text-green-800">Nhận diện thành công</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Tên:</strong> {lastRecognition.student?.full_name}</p>
                    <p><strong>Mã SV:</strong> {lastRecognition.student?.student_id}</p>
                    <p><strong>Lớp:</strong> {lastRecognition.student?.class_name}</p>
                    <p><strong>Độ chính xác:</strong> {lastRecognition.confidence}%</p>
                    <p><strong>Thời gian:</strong> {new Date().toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-yellow-600 text-xl mr-2">❓</span>
                    <span className="font-semibold text-yellow-800">Không nhận diện được</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Không tìm thấy khuôn mặt đã đăng ký trong hệ thống
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 bg-gray-50 border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">⚙️ Cài đặt Camera</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-gray-700 mb-1">Độ phân giải:</label>
              <select 
                value={`${cameraSettings.width}x${cameraSettings.height}`}
                onChange={(e) => {
                  const [width, height] = e.target.value.split('x').map(Number);
                  setCameraSettings(prev => ({...prev, width, height}));
                }}
                className="w-full border rounded px-2 py-1"
              >
                <option value="640x480">640x480 (Thấp)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="1920x1080">1920x1080 (Full HD)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Camera:</label>
              <select 
                value={cameraSettings.facingMode}
                onChange={(e) => setCameraSettings(prev => ({...prev, facingMode: e.target.value}))}
                className="w-full border rounded px-2 py-1"
              >
                <option value="user">Camera trước</option>
                <option value="environment">Camera sau</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (isStreamActive) {
                    stopCamera();
                    setTimeout(startCamera, 500);
                  }
                }}
                className="w-full bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                🔄 Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-blue-800">Hướng dẫn sử dụng:</h4>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ⚙️ Cài đặt
          </button>
        </div>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Nhấn "Bật Camera" để kích hoạt camera</li>
          <li>2. Đưa khuôn mặt vào vùng camera, đảm bảo ánh sáng đủ</li>
          <li>3. Nhấn "Chụp & Nhận diện" để thực hiện điểm danh</li>
          <li>4. Hệ thống sẽ tự động đánh dấu điểm danh nếu nhận diện thành công</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-600">
            💡 <strong>Mẹo:</strong> Nếu không nhận diện được, thử điều chỉnh góc độ, ánh sáng hoặc biểu cảm tự nhiên hơn.
            Hệ thống đã được tối ưu để nhận diện linh hoạt với các thay đổi nhỏ về góc chụp và biểu cảm.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            🎯 <strong>Production:</strong> Với camera thật, độ chính xác sẽ cao hơn nhờ chất lượng ảnh tốt và góc chụp cố định.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICamera; 