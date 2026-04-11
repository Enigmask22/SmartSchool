import { useContext } from "react";
import { SystemSettingsContext } from "./SystemSettingsContext";

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error(
      "useSystemSettings must be used within SystemSettingsProvider"
    );
  }
  return context;
};
