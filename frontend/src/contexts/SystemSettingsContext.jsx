import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";
import logger from "@/utils/logger";
import { AuthContext } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/utils/constants";

const SystemSettingsContext = createContext();

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error(
      "useSystemSettings must be used within SystemSettingsProvider"
    );
  }
  return context;
};

export const SystemSettingsProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [settings, setSettings] = useState({
    academic_year: "2024-2025",
    semester: "HK1",
    attendance_cutoff_time: "07:15:00",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
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
        const settingsMap = {};
        response.data.forEach((setting) => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });
        setSettings(settingsMap);
        setError(null);
      }
    } catch (err) {
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
  }, []);

  const refreshSettings = () => {
    fetchSettings();
  };

  const contextValue = {
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
