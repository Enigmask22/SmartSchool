import { createContext, useState, useEffect, ReactNode } from "react";
import api from "@/utils/api";
import logger from "@/utils/logger";
import { USER_ROLES } from "@/utils/constants";

// Define the shape of the auth context value
interface AuthContextValue {
  user: any;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isTeacher: () => boolean;
  isHomeroomTeacher: () => boolean;
  isSubjectTeacher: () => boolean;
  isAdmin: () => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access_token")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem("refresh_token")
  );

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Kiểm tra xem token có hết hạn không
  const isTokenExpired = (token: string): boolean => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  const checkAuthStatus = async () => {
    const storedAccessToken = localStorage.getItem("access_token");
    const storedRefreshToken = localStorage.getItem("refresh_token");
    const storedUser = localStorage.getItem("user");

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));

        // Kiểm tra xem access token có hết hạn không
        if (isTokenExpired(storedAccessToken)) {
          logger.debug("Access token expired, refreshing...");

          try {
            // Thử refresh token
            const newAccessToken = await api.refreshAccessToken();
            setAccessToken(newAccessToken);
            logger.debug("Token refreshed successfully");
          } catch (error) {
            logger.debug("Token refresh failed, logging out");
            logout();
          }
        }

        // Có thể verify token bằng cách gọi endpoint /auth/me
        // const response = await api.request('/auth/me');
        // if (response.success) {
        //   setUser(response.data);
        // } else {
        //   logout();
        // }
      } catch (error) {
        logger.error("Token verification failed:", error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);

      if (response.success && response.data.access_token) {
        const { access_token, refresh_token, user } = response.data;

        // Store in localStorage
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("user", JSON.stringify(user));

        // Update state
        setAccessToken(access_token);
        setRefreshToken(refresh_token);
        setUser(user);

        logger.debug("Login successful");
        return user;
      } else {
        throw new Error(response.message || "Invalid response format");
      }
    } catch (error) {
      logger.error("Login error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage = errorMsg || "Đăng nhập thất bại";
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Gọi API logout để invalidate tokens trên server
      await api.logout();
    } catch (error) {
      logger.error("Logout API call failed:", error);
    }

    // Xóa tất cả dữ liệu local
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);

    logger.debug("Logged out successfully");
  };

  const isAuthenticated = () => {
    return (
      !!accessToken && !!refreshToken && !!user && !isTokenExpired(accessToken)
    );
  };

  const isTeacher = () => {
    return user && (user.role === USER_ROLES.SUBJECT_TEACHER || user.role === USER_ROLES.ADMIN);
  };

  const isHomeroomTeacher = () => {
    return user && user.role === USER_ROLES.HOMEROOM_TEACHER;
  };

  const isSubjectTeacher = () => {
    return user && user.role === USER_ROLES.SUBJECT_TEACHER;
  };

  const isAdmin = () => {
    return user && user.role === USER_ROLES.ADMIN;
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return Array.isArray(roles)
      ? roles.includes(user.role)
      : user.role === roles;
  };

  // Tự động kiểm tra và refresh token theo định kỳ
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired(accessToken)) {
        logger.debug("Token expired, auto-refreshing...");
        api
          .refreshAccessToken()
          .then((newToken) => {
            setAccessToken(newToken);
            logger.debug("Auto-refresh successful");
          })
          .catch(() => {
            logger.debug("Auto-refresh failed, logging out");
            logout();
          });
      }
    };

    // Kiểm tra mỗi 2 phút (vì access token ngắn hơn)
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    logout,
    isAuthenticated,
    isTeacher,
    isHomeroomTeacher,
    isSubjectTeacher,
    isAdmin,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
