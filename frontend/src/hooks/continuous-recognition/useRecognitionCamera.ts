import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/utils/api";
import logger from "@/utils/logger";

export interface UseRecognitionCameraReturn {
  isCameraOn: boolean;
  cameraPreviews: Record<string, string>;
  streamErrors: Record<string, string>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleCamera: () => Promise<void>;
  captureFromManagedCamera: (cameraId: string, updatePreviewOnly?: boolean) => Promise<void>;
  setStreamErrors: (errors: Record<string, string>) => void;
}

/**
 * Manages camera stream operations (webcam and managed cameras).
 * 
 * Handles:
 * - Video stream capture from webcam
 * - Managed camera frame capture  
 * - Camera preview management
 * 
 * This hook focuses purely on stream operations.
 * Camera configuration is managed separately in useRecognitionCameraSource.
 */
export const useRecognitionCamera = (
  wsRef: React.MutableRefObject<WebSocket | null>
): UseRecognitionCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraPreviews, setCameraPreviews] = useState<Record<string, string>>({});
  const [streamErrors, setStreamErrors] = useState<Record<string, string>>({});

  const startCamera = useCallback(async () => {
    try {
      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
      logger.info("✅ Webcam started");
    } catch (error) {
      logger.error("❌ Error starting camera:", error);
      setStreamErrors({
        camera: "Unable to start webcam. Check permissions.",
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
      logger.info("⏹️ Webcam stopped");
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  }, [isCameraOn, startCamera, stopCamera]);

  const captureFromManagedCamera = useCallback(
    async (cameraId: string, updatePreviewOnly: boolean = false) => {
      try {
        const response = await api.get(`/cameras/${cameraId}/frame?format=base64`);
        if (response.success && response.data) {
          const base64Image = response.data.frame;
          if (base64Image) {
            setCameraPreviews(prev => ({
              ...prev,
              [cameraId]: `data:image/jpeg;base64,${base64Image}`,
            }));
            console.log(`📸 Camera ${cameraId} frame received (${base64Image.length} bytes, preview=${updatePreviewOnly})`);

            if (!updatePreviewOnly && wsRef.current?.readyState === 1) {
              // Send frame through WebSocket if connected and not preview-only
              wsRef.current.send(JSON.stringify({
                type: "frame",
                image: base64Image,
                camera_id: cameraId,
              }));
            }
          } else {
            console.warn(`⚠️ Camera ${cameraId} responded but no frame data`);
          }
        } else {
          console.warn(`⚠️ Camera ${cameraId} capture failed:`, response);
        }
      } catch (error) {
        console.error(`❌ Error capturing from camera ${cameraId}:`, error);
        setStreamErrors(prev => ({
          ...prev,
          [cameraId]: `Failed to capture frame: ${error}`,
        }));
      }
    },
    [wsRef]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCameraOn) {
        stopCamera();
      }
    };
  }, [isCameraOn, stopCamera]);

  return {
    isCameraOn,
    cameraPreviews,
    streamErrors,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFromManagedCamera,
    setStreamErrors,
  };
};

export default useRecognitionCamera;
