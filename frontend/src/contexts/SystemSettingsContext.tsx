import { createContext, useState, useEffect, ReactNode, useRef, useContext } from "react";
import api from "@/utils/api";
import logger from "@/utils/logger";
import { AuthContext } from "./AuthContext";

// Define the shape of system settings
interface Settings {
  academic_year?: string;
  semester?: string;
  attendance_cutoff_time?: string;
  [key: string]: any;
}

// Define the shape of the system settings context value
interface SystemSettingsContextValue {
  settings: Settings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => void;
}

export const SystemSettingsContext = createContext<SystemSettingsContextValue | undefined>(
  undefined
);

interface SystemSettingsProviderProps {
  children: ReactNode;
}

export const SystemSettingsProvider = ({ children }: SystemSettingsProviderProps) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isAuthenticated = !!user;

  // Initialize from localStorage, fallback to defaults
  const getInitialSettings = (): Settings => {
    try {
      const stored = localStorage.getItem("system_settings");
      return stored ? JSON.parse(stored) : {
        academic_year: "2024-2025",
        semester: "HK1",
        attendance_cutoff_time: "07:15:00",
      };
    } catch {
      return {
        academic_year: "2024-2025",
        semester: "HK1",
        attendance_cutoff_time: "07:15:00",
      };
    }
  };

  const [settings, setSettings] = useState<Settings>(getInitialSettings());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      // Fetch system settings (only for authenticated users)
      const response = await api.request("/admin/system-settings", {
        method: "GET",
      });

      if (response.success) {
        // Chuyển đổi array thành object
        const settingsMap: Settings = {};
        response.data.forEach((setting: any) => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });
        setSettings(settingsMap);
        // Persist to localStorage
        localStorage.setItem("system_settings", JSON.stringify(settingsMap));
        setError(null);
        
        // Start auto-refresh interval if not already started
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchSettings, 5 * 60 * 1000);
        }
      }
    } catch (err: any) {
      logger.error("Error fetching system settings:", err);
      setError(err.message);
      // Giữ nguyên giá trị mặc định nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings only when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      // Reset when not authenticated (e.g., on logout)
      setLoading(false);
      setError(null);
      localStorage.removeItem("system_settings");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isAuthenticated]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const refreshSettings = (): void => {
    fetchSettings();
  };

  const contextValue: SystemSettingsContextValue = {
    settings,
    loading,
    error,
    refreshSettings,
  };

  return (
    <SystemSettingsContext.Provider value={contextValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
};
