import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Square, 
  Play, 
  Pause,
  Settings,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  BarChart3,
  Info
} from 'lucide-react';

const ContinuousRecognition = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [recentRecognitions, setRecentRecognitions] = useState([]);
  const [cooldownPeriod, setCooldownPeriod] = useState(60);
  const [totalRecognitionsToday, setTotalRecognitionsToday] = useState(0);
  const [activeCooldowns, setActiveCooldowns] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    uniqueStudents: new Set(),
    runningTime: 0
  });
  const [settings, setSettings] = useState({
    cooldownPeriod: 60
  });
  const [startTime, setStartTime] = useState(null);
  const [message, setMessage] = useState('');

  // Load current settings from backend
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/recognition/status');
      const result = await response.json();
      
      if (result.success && result.data.cooldown_period) {
        setCooldownPeriod(result.data.cooldown_period);
        console.log('🔧 Loaded settings:', result.data);
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // Fix WebSocket URL để match với backend route
      wsRef.current = new WebSocket('ws://localhost:8000/api/ai/recognition/stream');
      
      wsRef.current.onopen = () => {
        console.log('🔗 Connected to recognition stream');
        setIsConnected(true);
        setConnectionStatus('connected');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 Disconnected from recognition stream');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            connectWebSocket();
          }
        }, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
      
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [isConnected]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'recognition_result':
        // Log debug info
        console.log('🔍 Recognition result:', data.data);
        
        if (data.data.recognized_students && data.data.recognized_students.length > 0) {
          setRecognizedStudents(data.data.recognized_students);
          
          // Add to recent recognitions
          data.data.recognized_students.forEach(recognition => {
            setRecentRecognitions(prev => [
              {
                ...recognition,
                timestamp: new Date().toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'Asia/Ho_Chi_Minh'
                }),
                id: Date.now() + Math.random()
              },
              ...prev.slice(0, 9) // Keep only last 10
            ]);
          });
          
          setTotalRecognitionsToday(prev => prev + data.data.recognized_students.length);
        } else {
          // Clear recognized students if no valid recognition
          setRecognizedStudents([]);
          
          // Log debug message if available
          if (data.data.message) {
            console.log(`⚠️ Recognition message: ${data.data.message}`);
          }
        }
        break;
        
      case 'status':
        console.log('📢 Status update:', data.message);
        setIsRunning(data.is_running);
        break;
        
      case 'control_update':
        setIsRunning(data.is_running);
        break;
        
      default:
        console.log('📨 Unknown message type:', data.type);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      // Stop existing stream first
      stopCamera();
      
      console.log('🎥 Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 60 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
        
        // Add event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Camera metadata loaded');
          videoRef.current.play().catch(e => {
            console.error('❌ Video play error:', e);
          });
        };
        
        videoRef.current.onplay = () => {
          console.log('▶️ Camera started playing');
        };
        
        videoRef.current.onerror = (e) => {
          console.error('❌ Video element error:', e);
        };
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      
      let errorMessage = 'Không thể truy cập camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Quyền truy cập camera bị từ chối. Vui lòng cho phép camera trong trình duyệt.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera đang được sử dụng bởi ứng dụng khác.';
      }
      
      alert(errorMessage);
      setConnectionStatus('camera_error');
      setIsCameraOn(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('🛑 Stopping camera...');
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log(`🔇 Stopped track: ${track.kind}`);
        });
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset video element
        setIsCameraOn(false);
      }
    } catch (error) {
      console.error('❌ Error stopping camera:', error);
    }
  };

  // Capture and send frame
  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current || !isRunning || !isCameraOn) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('⏳ Video not ready for capture');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 with error handling
      try {
        const imageData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        // Send frame via WebSocket
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'frame',
            image: imageData
          }));
        }
      } catch (canvasError) {
        console.error('❌ Canvas capture error:', canvasError);
      }
      
    } catch (error) {
      console.error('❌ Frame capture error:', error);
    }
  }, [isRunning, isCameraOn]);

  // Toggle camera on/off
  const toggleCamera = async () => {
    if (isCameraOn) {
      // Tắt camera và dừng nhận diện
      stopCamera();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isRunning) {
        wsRef.current.send(JSON.stringify({
          type: 'control',
          command: 'stop'
        }));
      }
    } else {
      // Bật camera
      await startCamera();
    }
  };

  // Control recognition (chỉ khi camera đang bật)
  const toggleRecognition = () => {
    if (!isCameraOn) {
      alert('Vui lòng bật camera trước khi bắt đầu nhận diện!');
      return;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = isRunning ? 'stop' : 'start';
      wsRef.current.send(JSON.stringify({
        type: 'control',
        command: command
      }));
    }
  };

  // Initialize on component mount
  useEffect(() => {
    let mounted = true;
    
    const initializeComponent = async () => {
      if (mounted) {
        await loadSettings(); // Load settings trước
        connectWebSocket();
        // Không tự động bật camera, để người dùng tự bật
      }
    };
    
    initializeComponent();
    
    return () => {
      mounted = false;
      
      // Cleanup WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Cleanup camera
      stopCamera();
      
      // Cleanup interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadSettings]); // Add loadSettings dependency

  // Start/stop frame capture
  useEffect(() => {
    if (isRunning && isConnected && isCameraOn) {
      // Increase interval to 2 seconds to reduce load
      intervalRef.current = setInterval(captureAndSendFrame, 2000); // 0.5 FPS
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isConnected, isCameraOn, captureAndSendFrame]);

  // Helper function to format duration
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Update stats when recognition happens
  useEffect(() => {
    if (recognizedStudents.length > 0) {
      setStats(prev => {
        const newUniqueStudents = new Set(prev.uniqueStudents);
        recognizedStudents.forEach(r => newUniqueStudents.add(r.student.id));
        
        return {
          ...prev,
          totalRecognitions: prev.totalRecognitions + recognizedStudents.length,
          uniqueStudents: newUniqueStudents
        };
      });
    }
  }, [recognizedStudents]);

  // Update running time
  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          runningTime: Math.floor((Date.now() - startTime) / 1000)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/recognition/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      if (response.ok) {
        setIsRunning(true);
        setStartTime(Date.now());
        setStats(prev => ({ ...prev, totalRecognitions: 0, uniqueStudents: new Set(), runningTime: 0 }));
        setMessage('🎥 Đã bắt đầu nhận diện tự động');
      }
    } catch (error) {
      console.error('Error starting recognition:', error);
      setMessage('❌ Lỗi khi bắt đầu nhận diện');
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/recognition/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      if (response.ok) {
        setIsRunning(false);
        setStartTime(null);
        setMessage('⏹️ Đã dừng nhận diện tự động');
      }
    } catch (error) {
      console.error('Error stopping recognition:', error);
      setMessage('❌ Lỗi khi dừng nhận diện');
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h1 className="flex items-center text-3xl font-bold text-gray-800">
              <Camera className="mr-3 text-blue-600" size={36} />
              Điểm Danh Tự Động Liên Tục
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* Status Indicators */}
              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? <Wifi size={16} className="mr-1" /> : <WifiOff size={16} className="mr-1" />}
                {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
              </div>
              
              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isRunning ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isRunning ? 'Đang chạy' : 'Đã dừng'}
              </div>

              {/* Camera Toggle Button */}
              <button
                onClick={toggleCamera}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                  isCameraOn
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isCameraOn ? (
                  <>
                    <Square size={18} className="mr-2" />
                    Tắt Camera
                  </>
                ) : (
                  <>
                    <Camera size={18} className="mr-2" />
                    Bật Camera
                  </>
                )}
              </button>
              
              {/* Recognition Control Button */}
              <button
                onClick={isRunning ? handleStop : handleStart}
                disabled={!isConnected || !isCameraOn}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                  isRunning
                    ? 'text-white bg-orange-600 hover:bg-orange-700'
                    : 'text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause size={18} className="mr-2" />
                    Dừng Nhận Diện
                  </>
                ) : (
                  <>
                    <Play size={18} className="mr-2" />
                    Bắt Đầu Nhận Diện
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Info Banner */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="mr-2 text-blue-600 mt-0.5" size={16} />
              <div className="text-sm text-blue-800">
                <strong>Về độ tin cậy:</strong> InsightFace AI sử dụng thuật toán ArcFace với độ tin cậy 20-50% là bình thường và rất chính xác. 
                Hệ thống hiển thị cả <strong>độ tin cậy gốc</strong> (20-50%) và <strong>độ chính xác quy đổi</strong> (40-100%) để dễ hiểu hơn.
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Recognition Stats */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="flex items-center mb-3 text-lg font-semibold text-gray-800">
              <BarChart3 className="mr-2 text-blue-600" size={20} />
              Thống Kê Nhận Diện
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng nhận diện:</span>
                <span className="font-semibold">{stats.totalRecognitions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Học sinh unique:</span>
                <span className="font-semibold">{stats.uniqueStudents.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian chạy:</span>
                <span className="font-semibold">{formatDuration(stats.runningTime)}</span>
              </div>
            </div>
          </div>

          {/* Confidence Guide */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="flex items-center mb-3 text-lg font-semibold text-gray-800">
              <Info className="mr-2 text-green-600" size={20} />
              Hướng Dẫn Độ Tin Cậy
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-600 rounded mr-2"></div>
                <span>≥45% (90%+): Xuất sắc</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                <span>35-44% (70-88%): Rất cao</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                <span>25-34% (50-68%): Cao</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-600 rounded mr-2"></div>
                <span>20-24% (40-48%): Tốt</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-600 rounded mr-2"></div>
                <span>&lt;20% (&lt;40%): Chấp nhận được</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="flex items-center mb-3 text-lg font-semibold text-gray-800">
              <Settings className="mr-2 text-purple-600" size={20} />
              Trạng Thái Hệ Thống
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">AI Engine:</span>
                <span className="font-semibold text-blue-600">InsightFace</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kết nối:</span>
                <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Camera:</span>
                <span className={`font-semibold ${isCameraOn ? 'text-green-600' : 'text-red-600'}`}>
                  {isCameraOn ? 'Hoạt động' : 'Tắt'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cooldown:</span>
                <span className="font-semibold">{cooldownPeriod}s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="flex items-center mb-4 text-xl font-semibold">
                <Camera className="mr-2 text-blue-600" size={24} />
                Camera Nhận Diện
              </h2>
              
              <div className="relative">
                <video
                  ref={videoRef}
                  className={`w-full h-auto bg-black rounded-lg ${!isCameraOn ? 'hidden' : ''}`}
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Camera Off Placeholder */}
                {!isCameraOn && (
                  <div className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera size={64} className="mx-auto mb-4 text-gray-400" />
                      <h3 className="text-xl font-semibold mb-2">Camera đã tắt</h3>
                      <p className="text-gray-300">Nhấn nút "Bật Camera" để bắt đầu</p>
                    </div>
                  </div>
                )}
                
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4">
                  <div className={`px-3 py-2 rounded-lg text-white font-medium ${
                    !isCameraOn ? 'bg-gray-600' :
                    isRunning ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {!isCameraOn ? '📷 CAMERA TẮT' :
                     isRunning ? '🔴 ĐANG NHẬN DIỆN' : '⏸️ TẠM DỪNG'}
                  </div>
                </div>
                
                {/* Recognition Results Overlay */}
                {recognizedStudents.length > 0 && (
                  <div className="absolute right-4 bottom-4 left-4">
                    {recognizedStudents.map((recognition, index) => {
                      // Color coding based on confidence level
                      const confidence = recognition.confidence;
                      let bgColor = 'bg-green-600';
                      let confidenceLabel = 'Tốt';
                      
                      if (confidence >= 45) {
                        bgColor = 'bg-emerald-600';
                        confidenceLabel = 'Xuất sắc';
                      } else if (confidence >= 35) {
                        bgColor = 'bg-green-600';
                        confidenceLabel = 'Rất cao';
                      } else if (confidence >= 25) {
                        bgColor = 'bg-blue-600';
                        confidenceLabel = 'Cao';
                      } else if (confidence >= 20) {
                        bgColor = 'bg-yellow-600';
                        confidenceLabel = 'Tốt';
                      } else {
                        bgColor = 'bg-orange-600';
                        confidenceLabel = 'Chấp nhận được';
                      }
                      
                      return (
                        <div
                          key={index}
                          className={`flex justify-between items-center p-3 mb-2 text-white rounded-lg ${bgColor}`}
                        >
                          <div>
                            <div className="font-semibold">{recognition.student.full_name}</div>
                            <div className="text-sm opacity-90">
                              Độ tin cậy: {(recognition.confidence/100).toFixed(3)} | Độ chính xác: {Math.round(recognition.confidence * 2)}%
                            </div>
                            <div className="text-xs opacity-75">
                              {confidenceLabel} - InsightFace AI
                            </div>
                          </div>
                          <CheckCircle size={24} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="flex items-center mb-4 text-lg font-semibold">
                <Users className="mr-2 text-purple-600" size={20} />
                Thống Kê Hôm Nay
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng điểm danh:</span>
                  <span className="text-xl font-bold text-green-600">{totalRecognitionsToday}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Thời gian chờ:</span>
                  <span className="font-bold text-blue-600">{cooldownPeriod}s</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Đang chờ:</span>
                  <span className="font-bold text-orange-600">{Object.keys(activeCooldowns).length}</span>
                </div>
              </div>
            </div>

            {/* Recent Recognitions */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="flex items-center mb-4 text-lg font-semibold">
                <Clock className="mr-2 text-green-600" size={20} />
                Nhận Diện Gần Đây
              </h3>
              
              <div className="overflow-y-auto space-y-3 max-h-96">
                {recentRecognitions.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">
                    Chưa có nhận diện nào
                  </p>
                ) : (
                  recentRecognitions.map((recognition) => (
                    <div
                      key={recognition.id}
                      className="p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {recognition.student.full_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {recognition.student.student_code}
                          </div>
                          <div className="text-sm text-green-600">
                            {(recognition.confidence/100).toFixed(3)} ({Math.round(recognition.confidence * 2)}%) - {recognition.timestamp}
                          </div>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          recognition.attendance.type === 'created' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {recognition.attendance.type === 'created' ? 'Mới' : 'Cập nhật'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="flex items-center mb-4 text-lg font-semibold">
                <Settings className="mr-2 text-gray-600" size={20} />
                Cài Đặt
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Thời gian chờ (giây)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={cooldownPeriod}
                    onChange={(e) => setCooldownPeriod(parseInt(e.target.value))}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Thời gian chờ giữa các lần nhận diện cho cùng 1 học sinh
                  </p>
                </div>
                
                <button
                  onClick={async () => {
                    try {
                      // Call API to update settings
                      const response = await fetch('http://localhost:8000/api/ai/recognition/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cooldown_period: cooldownPeriod })
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        alert(`✅ ${result.message}`);
                        console.log('🔧 Settings updated:', result.data);
                      } else {
                        alert(`❌ Lỗi: ${result.message || 'Không thể cập nhật cài đặt'}`);
                      }
                    } catch (error) {
                      console.error('❌ Error updating settings:', error);
                      alert('❌ Lỗi kết nối khi cập nhật cài đặt');
                    }
                  }}
                  className="px-4 py-2 w-full text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                >
                  Lưu Cài Đặt
                </button>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinuousRecognition; 