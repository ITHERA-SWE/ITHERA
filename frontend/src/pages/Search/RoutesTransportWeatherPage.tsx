import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchIntegratedShell } from "./SearchIntegratedShell";
import { useSearchTrip } from "./useSearchTrip";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { groupsService } from "../../services/groups";
import {
  mapsService,
  type ComputeRouteResult,
  type GoogleLatLngLiteral,
  type PlaceAutocompleteResult,
} from "../../services/maps";
import type { Group } from "../../types/groups";
import { travelPath, withSearchTimeout } from "./search-data";
import { useGeoContext } from "./exploration/useGeoContext";
import { coordinates, numberText } from "./exploration/geo-data";
import { GeoInput, GeoNotice } from "./exploration/GeoControls";
import { InteractiveMap } from "./exploration/InteractiveMap";
import { WeatherPanel } from "./exploration/WeatherPanel";
import "./exploration/exploration.css";
const transports = [
  { id: "DRIVE", label: "Auto" },
  { id: "WALK", label: "Caminar" },
  { id: "TRANSIT", label: "Transporte público" },
] as const;
type Mode = (typeof transports)[number]["id"];
type Endpoint = { label: string; position: GoogleLatLngLiteral };
type SavedRoute = {
  data: ComputeRouteResult;
  origin: Endpoint;
  destination: Endpoint;
  mode: Mode;
};
function RoutesWorkspace({
  group,
  token,
  online,
  activityId,
  placeId,
}: {
  group: Group | null;
  token: string | null;
  online: boolean;
  activityId: string | null;
  placeId: string | null;
}) {
  const navigate = useNavigate(),
    context = useGeoContext(group, token);
  const [origin, setOrigin] = useState<string | null>(null),
    [originPoint, setOriginPoint] = useState<GoogleLatLngLiteral | null>(null),
    [originEdited, setOriginEdited] = useState(false);
  const [destination, setDestination] = useState(""),
    [destinationPoint, setDestinationPoint] =
      useState<GoogleLatLngLiteral | null>(null),
    [mode, setMode] = useState<Mode>("DRIVE");
  const [itinerary, setItinerary] = useState<
      Array<{ id: string; label: string; position: GoogleLatLngLiteral }>
    >([]),
    [targetLoading, setTargetLoading] = useState(false),
    [targetError, setTargetError] = useState(""),
    [targetRetry, setTargetRetry] = useState(0);
  const [result, setResult] = useState<SavedRoute | null>(null),
    [calculating, setCalculating] = useState(false),
    [error, setError] = useState(""),
    [resolving, setResolving] = useState(false),
    [weatherLocation, setWeatherLocation] = useState("base");
  const life = useRef(true),
    generation = useRef(0),
    lock = useRef(false),
    destEdited = useRef(false),
    endpointGeneration = useRef({ origin: 0, destination: 0 });
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setTargetLoading(true);
    setTargetError("");
    const load = async () => {
      if (!token) {
        setTargetLoading(false);
        return;
      }
      let options: Array<{
        id: string;
        label: string;
        position: GoogleLatLngLiteral;
      }> = [];
      if (group)
        try {
          const r = await withSearchTimeout(
            groupsService.getItinerary(String(group.id), token),
            12000,
          );
          options = r.days
            .flatMap((d) => d.activities)
            .flatMap((a) => {
              const p = coordinates(a);
              return p
                ? [
                    {
                      id: String(a.id),
                      label: a.title || a.location || "Actividad",
                      position: p,
                    },
                  ]
                : [];
            });
          if (active) setItinerary(options);
        } catch (e) {
          if (active)
            setTargetError(
              e instanceof Error
                ? e.message
                : "No se pudieron consultar las ubicaciones del itinerario.",
            );
        }
      if (activityId) {
        const activity = options.find((a) => a.id === activityId);
        if (active && !destEdited.current) {
          if (activity) {
            setDestination(activity.label);
            setDestinationPoint(activity.position);
          } else
            setTargetError(
              "La actividad no está disponible con coordenadas en este viaje. Puedes indicar otro destino.",
            );
        }
      } else if (placeId)
        try {
          const r = await withSearchTimeout(
            mapsService.getPlaceDetails(placeId, token),
            12000,
          );
          const p = coordinates(r.data);
          if (!p)
            throw new Error(
              "El lugar no incluye coordenadas para calcular una ruta.",
            );
          if (active && !destEdited.current) {
            setDestination(
              r.data?.name || r.data?.formattedAddress || "Lugar seleccionado",
            );
            setDestinationPoint(p);
          }
        } catch (e) {
          if (active)
            setTargetError(
              e instanceof Error
                ? e.message
                : "No se pudo abrir la ubicación elegida.",
            );
        }
      if (active) setTargetLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [group, token, activityId, placeId, targetRetry]);
  const start = originPoint ?? (!originEdited ? context.position : null),
    originLabel = origin ?? context.label;
  const clearRoute = () => {
    generation.current++;
    setResult(null);
    setError("");
  };
  const select = async (
    s: PlaceAutocompleteResult,
    target: "origin" | "destination",
  ) => {
    if (!token || !online) return;
    const request = ++endpointGeneration.current[target];
    setResolving(true);
    setError("");
    clearRoute();
    try {
      const r = await withSearchTimeout(
        mapsService.getPlaceDetails(s.placeId, token),
        12000,
      );
      const p = coordinates(r.data);
      if (!p) throw new Error("La selección no incluye coordenadas válidas.");
      if (!life.current || request !== endpointGeneration.current[target])
        return;
      if (target === "origin") {
        setOrigin(s.description);
        setOriginEdited(true);
        setOriginPoint(p);
      } else {
        destEdited.current = true;
        setDestination(s.description);
        setDestinationPoint(p);
      }
    } catch (e) {
      if (life.current && request === endpointGeneration.current[target])
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo seleccionar la ubicación.",
        );
    } finally {
      if (life.current && request === endpointGeneration.current[target])
        setResolving(false);
    }
  };
  const calculate = async () => {
    if (
      !token ||
      !online ||
      !originLabel.trim() ||
      !destination.trim() ||
      lock.current ||
      resolving
    )
      return;
    lock.current = true;
    const request = ++generation.current;
    setCalculating(true);
    setError("");
    setResult(null);
    try {
      const a =
        start ??
        coordinates(
          (
            await withSearchTimeout(
              mapsService.searchDestination(originLabel.trim(), token),
              12000,
            )
          ).data,
        );
      const b =
        destinationPoint ??
        coordinates(
          (
            await withSearchTimeout(
              mapsService.searchDestination(destination.trim(), token),
              12000,
            )
          ).data,
        );
      if (!a || !b)
        throw new Error(
          "No se pudieron resolver un origen y destino válidos. Revisa las direcciones.",
        );
      const r = await withSearchTimeout(
        mapsService.computeRoute(
          {
            originLat: a.lat,
            originLng: a.lng,
            destinationLat: b.lat,
            destinationLng: b.lng,
            travelMode: mode,
          },
          token,
        ),
        15000,
      );
      if (!r.data)
        throw new Error(
          "No se recibió una ruta para esas ubicaciones y ese medio de transporte.",
        );
      if (!life.current || request !== generation.current) return;
      setOriginPoint(a);
      setDestinationPoint(b);
      setResult({
        data: r.data,
        origin: { label: originLabel, position: a },
        destination: { label: destination, position: b },
        mode,
      });
    } catch (e) {
      if (life.current && request === generation.current)
        setError(
          e instanceof Error ? e.message : "No se pudo calcular la ruta.",
        );
    } finally {
      lock.current = false;
      if (life.current) setCalculating(false);
    }
  };
  const points = useMemo(
    () => [
      ...(start
        ? [{ id: "origin", label: `Origen: ${originLabel}`, position: start }]
        : []),
      ...(destinationPoint
        ? [
            {
              id: "destination",
              label: `Destino: ${destination}`,
              position: destinationPoint,
            },
          ]
        : []),
    ],
    [start, originLabel, destinationPoint, destination],
  );
  const endpoints = useMemo(
    () =>
      result
        ? {
            origin: result.origin.position,
            destination: result.destination.position,
          }
        : null,
    [result],
  );
  const weatherPoint =
    weatherLocation === "origin"
      ? start
      : weatherLocation === "destination"
        ? destinationPoint
        : context.position;
  const weatherLabel =
    weatherLocation === "origin"
      ? originLabel
      : weatherLocation === "destination"
        ? destination
        : context.label;
  const external = result
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${result.origin.position.lat},${result.origin.position.lng}`)}&destination=${encodeURIComponent(`${result.destination.position.lat},${result.destination.position.lng}`)}&travelmode=${result.mode === "DRIVE" ? "driving" : result.mode === "WALK" ? "walking" : "transit"}`
    : null;
  return (
    <div className="atlas-geo-page atlas-routes-page">
      <header className="atlas-geo-heading">
        <div>
          <p className="atlas-eyebrow">EXPLORAR / RUTAS Y CLIMA</p>
          <h1>
            Conoce el camino.
            <br />
            <em>Prepara tu próxima parada.</em>
          </h1>
          <p>
            Traslados y condiciones del destino, en el contexto de tu viaje.
          </p>
        </div>
        {group && (
          <button
            className="atlas-text-link"
            onClick={() =>
              navigate(travelPath("/dashboard", group.id, { tab: "inicio" }))
            }
          >
            Volver al itinerario ↗
          </button>
        )}
      </header>
      {!online && (
        <GeoNotice>
          Sin conexión. Reconecta para calcular rutas y actualizar el clima.
        </GeoNotice>
      )}
      {context.loading && (
        <p role="status" className="atlas-geo-context">
          Verificando punto de partida del viaje…
        </p>
      )}
      {context.error && (
        <GeoNotice>
          {context.error}
          <button className="atlas-text-link" onClick={context.retry}>
            Reintentar ubicación
          </button>
        </GeoNotice>
      )}
      <div className="atlas-route-layout">
        <div className="atlas-route-planner">
          <p className="atlas-eyebrow">DEL PUNTO A / AL PUNTO B</p>
          <h2>Una ruta con sentido.</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void calculate();
            }}
          >
            <fieldset disabled={calculating || resolving || !online}>
              <GeoInput
                id="atlas-route-origin"
                label="Origen"
                value={originLabel}
                onChange={(v) => {
                  endpointGeneration.current.origin++;
                  setResolving(false);
                  setOrigin(v);
                  setOriginEdited(true);
                  setOriginPoint(null);
                  clearRoute();
                }}
                onSelect={(s) => void select(s, "origin")}
                token={token}
                position={context.position}
                placeholder="Una dirección o punto de partida"
              />
              <GeoInput
                id="atlas-route-destination"
                label="Destino"
                value={destination}
                onChange={(v) => {
                  endpointGeneration.current.destination++;
                  setResolving(false);
                  destEdited.current = true;
                  setDestination(v);
                  setDestinationPoint(null);
                  clearRoute();
                }}
                onSelect={(s) => void select(s, "destination")}
                token={token}
                position={start}
                placeholder="Dónde quieres llegar"
              />
              <div
                className="atlas-route-modes"
                role="group"
                aria-label="Medio de transporte"
              >
                {transports.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    aria-pressed={mode === t.id}
                    onClick={() => {
                      setMode(t.id);
                      clearRoute();
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              className="atlas-button atlas-button-primary"
              disabled={
                !online ||
                calculating ||
                resolving ||
                !originLabel.trim() ||
                !destination.trim()
              }
            >
              {calculating
                ? "Calculando ruta…"
                : resolving
                  ? "Verificando ubicación…"
                  : "Calcular ruta"}
            </button>
          </form>
          {error && (
            <GeoNotice error>
              {error}
              <button
                className="atlas-text-link"
                disabled={!online || calculating}
                onClick={() => void calculate()}
              >
                Reintentar ruta
              </button>
            </GeoNotice>
          )}
          {targetLoading && (
            <p role="status">Consultando ubicaciones del itinerario…</p>
          )}
          {targetError && (
            <GeoNotice>
              {targetError}
              <button
                className="atlas-text-link"
                onClick={() => setTargetRetry((n) => n + 1)}
              >
                Reintentar ubicaciones
              </button>
            </GeoNotice>
          )}
          {itinerary.length > 0 && (
            <label
              className="atlas-route-activity"
              htmlFor="atlas-route-activity"
            >
              Usar una actividad como destino
              <select
                id="atlas-route-activity"
                value=""
                disabled={calculating}
                onChange={(e) => {
                  const a = itinerary.find((a) => a.id === e.target.value);
                  if (a) {
                    destEdited.current = true;
                    setDestination(a.label);
                    setDestinationPoint(a.position);
                    clearRoute();
                  }
                }}
              >
                <option value="">Elegir una ubicación del viaje</option>
                {itinerary.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="atlas-route-map">
          <InteractiveMap
            points={points}
            center={context.position}
            route={result?.data}
            routeEndpoints={endpoints}
            travelMode={result?.mode ?? mode}
          />
        </div>
      </div>
      {calculating && (
        <div
          className="atlas-geo-skeleton atlas-route-loading"
          role="status"
          aria-busy="true"
        >
          Consultando la ruta disponible…
          <span />
        </div>
      )}
      {result && (
        <section className="atlas-route-result" aria-label="Ruta calculada">
          <header>
            <div>
              <p className="atlas-eyebrow">
                RUTA RECIBIDA /{" "}
                {transports.find((t) => t.id === result.mode)?.label}
              </p>
              <h2>
                {result.origin.label} <span aria-hidden="true">→</span>{" "}
                {result.destination.label}
              </h2>
            </div>
            <dl>
              <div>
                <dt>Distancia</dt>
                <dd>
                  {result.data.distanceText ||
                    numberText(result.data.distanceMeters, " m")}
                </dd>
              </div>
              <div>
                <dt>Duración estimada</dt>
                <dd>
                  {result.data.durationText ||
                    result.data.staticDurationText ||
                    "No informada"}
                </dd>
              </div>
            </dl>
          </header>
          <p>
            Estimación recibida para la consulta; verifica las condiciones del
            traslado. No se informan costos ni alternativas en esta respuesta.
          </p>
          {result.data.steps?.length ? (
            <details>
              <summary>
                Ver indicaciones · {result.data.steps.length} tramo(s)
              </summary>
              <ol>
                {result.data.steps.map((step, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    <div>
                      <p>{step.instructions || "Indicación no informada"}</p>
                      {(step.distanceText || step.durationText) && (
                        <small>
                          {[step.distanceText, step.durationText]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <p>No se recibieron indicaciones por tramo.</p>
          )}
          {external && (
            <a
              className="atlas-text-link"
              href={external}
              target="_blank"
              rel="noreferrer"
            >
              Abrir trayecto en Google Maps ↗
            </a>
          )}
        </section>
      )}
      <div className="atlas-weather-location">
        <label htmlFor="atlas-weather-location">
          Ubicación del clima
          <select
            id="atlas-weather-location"
            value={weatherLocation}
            onChange={(e) => setWeatherLocation(e.target.value)}
          >
            <option value="base">Punto de partida del viaje</option>
            <option value="origin" disabled={!start}>
              Origen de la ruta
            </option>
            <option value="destination" disabled={!destinationPoint}>
              Destino de la ruta
            </option>
          </select>
        </label>
      </div>
      <WeatherPanel
        key={`${group?.id ?? "explore"}:${weatherLocation}`}
        position={weatherPoint}
        label={weatherLabel}
        token={token}
        online={online}
        tripDate={group?.fecha_inicio}
      />
    </div>
  );
}
export default function RoutesTransportWeatherPage() {
  const trip = useSearchTrip(),
    { accessToken, localUser } = useAuth(),
    online = useNetworkMonitor(),
    location = useLocation();
  const params = new URLSearchParams(location.search),
    activityId = params.get("activityId"),
    placeId = params.get("placeId");
  const user = {
    name: localUser?.nombre || localUser?.email || "Usuario",
    initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
    role: trip.group?.myRole === "admin" ? "Organizador" : "Viajero",
  };
  return (
    <SearchIntegratedShell group={trip.group} user={user}>
      {trip.loading ? (
        <div className="atlas-geo-page" role="status">
          Verificando viaje para consultar rutas…
        </div>
      ) : trip.error ? (
        <div className="atlas-geo-page">
          <GeoNotice error>
            {trip.error}
            <button onClick={trip.retry}>Reintentar viaje</button>
          </GeoNotice>
        </div>
      ) : (
        <RoutesWorkspace
          key={`${trip.groupId}:${activityId ?? ""}:${placeId ?? ""}`}
          group={trip.group}
          token={accessToken}
          online={online}
          activityId={activityId}
          placeId={placeId}
        />
      )}
    </SearchIntegratedShell>
  );
}
