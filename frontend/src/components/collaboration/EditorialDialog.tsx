import { useEffect, useRef, type ReactNode } from "react";
export function EditorialDialog({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="atlas-collab-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="atlas-button atlas-button-quiet"
          onClick={onClose}
          disabled={busy}
          autoFocus
          aria-label={`Cerrar ${title}`}
        >
          Cerrar ×
        </button>
      </header>
      <div className="atlas-dialog-body">{children}</div>
    </dialog>
  );
}
