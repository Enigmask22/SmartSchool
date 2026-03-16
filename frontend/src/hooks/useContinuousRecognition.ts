/**
 * useContinuousRecognition.ts - Continuous Recognition Hook
 * 
 * Extracted from ContinuousRecognition.jsx (~1,889 lines)
 * 
 * Manages:
 * - Camera state (webcam and managed cameras)
 * - WebSocket connection and real-time recognition
 * - Recognition data and statistics
 * - Cooldown tracking
 * - Multi-camera support with staggered frame capture
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import api from '@/services/api';
import logger from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace('http', 'ws');

/**
 * Recognition Result Interface
 */
export interface RecognitionResult {
  student: {
    full_name: string;
    student_code: string;
  };
  confidence: number;
  timestamp: string;
  attendance: {
    type: string;
  };
}

/**
 * Camera Stats Interface
 */
export interface CameraStats {
  total: number;
  unique: Set<string>;
  lastFrame: string | null;
}

/**
 * Hook Return Interface
 */
export interface UseContinuousRecognitionReturn {
  // State
  isRunning: boolean;
  isConnected: boolean;
  isCameraOn: boolean;
  recognizedStudents: RecognitionResult[];
  recentRecognitions: RecognitionResult[];
  cooldownPeriod: number;
  totalRecognitionsToday: number;
  activeCooldowns: Record<string, number>;
  connectionStatus: string;
  stats: any;
  cameraStats: Record<string, CameraStats>;
  cameraRecognitions: Record<string, RecognitionResult[]>;
  cameraPreviews: Record<string, string>;
  streamErrors: Record<string, boolean>;
  settings: any;
  startTime: number | null;
  message: string;
  availableCameras: any[];
  selectedCameraId: string | null;
  cameraSource: 'webcam' | 'managed';
  selectedMultiCameras: string[];
  useMultiCamera: boolean;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  wsRef: React.MutableRefObject<WebSocket | null>;

  // Actions
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleCamera: () => Promise<void>;
  toggleRecognition: () => void;
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  setCameraSource: (source: 'webcam' | 'managed') => void;
  setSelectedCameraId: (id: string | null) => void;
  setSelectedMultiCameras: (cameras: string[]) => void;
  setUseMultiCamera: (use: boolean) => void;
  setCooldownPeriod: (period: number) => void;
  setMessage: (msg: string) => void;
}

/**
 * useContinuousRecognition Hook
 */
export const useContinuousRecognition = (): UseContinuousRecognitionReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const staggerTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<RecognitionResult[]>([]);
  const [recentRecognitions, setRecentRecognitions] = useState<RecognitionResult[]>([]);
  const [cooldownPeriod, setCooldownPeriod] = useState(60);
  const [totalRecognitionsToday, setTotalRecognitionsToday] = useState(0);
  const [activeCooldowns, setActiveCooldowns] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    uniqueStudents: new Set<string>(),
    runningTime: 0,
  });
  const [cameraStats, setCameraStats] = useState<Record<string, CameraStats>>({});
  const [cameraRecognitions, setCameraRecognitions] = useState<Record<string, RecognitionResult[]>>({});
  const [cameraPreviews, setCameraPreviews] = useState<Record<string, string>>({});
  const [streamErrors, setStreamErrors] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState({
    cooldownPeriod: 60,
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraSource, setCameraSource] = useState<'webcam' | 'managed'>('webcam');
  const [selectedMultiCameras, setSelectedMultiCameras] = useState<string[]>([]);
  const [useMultiCamera, setUseMultiCamera] = useState(false);

  /**
   * Load available cameras from API
   */
  const loadCameras = useCallback(async () => {
    try {
      const response = await api.get('/cameras/');
      if (response.success && response.data) {
        setAvailableCameras(response.data);
      }
    } catch (error) {
      logger.error('❌ Error loading cameras:', error);
    }
  }, []);

  /**
   * Start selected camera
   */
  const startSelectedCamera = useCallback(async (cameraId: string) => {
    if (!cameraId) return;
    try {
      const response = await api.post(`/cameras/${cameraId}/start`);
      if (response.success) {
        logger.debug(`✅ Camera ${cameraId} started`);
      }
    } catch (error) {
      logger.error(`❌ Error starting camera ${cameraId}:`, error);
    }
  }, []);

  /**
   * Auto-start camera when selected
   */
  useEffect(() => {
    if (cameraSource === 'managed') {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        selectedMultiCameras.forEach((cameraId) => {
          startSelectedCamera(cameraId);
        });
      } else if (selectedCameraId) {
        startSelectedCamera(selectedCameraId);
      }
    }
  }, [selectedCameraId, selectedMultiCameras, cameraSource, useMultiCamera, startSelectedCamera]);

  /**
   * Load settings from backend
   */
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/status`);
      const result = await response.json();
      if (result.success && result.data.cooldown_period) {
        setCooldownPeriod(result.data.cooldown_period);
        logger.debug('🔧 Loaded settings:', result.data);
      }
    } catch (error) {
      logger.error('❌ Error loading settings:', error);
    }
  }, []);

  /**
   * Connect WebSocket
   */
  const connectWebSocket = useCallback(() => {
    try {
      wsRef.current = new WebSocket(`${WS_BASE_URL}/ai/recognition/stream`);

      wsRef.current.onopen = () => {
        logger.debug('🔗 Connected to recognition stream');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        logger.debug('🔌 Disconnected from recognition stream');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        logger.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      logger.error('❌ Failed to connect WebSocket:', error);
      setConnectionStatus('error');
    }
  }, []);

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'recognition_result':
        logger.debug('🔍 Recognition result:', data.data);
        const cameraId = data.camera_id || data.data?.camera_id || 'default';
        const recognitionData = data.data || data;

        if (recognitionData.recognized_students && recognitionData.recognized_students.length > 0) {
          recognitionData.recognized_students.forEach((student: RecognitionResult) => {
            setRecognizedStudents((prev) => [...prev, student]);
            setRecentRecognitions((prev) => [student, ...prev].slice(0, 50));
            setTotalRecognitionsToday((prev) => prev + 1);

            setCameraStats((prev) => ({
              ...prev,
              [cameraId]: {
                total: (prev[cameraId]?.total || 0) + 1,
                unique: new Set([
                  ...(prev[cameraId]?.unique || new Set()),
                  student.student.student_code,
                ]),
                lastFrame: new Date().toISOString(),
              },
            }));
          });
        } else {
          logger.debug('ℹ️ No students recognized');
        }
        break;

      case 'status':
        logger.debug('📢 Status update:', data.message);
        setIsRunning(data.is_running);
        break;

      case 'control_update':
        setIsRunning(data.is_running);
        break;

      default:
        logger.debug('📨 Unknown message type:', data.type);
    }
  };

  /**
   * Start camera (webcam)
   */
  const startCamera = async () => {
    try {
      stopCamera();
      logger.debug('🎥 Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 60 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);

        videoRef.current.onloadedmetadata = () => {
          logger.debug('✅ Camera metadata loaded');
        };

        videoRef.current.onplay = () => {
          logger.debug('▶️ Camera playing');
        };

        videoRef.current.onerror = (e) => {
          logger.error('❌ Video error:', e);
        };
      }
    } catch (error: any) {
      logger.error('❌ Error accessing camera:', error);
      let errorMessage = 'Không thể truy cập camera.';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Quyền truy cập camera bị từ chối. Vui lòng cho phép camera trong trình duyệt.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Không tìm thấy camera. Vui lòng kiểm tra camera kết nối.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Không thể đọc camera. Có thể đang được sử dụng bởi ứng dụng khác.';
      }

      alert(errorMessage);
      setConnectionStatus('camera_error');
      setIsCameraOn(false);
    }
  };

  /**
   * Stop camera
   */
  const stopCamera = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        logger.debug('🛑 Stopping camera...');
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => {
          track.stop();
          logger.debug(`🔇 Stopped track: ${track.kind}`);
        });
        videoRef.current.srcObject = null;
        videoRef.current.load();
        setIsCameraOn(false);
      }
    } catch (error) {
      logger.error('❌ Error stopping camera:', error);
    }
  };

  /**
   * Capture frame from managed camera
   */
  const captureFromManagedCamera = useCallback(
    async (cameraId: string, updatePreviewOnly = false) => {
      if (!updatePreviewOnly && !isRunning) return;

      try {
        const response = await api.get(`/cameras/${cameraId}/frame?format=base64`);

        if (response.success && response.data?.frame) {
          setCameraPreviews((prev) => ({
            ...prev,
            [cameraId]: `data:image/jpeg;base64,${response.data.frame}`,
          }));

          const imgElement = document.getElementById(`camera-preview-${cameraId}`);
          if (imgElement) {
            (imgElement as HTMLImageElement).src = `data:image/jpeg;base64,${response.data.frame}`;
            (imgElement as HTMLImageElement).style.display = 'block';
          }

          if (!updatePreviewOnly && isRunning && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'frame',
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

  /**
   * Refresh preview images for selected cameras
   */
  useEffect(() => {
    if (cameraSource === 'managed') {
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
        const previewInterval = setInterval(loadPreview, 300);
        return () => clearInterval(previewInterval);
      }
    }
  }, [cameraSource, selectedCameraId, selectedMultiCameras, useMultiCamera, captureFromManagedCamera]);

  /**
   * Capture and send frame
   */
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || !isRunning) return;

    if (cameraSource === 'managed') {
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        staggerTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        staggerTimeoutsRef.current = [];

        selectedMultiCameras.forEach((cameraId, index) => {
          const timeoutId = setTimeout(() => {
            captureFromManagedCamera(cameraId, false);
          }, index * 500);
          staggerTimeoutsRef.current.push(timeoutId);
        });
      } else if (selectedCameraId) {
        captureFromManagedCamera(selectedCameraId, false);
      }
      return;
    }

    if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = imageData.split(',')[1];

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'frame',
              image: base64,
            })
          );
        }
      } catch (canvasError) {
        logger.error('❌ Canvas error:', canvasError);
      }
    } catch (error) {
      logger.error('❌ Frame capture error:', error);
    }
  }, [isRunning, isCameraOn, cameraSource, selectedCameraId, selectedMultiCameras, useMultiCamera, captureFromManagedCamera]);

  /**
   * Toggle camera
   */
  const toggleCamera = async () => {
    if (isCameraOn) {
      stopCamera();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isRunning) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
        setIsRunning(false);
      }
    } else {
      await startCamera();
    }
  };

  /**
   * Toggle recognition
   */
  const toggleRecognition = () => {
    if (cameraSource === 'webcam' && !isCameraOn) {
      alert('Vui lòng bật camera trước khi bắt đầu nhận diện!');
      return;
    }

    if (cameraSource === 'managed') {
      if (useMultiCamera && selectedMultiCameras.length === 0) {
        alert('Vui lòng chọn ít nhất một camera!');
        return;
      }
      if (!useMultiCamera && !selectedCameraId) {
        alert('Vui lòng chọn một camera!');
        return;
      }
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (isRunning) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
        setIsRunning(false);
        setStartTime(null);
      } else {
        wsRef.current.send(JSON.stringify({ type: 'start' }));
        setIsRunning(true);
        setStartTime(Date.now());
      }
    }
  };

  /**
   * Load cameras on mount
   */
  useEffect(() => {
    loadCameras();
    const interval = setInterval(loadCameras, 10000);
    return () => clearInterval(interval);
  }, [loadCameras]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    let mounted = true;

    const initializeComponent = async () => {
      await loadSettings();
      connectWebSocket();
    };

    initializeComponent();

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopCamera();
      staggerTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [loadSettings, connectWebSocket]);

  /**
   * Start/stop frame capture
   */
  useEffect(() => {
    const shouldCapture = isRunning && isConnected && (cameraSource === 'managed' || isCameraOn);

    if (shouldCapture) {
      intervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isConnected, isCameraOn, captureAndSendFrame, cameraSource]);

  /**
   * Handle start
   */
  const handleStart = async () => {
    if (cameraSource === 'webcam') {
      await startCamera();
    }
    toggleRecognition();
  };

  /**
   * Handle stop
   */
  const handleStop = async () => {
    if (isRunning) {
      toggleRecognition();
    }
    if (cameraSource === 'webcam') {
      stopCamera();
    }
  };

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
    setCameraSource,
    setSelectedCameraId,
    setSelectedMultiCameras,
    setUseMultiCamera,
    setCooldownPeriod,
    setMessage,
  };
};
