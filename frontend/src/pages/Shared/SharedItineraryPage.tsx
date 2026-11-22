import { Logo } from "../../components/ui/Logo";
import { EditorialLoading } from "../../components/ui/EditorialLoading";
import "./shared-editorial.css";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  exportService,
  type SharedItineraryItem,
  type SharedGroupInfo,
} from "../../services/export";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Fechas sin definir";
  return `${start ?? "-"} a ${end ?? "-"}`;
}

export function SharedItineraryPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<SharedGroupInfo | null>(null);
  const [items, setItems] = useState<SharedItineraryItem[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await exportService.getSharedItinerary(token);
        if (cancelled) return;
        setGroup(response.group);
        setItems(response.itinerary ?? []);
        setExpiresAt(response.tokenMeta?.expiresAt ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el itinerario compartido",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, retry]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, SharedItineraryItem[]>();
    items.forEach((item) => {
      const day = item.day ?? "Sin fecha";
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <main className="atlas-shared-itinerary">
      <div className="atlas-shared-sheet">
        <header>
          <Logo variant="color" height={38} />
          <p className="atlas-shared-eyebrow">
            EL ATLAS DEL VIAJE / CONSULTA COMPARTIDA
          </p>
          <h1>{group?.nombre ?? "El itinerario del viaje."}</h1>
          {group && (
            <>
              <p>
                {group.destino_formatted_address ||
                  group.destino ||
                  "Destino sin definir"}
              </p>
              <p>{formatRange(group.fecha_inicio, group.fecha_fin)}</p>
            </>
          )}
          {expiresAt && (
            <small>Enlace válido hasta {formatDate(expiresAt)}</small>
          )}
          <button
            className="atlas-shared-print"
            disabled={loading || Boolean(error)}
            onClick={() => window.print()}
          >
            Imprimir / Guardar PDF
          </button>
        </header>
        {loading ? (
          <EditorialLoading label="Preparando el itinerario compartido…" />
        ) : error ? (
          <section role="alert" className="atlas-shared-error">
            <h2>No se pudo consultar el itinerario.</h2>
            <p>{error}</p>
            <button onClick={() => setRetry((value) => value + 1)}>
              Reintentar consulta
            </button>
          </section>
        ) : groupedByDay.length === 0 ? (
          <section className="atlas-shared-empty">
            <h2>Sin actividades para mostrar.</h2>
            <p>
              Este enlace solo presenta los datos compartidos del itinerario.
            </p>
          </section>
        ) : (
          <div className="atlas-shared-days">
            {groupedByDay.map(([day, dayItems]) => (
              <section key={day} className="atlas-shared-day">
                <header>
                  <p className="atlas-shared-eyebrow">EL PLAN DEL DÍA</p>
                  <h2>{day}</h2>
                </header>
                {dayItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <span>HORARIO</span>
                      <p>
                        {formatDate(item.startsAt)}
                        {item.endsAt && <> — {formatDate(item.endsAt)}</>}
                      </p>
                    </div>
                    <div>
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                      {item.location && (
                        <p className="atlas-shared-location">{item.location}</p>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
        <footer>ITHERA · Planear juntos, vivir el viaje.</footer>
      </div>
    </main>
  );
}
