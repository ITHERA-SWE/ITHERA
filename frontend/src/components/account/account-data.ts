import type { TripDocument } from "../../services/documents";
export function canDeleteTripDocument(
  document: TripDocument,
  authUserId?: string | null,
  readOnly = false,
) {
  return (
    !readOnly &&
    Boolean(authUserId) &&
    String(document.user_id) === String(authUserId) &&
    document.metadata?.immutable !== true
  );
}
export function documentKind(mime?: string | null, name = "") {
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "PDF";
  if (mime === "text/plain" || /\.txt$/i.test(name)) return "TXT";
  if (mime?.startsWith("image/")) return "IMAGEN";
  return "ARCHIVO";
}
export function validDocumentFile(file: { size: number; type: string }) {
  if (
    ![
      "application/pdf",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/webp",
    ].includes(file.type)
  )
    return "Elige un archivo PDF, TXT, PNG, JPG o WEBP.";
  if (file.size > 10 * 1024 * 1024)
    return "El archivo no puede superar los 10 MB.";
  return "";
}
export function safeDocumentUrl(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}
export function documentSize(bytes?: number) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0)
    return "Tamaño no informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
export function documentDate(value?: string) {
  if (!value) return "Fecha no informada";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      }).format(date)
    : "Fecha no informada";
}

/** Identidad de servidor: dos archivos con el mismo nombre pueden ser legítimos. */
export function mergeTripDocuments<T extends { id: string }>(
  current: T[],
  incoming: T[],
) {
  const incomingById = new Map(incoming.map((item) => [String(item.id), item]));
  const seen = new Set<string>();
  return [...incomingById.values(), ...current].filter((item) => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
