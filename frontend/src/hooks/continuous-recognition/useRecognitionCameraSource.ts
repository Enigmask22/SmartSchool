import { useState, useCallback, useEffect } from "react";
import api from "@/utils/api";

export interface UseRecognitionCameraSourceReturn {
  cameraSource: "webcam" | "managed";
  selectedCameraId: string;
  selectedMultiCameras: string[];
  useMultiCamera: boolean;
  availableCameras: Array<{ id: string; name: string }>;
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
  const [selectedCameraId, setSelectedCameraId] = useState<string>("0");
  const [selectedMultiCameras, setSelectedMultiCameras] = useState<string[]>([]);
  const [useMultiCamera, setUseMultiCamera] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const loadCameras = useCallback(async () => {
    try {
      const response = await api.get("/cameras/");
      if (response.success && response.data) {
        const enabledCameras = response.data.filter((cam: any) => cam.enabled);
        setAvailableCameras(
          enabledCameras.map((cam: any) => ({
            id: cam.camera_id,
            name: cam.name || `Camera ${cam.camera_id}`,
          }))
        );
        console.log(`✅ Loaded ${enabledCameras.length} cameras`);
      }
    } catch (error) {
      console.error("Error loading cameras:", error);
    }
  }, []);

  // Load cameras on mount
  useEffect(() => {
    loadCameras();
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
