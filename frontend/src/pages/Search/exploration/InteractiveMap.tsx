import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type GoogleLatLngLiteral,
  type GoogleDirectionsRendererInstance,
  type GoogleDirectionsResult,
  type ComputeRouteResult,
} from "../../../services/maps";
import { decodePolyline } from "./geo-data";
export type GeoPoint = {
  id: string;
  label: string;
  position: GoogleLatLngLiteral;
};
type Polyline = { setMap: (map: GoogleMapInstance | null) => void };
export function InteractiveMap({
  points,
  center,
  selectedId,
  onSelect,
  route,
  routeEndpoints,
  travelMode = "DRIVE",
  layoutKey = "",
}: {
  points: GeoPoint[];
  center: GoogleLatLngLiteral | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  route?: ComputeRouteResult | null;
  routeEndpoints?: {
    origin: GoogleLatLngLiteral;
    destination: GoogleLatLngLiteral;
  } | null;
  travelMode?: "DRIVE" | "WALK" | "TRANSIT";
  layoutKey?: string;
}) {
  const element = useRef<HTMLDivElement>(null),
    initialCenter = center ?? points[0]?.position ?? null;
  const [map, setMap] = useState<GoogleMapInstance | null>(null),
    [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
      "empty",
    ),
    [attempt, setAttempt] = useState(0),
    [drawingNotice, setDrawingNotice] = useState("");
  const anchorLat = initialCenter?.lat,
    anchorLng = initialCenter?.lng;
  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as
    string | undefined;
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    let active = true;
    // El ciclo del mapa externo necesita invalidar la instancia previa antes de cargar otra.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMap(null);
    if (anchorLat == null || anchorLng == null) {
      setStatus("empty");
      return;
    }
    if (!key) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    const win = window as Window & { gm_authFailure?: () => void },
      previous = win.gm_authFailure;
    const failure = () => {
      previous?.();
      if (active) setStatus("error");
    };
    win.gm_authFailure = failure;
    void loadGoogleMaps(key)
      .then(() => {
        if (!active || !element.current || !window.google?.maps) return;
        const instance = new window.google.maps.Map(element.current, {
          center: { lat: anchorLat, lng: anchorLng },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMap(instance);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
      if (win.gm_authFailure === failure) win.gm_authFailure = previous;
    };
    // Cambiar de selección se atiende en el efecto de marcadores; la base geográfica permanece estable.
  }, [key, attempt, anchorLat, anchorLng]);
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    let active = true;
    const markers: GoogleMarkerInstance[] = [],
      listeners: Array<{ remove: () => void }> = [];
    let line: Polyline | null = null,
      renderer: GoogleDirectionsRendererInstance | null = null;
    // Reinicia el diagnóstico del trazado externo cuando cambia su contenido.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawingNotice("");
    try {
      // Restablece el tamaño al alternar Lista/Mapa tras una inicialización oculta en móvil.
      const events = window.google.maps as typeof window.google.maps & {
        event?: { trigger: (map: GoogleMapInstance, name: string) => void };
      };
      events.event?.trigger(map, "resize");
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => {
        const marker = new window.google!.maps.Marker({
          map,
          position: p.position,
          title: p.label,
          icon:
            p.id === selectedId
              ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
              : undefined,
        });
        const listener = marker.addListener("click", () =>
          selectRef.current?.(p.id),
        ) as unknown as { remove?: () => void } | undefined;
        if (listener?.remove)
          listeners.push(listener as { remove: () => void });
        markers.push(marker);
        bounds.extend(p.position);
      });
      const selected = points.find((p) => p.id === selectedId);
      if (points.length > 1 && !selected) map.fitBounds(bounds, 60);
      else if (selected) map.panTo(selected.position);
      else if (center) map.setCenter(center);
      else if (points[0]) map.setCenter(points[0].position);
      if (route && routeEndpoints) {
        const path = route.encodedPolyline
          ? decodePolyline(route.encodedPolyline)
          : [];
        const gm = window.google.maps as typeof window.google.maps & {
          Polyline?: new (options: Record<string, unknown>) => Polyline;
        };
        if (path.length > 0 && gm.Polyline) {
          line = new gm.Polyline({
            path,
            strokeColor: "#4B2FA3",
            strokeWeight: 5,
            strokeOpacity: 0.95,
            map,
          });
          path.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 60);
        } else if (
          !route.encodedPolyline &&
          gm.DirectionsService &&
          gm.DirectionsRenderer
        ) {
          renderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
          });
          renderer?.setMap(map);
          const mode =
            travelMode === "DRIVE"
              ? "DRIVING"
              : travelMode === "WALK"
                ? "WALKING"
                : "TRANSIT";
          new window.google.maps.DirectionsService().route(
            {
              origin: routeEndpoints.origin,
              destination: routeEndpoints.destination,
              travelMode: mode,
            },
            (result: GoogleDirectionsResult | null, status: string) => {
              if (!active) return;
              if (status === "OK" && result) {
                renderer?.setDirections(result);
                setDrawingNotice(
                  "El mapa recalculó una ruta de referencia; puede variar del resultado mostrado.",
                );
              } else
                setDrawingNotice(
                  "No se recibió un trazado visual. Puedes consultar las indicaciones del resultado.",
                );
            },
          );
        } else
          setDrawingNotice(
            "No se recibió un trazado visual válido. Las indicaciones y distancias siguen disponibles.",
          );
      }
    } catch {
      setDrawingNotice(
        "No se pudieron dibujar las ubicaciones. Puedes seguir consultando los resultados de texto.",
      );
    }
    return () => {
      active = false;
      markers.forEach((m) => m.setMap(null));
      listeners.forEach((l) => l.remove());
      line?.setMap(null);
      renderer?.setMap(null);
    };
  }, [
    map,
    points,
    center,
    selectedId,
    route,
    routeEndpoints,
    travelMode,
    layoutKey,
  ]);
  return (
    <section
      className="atlas-interactive-map"
      aria-label="Mapa interactivo de ubicaciones"
    >
      <div
        ref={element}
        className="atlas-map-canvas"
        aria-label="Mapa de Google"
      />
      {status !== "ready" && (
        <div
          className="atlas-map-status"
          role={status === "error" ? "alert" : "status"}
        >
          {status === "loading" ? (
            <>
              <span className="atlas-map-skeleton" />
              Cargando mapa interactivo…
            </>
          ) : status === "empty" ? (
            <>
              <strong>El mapa necesita una ubicación.</strong>
              <p>
                Busca un lugar o selecciona un resultado con coordenadas
                válidas.
              </p>
            </>
          ) : (
            <>
              <strong>El mapa no está disponible.</strong>
              <p>
                Puedes seguir buscando y consultar las direcciones, rutas y
                resultados de texto.
              </p>
              <button
                className="atlas-button atlas-button-secondary"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Reintentar mapa
              </button>
            </>
          )}
        </div>
      )}
      {status === "ready" && (
        <button
          className="atlas-map-center"
          onClick={() => {
            const p =
              points.find((p) => p.id === selectedId)?.position ??
              center ??
              points[0]?.position;
            if (p) map?.panTo(p);
          }}
        >
          Centrar mapa
        </button>
      )}
      {drawingNotice && (
        <p className="atlas-map-drawing-notice" role="status">
          {drawingNotice}
        </p>
      )}
    </section>
  );
}
