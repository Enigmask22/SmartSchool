import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";

/**
 * ConfirmDialog – dialog xác nhận tái sử dụng thay thế window.confirm.
 *
 * Cách dùng trong component cha:
 *
 *   const [confirmState, setConfirmState] = useState({ open: false });
 *
 *   const openConfirm = (config) =>
 *     setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config });
 *
 *   const closeConfirm = () =>
 *     setConfirmState((prev) => ({ ...prev, open: false }));
 *
 *   // Kích hoạt:
 *   openConfirm({
 *     title: "Xóa bản ghi",
 *     description: "Hành động này không thể hoàn tác.",
 *     onConfirm: () => { closeConfirm(); doDelete(id); },
 *   });
 *
 *   // JSX:
 *   <ConfirmDialog {...confirmState} onCancel={closeConfirm} />
 */
const ConfirmDialog = ({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "destructive",
}) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel?.()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ConfirmDialog;
