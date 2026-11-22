import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { groupsService, saveCurrentGroup } from "../../services/groups";
import { ApiError, isNetworkError } from "../../services/apiClient";
import type { Group, InvitePreview } from "../../types/groups";
import {
  TripAccessLayout,
  TripBack,
  TripCompass,
  TripNotice,
} from "../../components/trips/TripAccessLayout";
import { tripDateRange } from "../../components/trips/trip-data";
import { travelPath, withSearchTimeout } from "../Search/search-data";
function Invitation({
  code,
  invitationToken,
}: {
  code: string;
  invitationToken: string;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    { accessToken, localUser, loading: authLoading } = useAuth(),
    online = useNetworkMonitor();
  const [draft, setDraft] = useState(code),
    [codeError, setCodeError] = useState(""),
    [preview, setPreview] = useState<InvitePreview | null>(null),
    [loading, setLoading] = useState(Boolean(code)),
    [error, setError] = useState(""),
    [unavailable, setUnavailable] = useState(false),
    [retry, setRetry] = useState(0),
    [joining, setJoining] = useState(false),
    [joinError, setJoinError] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [joined, setJoined] = useState<Group | null>(null);
  const lock = useRef(false),
    life = useRef(true);
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setPreview(null);
      setError("");
      setUnavailable(false);
      if (!code) {
        setLoading(false);
        return;
      }
      if (!online) {
        setLoading(false);
        setError("Sin conexión. Reconecta para consultar esta invitación.");
        return;
      }
      setLoading(true);
      try {
        const r = await withSearchTimeout(
          groupsService.getInvitePreview(code, invitationToken || undefined),
          12000,
        );
        if (active) {
          if (!r.preview)
            throw new Error("No se recibió la información de la invitación.");
          setPreview(r.preview);
        }
      } catch (e) {
        if (active) {
          setError(
            isNetworkError(e)
              ? "Sin conexión. No se pudo consultar la invitación."
              : e instanceof Error
                ? e.message
                : "No se pudo consultar la invitación.",
          );
          setUnavailable(
            e instanceof ApiError && [400, 404, 410].includes(e.status),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [code, invitationToken, online, retry]);
  const changed = draft.trim().toUpperCase() !== code;
  const inspect = () => {
    const value = draft.trim().toUpperCase();
    if (!value) {
      setCodeError("Ingresa el código de invitación.");
      return;
    }
    setCodeError("");
    if (value === code) {
      setRetry((n) => n + 1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.set("code", value);
    params.delete("token");
    navigate({
      pathname: "/join-group",
      search: `?${params.toString()}`,
      hash: location.hash,
    });
  };
  const join = async () => {
    if (
      lock.current ||
      joined ||
      pending ||
      changed ||
      !preview?.canJoin ||
      !online ||
      authLoading
    )
      return;
    if (!accessToken || !localUser) {
      const redirect = location.pathname + location.search + location.hash;
      try {
        sessionStorage.setItem("ithera_post_login_redirect", redirect);
      } catch {
        /* El retorno también queda en la URL de login. */
      }
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    lock.current = true;
    setJoining(true);
    setJoinError("");
    try {
      const r = await groupsService.joinGroup(
        code,
        accessToken,
        invitationToken || undefined,
      );
      if (!life.current) return;
      if (r.group.requiresApproval) {
        setPending(true);
        setMessage(r.message || "La solicitud se envió al organizador.");
        return;
      }
      if (!r.group.id)
        throw new Error(
          "No se recibió el identificador del viaje. Consulta Mis viajes antes de volver a aceptar.",
        );
      setJoined(r.group);
      setMessage(r.message || "Ya formas parte del viaje.");
      try {
        saveCurrentGroup(r.group);
      } catch {
        /* La URL del viaje conserva su identificador. */
      }
    } catch (e) {
      if (life.current) {
        if (
          e instanceof ApiError &&
          e.payload?.code === "JOIN_REQUEST_PENDING"
        ) {
          setPending(true);
          setMessage(e.message);
        } else
          setJoinError(
            isNetworkError(e)
              ? "No se pudo confirmar la incorporación. Revisa Mis viajes antes de repetirla si la conexión se interrumpió."
              : e instanceof Error
                ? e.message
                : "No se pudo aceptar la invitación.",
          );
      }
    } finally {
      lock.current = false;
      if (life.current) setJoining(false);
    }
  };
  return (
    <div className="atlas-join-trip">
      <TripBack />
      <div className="atlas-join-layout">
        <header className="atlas-join-intro">
          <p className="atlas-access-eyebrow">UNIRSE A UN VIAJE / ITHERA</p>
          <h1>
            El plan se disfruta
            <br />
            <em>en compañía.</em>
          </h1>
          <p>
            Consulta tu invitación y encuentra tu lugar en el próximo viaje del
            grupo.
          </p>
          <div className="atlas-join-compass">
            <TripCompass />
            <span>
              Ideas compartidas.
              <br />
              Experiencias por vivir.
            </span>
          </div>
        </header>
        <section
          className="atlas-invitation-panel"
          aria-labelledby="trip-invitation-title"
        >
          <p className="atlas-access-eyebrow">TU ACCESO AL VIAJE</p>
          <h2 id="trip-invitation-title">Una invitación para comenzar.</h2>
          {!joined && !pending && (
            <form
              className="atlas-invitation-code"
              onSubmit={(e) => {
                e.preventDefault();
                inspect();
              }}
            >
              <label htmlFor="trip-invitation-code">Código de invitación</label>
              <div>
                <input
                  id="trip-invitation-code"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  disabled={joining}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Código que compartió el organizador"
                  aria-invalid={Boolean(codeError)}
                  aria-describedby={codeError ? "trip-code-error" : undefined}
                />
                <button
                  className="atlas-access-button"
                  disabled={!online || joining}
                  type="submit"
                >
                  Consultar
                </button>
              </div>
              {codeError && (
                <p
                  id="trip-code-error"
                  className="atlas-field-error"
                  role="alert"
                >
                  {codeError}
                </p>
              )}
            </form>
          )}
          {!online && (
            <TripNotice>
              Sin conexión. Reconecta para consultar o aceptar invitaciones.
            </TripNotice>
          )}
          {joined ? (
            <div className="atlas-invitation-granted">
              <p className="atlas-invitation-label is-granted">
                Acceso concedido
              </p>
              <h3>Ya eres parte del plan.</h3>
              <p role="status">{message}</p>
              <p>{joined.nombre}</p>
              <button
                className="atlas-access-button is-primary"
                onClick={() =>
                  navigate(
                    travelPath("/dashboard", joined.id, { tab: "resumen" }),
                  )
                }
              >
                Entrar al viaje ↗
              </button>
              <Link className="atlas-access-link" to="/my-trips">
                Mis viajes
              </Link>
            </div>
          ) : pending ? (
            <div className="atlas-invitation-pending">
              <p className="atlas-invitation-label is-pending">
                Solicitud pendiente
              </p>
              <h3>Tu solicitud está en camino.</h3>
              <TripNotice>
                {message} La incorporación requiere la aprobación del
                organizador.
              </TripNotice>
              <p>
                Podrás acceder cuando se apruebe. Consulta las notificaciones de
                tu cuenta para conocer la respuesta.
              </p>
              <Link className="atlas-access-button" to="/my-trips">
                Volver a Mis viajes
              </Link>
            </div>
          ) : changed ? (
            <TripNotice>
              Consulta el código actualizado para continuar.
            </TripNotice>
          ) : loading ? (
            <div
              className="atlas-invitation-skeleton"
              role="status"
              aria-busy="true"
            >
              Consultando invitación…
              <span />
              <span />
            </div>
          ) : error ? (
            <div>
              <p className="atlas-invitation-label">
                {unavailable
                  ? "Invitación no disponible"
                  : "No se pudo consultar"}
              </p>
              <TripNotice error>
                {error}
                {!unavailable && (
                  <button
                    className="atlas-access-link"
                    disabled={!online}
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    Reintentar consulta
                  </button>
                )}
              </TripNotice>
              <p>
                Verifica el enlace o solicita al organizador una invitación
                vigente. No se ha confirmado ningún acceso.
              </p>
            </div>
          ) : preview ? (
            <div className="atlas-invitation-detail">
              <p className="atlas-invitation-label">
                {preview.canJoin
                  ? "Invitación disponible"
                  : "Acceso no disponible"}
              </p>
              <h3>{preview.nombre}</h3>
              {preview.descripcion && <p>{preview.descripcion}</p>}
              <dl>
                {preview.destino && (
                  <div>
                    <dt>Destino</dt>
                    <dd>{preview.destino}</dd>
                  </div>
                )}
                <div>
                  <dt>Fechas</dt>
                  <dd>
                    {tripDateRange(preview.fecha_inicio, preview.fecha_fin)}
                  </dd>
                </div>
                {typeof preview.memberCount === "number" && (
                  <div>
                    <dt>Integrantes</dt>
                    <dd>
                      {preview.memberCount}
                      {typeof preview.maximo_miembros === "number"
                        ? ` de ${preview.maximo_miembros}`
                        : ""}
                    </dd>
                  </div>
                )}
              </dl>
              {!preview.canJoin ? (
                <TripNotice error>
                  {preview.cannotJoinReason === "GROUP_CAPACITY_REACHED"
                    ? "El viaje alcanzó su capacidad máxima. Consulta al organizador si puede habilitar más lugares."
                    : "Esta invitación no permite incorporarse en este momento. Consulta al organizador."}
                </TripNotice>
              ) : (
                <>
                  {preview.emailInvitation ? (
                    <TripNotice>
                      Esta invitación personal permite acceso directo, sujeto a
                      la verificación del correo invitado.
                      {localUser && preview.invitedEmail
                        ? ` Cuenta invitada: ${preview.invitedEmail}.`
                        : ""}{" "}
                      Conserva el enlace completo para utilizarla.
                    </TripNotice>
                  ) : preview.requiresApproval ? (
                    <TripNotice>
                      El viaje es privado. Al continuar enviarás una solicitud
                      de acceso al organizador.
                    </TripNotice>
                  ) : (
                    <p className="atlas-invitation-rule">
                      El viaje admite acceso directo mediante este código.
                    </p>
                  )}
                  {(!accessToken || !localUser) && !authLoading && (
                    <p>
                      Necesitas iniciar sesión para aceptar. El enlace se
                      conservará para que puedas regresar.
                    </p>
                  )}
                  {joinError && <TripNotice error>{joinError}</TripNotice>}
                  <button
                    className="atlas-access-button is-primary"
                    disabled={joining || !online || authLoading}
                    onClick={() => void join()}
                  >
                    {joining
                      ? "Procesando…"
                      : authLoading
                        ? "Verificando sesión…"
                        : !localUser || !accessToken
                          ? "Iniciar sesión para continuar"
                          : preview.emailInvitation
                            ? "Aceptar invitación personal"
                            : preview.requiresApproval
                              ? "Solicitar acceso"
                              : "Aceptar invitación"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="atlas-invitation-explanation">
              <p>
                Escribe el código que te compartieron. Si recibiste una
                invitación personal por correo, abre su enlace completo para
                conservar la verificación de esa invitación.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export function JoinGroupPage() {
  const [params] = useSearchParams(),
    { localUser } = useAuth();
  const code = params.get("code")?.trim().toUpperCase() || "",
    token = params.get("token")?.trim() || "";
  return (
    <TripAccessLayout>
      <Invitation
        key={`${code}:${token}:${localUser?.id_usuario ?? "public"}`}
        code={code}
        invitationToken={token}
      />
    </TripAccessLayout>
  );
}
