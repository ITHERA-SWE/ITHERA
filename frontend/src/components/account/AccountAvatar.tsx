import { useState } from "react";
export function AccountAvatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="atlas-account-avatar">
      {src && failed !== src ? (
        <img src={src} alt={`Foto de ${name}`} onError={() => setFailed(src)} />
      ) : (
        <span aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "—"}
        </span>
      )}
    </span>
  );
}
