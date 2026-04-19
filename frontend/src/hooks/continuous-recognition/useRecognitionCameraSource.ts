import { useState, useCallback, useEffect } from "react";
import api from "@/utils/api";

export interface UseRecognitionCameraSourceReturn {
  cameraSource: "webcam" | "managed";
  selectedCameraId: string;
  selectedMultiCameras: string[];
  useMultiCamera: boolean;
  availableCameras: Array<{ camera_id: string; name: string; location?: string; status?: string }>;
  setCameraSource: (source: "webcam" | "managed") => void;
  setSelectedCameraId: (id: string) => void;
  setSelectedMultiCameras: (ids: string[]) => void;
  setUseMultiCamera: (value: boolean) => void;
  loadCameras: () => Promise<void>;
}

/**
 * Manages camera source selection and configuration.
 * Handles both webcam and managed camera selection, multi-camera mode.
 *
 * Dependencies:
 * - API_BASE_URL environment variable
 * - Recognition API endpoints
 */
export const useRecognitionCameraSource = (): UseRecognitionCameraSourceReturn => {
  const [cameraSource, setCameraSource] = useState<"webcam" | "managed">("webcam");
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMultiCameras, setSelectedMultiCameras] = useState<string[]>([]);
  const [useMultiCamera, setUseMultiCamera] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<
    Array<{ camera_id: string; name: string; location?: string; status?: string }>
  >([]);

  const loadCameras = useCallback(async () => {
    try {
      const response = await api.get("/cameras/");
      console.log("📹 Raw camera response:", response);
      
      if (response.success && response.data) {
        console.log("📹 Total cameras from API:", response.data.length);
        console.log("📹 Camera data:", response.data);
        
        // Try without filter first to see all cameras
        const cameras = Array.isArray(response.data) ? response.data : [];
        console.log("📹 Cameras array:", cameras);
        
        const enabledCameras = cameras.filter((cam: any) => {
          console.log(`📹 Checking camera ${cam.camera_id}: enabled=${cam.enabled}`);
          return cam.enabled !== false; // Include if enabled is true or undefined
        });
        
        console.log("📹 Enabled cameras:", enabledCameras.length);
        
        setAvailableCameras(
          enabledCameras.map((cam: any) => ({
            camera_id: cam.camera_id,
            name: cam.name || `Camera ${cam.camera_id}`,
            location: cam.location,
            status: cam.status,
          }))
        );
        console.log(`✅ Loaded ${enabledCameras.length} cameras`);
      } else {
        console.warn("⚠️ No success or data in response:", response);
      }
    } catch (error) {
      console.error("❌ Error loading cameras:", error);
    }
  }, []);

  // Auto-select first camera when switching to managed mode
  useEffect(() => {
    if (
      cameraSource === "managed" &&
      !selectedCameraId &&
      availableCameras.length > 0
    ) {
      setSelectedCameraId(availableCameras[0].camera_id);
    }
  }, [cameraSource, availableCameras, selectedCameraId]);

  // Load cameras on mount and periodically refresh
  useEffect(() => {
    loadCameras();
    // Refresh cameras every 10 seconds
    const interval = setInterval(loadCameras, 10000);
    return () => clearInterval(interval);
  }, [loadCameras]);

  return {
    cameraSource,
    selectedCameraId,
    selectedMultiCameras,
    useMultiCamera,
    availableCameras,
    setCameraSource,
    setSelectedCameraId,
    setSelectedMultiCameras,
    setUseMultiCamera,
    loadCameras,
  };
};

export default useRecognitionCameraSource;
