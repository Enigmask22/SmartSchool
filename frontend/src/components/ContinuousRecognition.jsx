import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CameraOff,
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
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

// API Configuration
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";
const WS_BASE_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000/api";

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
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    uniqueStudents: new Set(),
    runningTime: 0,
  });
  const [settings, setSettings] = useState({
    cooldownPeriod: 60,
  });
  const [startTime, setStartTime] = useState(null);
  const [message, setMessage] = useState("");

  // Load current settings from backend
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/status`);
      const result = await response.json();

      if (result.success && result.data.cooldown_period) {
        setCooldownPeriod(result.data.cooldown_period);
        console.log("🔧 Loaded settings:", result.data);
      }
    } catch (error) {
      console.error("❌ Error loading settings:", error);
    }
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // Fix WebSocket URL để match với backend route
      wsRef.current = new WebSocket(`${WS_BASE_URL}/ai/recognition/stream`);

      wsRef.current.onopen = () => {
        console.log("🔗 Connected to recognition stream");
        setIsConnected(true);
        setConnectionStatus("connected");
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        console.log("🔌 Disconnected from recognition stream");
        setIsConnected(false);
        setConnectionStatus("disconnected");

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setConnectionStatus("error");
      };
    } catch (error) {
      console.error("❌ Failed to connect WebSocket:", error);
      setConnectionStatus("error");
    }
  }, [isConnected]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "recognition_result":
        // Log debug info
        console.log("🔍 Recognition result:", data.data);

        if (
          data.data.recognized_students &&
          data.data.recognized_students.length > 0
        ) {
          setRecognizedStudents(data.data.recognized_students);

          // Add to recent recognitions
          data.data.recognized_students.forEach((recognition) => {
            setRecentRecognitions((prev) => [
              {
                ...recognition,
                timestamp: new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Ho_Chi_Minh",
                }),
                id: Date.now() + Math.random(),
              },
              ...prev.slice(0, 9), // Keep only last 10
            ]);
          });

          setTotalRecognitionsToday(
            (prev) => prev + data.data.recognized_students.length
          );
        } else {
          // Clear recognized students if no valid recognition
          setRecognizedStudents([]);

          // Log debug message if available
          if (data.data.message) {
            console.log(`⚠️ Recognition message: ${data.data.message}`);
          }
        }
        break;

      case "status":
        console.log("📢 Status update:", data.message);
        setIsRunning(data.is_running);
        break;

      case "control_update":
        setIsRunning(data.is_running);
        break;

      default:
        console.log("📨 Unknown message type:", data.type);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      // Stop existing stream first
      stopCamera();

      console.log("🎥 Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 15, max: 60 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);

        // Add event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log("✅ Camera metadata loaded");
          videoRef.current.play().catch((e) => {
            console.error("❌ Video play error:", e);
          });
        };

        videoRef.current.onplay = () => {
          console.log("▶️ Camera started playing");
        };

        videoRef.current.onerror = (e) => {
          console.error("❌ Video element error:", e);
        };
      }
    } catch (error) {
      console.error("❌ Error accessing camera:", error);

      let errorMessage = "Không thể truy cập camera.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Quyền truy cập camera bị từ chối. Vui lòng cho phép camera trong trình duyệt.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "Không tìm thấy camera. Vui lòng kiểm tra thiết bị camera.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera đang được sử dụng bởi ứng dụng khác.";
      }

      alert(errorMessage);
      setConnectionStatus("camera_error");
      setIsCameraOn(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log("🛑 Stopping camera...");
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => {
          track.stop();
          console.log(`🔇 Stopped track: ${track.kind}`);
        });
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset video element
        setIsCameraOn(false);
      }
    } catch (error) {
      console.error("❌ Error stopping camera:", error);
    }
  };

  // Capture and send frame
  const captureAndSendFrame = useCallback(() => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !wsRef.current ||
      !isRunning ||
      !isCameraOn
    ) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log("⏳ Video not ready for capture");
        return;
      }

      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 with error handling
      try {
        const imageData = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

        // Send frame via WebSocket
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "frame",
              image: imageData,
            })
          );
        }
      } catch (canvasError) {
        console.error("❌ Canvas capture error:", canvasError);
      }
    } catch (error) {
      console.error("❌ Frame capture error:", error);
    }
  }, [isRunning, isCameraOn]);

  // Toggle camera on/off
  const toggleCamera = async () => {
    if (isCameraOn) {
      // Tắt camera và dừng nhận diện
      stopCamera();
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        isRunning
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: "control",
            command: "stop",
          })
        );
      }
    } else {
      // Bật camera
      await startCamera();
    }
  };

  // Control recognition (chỉ khi camera đang bật)
  const toggleRecognition = () => {
    if (!isCameraOn) {
      alert("Vui lòng bật camera trước khi bắt đầu nhận diện!");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = isRunning ? "stop" : "start";
      wsRef.current.send(
        JSON.stringify({
          type: "control",
          command: command,
        })
      );
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
      setStats((prev) => {
        const newUniqueStudents = new Set(prev.uniqueStudents);
        recognizedStudents.forEach((r) => newUniqueStudents.add(r.student.id));

        return {
          ...prev,
          totalRecognitions: prev.totalRecognitions + recognizedStudents.length,
          uniqueStudents: newUniqueStudents,
        };
      });
    }
  }, [recognizedStudents]);

  // Update running time
  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          runningTime: Math.floor((Date.now() - startTime) / 1000),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (response.ok) {
        setIsRunning(true);
        setStartTime(Date.now());
        setStats((prev) => ({
          ...prev,
          totalRecognitions: 0,
          uniqueStudents: new Set(),
          runningTime: 0,
        }));
        setMessage("Đã bắt đầu nhận diện tự động");
      }
    } catch (error) {
      console.error("Error starting recognition:", error);
      setMessage("Lỗi khi bắt đầu nhận diện");
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (response.ok) {
        setIsRunning(false);
        setStartTime(null);
        setMessage("Đã dừng nhận diện tự động");
      }
    } catch (error) {
      console.error("Error stopping recognition:", error);
      setMessage("Lỗi khi dừng nhận diện");
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-3xl font-bold">
                    Điểm Danh Tự Động Liên Tục
                  </CardTitle>
                  <CardDescription>
                    Hệ thống nhận diện khuôn mặt tự động liên tục
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Status Indicators */}
                <Badge
                  variant={isConnected ? "default" : "destructive"}
                  className="flex items-center space-x-1"
                >
                  {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                  <span>{isConnected ? "Đã kết nối" : "Mất kết nối"}</span>
                </Badge>

                <Badge
                  variant={isRunning ? "default" : "secondary"}
                  className="flex items-center space-x-1"
                >
                  <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
                </Badge>

                {/* Camera Toggle Button */}
                <Button
                  onClick={toggleCamera}
                  variant={isCameraOn ? "destructive" : "default"}
                  className="flex items-center space-x-2"
                >
                  {isCameraOn ? <Square size={18} /> : <Camera size={18} />}
                  <span>{isCameraOn ? "Tắt Camera" : "Bật Camera"}</span>
                </Button>

                {/* Recognition Control Button */}
                <Button
                  onClick={isRunning ? handleStop : handleStart}
                  disabled={!isConnected || !isCameraOn}
                  variant={isRunning ? "destructive" : "default"}
                  className="flex items-center space-x-2"
                >
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  <span>
                    {isRunning ? "Dừng Nhận Diện" : "Bắt Đầu Nhận Diện"}
                  </span>
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Info Banner */}
          <CardContent>
            <div className="flex items-start p-3 space-x-2 border rounded-lg bg-primary/5 border-primary/20">
              <Info className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm text-primary">
                <strong>Về độ tin cậy:</strong> InsightFace AI sử dụng thuật
                toán ArcFace với độ tin cậy 20-50% là bình thường và rất chính
                xác. Hệ thống hiển thị cả <strong>độ tin cậy gốc</strong>{" "}
                (20-50%) và <strong>độ chính xác quy đổi</strong> (40-100%) để
                dễ hiểu hơn.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Panel */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Recognition Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span>Thống Kê Nhận Diện</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng nhận diện:</span>
                  <span className="font-semibold text-primary">
                    {stats.totalRecognitions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Học sinh unique:
                  </span>
                  <span className="font-semibold text-green-600">
                    {stats.uniqueStudents.size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thời gian chạy:</span>
                  <span className="font-semibold text-purple-600">
                    {formatDuration(stats.runningTime)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-green-600" />
                <span>Hướng Dẫn Độ Tin Cậy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 rounded bg-emerald-600"></div>
                  <span>≥45% (90%+): Xuất sắc</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 bg-green-600 rounded"></div>
                  <span>35-44% (70-88%): Rất cao</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 bg-blue-600 rounded"></div>
                  <span>25-34% (50-68%): Cao</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 bg-yellow-600 rounded"></div>
                  <span>20-24% (40-48%): Tốt</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 bg-orange-600 rounded"></div>
                  <span>&lt;20% (&lt;40%): Chấp nhận được</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <span>Trạng Thái Hệ Thống</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Engine:</span>
                  <span className="font-semibold text-primary">
                    InsightFace
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kết nối:</span>
                  <Badge variant={isConnected ? "default" : "destructive"}>
                    {isConnected ? "Đã kết nối" : "Mất kết nối"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Camera:</span>
                  <Badge variant={isCameraOn ? "default" : "destructive"}>
                    {isCameraOn ? "Hoạt động" : "Tắt"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cooldown:</span>
                  <span className="font-semibold text-primary">
                    {cooldownPeriod}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-6 h-6 text-primary" />
                  <span>Camera Nhận Diện</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className={`w-full h-auto bg-black rounded-lg ${
                      !isCameraOn ? "hidden" : ""
                    }`}
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* Camera Off Placeholder */}
                  {!isCameraOn && (
                    <div className="flex items-center justify-center w-full bg-gray-800 rounded-lg h-96">
                      <div className="text-center text-white">
                        <Camera
                          size={64}
                          className="mx-auto mb-4 text-gray-400"
                        />
                        <h3 className="mb-2 text-xl font-semibold">
                          Camera đã tắt
                        </h3>
                        <p className="text-gray-300">
                          Nhấn nút "Bật Camera" để bắt đầu
                        </p>
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Status Overlay */}
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

                  {/* Recognition Results Overlay */}
                  {recognizedStudents.length > 0 && (
                    <div className="absolute right-4 bottom-4 left-4">
                      {recognizedStudents.map((recognition, index) => {
                        // Color coding based on confidence level
                        const confidence = recognition.confidence;
                        let bgColor = "bg-green-600";
                        let confidenceLabel = "Tốt";

                        if (confidence >= 45) {
                          bgColor = "bg-emerald-600";
                          confidenceLabel = "Xuất sắc";
                        } else if (confidence >= 35) {
                          bgColor = "bg-green-600";
                          confidenceLabel = "Rất cao";
                        } else if (confidence >= 25) {
                          bgColor = "bg-blue-600";
                          confidenceLabel = "Cao";
                        } else if (confidence >= 20) {
                          bgColor = "bg-yellow-600";
                          confidenceLabel = "Tốt";
                        } else {
                          bgColor = "bg-orange-600";
                          confidenceLabel = "Chấp nhận được";
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
                              <div className="text-sm opacity-90">
                                Độ tin cậy:{" "}
                                {(recognition.confidence / 100).toFixed(3)} | Độ
                                chính xác:{" "}
                                {Math.round(recognition.confidence * 2)}%
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
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Thống Kê Hôm Nay</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Tổng điểm danh:
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      {totalRecognitionsToday}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Thời gian chờ:
                    </span>
                    <span className="font-bold text-primary">
                      {cooldownPeriod}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Đang chờ:</span>
                    <span className="font-bold text-orange-600">
                      {Object.keys(activeCooldowns).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Recognitions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span>Nhận Diện Gần Đây</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 overflow-y-auto max-h-96">
                  {recentRecognitions.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground">
                      Chưa có nhận diện nào
                    </p>
                  ) : (
                    recentRecognitions.map((recognition) => (
                      <div
                        key={recognition.id}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {recognition.student.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {recognition.student.student_code}
                            </div>
                            <div className="text-sm text-green-600">
                              {(recognition.confidence / 100).toFixed(3)} (
                              {Math.round(recognition.confidence * 2)}%) -{" "}
                              {recognition.timestamp}
                            </div>
                          </div>

                          <Badge
                            variant={
                              recognition.attendance.type === "created"
                                ? "success"
                                : "default"
                            }
                            className="text-xs"
                          >
                            {recognition.attendance.type === "created"
                              ? "Mới"
                              : "Cập nhật"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <span>Cài Đặt</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-foreground">
                      Thời gian chờ (giây)
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={cooldownPeriod}
                      onChange={(e) =>
                        setCooldownPeriod(parseInt(e.target.value))
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Thời gian chờ giữa các lần nhận diện cho cùng 1 học sinh
                    </p>
                  </div>

                  <Button
                    onClick={async () => {
                      try {
                        // Call API to update settings
                        const response = await fetch(
                          `${API_BASE_URL}/ai/recognition/settings`,
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              cooldown_period: cooldownPeriod,
                            }),
                          }
                        );

                        const result = await response.json();

                        if (result.success) {
                          alert(`${result.message}`);
                          console.log("Settings updated:", result.data);
                        } else {
                          alert(
                            `Lỗi: ${
                              result.message || "Không thể cập nhật cài đặt"
                            }`
                          );
                        }
                      } catch (error) {
                        console.error("Error updating settings:", error);
                        alert("Lỗi kết nối khi cập nhật cài đặt");
                      }
                    }}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Lưu Cài Đặt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinuousRecognition;
