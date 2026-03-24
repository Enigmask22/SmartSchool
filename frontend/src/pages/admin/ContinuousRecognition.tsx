/**
 * ContinuousRecognition.tsx - Main Page Component
 * 
 * Orchestrates the continuous recognition system by composing:
 * - PageHeader: Status indicators and control buttons
 * - StatisticsPanel: Recognition statistics and system info
 * - CameraView: Camera selection and live preview
 * - RecentRecognitions: Recent recognition history
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";
import { useContinuousRecognition } from "@/hooks/useContinuousRecognition";
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
  const {
    isRunning,
    isConnected,
    isCameraOn,
    recognizedStudents,
    recentRecognitions,
    cooldownPeriod,
    totalRecognitionsToday,
    activeCooldowns,
    cameraSource,
    selectedCameraId,
    selectedMultiCameras,
    useMultiCamera,
    startTime,
    availableCameras,
    cameraPreviews,
    cameraStats,
    stats,
    videoRef,
    canvasRef,
    toggleCamera,
    handleStart,
    handleStop,
    setCameraSource,
    setSelectedCameraId,
    setSelectedMultiCameras,
    setUseMultiCamera,
    setCooldownPeriod,
  } = useContinuousRecognition();

  const [settingsError, setSettingsError] = useState("");

  // Calculate running time
  const runningTime = startTime
    ? Math.floor((Date.now() - startTime) / 1000)
    : 0;

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
        alert(`${result.message}`);
        logger.debug("Settings updated:", result.data);
        setSettingsError("");
      } else {
        alert(`Lỗi: ${result.message || "Không thể cập nhật cài đặt"}`);
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
          runningTime={runningTime}
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
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Đang chờ:</span>
                    <span className="font-bold text-orange-600">
                      {Object.keys(activeCooldowns).length}
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
         