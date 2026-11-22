import { useState } from "react";
import { safePhoto } from "./trip-data";
import { TripCompass } from "./TripAccessLayout";
export function TripCover({
  src,
  destination,
}: {
  src?: string | null;
  destination?: string | null;
}) {
  const url = safePhoto(src),
    [failed, setFailed] = useState<string | null>(null),
    [loaded, setLoaded] = useState<string | null>(null);
  return (
    <div className="atlas-trip-cover">
      {url && failed !== url ? (
        <>
          <img
            src={url}
            alt={
              destination ? `Destino: ${destination}` : "Fotografía del destino"
            }
            loading="lazy"
            onLoad={() => setLoaded(url)}
            onError={() => setFailed(url)}
          />
          {loaded !== url && (
            <span className="atlas-trip-photo-loading" role="status">
              Cargando fotografía…
            </span>
          )}
        </>
      ) : (
        <div className="atlas-trip-cover-fallback">
          <TripCompass />
          <span>{destination || "Tu próxima experiencia"}</span>
          <small>Fotografía no disponible</small>
        </div>
      )}
    </div>
  );
}
