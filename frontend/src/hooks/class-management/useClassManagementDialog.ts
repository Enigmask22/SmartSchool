import { useState, useCallback } from 'react';

export interface ConfirmState {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: 'destructive' | 'default';
  onConfirm?: () => void;
}

export const useClassManagementDialog = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  const openConfirm = useCallback(
    (config: Omit<ConfirmState, 'open'>) =>
      setConfirmState({ open: true, variant: 'destructive', confirmText: 'Xác nhận', ...config }),
    [],
  );

  const closeConfirm = useCallback(
    () => setConfirmState((prev) => ({ ...prev, open: false })),
    [],
  );

  return {
    confirmState,
    openConfirm,
    closeConfirm,
  };
};
