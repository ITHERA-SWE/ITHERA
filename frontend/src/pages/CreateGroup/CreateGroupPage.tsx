import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { groupsService, saveCurrentGroup } from "../../services/groups";
import { isNetworkError } from "../../services/apiClient";
import type { GeocodingResult } from "../../services/maps";
import type { Group, GroupInvitationResult } from "../../types/groups";
import {
  TripAccessLayout,
  TripBack,
  TripCompass,
  TripField,
  TripNotice,
} from "../../components/trips/TripAccessLayout";
import { TripDestination } from "../../components/trips/TripDestination";
import {
  addCivilDays,
  MAX_DURATION,
  todayInMexico,
  tripDateRange,
  validEmail,
  validateTrip,
  type CreateTripForm,
} from "../../components/trips/trip-data";
import { travelPath } from "../Search/search-data";
const initial: CreateTripForm = {
  name: "",
  destination: "",
  description: "",
  startDate: "",
  endDate: "",
  maxMembers: "10",
  totalBudget: "",
  isPublic: false,
};
export function CreateGroupPage() {
  const { accessToken } = useAuth(),
    online = useNetworkMonitor(),
    navigate = useNavigate();
  const [form, setForm] = useState<CreateTripForm>(initial),
    [geo, setGeo] = useState<GeocodingResult | null>(null),
    [destinationBusy, setDestinationBusy] = useState(false),
    [errors, setErrors] = useState<ReturnType<typeof validateTrip>>({}),
    [serverError, setServerError] = useState(""),
    [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(""),
    [members, setMembers] = useState<string[]>([]),
    [emailError, setEmailError] = useState(""),
    [capacityMessage, setCapacityMessage] = useState("");
  const [created, setCreated] = useState<Group | null>(null),
    [invitationResults, setInvitationResults] = useState<
      GroupInvitationResult[] | null
    >(null),
    [inviting, setInviting] = useState(false),
    [invitationError, setInvitationError] = useState(""),
    [copyMessage, setCopyMessage] = useState("");
  const createLock = useRef(false),
    inviteLock = useRef(false),
    life = useRef(true),
    summary = useRef<HTMLDivElement>(null),
    invitationTarget = useRef<{ groupId: string; emails: string[] } | null>(
      null,
    );
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
    };
  }, []);
  const today = todayInMexico(),
    slots = Math.max(Number(form.maxMembers || 1) - 1, 0);
  const setField = <K extends keyof CreateTripForm>(
    key: K,
    value: CreateTripForm[K],
  ) => {
    const next = { ...form, [key]: value };
    if (
      key === "startDate" &&
      next.endDate &&
      (next.endDate <= next.startDate ||
        next.endDate > addCivilDays(next.startDate, MAX_DURATION))
    )
      next.endDate = "";
    if (key === "maxMembers") {
      const max = Math.max(Number(value) - 1, 0);
      if (Number.isInteger(max) && max < members.length) {
        setMembers(members.slice(0, max));
        setCapacityMessage(
          `La lista se ajustó a ${max} invitación(es) para respetar la capacidad elegida.`,
        );
      }
    }
    setForm(next);
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "startDate" ? { endDate: undefined } : {}),
    }));
    setServerError("");
  };
  const addMember = () => {
    const value = email.trim().toLowerCase();
    if (!validEmail(value))
      return setEmailError("Escribe un correo electrónico válido.");
    if (members.includes(value))
      return setEmailError("Ese correo ya está en la lista.");
    if (members.length >= slots)
      return setEmailError(
        "La lista alcanzó la capacidad disponible del viaje.",
      );
    setMembers([...members, value]);
    setEmail("");
    setEmailError("");
  };
  const sendInvitations = async () => {
    const target = invitationTarget.current;
    if (!target || !accessToken || !online || inviteLock.current) return;
    inviteLock.current = true;
    if (life.current) {
      setInviting(true);
      setInvitationError("");
    }
    try {
      const r = await groupsService.sendInvitations(
        target.groupId,
        target.emails,
        accessToken,
      );
      if (life.current) setInvitationResults(r.invitations);
    } catch (e) {
      if (life.current)
        setInvitationError(
          isNetworkError(e)
            ? "El viaje ya está creado. No se pudo confirmar el envío de las invitaciones; revisa tu conexión antes de reintentar."
            : e instanceof Error
              ? e.message
              : "El viaje se creó, pero no se pudieron enviar las invitaciones.",
        );
    } finally {
      inviteLock.current = false;
      if (life.current) setInviting(false);
    }
  };
  const create = async () => {
    if (createLock.current || created) return;
    const validation = validateTrip(form);
    setErrors(validation);
    if (Object.keys(validation).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    if (!accessToken || !online || destinationBusy) {
      setServerError(
        !online
          ? "Sin conexión. Conservamos el formulario para que puedas continuar."
          : "Espera a que termine la selección del destino o verifica tu sesión.",
      );
      return;
    }
    createLock.current = true;
    setSaving(true);
    setServerError("");
    try {
      const r = await groupsService.createGroup(
        {
          nombre: form.name.trim(),
          descripcion: form.description.trim() || undefined,
          destino: form.destination.trim(),
          destino_latitud: geo?.latitude ?? null,
          destino_longitud: geo?.longitude ?? null,
          destino_place_id: geo?.placeId ?? null,
          destino_formatted_address: geo?.formattedAddress ?? null,
          fecha_inicio: form.startDate,
          fecha_fin: form.endDate,
          maximo_miembros: Number(form.maxMembers),
          es_publico: form.isPublic,
          presupuesto_total: Number(form.totalBudget),
        },
        accessToken,
      );
      if (!r.group?.id)
        throw new Error(
          "El servidor no devolvió el identificador del viaje. Revisa Mis viajes antes de intentar crearlo de nuevo.",
        );
      if (life.current) {
        setCreated(r.group);
        try {
          saveCurrentGroup(r.group);
        } catch {
          /* La navegación sigue usando el identificador verificado de la respuesta. */
        }
      }
      // Completa las invitaciones incluidas en el envío, sin cambiar el contexto de otra pantalla.
      if (members.length) {
        invitationTarget.current = {
          groupId: r.group.id,
          emails: [...members],
        };
        await sendInvitations();
      }
    } catch (e) {
      if (life.current)
        setServerError(
          isNetworkError(e)
            ? "No se pudo confirmar la creación. Revisa Mis viajes antes de reintentar si la conexión se interrumpió."
            : e instanceof Error
              ? e.message
              : "No se pudo crear el viaje.",
        );
    } finally {
      createLock.current = false;
      if (life.current) setSaving(false);
    }
  };
  const inputProps = (key: keyof CreateTripForm) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": `${`trip-${key}`}-hint${errors[key] ? ` trip-${key}-error` : ""}`,
  });
  return (
    <TripAccessLayout>
      <TripBack />
      {created ? (
        <section
          className="atlas-trip-created"
          aria-labelledby="trip-created-title"
        >
          <div className="atlas-trip-created-symbol">
            <TripCompass />
          </div>
          <p className="atlas-access-eyebrow">UN NUEVO CAPÍTULO</p>
          <h1 id="trip-created-title">
            Tu viaje ya tiene
            <br />
            <em>un punto de partida.</em>
          </h1>
          <TripNotice>Viaje creado correctamente: {created.nombre}.</TripNotice>
          <p>{created.destino_formatted_address || created.destino}</p>
          <p>{tripDateRange(created.fecha_inicio, created.fecha_fin)}</p>
          {created.codigo_invitacion && (
            <div className="atlas-created-code">
              <span>Código del viaje</span>
              <strong>{created.codigo_invitacion}</strong>
              <button
                className="atlas-access-link"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(created.codigo_invitacion)
                    .then(() => setCopyMessage("Código copiado."))
                    .catch(() =>
                      setCopyMessage(
                        "No se pudo copiar. Puedes seleccionar el código y copiarlo manualmente.",
                      ),
                    );
                  if (!navigator.clipboard)
                    setCopyMessage(
                      "Puedes seleccionar el código y copiarlo manualmente.",
                    );
                }}
              >
                Copiar código
              </button>
              <small role="status">{copyMessage}</small>
            </div>
          )}
          {inviting && (
            <TripNotice>
              El viaje está creado. Enviando las invitaciones que agregaste…
            </TripNotice>
          )}
          {invitationResults && (
            <TripNotice>
              {invitationResults.filter((i) => i.status === "created").length}{" "}
              invitación(es) generada(s).{" "}
              {
                invitationResults.filter((i) => i.status === "already_invited")
                  .length
              }{" "}
              correo(s) ya tenían invitación.{" "}
              {
                invitationResults.filter((i) => i.status === "existing_member")
                  .length
              }{" "}
              ya pertenecían al viaje.
            </TripNotice>
          )}
          {invitationError && (
            <TripNotice error>
              {invitationError}
              <button
                className="atlas-access-link"
                disabled={inviting || !online}
                onClick={() => void sendInvitations()}
              >
                Reintentar solo invitaciones
              </button>
              <p>
                El viaje no se volverá a crear. También puedes gestionarlas
                desde Personas.
              </p>
            </TripNotice>
          )}
          {!members.length && (
            <p>
              Comparte el código o invita a tus acompañantes desde el viaje.
            </p>
          )}
          <div className="atlas-trip-success-actions">
            <button
              className="atlas-access-button is-primary"
              onClick={() =>
                navigate(
                  travelPath("/dashboard", created.id, { tab: "resumen" }),
                )
              }
            >
              Abrir mi viaje ↗
            </button>
            <Link to="/my-trips" className="atlas-access-button">
              Mis viajes
            </Link>
          </div>
        </section>
      ) : (
        <div className="atlas-trip-create">
          <header className="atlas-access-heading">
            <p className="atlas-access-eyebrow">CREAR VIAJE / ITHERA</p>
            <h1>
              Todo empieza
              <br />
              <em>con un destino.</em>
            </h1>
            <p>Define lo esencial. El resto lo planean juntos.</p>
          </header>
          <div className="atlas-trip-create-layout">
            <form
              className="atlas-trip-create-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              {!online && (
                <TripNotice>
                  Sin conexión. Tu formulario permanece aquí; reconecta para
                  crear el viaje.
                </TripNotice>
              )}
              {serverError && (
                <TripNotice error>
                  {serverError}
                  <Link className="atlas-access-link" to="/my-trips">
                    Revisar mis viajes
                  </Link>
                </TripNotice>
              )}
              {Object.values(errors).some(Boolean) && (
                <div
                  ref={summary}
                  tabIndex={-1}
                  className="atlas-access-notice is-error"
                  role="alert"
                >
                  <strong>Revisa los campos indicados.</strong>
                  <ul>
                    {Object.entries(errors)
                      .filter(([, v]) => v)
                      .map(([key, message]) => (
                        <li key={key}>
                          <a
                            href={`#${key === "destination" ? "trip-destination" : `trip-${key}`}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document
                                .getElementById(
                                  key === "destination"
                                    ? "trip-destination"
                                    : `trip-${key}`,
                                )
                                ?.focus();
                            }}
                          >
                            {message}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <fieldset disabled={saving || !online}>
                <section className="atlas-trip-form-section">
                  <header>
                    <span>01</span>
                    <div>
                      <h2>El viaje que tienes en mente.</h2>
                      <p>Un nombre, un destino y una idea para compartir.</p>
                    </div>
                  </header>
                  <TripField
                    id="trip-name"
                    label="Nombre del viaje"
                    hint="Hasta 60 caracteres."
                    error={errors.name}
                  >
                    <input
                      id="trip-name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      maxLength={60}
                      placeholder="Cómo se llamará tu viaje"
                      required
                      {...inputProps("name")}
                    />
                  </TripField>
                  <TripDestination
                    value={form.destination}
                    token={accessToken}
                    disabled={saving || !online}
                    onBusy={setDestinationBusy}
                    onChange={(value, result) => {
                      setField("destination", value);
                      setGeo(result);
                    }}
                    error={errors.destination}
                  />
                  <TripField
                    id="trip-description"
                    label="Descripción · opcional"
                    hint="Hasta 300 caracteres."
                    error={errors.description}
                  >
                    <textarea
                      id="trip-description"
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      rows={3}
                      maxLength={300}
                      placeholder="Qué les gustaría vivir en este viaje"
                      {...inputProps("description")}
                    />
                  </TripField>
                </section>
                <section className="atlas-trip-form-section">
                  <header>
                    <span>02</span>
                    <div>
                      <h2>Hazle espacio en el calendario.</h2>
                      <p>
                        Salida y regreso en fechas futuras; hasta 60 días de
                        diferencia.
                      </p>
                    </div>
                  </header>
                  <div className="atlas-trip-form-row">
                    <TripField
                      id="trip-startDate"
                      label="Fecha de salida"
                      hint="Puede ser hoy o una fecha posterior."
                      error={errors.startDate}
                    >
                      <input
                        id="trip-startDate"
                        type="date"
                        value={form.startDate}
                        min={today}
                        onChange={(e) => setField("startDate", e.target.value)}
                        required
                        {...inputProps("startDate")}
                      />
                    </TripField>
                    <TripField
                      id="trip-endDate"
                      label="Fecha de regreso"
                      hint="Posterior a la salida."
                      error={errors.endDate}
                    >
                      <input
                        id="trip-endDate"
                        type="date"
                        value={form.endDate}
                        min={
                          form.startDate
                            ? addCivilDays(form.startDate, 1)
                            : today
                        }
                        max={
                          form.startDate
                            ? addCivilDays(form.startDate, MAX_DURATION)
                            : undefined
                        }
                        onChange={(e) => setField("endDate", e.target.value)}
                        required
                        {...inputProps("endDate")}
                      />
                    </TripField>
                  </div>
                </section>
                <section className="atlas-trip-form-section">
                  <header>
                    <span>03</span>
                    <div>
                      <h2>Las bases del plan.</h2>
                      <p>La capacidad incluye a quien organiza el viaje.</p>
                    </div>
                  </header>
                  <div className="atlas-trip-form-row">
                    <TripField
                      id="trip-maxMembers"
                      label="Máximo de integrantes"
                      hint="De 1 a 50 personas, incluyéndote."
                      error={errors.maxMembers}
                    >
                      <input
                        id="trip-maxMembers"
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={form.maxMembers}
                        onChange={(e) => setField("maxMembers", e.target.value)}
                        required
                        {...inputProps("maxMembers")}
                      />
                    </TripField>
                    <TripField
                      id="trip-totalBudget"
                      label="Presupuesto total · MXN"
                      hint="Obligatorio y positivo, sin separadores de miles; hasta 10 dígitos enteros y 2 decimales."
                      error={errors.totalBudget}
                    >
                      <input
                        id="trip-totalBudget"
                        type="text"
                        inputMode="decimal"
                        value={form.totalBudget}
                        onChange={(e) =>
                          setField("totalBudget", e.target.value)
                        }
                        maxLength={13}
                        placeholder="Monto definido por tu grupo"
                        required
                        {...inputProps("totalBudget")}
                      />
                    </TripField>
                  </div>
                  <p className="atlas-budget-explanation">
                    Este monto define el presupuesto inicial del viaje. Crear el
                    viaje no realiza ningún cobro.
                  </p>
                  <label className="atlas-trip-public">
                    <input
                      id="trip-public"
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setField("isPublic", e.target.checked)}
                    />
                    <span>
                      <strong>Permitir acceso directo con el código</strong>
                      <small>
                        Activado: quienes tienen el código entran sin
                        aprobación. Desactivado: las solicitudes requieren
                        aprobación del organizador. Las invitaciones personales
                        conservan sus propias reglas.
                      </small>
                    </span>
                  </label>
                </section>
                <section className="atlas-trip-form-section">
                  <header>
                    <span>04</span>
                    <div>
                      <h2>Mejor, en compañía.</h2>
                      <p>
                        Invitar ahora es opcional. También puedes hacerlo
                        después.
                      </p>
                    </div>
                  </header>
                  {capacityMessage && (
                    <TripNotice>{capacityMessage}</TripNotice>
                  )}
                  {slots > 0 ? (
                    <>
                      <label
                        className="atlas-invite-email-label"
                        htmlFor="trip-invite-email"
                      >
                        Correo de un acompañante
                      </label>
                      <div className="atlas-invite-email">
                        <input
                          id="trip-invite-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addMember();
                            }
                          }}
                          placeholder="correo@ejemplo.com"
                          aria-describedby={
                            emailError ? "trip-email-error" : undefined
                          }
                          aria-invalid={Boolean(emailError)}
                        />
                        <button
                          className="atlas-access-button"
                          type="button"
                          disabled={members.length >= slots}
                          onClick={addMember}
                        >
                          Agregar
                        </button>
                      </div>
                      {emailError && (
                        <p
                          id="trip-email-error"
                          className="atlas-field-error"
                          role="alert"
                        >
                          {emailError}
                        </p>
                      )}
                      <ul className="atlas-trip-emails">
                        {members.map((m) => (
                          <li key={m}>
                            <span>{m}</span>
                            <button
                              type="button"
                              aria-label={`Quitar ${m}`}
                              onClick={() =>
                                setMembers(
                                  members.filter((email) => email !== m),
                                )
                              }
                            >
                              Quitar ×
                            </button>
                          </li>
                        ))}
                      </ul>
                      <small>
                        Hasta {slots} invitación(es) según la capacidad. Al
                        crear el viaje se enviarán únicamente los correos
                        agregados a esta lista.
                      </small>
                    </>
                  ) : (
                    <p>
                      La capacidad elegida es de una persona. Puedes cambiarla
                      para invitar acompañantes.
                    </p>
                  )}
                </section>
              </fieldset>
              <div className="atlas-trip-form-submit">
                <p>Podrás seguir ajustando el plan dentro del viaje.</p>
                <button
                  className="atlas-access-button is-primary"
                  disabled={saving || destinationBusy || !online}
                  type="submit"
                >
                  {saving
                    ? "Creando viaje…"
                    : destinationBusy
                      ? "Verificando destino…"
                      : members.length
                        ? "Crear viaje e invitar ↗"
                        : "Crear viaje ↗"}
                </button>
              </div>
            </form>
            <aside className="atlas-trip-create-note">
              <TripCompass />
              <p className="atlas-access-eyebrow">
                DEL PRIMER PLAN / AL PRIMER RECUERDO
              </p>
              <h2>
                Un lugar para
                <br />
                planear juntos.
              </h2>
              <p>
                Después podrás explorar opciones, proponer actividades y decidir
                con tu grupo.
              </p>
              <ol>
                <li>Elige el destino.</li>
                <li>Reúne a tus acompañantes.</li>
                <li>Construyan el itinerario.</li>
              </ol>
            </aside>
          </div>
        </div>
      )}
    </TripAccessLayout>
  );
}
