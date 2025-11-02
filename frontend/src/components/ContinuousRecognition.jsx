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
  Video,
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
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import api from "../services/api";
import logger from "../utils/logger";

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

  // Multi-camera tracking: stats và recognitions riêng cho từng camera
  const [cameraStats, setCameraStats] = useState({}); // { cameraId: { total: 0, unique: Set(), lastFrame: null } }
  const [cameraRecognitions, setCameraRecognitions] = useState({}); // { cameraId: [recognitions] }
  const [cameraPreviews, setCameraPreviews] = useState({}); // { cameraId: base64Image }
  const [streamErrors, setStreamErrors] = useState({}); // { cameraId: true/false } - track stream errors để fallback
  const [settings, setSettings] = useState({
    cooldownPeriod: 60,
  });
  const [startTime, setStartTime] = useState(null);
  const [message, setMessage] = useState("");

  // Camera management state
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [cameraSource, setCameraSource] = useState("webcam"); // "webcam" or "managed"
  const [selectedMultiCameras, setSelectedMultiCameras] = useState([]); // For multi-camera mode
  const [useMultiCamera, setUseMultiCamera] = useState(false);
  const cameraFrameIntervals = useRef({}); // Track intervals for each camera

  // Load available cameras from camera manager
  const loadCameras = useCallback(async () => {
    try {
      const response = await api.get("/cameras/");
      if (response.success && response.data) {
        // Lấy tất cả cameras enabled (không cần filter active vì có thể start sau)
        const enabledCameras = response.data.filter((cam) => cam.enabled);
        setAvailableCameras(enabledCameras);
        logger.info(`📹 Loaded ${enabledCameras.length} enabled cameras`);

        // Tự động chọn camera đầu tiên nếu chưa chọn
        if (
          enabledCameras.length > 0 &&
          !selectedCameraId &&
          cameraSource === "managed"
        ) {
          setSelectedCameraId(enabledCameras[0].camera_id);
        }
      }
    } catch (error) {
      logger.error("❌ Error loading cameras:", error);
    }
  }, [selectedCameraId, cameraSource]);

  // Start camera khi chọn managed camera
  const startSelectedCamera = useCallback(async (cameraId) => {
    if (!cameraId) return;

    try {
      const response = await api.post(`/cameras/${cameraId}/start`);
      if (response.success) {
        logger.info(`✅ Started camera ${cameraId}`);
      } else {
        logger.warn(`⚠️ Camera ${cameraId} may not be connected yet`);
      }
    } catch (error) {
      logger.error(`❌ Error starting camera ${cameraId}:`, error);
    }
  }, []);

  // Tự động start camera khi chọn (single hoặc multi)
  useEffect(() => {
    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        // Start tất cả cameras đã chọn trong multi-camera mode
        selectedMultiCameras.forEach((cameraId) => {
          startSelectedCamera(cameraId);
        });
      } else if (selectedCameraId) {
        // Start single camera
        startSelectedCamera(selectedCameraId);
      }
    }
  }, [
    selectedCameraId,
    selectedMultiCameras,
    cameraSource,
    useMultiCamera,
    startSelectedCamera,
  ]);

  // Load current settings from backend
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/status`);
      const result = await response.json();

      if (result.success && result.data.cooldown_period) {
        setCooldownPeriod(result.data.cooldown_period);
        logger.debug("🔧 Loaded settings:", result.data);
      }
    } catch (error) {
      logger.error("❌ Error loading settings:", error);
    }
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // Fix WebSocket URL để match với backend route
      wsRef.current = new WebSocket(`${WS_BASE_URL}/ai/recognition/stream`);

      wsRef.current.onopen = () => {
        logger.debug("🔗 Connected to recognition stream");
        setIsConnected(true);
        setConnectionStatus("connected");
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        logger.debug("🔌 Disconnected from recognition stream");
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
        logger.error("❌ WebSocket error:", error);
        setConnectionStatus("error");
      };
    } catch (error) {
      logger.error("❌ Failed to connect WebSocket:", error);
      setConnectionStatus("error");
    }
  }, [isConnected]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "recognition_result":
        // Log debug info
        logger.debug("🔍 Recognition result:", data.data);

        // Lấy camera_id từ response (có thể từ data.camera_id hoặc data.data.camera_id)
        const cameraId = data.camera_id || data.data?.camera_id || "default";
        const recognitionData = data.data || data;

        if (
          recognitionData.recognized_students &&
          recognitionData.recognized_students.length > 0
        ) {
          // Update global recognized students (latest from any camera)
          setRecognizedStudents(recognitionData.recognized_students);

          // Update camera-specific stats
          setCameraStats((prev) => {
            const cameraStat = prev[cameraId] || {
              total: 0,
              unique: new Set(),
              lastFrame: null,
            };
            const uniqueSet =
              cameraStat.unique instanceof Set ? cameraStat.unique : new Set();
            recognitionData.recognized_students.forEach((recognition) => {
              cameraStat.total += 1;
              if (recognition.student?.id) {
                uniqueSet.add(recognition.student.id);
              }
            });
            // Convert Set to array để lưu vào state (React không serialize Set)
            return {
              ...prev,
              [cameraId]: {
                total: cameraStat.total,
                unique: uniqueSet, // Vẫn giữ Set để tính size, nhưng khi render convert sang array
                uniqueCount: uniqueSet.size,
                lastFrame: Date.now(),
              },
            };
          });

          // Update camera-specific recognitions
          setCameraRecognitions((prev) => {
            const cameraRecs = prev[cameraId] || [];
            const newRecs = recognitionData.recognized_students.map(
              (recognition) => ({
                ...recognition,
                camera_id: cameraId,
                timestamp: new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Ho_Chi_Minh",
                }),
                id: Date.now() + Math.random(),
              })
            );
            return {
              ...prev,
              [cameraId]: [...newRecs, ...cameraRecs.slice(0, 9)],
            };
          });

          // Add to recent recognitions (global)
          recognitionData.recognized_students.forEach((recognition) => {
            setRecentRecognitions((prev) => [
              {
                ...recognition,
                camera_id: cameraId,
                timestamp: new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Ho_Chi_Minh",
                }),
                id: Date.now() + Math.random(),
              },
              ...prev.slice(0, 19), // Keep only last 20 (tăng để multi-camera)
            ]);
          });

          setTotalRecognitionsToday(
            (prev) => prev + recognitionData.recognized_students.length
          );
        } else {
          // Clear recognized students if no valid recognition (only for single camera mode)
          if (!useMultiCamera || cameraId === selectedCameraId) {
            setRecognizedStudents([]);
          }

          // Log debug message if available
          if (recognitionData.message) {
            logger.debug(
              `⚠️ Recognition message [${cameraId}]: ${recognitionData.message}`
            );
          }
        }
        break;

      case "status":
        logger.debug("📢 Status update:", data.message);
        setIsRunning(data.is_running);
        break;

      case "control_update":
        setIsRunning(data.is_running);
        break;

      default:
        logger.debug("📨 Unknown message type:", data.type);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      // Stop existing stream first
      stopCamera();

      logger.debug("🎥 Starting camera...");
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
          logger.debug("✅ Camera metadata loaded");
          videoRef.current.play().catch((e) => {
            logger.error("❌ Video play error:", e);
          });
        };

        videoRef.current.onplay = () => {
          logger.debug("▶️ Camera started playing");
        };

        videoRef.current.onerror = (e) => {
          logger.error("❌ Video element error:", e);
        };
      }
    } catch (error) {
      logger.error("❌ Error accessing camera:", error);

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
        logger.debug("🛑 Stopping camera...");
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => {
          track.stop();
          logger.debug(`🔇 Stopped track: ${track.kind}`);
        });
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset video element
        setIsCameraOn(false);
      }
    } catch (error) {
      logger.error("❌ Error stopping camera:", error);
    }
  };

  // Capture frame from managed camera via API - luôn update preview để có hình ảnh
  const captureFromManagedCamera = useCallback(
    async (cameraId, updatePreviewOnly = false) => {
      // Nếu chỉ update preview (không phải recognition), không cần check isRunning
      if (!updatePreviewOnly && !isRunning) {
        return;
      }

      try {
        const response = await api.get(
          `/cameras/${cameraId}/frame?format=base64`
        );

        if (response.success && response.data && response.data.frame) {
          // LUÔN update preview image (cả khi running và không running) để có hình ảnh
          setCameraPreviews((prev) => ({
            ...prev,
            [cameraId]: `data:image/jpeg;base64,${response.data.frame}`,
          }));

          // Update preview image trong DOM (fallback)
          const imgElement = document.getElementById(
            `camera-preview-${cameraId}`
          );
          if (imgElement) {
            imgElement.src = `data:image/jpeg;base64,${response.data.frame}`;
            imgElement.style.display = "block";
          }

          // Chỉ gửi frame qua WebSocket khi đang running và không phải chỉ preview
          if (
            !updatePreviewOnly &&
            isRunning &&
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(
              JSON.stringify({
                type: "frame",
                image: response.data.frame,
                camera_id: cameraId, // Thêm camera_id để backend biết frame từ camera nào
              })
            );
          }
        }
      } catch (error) {
        // Chỉ log error nếu đang running hoặc đang update preview
        if (isRunning || updatePreviewOnly) {
          logger.error(`❌ Error capturing from camera ${cameraId}:`, error);
        }
      }
    },
    [isRunning]
  );

  // Refresh preview images cho cameras đã chọn (ngay cả khi không running)
  useEffect(() => {
    if (cameraSource === "managed") {
      const camerasToRefresh =
        useMultiCamera && selectedMultiCameras.length > 0
          ? selectedMultiCameras
          : selectedCameraId
          ? [selectedCameraId]
          : [];

      if (camerasToRefresh.length > 0) {
        // Delay một chút để camera đã start xong
        const loadPreview = () => {
          camerasToRefresh.forEach((cameraId) => {
            captureFromManagedCamera(cameraId, true);
          });
        };

        // Load preview ngay lập tức
        loadPreview();

        // Refresh preview mỗi 300ms để mượt hơn (~3.3 FPS preview)
        const previewInterval = setInterval(() => {
          loadPreview();
        }, 300); // Giảm từ 500ms xuống 300ms để preview mượt hơn

        return () => clearInterval(previewInterval);
      }
    }
  }, [
    cameraSource,
    selectedCameraId,
    selectedMultiCameras,
    useMultiCamera,
    captureFromManagedCamera,
  ]);

  // Track setTimeout IDs để có thể clear khi dừng
  const staggerTimeoutsRef = useRef([]);

  // Capture and send frame với stagger intervals cho multi-camera
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || !isRunning) {
      return;
    }

    // Nếu dùng managed cameras
    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        // Clear previous timeouts nếu có
        staggerTimeoutsRef.current.forEach((timeoutId) =>
          clearTimeout(timeoutId)
        );
        staggerTimeoutsRef.current = [];

        // Multi-camera mode: capture từ tất cả cameras với stagger
        // Stagger: mỗi camera capture cách nhau 0.5s để không quá tải backend
        selectedMultiCameras.forEach((cameraId, index) => {
          const timeoutId = setTimeout(() => {
            // Kiểm tra lại isRunning trước khi capture
            if (isRunning) {
              captureFromManagedCamera(cameraId);
            }
          }, index * 500); // Stagger 500ms giữa các camera

          staggerTimeoutsRef.current.push(timeoutId);
        });
      } else if (selectedCameraId) {
        // Single managed camera
        captureFromManagedCamera(selectedCameraId);
      }
      return;
    }

    // Webcam mode (original logic)
    if (!videoRef.current || !canvasRef.current || !isCameraOn) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        logger.debug("⏳ Video not ready for capture");
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
        logger.error("❌ Canvas capture error:", canvasError);
      }
    } catch (error) {
      logger.error("❌ Frame capture error:", error);
    }
  }, [
    isRunning,
    isCameraOn,
    cameraSource,
    selectedCameraId,
    selectedMultiCameras,
    useMultiCamera,
    captureFromManagedCamera,
  ]);

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

  // Control recognition (chỉ khi camera đang bật hoặc đã chọn managed camera)
  const toggleRecognition = () => {
    // Với managed camera, không cần bật webcam
    if (cameraSource === "webcam" && !isCameraOn) {
      alert("Vui lòng bật camera trước khi bắt đầu nhận diện!");
      return;
    }

    // Với managed camera, cần chọn camera
    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length === 0) {
        alert("Vui lòng chọn ít nhất 1 camera để điểm danh đa luồng!");
        return;
      }
      if (!useMultiCamera && !selectedCameraId) {
        alert("Vui lòng chọn camera!");
        return;
      }
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

  // Load cameras on mount
  useEffect(() => {
    loadCameras();
    // Refresh cameras mỗi 10 giây
    const interval = setInterval(loadCameras, 10000);
    return () => clearInterval(interval);
  }, [loadCameras]);

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
    // Managed camera mode: chỉ cần isRunning và isConnected
    // Webcam mode: cần thêm isCameraOn
    const shouldCapture =
      isRunning && isConnected && (cameraSource === "managed" || isCameraOn);

    if (shouldCapture) {
      // Với managed camera, capture mỗi 2 giây
      // Với webcam, capture mỗi 2 giây
      intervalRef.current = setInterval(captureAndSendFrame, 2000); // 0.5 FPS
    } else {
      // Dừng capture - clear interval và timeouts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Clear tất cả stagger timeouts để tránh spam
      if (staggerTimeoutsRef.current) {
        staggerTimeoutsRef.current.forEach((timeoutId) =>
          clearTimeout(timeoutId)
        );
        staggerTimeoutsRef.current = [];
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Cleanup timeouts khi unmount
      if (staggerTimeoutsRef.current) {
        staggerTimeoutsRef.current.forEach((timeoutId) =>
          clearTimeout(timeoutId)
        );
        staggerTimeoutsRef.current = [];
      }
    };
  }, [isRunning, isConnected, isCameraOn, captureAndSendFrame, cameraSource]);

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
      logger.error("Error starting recognition:", error);
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
      logger.error("Error stopping recognition:", error);
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

                {/* Camera Toggle Button - chỉ hiển thị cho webcam mode */}
                {cameraSource === "webcam" && (
                  <Button
                    onClick={toggleCamera}
                    variant={isCameraOn ? "destructive" : "default"}
                    className="flex items-center space-x-2"
                  >
                    {isCameraOn ? <Square size={18} /> : <Camera size={18} />}
                    <span>{isCameraOn ? "Tắt Camera" : "Bật Camera"}</span>
                  </Button>
                )}

                {/* Camera Info for Managed Camera */}
                {cameraSource === "managed" && selectedCameraId && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {availableCameras.find(
                        (c) => c.camera_id === selectedCameraId
                      )?.name || "Camera"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {useMultiCamera
                        ? `${selectedMultiCameras.length} cameras`
                        : "Active"}
                    </Badge>
                  </div>
                )}

                {/* Recognition Control Button */}
                <Button
                  onClick={isRunning ? handleStop : handleStart}
                  disabled={
                    !isConnected ||
                    (cameraSource === "webcam" && !isCameraOn) ||
                    (cameraSource === "managed" &&
                      !selectedCameraId &&
                      !useMultiCamera) ||
                    (cameraSource === "managed" &&
                      useMultiCamera &&
                      selectedMultiCameras.length === 0)
                  }
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
                          setCameraSource(value);
                          if (value === "webcam") {
                            setSelectedCameraId(null);
                            setUseMultiCamera(false);
                          }
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
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Camera:</Label>
                          <Select
                            value={selectedCameraId || ""}
                            onValueChange={(value) => {
                              setSelectedCameraId(value);
                              setUseMultiCamera(false);
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

                        {/* Multi-camera toggle - hiển thị ngay cả khi chỉ có 1 camera để chuẩn bị */}
                        {availableCameras.length > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                            <input
                              type="checkbox"
                              id="multiCamera"
                              checked={useMultiCamera}
                              onChange={(e) => {
                                setUseMultiCamera(e.target.checked);
                                if (!e.target.checked) {
                                  setSelectedMultiCameras([]);
                                } else if (selectedCameraId) {
                                  setSelectedMultiCameras([selectedCameraId]);
                                }
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
                              Đa luồng
                              {availableCameras.length < 2 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (cần ≥2 camera)
                                </span>
                              )}
                            </Label>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Multi-camera mode info banner */}
                {cameraSource === "managed" && useMultiCamera && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      <Label className="text-sm font-semibold text-blue-900">
                        Chế độ đa luồng đã bật - Chọn cameras để nhận diện đồng
                        thời:
                      </Label>
                    </div>

                    {availableCameras.length > 1 ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {availableCameras.map((cam) => (
                          <label
                            key={cam.camera_id}
                            className={`flex items-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedMultiCameras.includes(cam.camera_id)
                                ? "bg-blue-100 border-blue-500 shadow-sm"
                                : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMultiCameras.includes(
                                cam.camera_id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMultiCameras([
                                    ...selectedMultiCameras,
                                    cam.camera_id,
                                  ]);
                                } else {
                                  setSelectedMultiCameras(
                                    selectedMultiCameras.filter(
                                      (id) => id !== cam.camera_id
                                    )
                                  );
                                }
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm font-medium">
                              {cam.name}
                            </span>
                            {cam.location && (
                              <span className="text-xs text-gray-500">
                                ({cam.location})
                              </span>
                            )}
                            <Badge
                              variant={
                                cam.status === "active"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {cam.status === "active" ? "✓" : "✗"}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-orange-600 mt-2">
                        ⚠️ Cần ít nhất 2 camera để sử dụng chế độ đa luồng. Hiện
                        có {availableCameras.length} camera.
                      </p>
                    )}

                    {selectedMultiCameras.length === 0 &&
                      availableCameras.length > 1 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Vui lòng chọn ít nhất 1 camera để bắt đầu nhận diện
                        </p>
                      )}

                    {selectedMultiCameras.length > 0 && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        ✓ Đã chọn {selectedMultiCameras.length} camera(s) - Sẵn
                        sàng nhận diện đa luồng
                      </p>
                    )}
                  </div>
                )}

                <div className="relative">
                  {/* Show video for webcam mode */}
                  {cameraSource === "webcam" && (
                    <video
                      ref={videoRef}
                      className={`w-full h-auto bg-black rounded-lg ${
                        !isCameraOn ? "hidden" : ""
                      }`}
                      autoPlay
                      muted
                      playsInline
                    />
                  )}

                  {/* Show preview: single camera hoặc multi-camera grid */}
                  {cameraSource === "managed" &&
                    (useMultiCamera && selectedMultiCameras.length > 0 ? (
                      // Multi-camera grid view
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          const recs = cameraRecognitions[cameraId] || [];

                          // Build camera stream URL - dùng proxy qua backend để tránh CORS và tối ưu
                          const getCameraStreamUrl = (camera) => {
                            if (!camera?.camera_id) return null;
                            // Dùng proxy endpoint qua backend để stream MJPEG
                            const API_BASE =
                              process.env.REACT_APP_API_URL ||
                              "http://localhost:8000/api";
                            return `${API_BASE}/cameras/${camera.camera_id}/stream`;
                          };

                          // Fallback: thử stream trực tiếp nếu proxy không hoạt động
                          const getDirectStreamUrl = (camera) => {
                            if (!camera?.source) return null;
                            let url = camera.source.trim();
                            if (url.includes("://")) {
                              const parts = url.split("://");
                              const urlPart = parts[1];
                              if (!urlPart.includes("/")) {
                                url = `${parts[0]}://${urlPart}/video`;
                              } else if (!urlPart.includes("/video")) {
                                const hostPort = urlPart.split("/")[0];
                                url = `${parts[0]}://${hostPort}/video`;
                              }
                            } else if (url.includes(":")) {
                              url = `http://${url}/video`;
                            }
                            return url;
                          };

                          const streamUrl = getCameraStreamUrl(camera);
                          const directStreamUrl = getDirectStreamUrl(camera);

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

                                {/* Status badge - di chuyển lên header để không che camera */}
                                {isRunning && (
                                  <div className="flex items-center gap-2 px-2 py-1 bg-green-100 rounded text-xs">
                                    <AlertCircle className="w-3 h-3 text-green-600 animate-pulse" />
                                    <span className="font-medium text-green-700">
                                      ĐANG NHẬN DIỆN
                                    </span>
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {/* Video Stream với fallback preview - ưu tiên proxy backend */}
                                <div className="relative w-full bg-black rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                                  {/* Ưu tiên: proxy backend stream, fallback: direct stream, fallback: preview image */}
                                  {!streamErrors[cameraId] &&
                                  (streamUrl || directStreamUrl) ? (
                                    <video
                                      key={`stream-${cameraId}-${
                                        streamErrors[cameraId] === "direct"
                                          ? "direct"
                                          : "proxy"
                                      }`}
                                      src={
                                        streamErrors[cameraId] === "direct"
                                          ? directStreamUrl
                                          : streamUrl || directStreamUrl
                                      }
                                      autoPlay
                                      muted
                                      playsInline
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        logger.warn(
                                          `Stream error for camera ${cameraId}, trying fallback:`,
                                          e
                                        );
                                        // Thử direct stream nếu proxy lỗi
                                        if (streamUrl && directStreamUrl) {
                                          // Có cả 2, thử switch sang direct
                                          setStreamErrors((prev) => ({
                                            ...prev,
                                            [cameraId]: "direct",
                                          }));
                                        } else {
                                          // Không có fallback, dùng preview
                                          setStreamErrors((prev) => ({
                                            ...prev,
                                            [cameraId]: "both_failed",
                                          }));
                                        }
                                      }}
                                      onLoadedData={() => {
                                        setStreamErrors((prev) => {
                                          const newErrors = { ...prev };
                                          delete newErrors[cameraId];
                                          return newErrors;
                                        });
                                        logger.debug(
                                          `Stream loaded successfully for camera ${cameraId}`
                                        );
                                      }}
                                    />
                                  ) : preview ? (
                                    // Fallback: dùng preview image từ API
                                    <img
                                      key={`preview-${cameraId}`}
                                      src={preview}
                                      alt={`${camera?.name} preview`}
                                      className="w-full h-full object-contain"
                                      onError={() => {
                                        // Refresh preview nếu image lỗi
                                        captureFromManagedCamera(
                                          cameraId,
                                          true
                                        );
                                      }}
                                    />
                                  ) : (
                                    // Loading state
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="text-white text-center">
                                        <Video className="w-12 h-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                                        <p className="text-xs">
                                          Đang kết nối camera...
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Retry button nếu stream lỗi */}
                                  {streamErrors[cameraId] && (
                                    <div className="absolute bottom-2 right-2 z-10">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setStreamErrors((prev) => {
                                            const newErrors = { ...prev };
                                            delete newErrors[cameraId];
                                            return newErrors;
                                          });
                                          // Force reload video
                                          const videoEl =
                                            document.querySelector(
                                              `video[key="stream-${cameraId}"]`
                                            );
                                          if (videoEl) {
                                            videoEl.load();
                                          }
                                        }}
                                        className="text-xs bg-blue-600 text-white hover:bg-blue-700 border-none"
                                      >
                                        Thử lại
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Nhận diện:{" "}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      {stats.total}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Unique:{" "}
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                      {stats.uniqueCount || 0}
                                    </span>
                                  </div>
                                </div>

                                {/* Recent recognition cho camera này */}
                                {recs.length > 0 && (
                                  <div className="text-xs border-t pt-2">
                                    <p className="font-medium mb-1">
                                      Nhận diện gần đây:
                                    </p>
                                    {recs.slice(0, 2).map((rec) => (
                                      <div
                                        key={rec.id}
                                        className="flex justify-between items-center mb-1"
                                      >
                                        <span className="text-muted-foreground">
                                          {rec.student?.full_name || "Unknown"}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {rec.confidence}%
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : selectedCameraId ? (
                      // Single camera view với MJPEG stream trực tiếp
                      (() => {
                        const selectedCamera = availableCameras.find(
                          (c) => c.camera_id === selectedCameraId
                        );

                        // Build stream URL - ưu tiên proxy backend
                        const API_BASE =
                          process.env.REACT_APP_API_URL ||
                          "http://localhost:8000/api";
                        const streamUrl = `${API_BASE}/cameras/${selectedCameraId}/stream`;

                        // Fallback: direct stream URL
                        const getDirectStreamUrl = (camera) => {
                          if (!camera?.source) return null;
                          let url = camera.source.trim();
                          if (url.includes("://")) {
                            const parts = url.split("://");
                            const urlPart = parts[1];
                            if (!urlPart.includes("/")) {
                              url = `${parts[0]}://${urlPart}/video`;
                            } else if (!urlPart.includes("/video")) {
                              const hostPort = urlPart.split("/")[0];
                              url = `${parts[0]}://${hostPort}/video`;
                            }
                          } else if (url.includes(":")) {
                            url = `http://${url}/video`;
                          }
                          return url;
                        };

                        const directStreamUrl =
                          getDirectStreamUrl(selectedCamera);

                        return (
                          <div className="w-full bg-black rounded-lg min-h-96 flex items-center justify-center relative overflow-hidden">
                            {/* Video stream với fallback - ưu tiên proxy backend */}
                            {!streamErrors[selectedCameraId] &&
                            (streamUrl || directStreamUrl) ? (
                              <video
                                key={`stream-${selectedCameraId}-${
                                  streamErrors[selectedCameraId] === "direct"
                                    ? "direct"
                                    : "proxy"
                                }`}
                                src={
                                  streamErrors[selectedCameraId] === "direct"
                                    ? directStreamUrl
                                    : streamUrl || directStreamUrl
                                }
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-contain"
                                style={{ maxHeight: "100%" }}
                                onError={(e) => {
                                  logger.warn(
                                    `Stream error for camera ${selectedCameraId}, trying fallback:`,
                                    e
                                  );
                                  // Thử direct stream nếu proxy lỗi
                                  if (streamUrl && directStreamUrl) {
                                    // Có cả 2, thử switch sang direct
                                    setStreamErrors((prev) => ({
                                      ...prev,
                                      [selectedCameraId]: "direct",
                                    }));
                                  } else {
                                    // Không có fallback
                                    setStreamErrors((prev) => ({
                                      ...prev,
                                      [selectedCameraId]: "both_failed",
                                    }));
                                  }
                                }}
                                onLoadedData={() => {
                                  setStreamErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[selectedCameraId];
                                    return newErrors;
                                  });
                                  logger.debug(
                                    `Stream loaded successfully for camera ${selectedCameraId}`
                                  );
                                }}
                              />
                            ) : cameraPreviews[selectedCameraId] ? (
                              <img
                                key={`preview-${selectedCameraId}`}
                                src={cameraPreviews[selectedCameraId]}
                                alt="Camera preview"
                                className="max-w-full max-h-96 object-contain"
                                onError={() => {
                                  captureFromManagedCamera(
                                    selectedCameraId,
                                    true
                                  );
                                }}
                              />
                            ) : (
                              <div className="text-white text-center">
                                <Video className="w-16 h-16 mx-auto mb-2 text-gray-400 animate-pulse" />
                                <p className="text-sm">
                                  Đang kết nối camera...
                                </p>
                              </div>
                            )}

                            {/* Status badge - di chuyển lên trên, không che camera */}
                            {isRunning && (
                              <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg z-10">
                                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>ĐANG NHẬN DIỆN</span>
                              </div>
                            )}

                            {/* Retry button nếu stream lỗi */}
                            {streamErrors[selectedCameraId] && (
                              <div className="absolute bottom-3 right-3 z-10">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setStreamErrors((prev) => {
                                      const newErrors = { ...prev };
                                      delete newErrors[selectedCameraId];
                                      return newErrors;
                                    });
                                    const videoEl = document.querySelector(
                                      `video[key="stream-${selectedCameraId}"]`
                                    );
                                    if (videoEl) {
                                      videoEl.load();
                                    }
                                  }}
                                  className="text-xs bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Thử lại stream
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : null)}

                  {/* Camera Off Placeholder - chỉ hiển thị với webcam mode */}
                  {cameraSource === "webcam" && !isCameraOn && (
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

                  {/* Status Overlay for Managed Camera - đã di chuyển vào trong camera cards */}

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
                          logger.debug("Settings updated:", result.data);
                        } else {
                          alert(
                            `Lỗi: ${
                              result.message || "Không thể cập nhật cài đặt"
                            }`
                          );
                        }
                      } catch (error) {
                        logger.error("Error updating settings:", error);
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
