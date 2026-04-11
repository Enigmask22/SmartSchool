import { useState, useEffect, useRef, useCallback } from "react";
import logger from "@/utils/logger";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export interface UseRecognitionControlReturn {
  // State
  isRunning: boolean;
  startTime: number | null;
  cooldownPeriod: number;
  message: string;

  // Actions
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  toggleRecognition: (cameraOn: boolean, cameraSource: string, selectedCameraId: string | null, selectedMultiCameras: string[], useMultiCamera: boolean, wsRef: React.MutableRefObject<WebSocket | null>) => void;
  captureAndSendFrame: () => void;

  // Setters
  setCooldownPeriod: (period: number) => void;
  setMessage: (msg: string) => void;
}

/**
 * Manages recognition control: start/stop and frame capture loop.
 * 
 * Handles:
 * - Starting/stopping recognition service
 * - Frame capture and transmission
 * - Cooldown period management
 * - Status messages
 * 
 * Returns: See UseRecognitionControlReturn interface
 */
export const useRecognitionControl = (
  isCameraOn: boolean,
  isConnected: boolean,
  cameraSource: string,
  selectedCameraId: string | null,
  selectedMultiCameras: string[],
  useMultiCamera: boolean,
  videoRef: React.MutableRefObject<HTMLVideoElement | null>,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  staggerTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>,
  captureFromManagedCamera: (cameraId: string, updatePreviewOnly?: boolean) => Promise<void>
): UseRecognitionControlReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [cooldownPeriod, setCooldownPeriod] = useState(5);
  const [message, setMessage] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle start API call
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
        setMessage("Đã bắt đầu nhận diện tự động");
      }
    } catch (error: unknown) {
      logger.error("Error starting recognition:", error);
      setMessage("Lỗi khi bắt đầu nhận diện");
    }
  };

  // Handle stop API call
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
    } catch (error: unknown) {
      logger.error("Error stopping recognition:", error);
      setMessage("Lỗi khi dừng nhận diện");
    }
  };

  // Toggle recognition
  const toggleRecognition = (
    cameraOn: boolean,
    source: string,
    cameraId: string | null,
    multiCameras: string[],
    multi: boolean,
    ws: React.MutableRefObject<WebSocket | null>
  ) => {
    if (source === "webcam" && !cameraOn) {
      toast.error("Vui lòng bật camera trước khi bắt đầu nhận diện!");
      return;
    }

    if (source === "managed") {
      if (multi && multiCameras.length === 0) {
        toast.error("Vui lòng chọn ít nhất một camera!");
        return;
      }
      if (!multi && !cameraId) {
        toast.error("Vui lòng chọn một camera!");
        return;
      }
    }

    if (ws.current?.readyState === 1) {
      if (isRunning) {
        ws.current.send(JSON.stringify({ type: "stop" }));
        setIsRunning(false);
      } else {
        ws.current.send(JSON.stringify({ type: "start" }));
        setIsRunning(true);
        setStartTime(Date.now());
      }
    }
  };

  // Capture and send frame
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

        selectedMultiCameras.forEach((cameraId: string, index: number) => {
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
      const canvas = canvasRef.current as HTMLCanvasElement;
      const video = videoRef.current as HTMLVideoElement;

      if (video.readyState !== 4) return; // HAVE_ENOUGH_DATA = 4

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const frameData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
        if (wsRef.current?.readyState === 1) {
          wsRef.current.send(
            JSON.stringify({
              type: "frame",
              image: frameData,
              camera_id: "webcam",
            })
          );
        }
      } catch (canvasError: unknown) {
        logger.error("❌ Canvas error:", canvasError);
      }
    } catch (error: unknown) {
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
    videoRef,
    canvasRef,
    wsRef,
    staggerTimeoutsRef,
  ]);

  // Start/stop frame capture loop
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
        intervalRef.current = null;
      }
    };
  }, [isRunning, isConnected, isCameraOn, captureAndSendFrame, cameraSource]);

  return {
    isRunning,
    startTime,
    cooldownPeriod,
    message,
    handleStart,
    handleStop,
    toggleRecognition,
    captureAndSendFrame,
    setCooldownPeriod,
    setMessage,
  };
};

export default useRecognitionControl;
