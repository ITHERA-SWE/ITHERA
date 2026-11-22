import type { Toast } from "../../../hooks/useToast";
const icons = { error: "!", warning: "!", success: "✓", info: "i" };
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="atlas-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`atlas-toast is-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true">{icons[toast.type]}</span>
          <p>{toast.message}</p>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
