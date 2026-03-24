import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/utils/api";
import logger from "@/utils/logger";
import { AuthContext } from "./AuthContext";
import { USER_ROLES } from "@/utils/constants";

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
  academicYear: string;
  semester: string;
  attendanceCutoffTime: string;
}

const SystemSettingsContext = createContext<SystemSettingsContextValue | undefined>(
  undefined
);

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error(
      "useSystemSettings must be used within SystemSettingsProvider"
    );
  }
  return context;
};

interface SystemSettingsProviderProps {
  children: ReactNode;
}

export const SystemSettingsProvider = ({ children }: SystemSettingsProviderProps) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [settings, setSettings] = useState<Settings>({
    academic_year: "2024-2025",
    semester: "HK1",
    attendance_cutoff_time: "07:15:00",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      // Only fetch admin settings if user is admin
      if (!isAdmin) {
        setLoading(false);
        return;
      }

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
        setError(null);
      }
    } catch (err: any) {
      logger.error("Error fetching system settings:", err);
      setError(err.message);
      // Giữ nguyên giá trị mặc định nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Refresh settings mỗi 5 phút
    const interval = setInterval(fetchSettings, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const refreshSettings = (): void => {
    fetchSettings();
  };

  const contextValue: SystemSettingsContextValue = {
    settings,
    loading,
    error,
    refreshSettings,
    academicYear: settings.academic_year || "2024-2025",
    semester: settings.semester || "HK1",
    attendanceCutoffTime: settings.attendance_cutoff_time || "07:15:00",
  };

  return (
    <SystemSettingsContext.Provider value={contextValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
};
