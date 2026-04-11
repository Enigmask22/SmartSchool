import { useState, useRef, useCallback } from "react";
import logger from "@/utils/logger";

const WS_BASE_URL =
  import.meta.env.VITE_APP_WS_URL || "ws://localhost:8000/api";

export interface UseRecognitionConnectionReturn {
  isConnected: boolean;
  connectionStatus: string;
  wsRef: React.MutableRefObject<WebSocket | null>;
  connectWebSocket: () => void;
}

/**
 * Manages WebSocket connection for recognition stream.
 * 
 * Exactly matches the working pattern from useContinuousRecognition.ts
 * 
 * Parameters:
 * - onMessage: Callback function when WebSocket receives a message
 * 
 * Returns: See UseRecognitionConnectionReturn interface
 */
export const useRecognitionConnection = (
  onMessage?: (data: any) => void
): UseRecognitionConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    console.log("🔗 connectWebSocket() called");
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ai/recognition/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket OPENED");
        logger.debug("🔗 Connected to recognition stream");
        setIsConnected(true);
        setConnectionStatus("connected");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", data.type);
          if (onMessage) {
            onMessage(data);
          }
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

      wsRef.current.onerror = (error: Event) => {
        console.error("❌ WebSocket ERROR:", error);
        logger.error("❌ WebSocket error:", error);
        setConnectionStatus("error");
      };
    } catch (error: unknown) {
      console.error("❌ Exception creating WebSocket:", error);
      logger.error("❌ Failed to connect WebSocket:", error);
      setConnectionStatus("error");
    }
  }, [onMessage]);

  return {
    isConnected,
    connectionStatus,
    wsRef,
    connectWebSocket,
  };
};

export default useRecognitionConnection;
