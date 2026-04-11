import { useState, useCallback } from 'react';

export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState<Record<string, any>>({ open: false });

  const openConfirm = useCallback((config: any) => {
    setConfirmState({
      open: true,
      variant: 'destructive',
      confirmText: 'Xác nhận',
      ...config,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    confirmState,
    openConfirm,
    closeConfirm,
  };
}
