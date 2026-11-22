import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIntegratedShell } from "./SearchIntegratedShell";
import { useSearchTrip } from "./useSearchTrip";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import {
  mapsService,
  type PlaceResult,
  type PlaceAutocompleteResult,
  type ComputeRouteResult,
  type GoogleLatLngLiteral,
} from "../../services/maps";
import type { Group } from "../../types/groups";
import { withSearchTimeout, travelPath } from "./search-data";
import { useGeoContext } from "./exploration/useGeoContext";
import { GeoInput, GeoNotice, PlacePhoto } from "./exploration/GeoControls";
import { InteractiveMap } from "./exploration/InteractiveMap";
import { PlaceProposal } from "./exploration/PlaceProposal";
import {
  coordinates,
  categoryName,
  nearbyResults,
  numberText,
  placeKey,
  placeUrl,
  safeUrl,
} from "./exploration/geo-data";
import { EditorialDialog } from "../../components/collaboration/EditorialDialog";
import "./exploration/exploration.css";
const categories = [
  { label: "Restaurantes", query: "restaurantes" },
  { label: "Museos", query: "museos" },
  { label: "Parques", query: "parques" },
  { label: "Atracciones", query: "atracciones populares" },
];
function PlaceFacts({ place }: { place: PlaceResult }) {
  const url = placeUrl(place);
  return (
    <>
      <p className="atlas-place-category">
        {categoryName(place.primaryCategory)}
      </p>
      <h2>{place.name || "Nombre no informado"}</h2>
      {place.formattedAddress && <p>{place.formattedAddress}</p>}
      <p className="atlas-place-rating">
        {typeof place.rating === "number"
          ? `★ ${numberText(place.rating)} / 5`
          : "Valoración no informada"}
        {typeof place.userRatingCount === "number"
          ? ` · ${place.userRatingCount} reseñas`
          : ""}
      </p>
      {place.editorialSummary && (
        <p className="atlas-place-description">{place.editorialSummary}</p>
      )}
      {url && (
        <a
          className="atlas-text-link"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir ubicación en Google Maps ↗
        </a>
      )}
    </>
  );
}
function PlacesWorkspace({
  group,
  token,
  online,
}: {
  group: Group | null;
  token: string | null;
  online: boolean;
}) {
  const navigate = useNavigate(),
    context = useGeoContext(group, token);
  const [query, setQuery] = useState(""),
    [scope, setScope] = useState<string | null>(null),
    [scopePoint, setScopePoint] = useState<GoogleLatLngLiteral | null>(null),
    [scopeDirty, setScopeDirty] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
      "idle",
    ),
    [error, setError] = useState(""),
    [lastSearch, setLastSearch] = useState("");
  const [category, setCategory] = useState("all"),
    [minimum, setMinimum] = useState(""),
    [view, setView] = useState("list"),
    [detail, setDetail] = useState(false),
    [proposing, setProposing] = useState(false),
    [savedDay, setSavedDay] = useState<number | null>(null);
  const [route, setRoute] = useState<ComputeRouteResult | null>(null),
    [routeError, setRouteError] = useState(""),
    [routeLoading, setRouteLoading] = useState(false),
    [routeRetry, setRouteRetry] = useState(0);
  const generation = useRef(0),
    life = useRef(true),
    operation = useRef(false);
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  const center = scopePoint ?? (!scopeDirty ? context.position : null);
  const records = useMemo(
    () =>
      places.map((place, index) => ({ place, key: placeKey(place, index) })),
    [places],
  );
  const filtered = useMemo(
    () =>
      records.filter(
        ({ place }) =>
          (category === "all" || place.primaryCategory === category) &&
          (!minimum ||
            (typeof place.rating === "number" &&
              place.rating >= Number(minimum))),
      ),
    [records, category, minimum],
  );
  const selected =
    filtered.find((p) => p.key === selectedId) ?? filtered[0] ?? null;
  const selectedPlace = selected?.place ?? null;
  const points = useMemo(
    () =>
      filtered.flatMap(({ place, key }) => {
        const position = coordinates(place);
        return position
          ? [
              {
                id: key,
                label: place.name || place.formattedAddress || "Lugar",
                position,
              },
            ]
          : [];
      }),
    [filtered],
  );
  useEffect(() => {
    let active = true;
    setRoute(null);
    setRouteError("");
    const dest = coordinates(selectedPlace);
    if (!dest || !center || !token || !online) {
      setRouteLoading(false);
      return;
    }
    setRouteLoading(true);
    void withSearchTimeout(
      mapsService.computeRoute(
        {
          originLat: center.lat,
          originLng: center.lng,
          destinationLat: dest.lat,
          destinationLng: dest.lng,
          travelMode: "DRIVE",
        },
        token,
      ),
      12000,
    )
      .then((r) => {
        if (active) {
          setRoute(r.data);
          if (!r.data) setRouteError("No se recibió una ruta para este lugar.");
        }
      })
      .catch(() => {
        if (active)
          setRouteError(
            "No se pudo calcular el traslado. El lugar y su dirección siguen disponibles.",
          );
      })
      .finally(() => {
        if (active) setRouteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPlace, center, token, online, routeRetry]);
  const selectSuggestion = async (s: PlaceAutocompleteResult) => {
    if (!token || !online) return;
    const id = ++generation.current;
    operation.current = false;
    setQuery(s.mainText || s.description);
    setState("loading");
    setError("");
    try {
      const r = await withSearchTimeout(
        mapsService.getPlaceDetails(s.placeId, token),
        15000,
      );
      if (!r.data) throw new Error("No se recibió el detalle del lugar.");
      if (life.current && id === generation.current) {
        setPlaces([r.data]);
        setSelectedId(placeKey(r.data));
        setState("ready");
        setCategory("all");
        setMinimum("");
        setLastSearch(s.description);
      }
    } catch (e) {
      if (life.current && id === generation.current) {
        setState("error");
        setError(e instanceof Error ? e.message : "No se pudo abrir el lugar.");
      }
    }
  };
  const search = async (text = query) => {
    if (!token || !online || !text.trim() || operation.current) return;
    operation.current = true;
    const id = ++generation.current;
    setState("loading");
    setError("");
    setPlaces([]);
    setSavedDay(null);
    try {
      let origin = center;
      const location = scope ?? context.label;
      if (scopeDirty && location.trim()) {
        const r = await withSearchTimeout(
          mapsService.searchDestination(location.trim(), token),
          12000,
        );
        origin = coordinates(r.data);
        if (!origin)
          throw new Error(
            "No se encontraron coordenadas para la ubicación indicada.",
          );
        if (life.current && id === generation.current) {
          setScopePoint(origin);
          setScopeDirty(false);
        }
      }
      if (!life.current || id !== generation.current) return;
      const clean = text.trim();
      const actualQuery =
        !origin && location ? `${clean} en ${location}` : clean;
      const r = await withSearchTimeout(
        mapsService.searchPlacesByText(
          {
            textQuery: actualQuery,
            latitude: origin?.lat,
            longitude: origin?.lng,
            radius: 50000,
            maxResultCount: 12,
          },
          token,
        ),
        15000,
      );
      if (!life.current || id !== generation.current) return;
      const items = nearbyResults(r.data ?? [], origin);
      setPlaces(items);
      setSelectedId(items.length ? placeKey(items[0]) : null);
      setLastSearch(`${clean}${location ? ` · ${location}` : ""}`);
      setCategory("all");
      setMinimum("");
      setState("ready");
    } catch (e) {
      if (life.current && id === generation.current) {
        setState("error");
        setError(
          e instanceof Error ? e.message : "No se pudieron buscar lugares.",
        );
      }
    } finally {
      if (id === generation.current) operation.current = false;
    }
  };
  const readOnly = Boolean(
    group &&
    (["finalizado", "cerrado", "archivado"].includes(group.estado ?? "") ||
      group.modulo_itinerario_bloqueado),
  );
  const canPropose = Boolean(
    group && token && online && !readOnly && selectedPlace?.name,
  );
  const goItinerary = (day?: number | null) =>
    group &&
    navigate(
      travelPath("/dashboard", group.id, {
        tab: "inicio",
        ...(day ? { day: String(day) } : {}),
      }),
    );
  return (
    <div className="atlas-geo-page atlas-places-page">
      <header className="atlas-geo-heading">
        <div>
          <p className="atlas-eyebrow">EXPLORAR / LUGARES</p>
          <h1>
            Encuentra el lugar.
            <br />
            <em>Imagina el momento.</em>
          </h1>
          <p>
            Restaurantes, cultura y espacios por descubrir
            {group?.destino ? ` en ${group.destino}` : ""}.
          </p>
        </div>
        {group && (
          <button className="atlas-text-link" onClick={() => goItinerary()}>
            Volver al itinerario ↗
          </button>
        )}
      </header>
      {!online && (
        <GeoNotice>
          Sin conexión. Los resultados ya recibidos se conservan; reconecta para
          buscar o proponer.
        </GeoNotice>
      )}
      {readOnly && (
        <GeoNotice>
          El viaje está en solo lectura o su itinerario está bloqueado. Puedes
          consultar lugares, sin proponer actividades.
        </GeoNotice>
      )}
      <form
        className="atlas-place-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <GeoInput
          id="atlas-place-query"
          label="Qué quieres descubrir"
          value={query}
          onChange={setQuery}
          onSelect={(s) => void selectSuggestion(s)}
          token={token}
          position={center}
          disabled={!online}
          placeholder="Un museo, una playa, un restaurante…"
        />
        <GeoInput
          id="atlas-place-scope"
          label="Ubicación de búsqueda"
          value={scope ?? context.label}
          onChange={(v) => {
            generation.current++;
            operation.current = false;
            setScope(v);
            setScopePoint(null);
            setScopeDirty(true);
            setPlaces([]);
            setState("idle");
          }}
          onSelect={(s) => {
            generation.current++;
            operation.current = false;
            setScope(s.description);
            setScopeDirty(true);
            setScopePoint(null);
            setPlaces([]);
            setState("idle");
          }}
          token={token}
          position={center}
          disabled={!online}
          placeholder="Destino o dirección"
        />
        <button
          className="atlas-button atlas-button-primary"
          disabled={!online || !query.trim() || state === "loading"}
        >
          {state === "loading" ? "Buscando lugares…" : "Explorar lugares"}
        </button>
      </form>
      <div className="atlas-place-quick" aria-label="Búsquedas por categoría">
        {categories.map((c) => (
          <button
            key={c.query}
            disabled={!online || state === "loading"}
            onClick={() => {
              setQuery(c.query);
              void search(c.query);
            }}
          >
            {c.label} ↗
          </button>
        ))}
      </div>
      {context.loading && (
        <p className="atlas-geo-context" role="status">
          Verificando punto de partida…
        </p>
      )}
      {context.error && (
        <GeoNotice>
          {context.error}{" "}
          <button className="atlas-text-link" onClick={context.retry}>
            Reintentar ubicación
          </button>
        </GeoNotice>
      )}
      {savedDay && (
        <GeoNotice>
          Lugar enviado al itinerario. Consulta su estado en el viaje.{" "}
          <button
            className="atlas-text-link"
            onClick={() => goItinerary(savedDay)}
          >
            Ver día {savedDay} ↗
          </button>
        </GeoNotice>
      )}
      <div className="atlas-place-toolbar">
        <span role="status">
          {state === "ready"
            ? `${filtered.length} de ${places.length} lugar(es)`
            : "Exploración del destino"}
        </span>
        <label htmlFor="atlas-place-category">
          Categoría
          <select
            id="atlas-place-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todas las recibidas</option>
            {[
              ...new Set(
                places.flatMap((p) =>
                  p.primaryCategory ? [p.primaryCategory] : [],
                ),
              ),
            ].map((c) => (
              <option key={c} value={c}>
                {categoryName(c)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="atlas-place-rating">
          Valoración mínima
          <select
            id="atlas-place-rating"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="4">4 / 5</option>
            <option value="4.5">4.5 / 5</option>
          </select>
        </label>
        <div className="atlas-place-view">
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Lista
          </button>
          <button aria-pressed={view === "map"} onClick={() => setView("map")}>
            Mapa
          </button>
        </div>
      </div>
      <div className="atlas-geo-layout" data-view={view}>
        <section
          className="atlas-place-list"
          aria-label="Resultados de lugares"
        >
          {lastSearch && state === "ready" && (
            <p className="atlas-results-origin">Resultados de {lastSearch}</p>
          )}
          {state === "loading" ? (
            <div className="atlas-geo-skeleton" role="status" aria-busy="true">
              Buscando lugares…
              {[1, 2, 3].map((n) => (
                <span key={n} />
              ))}
            </div>
          ) : state === "error" ? (
            <GeoNotice error>
              {error}
              <button
                className="atlas-text-link"
                disabled={!online}
                onClick={() => void search()}
              >
                Reintentar búsqueda
              </button>
            </GeoNotice>
          ) : filtered.length === 0 ? (
            <div className="atlas-geo-empty">
              <h2>
                {state === "idle"
                  ? "El próximo descubrimiento comienza aquí."
                  : places.length
                    ? "No hay lugares con estos filtros."
                    : "No se recibieron lugares para esta búsqueda."}
              </h2>
              <p>
                {state === "idle"
                  ? "Escribe un lugar o elige una categoría para explorar el destino."
                  : "Prueba otra consulta o amplía los filtros. No se muestran resultados de sustitución."}
              </p>
              {places.length > 0 && (
                <button
                  className="atlas-text-link"
                  onClick={() => {
                    setCategory("all");
                    setMinimum("");
                  }}
                >
                  Quitar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map(({ place, key }, i) => (
              <article
                className={`atlas-place-result ${selected?.key === key ? "is-selected" : ""}`}
                key={key}
              >
                <button
                  className="atlas-place-result-select"
                  aria-pressed={selected?.key === key}
                  onClick={() => {
                    setSelectedId(key);
                    setSavedDay(null);
                  }}
                >
                  <PlacePhoto src={safeUrl(place.photoUrl)} name={place.name} />
                  <div>
                    <span className="atlas-place-number">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {categoryName(place.primaryCategory)}
                    </span>
                    <h2>{place.name || "Nombre no informado"}</h2>
                    {place.formattedAddress && <p>{place.formattedAddress}</p>}
                    <small>
                      {typeof place.rating === "number"
                        ? `★ ${numberText(place.rating)} / 5`
                        : "Valoración no informada"}
                      {typeof place.userRatingCount === "number"
                        ? ` · ${place.userRatingCount} reseñas`
                        : ""}
                    </small>
                  </div>
                </button>
                <div className="atlas-place-result-tools">
                  <button
                    className="atlas-text-link"
                    onClick={() => {
                      setSelectedId(key);
                      setDetail(true);
                    }}
                  >
                    Detalles
                  </button>
                  <button
                    className="atlas-text-link"
                    disabled={!coordinates(place)}
                    onClick={() => {
                      setSelectedId(key);
                      setView("map");
                    }}
                  >
                    Ver en mapa
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <div className="atlas-map-column">
          <InteractiveMap
            points={points}
            center={center}
            selectedId={selected?.key}
            onSelect={(id) => {
              setSelectedId(id);
              setView("map");
            }}
            layoutKey={view}
          />
          {selectedPlace && (
            <section
              className="atlas-selected-place"
              aria-label="Lugar seleccionado"
            >
              <PlaceFacts place={selectedPlace} />
              <div className="atlas-place-transfer">
                <p>
                  {routeLoading
                    ? "Consultando traslado desde el punto de partida…"
                    : route
                      ? `${route.distanceText || "Distancia no informada"} · ${route.durationText || route.staticDurationText || "Duración no informada"}`
                      : !coordinates(selectedPlace)
                        ? "El lugar no incluye coordenadas para calcular un traslado."
                        : "Sin traslado calculado."}
                </p>
                {routeError && (
                  <GeoNotice>
                    {routeError}{" "}
                    <button
                      className="atlas-text-link"
                      disabled={!online}
                      onClick={() => setRouteRetry((n) => n + 1)}
                    >
                      Reintentar traslado
                    </button>
                  </GeoNotice>
                )}
              </div>
              <div className="atlas-place-selected-actions">
                <button
                  className="atlas-button atlas-button-primary"
                  disabled={!canPropose}
                  onClick={() => {
                    setDetail(false);
                    setProposing(true);
                  }}
                >
                  Proponer al itinerario
                </button>
                <button
                  className="atlas-text-link"
                  onClick={() => setDetail(true)}
                >
                  Información del lugar ↗
                </button>
                {coordinates(selectedPlace) && group && selectedPlace.id && (
                  <button
                    className="atlas-text-link"
                    onClick={() =>
                      navigate(
                        travelPath("/search/routes-weather", group.id, {
                          placeId: selectedPlace.id!,
                        }),
                      )
                    }
                  >
                    Consultar ruta y clima ↗
                  </button>
                )}
              </div>
              {!group && (
                <small>Selecciona un viaje para enviar propuestas.</small>
              )}
            </section>
          )}
        </div>
      </div>
      {detail && selectedPlace && (
        <EditorialDialog
          title="Detalle del lugar"
          onClose={() => setDetail(false)}
        >
          <div className="atlas-place-detail">
            <PlacePhoto
              src={safeUrl(selectedPlace.photoUrl)}
              name={selectedPlace.name}
            />
            <PlaceFacts place={selectedPlace} />
            {selectedPlace.regularOpeningHours?.weekdayDescriptions?.length ? (
              <section>
                <h3>Horarios informados</h3>
                {selectedPlace.regularOpeningHours.weekdayDescriptions.map(
                  (h, i) => (
                    <p key={i}>{h}</p>
                  ),
                )}
              </section>
            ) : (
              <p>No se recibieron horarios de atención.</p>
            )}
            {(selectedPlace.nationalPhoneNumber ||
              selectedPlace.internationalPhoneNumber) && (
              <p>
                Teléfono:{" "}
                {selectedPlace.nationalPhoneNumber ||
                  selectedPlace.internationalPhoneNumber}
              </p>
            )}
            {safeUrl(selectedPlace.websiteUri) && (
              <a
                className="atlas-text-link"
                href={safeUrl(selectedPlace.websiteUri)!}
                target="_blank"
                rel="noreferrer"
              >
                Sitio web del lugar ↗
              </a>
            )}
            {selectedPlace.priceLevel && (
              <p>
                Nivel de precios informado:{" "}
                {categoryName(selectedPlace.priceLevel)}
              </p>
            )}
            <button
              className="atlas-button atlas-button-primary"
              disabled={!canPropose}
              onClick={() => {
                setDetail(false);
                setProposing(true);
              }}
            >
              Proponer al itinerario
            </button>
          </div>
        </EditorialDialog>
      )}
      {proposing && selectedPlace && group && token && (
        <PlaceProposal
          key={selected?.key}
          place={selectedPlace}
          group={group}
          token={token}
          online={online}
          route={route}
          onClose={() => setProposing(false)}
          onSaved={(day) => {
            setProposing(false);
            setSavedDay(day);
          }}
        />
      )}
    </div>
  );
}
export default function MapPlacesPage() {
  const trip = useSearchTrip(),
    { accessToken, localUser } = useAuth(),
    online = useNetworkMonitor();
  const user = {
    name: localUser?.nombre || localUser?.email || "Usuario",
    initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
    role: trip.group?.myRole === "admin" ? "Organizador" : "Viajero",
  };
  return (
    <SearchIntegratedShell group={trip.group} user={user}>
      {trip.loading ? (
        <div className="atlas-geo-page" role="status">
          Verificando viaje para explorar…
        </div>
      ) : trip.error ? (
        <div className="atlas-geo-page">
          <GeoNotice error>
            {trip.error}
            <button onClick={trip.retry}>Reintentar viaje</button>
          </GeoNotice>
        </div>
      ) : (
        <PlacesWorkspace
          key={trip.groupId}
          group={trip.group}
          token={accessToken}
          online={online}
        />
      )}
    </SearchIntegratedShell>
  );
}
