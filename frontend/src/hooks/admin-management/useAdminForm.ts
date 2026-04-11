import { useState, useCallback } from 'react';

export function useAdminForm() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Password generation utility
  const generatePassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  const handleGeneratePassword = useCallback(() => {
    const newPassword = generatePassword();
    setFormData((prev) => ({ ...prev, password: newPassword }));
  }, [generatePassword]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({});
    setShowPassword(false);
  }, []);

  const initializeFormData = useCallback((initialData: Record<string, any> = {}) => {
    setFormData(initialData);
    setShowPassword(false);
  }, []);

  return {
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    generatePassword,
    handleGeneratePassword,
    handleChange,
    resetForm,
    initializeFormData,
  };
}
