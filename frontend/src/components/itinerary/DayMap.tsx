import { useLocation, useNavigate } from "react-router-dom";
import { travelPath } from "../../pages/Search/search-data";
import { useState } from "react";
import type { Activity } from "../ui/DayView/DayView";
import { mapUrl, validCoordinates } from "./itinerary-data";
export function DayMap({
  activities,
  selectedId,
  onSelect,
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const location = useLocation(),
    navigate = useNavigate();
  const groupId = new URLSearchParams(location.search).get("groupId");
  const points = activities.filter(validCoordinates);
  const selected = points.find((a) => a.id === selectedId) ?? points[0];
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <aside className="atlas-day-map" aria-label="Lugares del día">
      <p className="atlas-eyebrow">EL DÍA, EN EL MAPA</p>
      <h2>Lugares por recorrer.</h2>
      {points.length === 0 ? (
        <p>
          No hay coordenadas verificables para este día. Las direcciones
          disponibles siguen en la agenda.
        </p>
      ) : (
        <>
          <ol>
            {points.map((a, i) => (
              <li key={a.id}>
                <button
                  aria-pressed={selected?.id === a.id}
                  onClick={() => {
                    onSelect(a.id);
                    setFailed(false);
                    setLoaded(false);
                  }}
                >
                  <span>{i + 1}</span>
                  <span>
                    {a.title}
                    {a.location && <small>{a.location}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {selected && (
            <details
              key={selected.id}
              className="atlas-map-disclosure"
              open={expanded}
              onToggle={(e) => setExpanded(e.currentTarget.open)}
            >
              <summary>Mostrar mapa de {selected.title}</summary>
              <p>
                Si el mapa no carga, puedes seguir consultando la agenda y las
                direcciones.
              </p>
              {expanded &&
                (failed ? (
                  <p role="alert">
                    El mapa no está disponible.{" "}
                    <button
                      className="atlas-text-link"
                      onClick={() => {
                        setFailed(false);
                        setLoaded(false);
                        setAttempt((n) => n + 1);
                      }}
                    >
                      Reintentar mapa
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="atlas-map-frame">
                      {!loaded && (
                        <span role="status">Cargando mapa externo…</span>
                      )}
                      <iframe
                        key={attempt}
                        title={`Ubicación de ${selected.title}`}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${selected.latitude},${selected.longitude}`)}&z=14&output=embed`}
                        onLoad={() => setLoaded(true)}
                        onError={() => setFailed(true)}
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <button
                      className="atlas-text-link"
                      onClick={() => setFailed(true)}
                    >
                      No puedo ver el mapa
                    </button>
                  </>
                ))}
              <a href={mapUrl(selected)!} target="_blank" rel="noreferrer">
                Abrir ubicación en Google Maps ↗
              </a>
            </details>
          )}
          {selected && groupId && (
            <button
              className="atlas-text-link"
              onClick={() =>
                navigate(
                  travelPath("/search/routes-weather", groupId, {
                    activityId: selected.id,
                  }),
                )
              }
            >
              Consultar ruta y clima de esta actividad ↗
            </button>
          )}
        </>
      )}
      <p className="atlas-map-caption">
        {points.length} ubicación(es) con coordenadas · No se geocodifican
        direcciones automáticamente.
      </p>
    </aside>
  );
}
