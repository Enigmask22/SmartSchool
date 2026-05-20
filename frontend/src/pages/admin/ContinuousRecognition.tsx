/**
 * ContinuousRecognition.tsx - Main Page Component
 * 
 * Orchestrates the continuous recognition system by composing:
 * - PageHeader: Status indicators and control buttons
 * - StatisticsPanel: Recognition statistics and system info
 * - CameraView: Camera selection and live preview
 * - RecentRecognitions: Recent recognition history
 * 
 * Uses 5 specialized hooks:
 * - useRecognitionConnection: WebSocket management
 * - useRecognitionCameraSource: Camera selection & configuration
 * - useRecognitionCamera: Camera stream operations
 * - useRecognitionData: Recognition results & statistics
 * - useRecognitionControl: Recognition lifecycle & frame capture
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useRecognitionConnection } from "@/hooks/continuous-recognition/useRecognitionConnection";
import { useRecognitionCameraSource } from "@/hooks/continuous-recognition/useRecognitionCameraSource";
import { useRecognitionCamera } from "@/hooks/continuous-recognition/useRecognitionCamera";
import { useRecognitionData } from "@/hooks/continuous-recognition/useRecognitionData";
import { useRecognitionControl } from "@/hooks/continuous-recognition/useRecognitionControl";
import {
  PageHeader,
  StatisticsPanel,
  CameraView,
  RecentRecognitions,
} from "@/components/continuous-recognition";
import logger from "@/utils/logger";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export default function ContinuousRecognitionPage() {
  const [settingsError, setSettingsError] = useState("");

  const staggerTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Initialize recognition data hook
  const {
    recognizedStudents,
    recentRecognitions,
    stats,
    cameraStats,
    totalRecognitionsToday,
    handleWebSocketMessage,
  } = useRecognitionData();

  // Initialize connection with message handler
  const { isConnected, wsRef, connectWebSocket } =
    useRecognitionConnection(handleWebSocketMessage);

  // Initialize camera source configuration
  const {
    cameraSource,
    selectedCameraId,
    selectedMultiCameras,
    useMultiCamera,
    availableCameras,
    setCameraSource,
    setSelectedCameraId,
    setSelectedMultiCameras,
    setUseMultiCamera,
  } = useRecognitionCameraSource();

  const activeMultiCameraIds = useMemo(
    () =>
      useMultiCamera
        ? availableCameras.map((camera) => camera.camera_id)
        : selectedMultiCameras,
    [availableCameras, selectedMultiCameras, useMultiCamera]
  );

  // Initialize camera stream operations
  const {
    isCameraOn,
    cameraPreviews,
    videoRef,
    canvasRef,
    toggleCamera,
    captureFromManagedCamera,
  } = useRecognitionCamera(wsRef);

  // Initialize recognition control
  const {
    isRunning,
    startTime,
    cooldownPeriod,
    handleStart,
    handleStop,
    setCooldownPeriod,
  } = useRecognitionControl(
    isCameraOn,
    isConnected,
    cameraSource,
    selectedCameraId,
    activeMultiCameraIds,
    useMultiCamera,
    videoRef,
    canvasRef,
    wsRef,
    captureFromManagedCamera
  );

  // Initialize connections on mount ONLY - don't reconnect on dependency changes
  useEffect(() => {
    console.log("📌 ContinuousRecognitionPage MOUNT");
    let mounted = true;

    const loadSettings = async () => {
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
    };

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
      console.log("📌 ContinuousRecognitionPage CLEANUP");
      mounted = false;

      // Don't close WebSocket during normal cleanup - only close on page unmount
      // The WebSocket should persist for the duration of the page
      staggerTimeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []); // Empty array - only run once on mount

  // Separate cleanup for when component actually unmounts
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        console.log("🔌 Closing WebSocket on unmount");
        wsRef.current.close();
      }
    };
  }, [wsRef]);

  // Auto-start cameras when selected (managed camera mode)
  useEffect(() => {
    const startCamera = async (cameraId: string) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/cameras/${cameraId}/start`,
          { method: "POST" }
        );
        const result = await response.json();
        if (result.success) {
          logger.info(`✅ Started camera ${cameraId}`);
        } else {
          logger.warn(`⚠️ Camera ${cameraId} may not be connected yet`);
        }
      } catch (error) {
        logger.error(`❌ Error starting camera ${cameraId}:`, error);
      }
    };

    if (cameraSource === "managed") {
      if (useMultiCamera && activeMultiCameraIds.length > 0) {
        activeMultiCameraIds.forEach((cam) => startCamera(cam));
      } else if (selectedCameraId) {
        startCamera(selectedCameraId);
      }
    }
  }, [cameraSource, selectedCameraId, activeMultiCameraIds, useMultiCamera]);

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/recognition/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooldown_period: cooldownPeriod,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.message}`);
        logger.debug("Settings updated:", result.data);
        setSettingsError("");
      } else {
        toast.error(`Lỗi: ${result.message || "Không thể cập nhật cài đặt"}`);
      }
    } catch (error) {
      logger.error("Error updating settings:", error);
      setSettingsError("Lỗi kết nối khi cập nhật cài đặt");
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* ==================== PAGE HEADER ==================== */}
        <PageHeader
          isConnected={isConnected}
          isRunning={isRunning}
          totalRecognitionsToday={totalRecognitionsToday}
          runningTime={startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}
        />

        {/* ==================== STATISTICS PANEL ==================== */}
        <StatisticsPanel
          totalRecognitions={stats.totalRecognitions}
          uniqueStudents={stats.uniqueStudents.size}
          runningTime={stats.runningTime}
          isConnected={isConnected}
          cooldownPeriod={cooldownPeriod}
          totalRecognitionsToday={totalRecognitionsToday}
        />

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 auto-rows-max lg:auto-rows-fr">
          {/* ================== LEFT: CAMERA VIEW ================== */}
          <div className="lg:col-span-2 space-y-6">
            <CameraView
              cameraSource={cameraSource}
              selectedCameraId={selectedCameraId}
              selectedMultiCameras={activeMultiCameraIds}
              useMultiCamera={useMultiCamera}
              availableCameras={availableCameras}
              isCameraOn={isCameraOn}
              isRunning={isRunning}
              videoRef={videoRef}
              cameraPreviews={cameraPreviews}
              cameraStats={cameraStats}
              recognizedStudents={recognizedStudents}
              onCameraSourceChange={setCameraSource}
              onSelectedCameraChange={setSelectedCameraId}
              onMultiCameraToggle={setUseMultiCamera}
              onSelectedMultiCamerasChange={setSelectedMultiCameras}
            />
          </div>

          {/* ================== RIGHT PANEL ================== */}
          <div className="flex flex-col h-full">
            {/* Recent Recognitions */}
            <RecentRecognitions
              recognitions={recentRecognitions}
              maxItems={20}
              cooldownPeriod={cooldownPeriod}
              settingsError={settingsError}
              onCooldownChange={setCooldownPeriod}
              onSaveSettings={handleSaveSettings}
              isCameraOn={isCameraOn}
              isRunning={isRunning}
              cameraSource={cameraSource}
              onToggleCamera={toggleCamera}
              onToggleRecognition={isRunning ? handleStop : handleStart}
            />
          </div>
        </div>

        {/* ==================== UNIFIED INFO BANNER (FULL WIDTH) ==================== */}
        <div className="p-6 bg-white border-2 shadow-md rounded-2xl hover:shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center bg-indigo-100 w-12 h-12 rounded-xl flex-shrink-0">
              <Info className="text-indigo-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Hướng dẫn mức độ khớp</h3>
              <p className="text-sm text-gray-600 mb-3">
                InsightFace AI so sánh khuôn mặt với dữ liệu đã lưu. Điểm khớp từ <strong>★★☆☆☆</strong> (20 điểm) trở lên là đủ để nhận diện chính xác.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="text-gray-700">★★★★★ Xuất sắc (≥45)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  <span className="text-gray-700">★★★★☆ Rất tốt (35-44)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-gray-700">★★★☆☆ Tốt (25-34)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                  <span className="text-gray-700">★★☆☆☆ Khá (20-24)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                  <span className="text-gray-700">★☆☆☆☆ Đạt (&lt;20)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden elements for video capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
         
