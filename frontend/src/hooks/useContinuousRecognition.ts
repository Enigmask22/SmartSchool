/**
 * useContinuousRecognition.ts
 * 
 * Complete extraction from ContinuousRecognition.jsx
 * All state, logic, and functions preserved exactly as in original
 */

import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/utils/api";
import logger from "@/utils/logger";

// API Configuration - EXACT FROM ORIGINAL JSX
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";
const WS_BASE_URL =
  import.meta.env.VITE_APP_WS_URL || "ws://localhost:8000/api";

console.log("🔍 useContinuousRecognition: API config", {
  API_BASE_URL,
  WS_BASE_URL,
});

export const useContinuousRecognition = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const cameraFrameIntervals = useRef({}); // Track intervals for each camera
  const staggerTimeoutsRef = useRef([]); // Track setTimeout IDs

  // ==================== ALL STATE VARIABLES ====================
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [recentRecognitions, setRecentRecognitions] = useState([]);
  const [cooldownPeriod, setCooldownPeriod] = useState(5);
  const [totalRecognitionsToday, setTotalRecognitionsToday] = useState(0);
  const [activeCooldowns, setActiveCooldowns] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    uniqueStudents: new Set(),
    runningTime: 0,
  });

  // Multi-camera tracking
  const [cameraStats, setCameraStats] = useState({});
  const [cameraRecognitions, setCameraRecognitions] = useState({});
  const [cameraPreviews, setCameraPreviews] = useState({});
  const [streamErrors, setStreamErrors] = useState({});
  const [settings, setSettings] = useState({
    cooldownPeriod: 5,
  });
  const [startTime, setStartTime] = useState(null);
  const [message, setMessage] = useState("");

  // Camera management state
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraSource, setCameraSource] = useState<'webcam' | 'managed'>('webcam');
  const [selectedMultiCameras, setSelectedMultiCameras] = useState<string[]>([]);
  const [useMultiCamera, setUseMultiCamera] = useState(false);

  // ==================== LOAD CAMERAS ====================
  const loadCameras = useCallback(async () => {
    try {
      const response = await api.get("/cameras/");
      if (response.success && response.data) {
        const enabledCameras = response.data.filter((cam) => cam.enabled);
        setAvailableCameras(enabledCameras);
        logger.info(`📹 Loaded ${enabledCameras.length} enabled cameras`);

        // Auto-select first camera if none selected and in managed mode
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

  // ==================== START SELECTED CAMERA ====================
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

  // ==================== AUTO-START CAMERA WHEN SELECTED ====================
  useEffect(() => {
    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        selectedMultiCameras.forEach((cameraId) => {
          startSelectedCamera(cameraId);
        });
      } else if (selectedCameraId) {
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

  // ==================== LOAD SETTINGS ====================
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

  // ==================== WEBSOCKET MESSAGE HANDLER ====================
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "recognition_result": {
        logger.debug("🔍 Recognition result:", data.data);

        const cameraId = data.camera_id || data.data?.camera_id || "default";
        const recognitionData = data.data || data;

        if (
          recognitionData.recognized_students &&
          recognitionData.recognized_students.length > 0
        ) {
          // Update global recognized students
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
            return {
              ...prev,
              [cameraId]: {
                total: cameraStat.total,
                unique: uniqueSet,
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

          // Add to recent recognitions
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
              ...prev.slice(0, 19),
            ]);
          });

          setTotalRecognitionsToday(
            (prev) => prev + recognitionData.recognized_students.length
          );
        } else {
          if (!useMultiCamera || cameraId === selectedCameraId) {
            setRecognizedStudents([]);
          }

          if (recognitionData.message) {
            logger.debug(
              `⚠️ Recognition message [${cameraId}]: ${recognitionData.message}`
            );
          }
        }
        break;
      }

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

  // ==================== CONNECT WEBSOCKET ====================
  const connectWebSocket = useCallback(() => {
    console.log("🔗 connectWebSocket() called");
    try {
      wsRef.current = new WebSocket(`${WS_BASE_URL}/ai/recognition/stream`);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket OPENED");
        logger.debug("🔗 Connected to recognition stream");
        setIsConnected(true);
        setConnectionStatus("connected");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          logger.error("❌ Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("❌ WebSocket CLOSED");
        logger.debug("🔌 Disconnected from recognition stream");
        setIsConnected(false);
        setConnectionStatus("disconnected");
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket ERROR:", error);
        logger.error("❌ WebSocket error:", error);
        setConnectionStatus("error");
      };
    } catch (error) {
      console.error("❌ Exception creating WebSocket:", error);
      logger.error("❌ Failed to connect WebSocket:", error);
      setConnectionStatus("error");
    }
  }, []);

  // ==================== START CAMERA ====================
  const startCamera = async () => {
    try {
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

  // ==================== STOP CAMERA ====================
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
        videoRef.current.load();
        setIsCameraOn(false);
      }
    } catch (error) {
      logger.error("❌ Error stopping camera:", error);
    }
  };

  // ==================== CAPTURE FROM MANAGED CAMERA ====================
  const captureFromManagedCamera = useCallback(
    async (cameraId, updatePreviewOnly = false) => {
      if (!updatePreviewOnly && !isRunning) {
        return;
      }

      try {
        const response = await api.get(
          `/cameras/${cameraId}/frame?format=base64`
        );

        if (response.success && response.data && response.data.frame) {
          setCameraPreviews((prev) => ({
            ...prev,
            [cameraId]: `data:image/jpeg;base64,${response.data.frame}`,
          }));

          const imgElement = document.getElementById(
            `camera-preview-${cameraId}`
          ) as HTMLImageElement;
          if (imgElement) {
            imgElement.src = `data:image/jpeg;base64,${response.data.frame}`;
            imgElement.style.display = "block";
          }

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
                camera_id: cameraId,
              })
            );
          }
        }
      } catch (error) {
        if (isRunning || updatePreviewOnly) {
          logger.error(`❌ Error capturing from camera ${cameraId}:`, error);
        }
      }
    },
    [isRunning]
  );

  // ==================== REFRESH PREVIEW IMAGES ====================
  useEffect(() => {
    if (cameraSource === "managed") {
      const camerasToRefresh =
        useMultiCamera && selectedMultiCameras.length > 0
          ? selectedMultiCameras
          : selectedCameraId
            ? [selectedCameraId]
            : [];

      if (camerasToRefresh.length > 0) {
        const loadPreview = () => {
          camerasToRefresh.forEach((cameraId) => {
            captureFromManagedCamera(cameraId, true);
          });
        };

        loadPreview();

        const previewInterval = setInterval(() => {
          loadPreview();
        }, 300);

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

  // ==================== CAPTURE AND SEND FRAME ====================
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || !isRunning) {
      return;
    }

    // For managed cameras
    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        staggerTimeoutsRef.current.forEach((timeoutId) =>
          clearTimeout(timeoutId)
        );
        staggerTimeoutsRef.current = [];

        selectedMultiCameras.forEach((cameraId, index) => {
          const staggerDelay = index * 50; // Stagger by 50ms
          const timeoutId = setTimeout(() => {
            captureFromManagedCamera(cameraId, false);
          }, staggerDelay);
          staggerTimeoutsRef.current.push(timeoutId);
        });
      } else if (selectedCameraId) {
        captureFromManagedCamera(selectedCameraId, false);
      }
      return;
    }

    // For webcam
    if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const frameData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "frame",
              image: frameData,
              camera_id: "webcam",
            })
          );
        }
      } catch (canvasError) {
        logger.error("❌ Canvas error:", canvasError);
      }
    } catch (error) {
      logger.error("❌ Frame capture error:", error);
    }
  }, [isRunning, isCameraOn, cameraSource, selectedCameraId, selectedMultiCameras, useMultiCamera, captureFromManagedCamera]);

  // ==================== TOGGLE CAMERA ====================
  const toggleCamera = async () => {
    if (isCameraOn) {
      stopCamera();
      if (wsRef.current?.readyState === WebSocket.OPEN && isRunning) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
    } else {
      await startCamera();
    }
  };

  // ==================== TOGGLE RECOGNITION ====================
  const toggleRecognition = () => {
    if (cameraSource === "webcam" && !isCameraOn) {
      alert("Vui lòng bật camera trước khi bắt đầu nhận diện!");
      return;
    }

    if (cameraSource === "managed") {
      if (useMultiCamera && selectedMultiCameras.length === 0) {
        alert("Vui lòng chọn ít nhất một camera!");
        return;
      }
      if (!useMultiCamera && !selectedCameraId) {
        alert("Vui lòng chọn một camera!");
        return;
      }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (isRunning) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
        setIsRunning(false);
      } else {
        wsRef.current.send(JSON.stringify({ type: "start" }));
        setIsRunning(true);
        setStartTime(Date.now());
      }
    }
  };

  // ==================== HANDLE START (API CALL) ====================
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

  // ==================== HANDLE STOP (API CALL) ====================
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

  // ==================== LOAD CAMERAS ON MOUNT ====================
  useEffect(() => {
    loadCameras();
    const interval = setInterval(loadCameras, 10000);
    return () => clearInterval(interval);
  }, [loadCameras]);

  // ==================== INITIALIZE ON MOUNT ====================
  useEffect(() => {
    console.log("📌 useContinuousRecognition useEffect MOUNT");
    let mounted = true;

    const initializeComponent = async () => {
      try {
        console.log("🚀 Loading settings...");
        await loadSettings();
        console.log("✓ Settings loaded");

        if (mounted) {
          console.log("🔌 Calling connectWebSocket()");
          connectWebSocket();
        }
      } catch (error) {
        logger.error("❌ Initialization error:", error);
      }
    };

    initializeComponent();

    return () => {
      console.log("📌 useContinuousRecognition useEffect CLEANUP");
      mounted = false;

      if (wsRef.current) {
        console.log("Closing WebSocket...");
        wsRef.current.close();
      }

      stopCamera();
      staggerTimeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  // ==================== START/STOP FRAME CAPTURE ====================
  useEffect(() => {
    const shouldCapture =
      isRunning && isConnected && (cameraSource === "managed" || isCameraOn);

    if (shouldCapture) {
      console.log("▶️ Starting frame capture (100ms interval)");
      intervalRef.current = setInterval(captureAndSendFrame, 100);
    } else {
      if (intervalRef.current) {
        console.log("⏹️ Stopping frame capture");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isConnected, isCameraOn, captureAndSendFrame, cameraSource]);

  // ==================== UPDATE STATS ====================
  useEffect(() => {
    if (recognizedStudents.length > 0) {
      setStats((prev) => {
        const newUniqueStudents = new Set(prev.uniqueStudents);
        recognizedStudents.forEach((r) => newUniqueStudents.add(r.student.id));

        return {
          ...prev,
          totalRecognitions:
            prev.totalRecognitions + recognizedStudents.length,
          uniqueStudents: newUniqueStudents,
        };
      });
    }
  }, [recognizedStudents]);

  // ==================== UPDATE RUNNING TIME ====================
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

  // ==================== RETURN ====================
  return {
    // State
    isRunning,
    isConnected,
    isCameraOn,
    recognizedStudents,
    recentRecognitions,
    cooldownPeriod,
    totalRecognitionsToday,
    activeCooldowns,
    connectionStatus,
    stats,
    cameraStats,
    cameraRecognitions,
    cameraPreviews,
    streamErrors,
    settings,
    startTime,
    message,
    availableCameras,
    selectedCameraId,
    cameraSource,
    selectedMultiCameras,
    useMultiCamera,

    // Refs
    videoRef,
    canvasRef,
    wsRef,

    // Actions
    startCamera,
    stopCamera,
    toggleCamera,
    toggleRecognition,
    handleStart,
    handleStop,
    loadCameras,
    loadSettings,
    connectWebSocket,
    captureFromManagedCamera,

    // Setters
    setCameraSource,
    setSelectedCameraId,
    setSelectedMultiCameras,
    setUseMultiCamera,
    setCooldownPeriod,
    setMessage,
    setStreamErrors,
  };
};

export default useContinuousRecognition;
