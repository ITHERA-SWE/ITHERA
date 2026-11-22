import { Logo } from "./Logo";
export function EditorialLoading({
  label = "Preparando tu atlas de viaje…",
  full = false,
}: {
  label?: string;
  full?: boolean;
}) {
  return (
    <div
      className={`atlas-loading ${full ? "is-full" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {full && <Logo variant="color" height={42} />}
      <span className="atlas-loading-line" aria-hidden="true" />
      <p>{label}</p>
      <small>
        La primera conexión puede tardar un poco. Puedes esperar mientras se
        activa el servicio.
      </small>
    </div>
  );
}
