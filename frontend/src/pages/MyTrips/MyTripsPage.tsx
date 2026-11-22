import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { useSocket } from "../../hooks/useSocket";
import { groupsService, saveCurrentGroup } from "../../services/groups";
import { isNetworkError } from "../../services/apiClient";
import type { GroupHistoryItem } from "../../types/groups";
import {
  TripAccessLayout,
  TripCompass,
  TripNotice,
} from "../../components/trips/TripAccessLayout";
import { TripCover } from "../../components/trips/TripCover";
import {
  normalizedText,
  orderTrips,
  roleLabel,
  statusLabel,
  todayInMexico,
  tripDateRange,
  tripSection,
  tripSections,
  uniqueTrips,
  type TripSection,
} from "../../components/trips/trip-data";
import { withSearchTimeout, travelPath } from "../Search/search-data";
export function MyTripsPage() {
  const { accessToken, localUser } = useAuth(),
    online = useNetworkMonitor(),
    { socket } = useSocket(accessToken),
    navigate = useNavigate(),
    location = useLocation();
  const [items, setItems] = useState<GroupHistoryItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [filter, setFilter] = useState<TripSection | "all">("all"),
    [query, setQuery] = useState(""),
    [order, setOrder] = useState<"date" | "name">("date");
  const version = useRef(0);
  const fetchTrips = useCallback(async () => {
    if (!accessToken) return;
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const data = await withSearchTimeout(
        groupsService.getMyHistory(accessToken),
        15000,
      );
      if (request === version.current)
        setItems(
          uniqueTrips([...(data.activos ?? []), ...(data.pasados ?? [])]),
        );
    } catch (e) {
      if (request === version.current)
        setError(
          isNetworkError(e)
            ? "Sin conexión. Tus viajes volverán a actualizarse cuando puedas reconectar."
            : e instanceof Error
              ? e.message
              : "No se pudieron cargar tus viajes.",
        );
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [accessToken]);
  useEffect(() => {
    void fetchTrips();
    const invalidate = () => {
      version.current++;
    };
    return invalidate;
  }, [fetchTrips]);
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      if (navigator.onLine) void fetchTrips();
    };
    const dashboard = (p: { tipo?: string }) => {
      if (/grupo|solicitud_union|miembro|viaje/.test(p?.tipo ?? "")) refresh();
    };
    socket.on("dashboard_updated", dashboard);
    for (const event of [
      "group_members_updated",
      "group_deleted",
      "notification_created",
    ])
      socket.on(event, refresh);
    return () => {
      socket.off("dashboard_updated", dashboard);
      for (const event of [
        "group_members_updated",
        "group_deleted",
        "notification_created",
      ])
        socket.off(event, refresh);
    };
  }, [socket, fetchTrips]);
  useEffect(() => {
    const reconnect = () => void fetchTrips();
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [fetchTrips]);
  const selectedFilter = location.hash === "#viajes-pasados" ? "past" : filter,
    today = todayInMexico();
  const visible = useMemo(
    () =>
      orderTrips(
        items.filter((item) => {
          const g = item.grupos_viaje;
          return (
            (selectedFilter === "all" ||
              tripSection(g, today) === selectedFilter) &&
            normalizedText(
              `${g.nombre} ${g.destino_formatted_address || g.destino || ""}`,
            ).includes(normalizedText(query.trim()))
          );
        }),
        order,
        today,
      ),
    [items, selectedFilter, query, order, today],
  );
  const changeFilter = (id: TripSection | "all") => {
    setFilter(id);
    if (location.hash) navigate("/my-trips", { replace: true });
  };
  const open = (item: GroupHistoryItem) => {
    try {
      saveCurrentGroup({ ...item.grupos_viaje, myRole: item.rol });
    } catch {
      /* El identificador de URL permite verificar el viaje aunque el almacenamiento no esté disponible. */
    }
    navigate(
      travelPath("/dashboard", item.grupos_viaje.id, { tab: "resumen" }),
    );
  };
  const firstName = localUser?.nombre?.trim().split(/\s+/)[0] || "viajero";
  return (
    <TripAccessLayout>
      <div className="atlas-my-trips">
        <header className="atlas-collection-heading">
          <div>
            <p className="atlas-access-eyebrow">TU ATLAS PERSONAL / ITHERA</p>
            <p className="atlas-trip-greeting">Hola, {firstName}.</p>
            <h1>
              Un destino en mente.
              <br />
              <em>Un viaje por escribir.</em>
            </h1>
            <p>Tu colección de planes, lugares y experiencias compartidas.</p>
          </div>
          <div className="atlas-collection-actions">
            <Link className="atlas-access-button is-primary" to="/create-group">
              Crear viaje <span aria-hidden="true">↗</span>
            </Link>
            <Link className="atlas-access-button" to="/join-group">
              Unirme a un viaje
            </Link>
          </div>
        </header>
        {!online && (
          <TripNotice>
            Sin conexión. Puedes revisar los viajes que ya se cargaron; para
            actualizar o crear uno necesitas reconectar.
          </TripNotice>
        )}
        {error && (
          <TripNotice error>
            {error}
            <button
              className="atlas-access-link"
              disabled={!online || loading}
              onClick={() => void fetchTrips()}
            >
              Reintentar carga
            </button>
          </TripNotice>
        )}
        <div className="atlas-collection-tools">
          <div
            className="atlas-trip-filters"
            role="group"
            aria-label="Filtrar viajes"
          >
            {[
              { id: "all", label: "Todos" },
              ...tripSections.map((s) => ({ id: s.id, label: s.label })),
            ].map((s) => (
              <button
                key={s.id}
                aria-pressed={selectedFilter === s.id}
                onClick={() => changeFilter(s.id as TripSection | "all")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="atlas-collection-search">
            <label htmlFor="trip-collection-query">
              Buscar en mis viajes
              <input
                id="trip-collection-query"
                type="search"
                placeholder="Nombre o destino"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label htmlFor="trip-collection-order">
              Ordenar
              <select
                id="trip-collection-order"
                value={order}
                onChange={(e) => setOrder(e.target.value as "date" | "name")}
              >
                <option value="date">Por fecha</option>
                <option value="name">Por nombre</option>
              </select>
            </label>
          </div>
        </div>
        {loading && items.length === 0 ? (
          <div
            className="atlas-trip-gallery-skeleton"
            role="status"
            aria-busy="true"
          >
            Cargando tus viajes…
            <div>
              {[1, 2, 3].map((i) => (
                <span key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {loading && (
              <p className="atlas-trip-updating" role="status">
                Actualizando viajes…
              </p>
            )}
            {!error && items.length === 0 ? (
              <section className="atlas-collection-empty">
                <div>
                  <p className="atlas-access-eyebrow">EL PRIMER CAPÍTULO</p>
                  <h2>
                    Los mejores planes
                    <br />
                    empiezan con una idea.
                  </h2>
                  <p>
                    Elige un destino y reúne a tu grupo. Si ya te invitaron,
                    puedes comenzar con el código del viaje.
                  </p>
                  <div>
                    <Link
                      to="/create-group"
                      className="atlas-access-button is-primary"
                    >
                      Crear mi primer viaje ↗
                    </Link>
                    <Link to="/join-group" className="atlas-access-link">
                      Tengo una invitación
                    </Link>
                  </div>
                </div>
                <div className="atlas-empty-compass">
                  <TripCompass />
                  <span>Un lugar. Un grupo. Un plan.</span>
                </div>
              </section>
            ) : items.length > 0 && visible.length === 0 ? (
              <section className="atlas-collection-no-results">
                <h2>No hay viajes con esta selección.</h2>
                <p>Prueba otro nombre, destino o categoría.</p>
                <button
                  className="atlas-access-link"
                  onClick={() => {
                    setQuery("");
                    changeFilter("all");
                  }}
                >
                  Ver todos mis viajes
                </button>
              </section>
            ) : (
              tripSections.map((section) => {
                const trips = visible.filter(
                  (item) =>
                    tripSection(item.grupos_viaje, today) === section.id,
                );
                return (
                  trips.length > 0 && (
                    <section
                      key={section.id}
                      className="atlas-trip-section"
                      id={
                        section.id === "past"
                          ? "viajes-pasados"
                          : `trips-${section.id}`
                      }
                      aria-labelledby={`trip-section-${section.id}`}
                    >
                      <header>
                        <div>
                          <p className="atlas-access-eyebrow">
                            {String(trips.length).padStart(2, "0")} VIAJE
                            {trips.length !== 1 ? "S" : ""}
                          </p>
                          <h2 id={`trip-section-${section.id}`}>
                            {section.label}
                          </h2>
                          <p>{section.description}</p>
                        </div>
                      </header>
                      <div
                        className={`atlas-trip-gallery ${selectedFilter === "all" && section.id !== "past" ? "has-feature" : ""}`}
                      >
                        {trips.map((item) => {
                          const g = item.grupos_viaje,
                            role = roleLabel(item.rol);
                          return (
                            <article key={g.id} className="atlas-trip-tile">
                              <button
                                onClick={() => open(item)}
                                className="atlas-trip-open"
                                aria-label={`${section.id === "past" ? "Consultar" : "Abrir"} viaje ${g.nombre}`}
                              >
                                <TripCover
                                  src={g.destino_photo_url}
                                  destination={
                                    g.destino_formatted_address || g.destino
                                  }
                                />
                                <div className="atlas-trip-tile-content">
                                  <div className="atlas-trip-tile-meta">
                                    <span>{statusLabel(g.estado)}</span>
                                    {role && <span>{role}</span>}
                                  </div>
                                  <h3>{g.nombre}</h3>
                                  {(g.destino_formatted_address ||
                                    g.destino) && (
                                    <p className="atlas-trip-destination-label">
                                      {g.destino_formatted_address || g.destino}
                                    </p>
                                  )}
                                  <p className="atlas-trip-dates">
                                    {tripDateRange(g.fecha_inicio, g.fecha_fin)}
                                  </p>
                                  <div className="atlas-trip-tile-footer">
                                    {typeof g.memberCount === "number" && (
                                      <span>
                                        {g.memberCount} integrante
                                        {g.memberCount !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                    <span>
                                      {section.id === "past"
                                        ? "Consultar viaje"
                                        : "Abrir viaje"}{" "}
                                      <span aria-hidden="true">↗</span>
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )
                );
              })
            )}
          </>
        )}
        <footer className="atlas-trip-collection-footer">
          <span>ITHERA / PLANEAR JUNTOS</span>
          <p>Un espacio para las ideas que se convierten en viajes.</p>
        </footer>
      </div>
    </TripAccessLayout>
  );
}
