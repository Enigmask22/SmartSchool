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

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";
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

  // Create refs early
  const staggerTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

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
    selectedMultiCameras,
    useMultiCamera,
    videoRef,
    canvasRef,
    wsRef,
    staggerTimeoutsRef,
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
      if (useMultiCamera && selectedMultiCameras.length > 0) {
        selectedMultiCameras.forEach((cam) => startCamera(cam));
      } else if (selectedCameraId) {
        startCamera(selectedCameraId);
      }
    }
  }, [cameraSource, selectedCameraId, selectedMultiCameras, useMultiCamera]);

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
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* ==================== PAGE HEADER ==================== */}
        <PageHeader
          isConnected={isConnected}
          isRunning={isRunning}
          isCameraOn={isCameraOn}
          cameraSource={cameraSource}
          selectedCameraId={selectedCameraId}
          selectedMultiCameras={selectedMultiCameras}
          useMultiCamera={useMultiCamera}
          availableCameras={availableCameras}
          onToggleCamera={toggleCamera}
          onToggleRecognition={isRunning ? handleStop : handleStart}
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
        />

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ================== LEFT: CAMERA VIEW ================== */}
          <div className="lg:col-span-2">
            <CameraView
              cameraSource={cameraSource}
              selectedCameraId={selectedCameraId}
              selectedMultiCameras={selectedMultiCameras}
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
          <div className="space-y-6">
            {/* Today's Statistics */}
            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-4">Thống Kê Hôm Nay</h3>
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
                </div>
              </div>
            </Card>

            {/* Recent Recognitions */}
            <RecentRecognitions
              recognitions={recentRecognitions}
              maxItems={20}
            />

            {/* Settings */}
            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Cài Đặt
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-foreground">
                      Thời gian chờ (giây)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="300"
                      value={cooldownPeriod}
                      onChange={(e) =>
                        setCooldownPeriod(parseInt(e.target.value) || 1)
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Thời gian chờ giữa các lần nhận diện cho cùng 1 học sinh
                    </p>
                  </div>

                  {settingsError && (
                    <p className="text-sm text-red-600">{settingsError}</p>
                  )}

                  <Button onClick={handleSaveSettings} className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Lưu Cài Đặt
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Hidden elements for video capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
         