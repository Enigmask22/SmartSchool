import { useState, useEffect, useCallback } from "react";

export interface UseRecognitionDataReturn {
  // State
  recognizedStudents: any[];
  recentRecognitions: any[];
  stats: {
    totalRecognitions: number;
    uniqueStudents: Set<number>;
    runningTime: number;
  };
  cameraStats: Record<string, any>;
  cameraRecognitions: Record<string, any[]>;
  totalRecognitionsToday: number;

  // Handlers & Setters
  handleWebSocketMessage: (data: any) => void;
}

/**
 * Manages recognition results and statistics.
 * 
 * Handles:
 * - Recognition data updates from WebSocket
 * - Statistics calculation (total, unique, runtime)
 * - Per-camera statistics
 * - Recent recognitions list (max 20)
 * 
 * Returns: See UseRecognitionDataReturn interface
 */
export const useRecognitionData = (): UseRecognitionDataReturn => {
  const [recognizedStudents, setRecognizedStudents] = useState<any[]>([]);
  const [recentRecognitions, setRecentRecognitions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    uniqueStudents: new Set<number>(),
    runningTime: 0,
  });
  const [cameraStats, setCameraStats] = useState<Record<string, any>>({});
  const [cameraRecognitions, setCameraRecognitions] = useState<Record<string, any[]>>({});
  const [totalRecognitionsToday, setTotalRecognitionsToday] = useState(0);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "recognition_result": {
        const cameraId = data.camera_id || data.data?.camera_id || "default";
        const recognitionData = data.data || data;

        if (
          recognitionData.recognized_students &&
          recognitionData.recognized_students.length > 0
        ) {
          // Update global recognized students
          setRecognizedStudents(recognitionData.recognized_students);

          // Update camera-specific stats
          setCameraStats((prev: Record<string, any>) => {
            const cameraStat = prev[cameraId] || {
              total: 0,
              unique: new Set<number>(),
              lastFrame: null,
            };
            const uniqueSet: Set<number> =
              cameraStat.unique instanceof Set ? cameraStat.unique : new Set();
            recognitionData.recognized_students.forEach((recognition: any) => {
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
          setCameraRecognitions((prev: Record<string, any[]>) => {
            const cameraRecs = prev[cameraId] || [];
            const newRecs = recognitionData.recognized_students.map(
              (recognition: any) => ({
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
          recognitionData.recognized_students.forEach((recognition: any) => {
            setRecentRecognitions((prev: any[]) => [
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
          setRecognizedStudents([]);
        }
        break;
      }

      case "status":
        // Status updates can be handled here if needed
        break;

      case "control_update":
        // Control updates can be handled here if needed
        break;

      default:
        // Unknown message type
        break;
    }
  }, []);

  // Update stats when recognized students change
  useEffect(() => {
    if (recognizedStudents.length > 0) {
      setStats((prev: any) => {
        const newUniqueStudents = new Set(prev.uniqueStudents);
        recognizedStudents.forEach((r: any) => newUniqueStudents.add(r.student.id));

        return {
          ...prev,
          totalRecognitions: prev.totalRecognitions + recognizedStudents.length,
          uniqueStudents: newUniqueStudents,
        };
      });
    }
  }, [recognizedStudents]);

  return {
    recognizedStudents,
    recentRecognitions,
    stats,
    cameraStats,
    cameraRecognitions,
    totalRecognitionsToday,
    handleWebSocketMessage,
  };
};

export default useRecognitionData;
