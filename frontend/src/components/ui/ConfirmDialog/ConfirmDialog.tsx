import type { ReactNode } from "react";
import { AccountConfirmDialog } from "../../account/AccountDialog";
export type ConfirmDialogVariant = "danger" | "warning" | "info" | "success";
export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return <AccountConfirmDialog {...props} />;
}
