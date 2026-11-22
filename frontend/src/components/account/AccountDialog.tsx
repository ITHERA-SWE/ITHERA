import type { ReactNode } from "react";
import { EditorialDialog } from "../collaboration/EditorialDialog";
import "./accounts-editorial.css";
export function AccountDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <EditorialDialog title={title} onClose={onClose} busy={busy}>
      <div className="atlas-account-dialog">{children}</div>
    </EditorialDialog>
  );
}
export function AccountConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <AccountDialog title={title} onClose={onCancel} busy={loading}>
      <div className={`atlas-account-confirm is-${variant}`}>
        <p>{description}</p>
        {details && <div className="atlas-confirm-details">{details}</div>}
        <div className="atlas-account-dialog-actions">
          <button
            className="atlas-account-button"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`atlas-account-button ${variant === "danger" ? "is-danger" : "is-primary"}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </AccountDialog>
  );
}
