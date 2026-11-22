import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/useAuth";
import {
  clearCurrentGroup,
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
} from "../../services/groups";
import type { Group } from "../../types/groups";
import { AccountTripNav } from "../../components/account/AccountTripNav";
import { AccountDialog } from "../../components/account/AccountDialog";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import {
  addCivilDays,
  todayInMexico,
  tripDateRange,
} from "../../components/trips/trip-data";
import "../../components/account/accounts-editorial.css";
import type { GeocodingResult } from "../../services/maps";

type SettingsForm = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxMembers: string;
  description: string;
  isPublic: boolean;
  itineraryLocked: boolean;
  budgetLocked: boolean;
};

function buildForm(group: Group): SettingsForm {
  return {
    name: group.nombre || "",
    destination: group.destino || "",
    startDate: group.fecha_inicio || "",
    endDate: group.fecha_fin || "",
    maxMembers: group.maximo_miembros ? String(group.maximo_miembros) : "10",
    description: group.descripcion || "",
    isPublic: group.es_publico === true,
    itineraryLocked: group.modulo_itinerario_bloqueado === true,
    budgetLocked: group.modulo_presupuesto_bloqueado === true,
  };
}

const GROUP_NAME_MAX_LENGTH = 60;
const GROUP_DESCRIPTION_MAX_LENGTH = 300;

const todayISO = todayInMexico;

function isClosedGroup(group?: Group | null) {
  return ["cerrado", "archivado", "finalizado"].includes(
    String(group?.estado ?? "").toLowerCase(),
  );
}

const addDaysISO = addCivilDays;

const getValidationError = (
  form: SettingsForm,
  currentGroup?: Group | null,
) => {
  const maxMembers = Number(form.maxMembers);
  const today = todayISO();
  const originalStartDate = currentGroup?.fecha_inicio ?? "";
  const originalEndDate = currentGroup?.fecha_fin ?? "";
  const startDateChanged = Boolean(
    form.startDate && form.startDate !== originalStartDate,
  );
  const endDateChanged = Boolean(
    form.endDate && form.endDate !== originalEndDate,
  );
  const tripAlreadyStarted = Boolean(
    originalStartDate && originalStartDate < today,
  );

  if (!form.name.trim()) return "El nombre del viaje es obligatorio.";
  if (form.name.trim().length > GROUP_NAME_MAX_LENGTH) {
    return `El nombre del viaje permite máximo ${GROUP_NAME_MAX_LENGTH} caracteres.`;
  }
  if (!form.destination.trim()) return "Selecciona un destino válido.";
  if (form.description.trim().length > GROUP_DESCRIPTION_MAX_LENGTH) {
    return `La descripción permite máximo ${GROUP_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  if (startDateChanged && tripAlreadyStarted) {
    return "No puedes cambiar la fecha de inicio de un viaje que ya comenzó. Solo puedes extender o ajustar la fecha de fin.";
  }
  if (startDateChanged && form.startDate < today) {
    return "La fecha de inicio no puede ser anterior a hoy.";
  }
  if (endDateChanged && form.endDate < today) {
    return "La fecha de fin no puede ser anterior a hoy.";
  }
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    return "La fecha final debe ser posterior a la inicial.";
  }
  if (
    form.startDate &&
    form.endDate &&
    form.endDate > addDaysISO(form.startDate, 60)
  )
    return "La duración máxima del viaje es de 60 días.";
  if (!Number.isInteger(maxMembers) || maxMembers < 1 || maxMembers > 50) {
    return "El máximo de miembros debe estar entre 1 y 50.";
  }

  return "";
};

function GroupSettingsWorkspace({ requestedId }: { requestedId: string }) {
  const alive = useRef(true),
    actionLocks = useRef(new Set<string>()),
    online = useNetworkMonitor();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const navigate = useNavigate();
  const { accessToken, localUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    maxMembers: "10",
    description: "",
    isPublic: false,
    itineraryLocked: false,
    budgetLocked: false,
  });
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"close" | "delete" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [destinationData, setDestinationData] =
    useState<GeocodingResult | null>(null);

  const groupId = requestedId;
  const effectiveGroup = group;
  const effectiveGroupId = String(groupId);
  const formError = getValidationError(form, effectiveGroup);
  const today = todayISO();
  const originalStartDate = effectiveGroup?.fecha_inicio ?? "";
  const originalEndDate = effectiveGroup?.fecha_fin ?? "";
  const tripAlreadyStarted = Boolean(
    originalStartDate && originalStartDate < today,
  );
  const datesWereChanged = Boolean(
    (form.startDate && form.startDate !== originalStartDate) ||
    (form.endDate && form.endDate !== originalEndDate),
  );

  const minStartDate = tripAlreadyStarted ? originalStartDate : today;
  const minEndDate = form.startDate ? addDaysISO(form.startDate, 1) : today;
  const isAdmin = effectiveGroup?.myRole === "admin";
  const isReadOnly = isClosedGroup(effectiveGroup) || !isAdmin;

  const goToGroupPanel = () => {
    if (!effectiveGroupId) {
      navigate("/my-trips");
      return;
    }
    navigate(`/grouppanel?groupId=${encodeURIComponent(effectiveGroupId)}`);
  };

  const goToItinerary = () => {
    if (!effectiveGroupId) {
      navigate("/my-trips");
      return;
    }
    navigate(`/dashboard?groupId=${encodeURIComponent(effectiveGroupId)}`, {
      state: {
        groupId: effectiveGroupId,
        switchingGroup: effectiveGroup ?? undefined,
      },
    });
  };

  useEffect(() => {
    if (!accessToken || !groupId) {
      setLoading(false);
      return;
    }

    const loadGroup = async () => {
      try {
        setLoading(true);
        setError("");
        setAccessDenied(false);

        const history = await groupsService.getMyHistory(accessToken);
        if (!alive.current) return;
        const allItems = [...history.activos, ...history.pasados];
        const foundItem =
          allItems.find(
            (item) => String(item.grupos_viaje?.id) === String(groupId),
          ) || null;

        if (!foundItem?.grupos_viaje) {
          throw new Error("No se encontró el viaje solicitado");
        }

        const foundGroup = { ...foundItem.grupos_viaje, myRole: foundItem.rol };

        if (foundItem.rol !== "admin") {
          setGroup(foundGroup);
          saveCurrentGroup(foundGroup);
          setAccessDenied(true);
          return;
        }

        setGroup(foundGroup);
        setForm(buildForm(foundGroup));
        setDestinationData(null);
        saveCurrentGroup(foundGroup);
      } catch (err) {
        if (!alive.current) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el grupo",
        );
      } finally {
        if (alive.current) {
          setLoading(false);
        }
      }
    };

    loadGroup();
  }, [accessToken, groupId, retry]);

  const setField = (key: keyof SettingsForm, value: string | boolean) => {
    if (isReadOnly) return;
    let nextValue = value;

    if (typeof value === "string") {
      if (key === "name") nextValue = value.slice(0, GROUP_NAME_MAX_LENGTH);
      if (key === "description")
        nextValue = value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH);
      if (key === "maxMembers") nextValue = value.replace(/[^0-9]/g, "");
    }

    setForm((prev) => {
      const next = { ...prev, [key]: nextValue };

      if (
        key === "startDate" &&
        typeof nextValue === "string" &&
        next.endDate &&
        next.endDate <= nextValue
      ) {
        next.endDate = "";
      }

      return next;
    });
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!accessToken || !group || isReadOnly || !online) return;

    const validationError = getValidationError(form, group);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (actionLocks.current.has("settings")) return;
    actionLocks.current.add("settings");
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await groupsService.updateGroup(
        group.id,
        {
          nombre: form.name.trim(),
          descripcion: form.description.trim() || undefined,
          destino: form.destination.trim() || undefined,
          destino_latitud:
            destinationData?.latitude ?? group.destino_latitud ?? null,
          destino_longitud:
            destinationData?.longitude ?? group.destino_longitud ?? null,
          destino_place_id:
            destinationData?.placeId ?? group.destino_place_id ?? null,
          destino_formatted_address:
            destinationData?.formattedAddress ??
            group.destino_formatted_address ??
            null,
          fecha_inicio: form.startDate || undefined,
          fecha_fin: form.endDate || undefined,
          maximo_miembros: Number(form.maxMembers),
          es_publico: form.isPublic,
          modulo_itinerario_bloqueado: form.itineraryLocked,
          modulo_presupuesto_bloqueado: form.budgetLocked,
        },
        accessToken,
      );
      if (!alive.current) return;

      const updatedGroup = { ...response.group, myRole: group.myRole };
      setGroup(updatedGroup);
      saveCurrentGroup(updatedGroup);
      setSuccess("Cambios guardados correctamente");
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      actionLocks.current.delete("settings");
      if (alive.current) {
        setSaving(false);
      }
    }
  };

  const handleCloseTrip = async () => {
    if (!accessToken || !group || isReadOnly || !online) return;

    if (actionLocks.current.has("settings")) return;
    actionLocks.current.add("settings");
    try {
      setClosing(true);
      setError("");
      const response = await groupsService.closeGroup(group.id, accessToken);
      if (!alive.current) return;
      const closedGroup = { ...response.group, myRole: group.myRole };
      setGroup(closedGroup);
      saveCurrentGroup(closedGroup);
      setConfirmAction(null);
      setSuccess("Viaje cerrado y archivado correctamente");
      navigate("/my-trips#viajes-pasados");
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error ? err.message : "No se pudo cerrar el viaje",
      );
    } finally {
      actionLocks.current.delete("settings");
      if (alive.current) {
        setClosing(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !group || isReadOnly || !online) return;

    if (actionLocks.current.has("settings")) return;
    actionLocks.current.add("settings");
    try {
      setDeleting(true);
      setError("");
      await groupsService.deleteGroup(group.id, accessToken);
      if (!alive.current) return;
      clearCurrentGroup();
      setConfirmAction(null);
      navigate("/my-trips");
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el viaje",
      );
    } finally {
      actionLocks.current.delete("settings");
      if (alive.current) {
        setDeleting(false);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout
        editorial
        user={{
          name: localUser?.nombre || "Usuario",
          role: isAdmin ? "Organizador" : "Viajero",
          initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">
            Cargando configuración...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (accessDenied) {
    return (
      <AppLayout
        editorial
        user={{
          name: localUser?.nombre || "Usuario",
          role: isAdmin ? "Organizador" : "Viajero",
          initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full text-center shadow-sm">
            <h2 className="font-heading text-xl text-[#1E0A4E] mb-2">
              Acceso restringido
            </h2>
            <p className="font-body text-sm leading-relaxed text-[#64748B]">
              Solo el organizador puede abrir la configuración del viaje. Puedes
              consultar el panel del grupo o volver al itinerario.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={goToGroupPanel}
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] shadow-sm transition hover:bg-[#F8FAFC]"
              >
                Ir al panel
              </button>
              <button
                type="button"
                onClick={goToItinerary}
                className="rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1557B0]"
              >
                Volver al itinerario
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !group) {
    return (
      <AppLayout
        editorial
        user={{
          name: localUser?.nombre || "Usuario",
          role: isAdmin ? "Organizador" : "Viajero",
          initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full text-center">
            <h2 className="font-heading text-xl text-[#1E0A4E] mb-2">
              No se pudo abrir configuración
            </h2>
            <p role="alert" className="font-body text-sm text-red-500">
              {error}
            </p>
            <button
              className="atlas-account-button"
              disabled={!online}
              onClick={() => setRetry((n) => n + 1)}
            >
              Reintentar configuración
            </button>
            <button
              onClick={
                effectiveGroupId ? goToItinerary : () => navigate("/my-trips")
              }
              className="mt-4 bg-[#1E6FD9] text-white rounded-xl px-4 py-3 text-sm"
            >
              {effectiveGroupId
                ? "Volver al itinerario"
                : "Volver a mis viajes"}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      editorial
      contextualNavigation={
        group ? <AccountTripNav group={group} /> : undefined
      }
      trip={{
        name: group?.nombre || "Viaje",
        subtitle: group?.destino || "Destino no informado",
        dates: tripDateRange(group?.fecha_inicio, group?.fecha_fin),
        people:
          typeof group?.memberCount === "number"
            ? `${group.memberCount} integrantes`
            : "Integrantes del viaje",
      }}
      user={{
        name: localUser?.nombre || "Usuario",
        role: isAdmin ? "Organizador" : "Viajero",
        initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
      }}
      showTripSelector={false}
      showRightPanel={false}
    >
      <div className="atlas-account-scroll">
        <div className="atlas-account-page atlas-settings-page">
          <header className="atlas-account-heading">
            <div>
              <p className="atlas-account-eyebrow">EL VIAJE / AJUSTES</p>
              <h1>
                Las bases
                <br />
                <em>del viaje compartido.</em>
              </h1>
              <p>
                {group?.nombre} · Información, acceso y colaboración.
              </p>
            </div>
            <button className="atlas-account-button" onClick={goToItinerary}>
              Volver al viaje
            </button>
          </header>
          {!online && (
            <div className="atlas-account-notice" role="status">
              Sin conexión. Los cambios se conservan en este formulario;
              reconecta para guardar.
            </div>
          )}
          {isReadOnly && (
            <div className="atlas-account-notice" role="status">
              Viaje en modo lectura. No se permiten modificaciones.
            </div>
          )}
          {error && (
            <div className="atlas-account-notice is-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="atlas-account-notice" role="status">
              {success}
            </div>
          )}
          <div className="atlas-settings-layout">
            <form
              className="atlas-account-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <fieldset
                disabled={
                  isReadOnly || !online || saving || closing || deleting
                }
              >
                <section className="atlas-account-section">
                  <header>
                    <h2>Información general.</h2>
                  </header>
                  <div className="atlas-account-fields">
                    <label
                      className="atlas-account-field"
                      htmlFor="atlas-settings-name"
                    >
                      Nombre del viaje
                      <input
                        id="atlas-settings-name"
                        value={form.name}
                        maxLength={60}
                        onChange={(e) => setField("name", e.target.value)}
                      />
                    </label>
                    <label
                      className="atlas-account-field"
                      htmlFor="atlas-settings-description"
                    >
                      Descripción
                      <textarea
                        id="atlas-settings-description"
                        value={form.description}
                        maxLength={300}
                        onChange={(e) =>
                          setField("description", e.target.value)
                        }
                        rows={3}
                      />
                    </label>
                    <label
                      className="atlas-account-field"
                      htmlFor="atlas-settings-destination"
                    >
                      Destino
                      <input
                        id="atlas-settings-destination"
                        value={form.destination}
                        readOnly
                      />
                    </label>
                    <p className="atlas-account-caption">
                      El destino se conserva en esta configuración, como en el
                      flujo anterior.
                    </p>
                    <div className="atlas-account-field-row">
                      <label
                        className="atlas-account-field"
                        htmlFor="atlas-settings-start"
                      >
                        Salida
                        <input
                          id="atlas-settings-start"
                          type="date"
                          value={form.startDate}
                          min={minStartDate}
                          disabled={tripAlreadyStarted}
                          onChange={(e) =>
                            setField("startDate", e.target.value)
                          }
                        />
                      </label>
                      <label
                        className="atlas-account-field"
                        htmlFor="atlas-settings-end"
                      >
                        Regreso
                        <input
                          id="atlas-settings-end"
                          type="date"
                          value={form.endDate}
                          min={minEndDate}
                          max={
                            form.startDate
                              ? addDaysISO(form.startDate, 60)
                              : undefined
                          }
                          onChange={(e) => setField("endDate", e.target.value)}
                        />
                      </label>
                    </div>
                    {tripAlreadyStarted && (
                      <p className="atlas-account-caption">
                        El viaje ya comenzó; la fecha de salida se conserva para
                        mantener las actividades existentes.
                      </p>
                    )}
                    {datesWereChanged && (
                      <p className="atlas-account-notice">
                        Al guardar se validará el nuevo calendario con las
                        reglas del viaje y de sus participantes.
                      </p>
                    )}
                    <label
                      className="atlas-account-field"
                      htmlFor="atlas-settings-capacity"
                    >
                      Máximo de integrantes
                      <input
                        id="atlas-settings-capacity"
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={form.maxMembers}
                        onChange={(e) => setField("maxMembers", e.target.value)}
                      />
                    </label>
                  </div>
                </section>
                <section className="atlas-account-section">
                  <header>
                    <h2>Acceso y colaboración.</h2>
                  </header>
                  <div className="atlas-account-fields">
                    <label className="atlas-account-check">
                      <input
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => setField("isPublic", e.target.checked)}
                      />
                      <span>
                        <strong>Acceso directo por código</strong>
                        <small>
                          Si se desactiva, las solicitudes por código requieren
                          aprobación. Las invitaciones personales mantienen sus
                          reglas.
                        </small>
                      </span>
                    </label>
                    {[
                      {
                        key: "itineraryLocked" as const,
                        label: "Bloquear edición del itinerario",
                        description:
                          "Los viajeros solo podrán consultar el itinerario.",
                      },
                      {
                        key: "budgetLocked" as const,
                        label: "Bloquear edición del presupuesto",
                        description:
                          "Se conserva el control existente del módulo del presupuesto para los viajeros.",
                      },
                    ].map((option) => (
                      <label key={option.key} className="atlas-account-check">
                        <input
                          type="checkbox"
                          checked={form[option.key]}
                          onChange={(e) =>
                            setField(option.key, e.target.checked)
                          }
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </fieldset>
              {!isReadOnly && (
                <div className="atlas-account-form-submit">
                  <p className="atlas-account-caption">
                    {formError ||
                      "Revisa la información antes de guardar los cambios."}
                  </p>
                  <button
                    className="atlas-account-button is-primary"
                    disabled={saving || !online || Boolean(formError)}
                    type="submit"
                  >
                    {saving ? "Guardando…" : "Guardar ajustes"}
                  </button>
                </div>
              )}
            </form>
            <aside className="atlas-settings-side">
              <section className="atlas-account-section">
                <h2>Las personas del plan.</h2>
                <p>
                  Gestiona integrantes, invitaciones y solicitudes desde
                  Personas.
                </p>
                <button className="atlas-account-link" onClick={goToGroupPanel}>
                  Abrir Personas ↗
                </button>
              </section>
              <section className="atlas-account-section atlas-account-danger">
                <h2>Finalizar o eliminar.</h2>
                <p>
                  Estas operaciones conservan sus confirmaciones y las
                  restricciones del servidor.
                </p>
                <button
                  className="atlas-account-button"
                  disabled={
                    isReadOnly || !online || saving || closing || deleting
                  }
                  onClick={() => setConfirmAction("close")}
                >
                  Cerrar viaje (archivar)
                </button>
                <p className="atlas-account-caption">
                  El viaje quedará en modo lectura.
                </p>
                <button
                  className="atlas-account-button is-danger"
                  disabled={
                    isReadOnly || !online || saving || closing || deleting
                  }
                  onClick={() => setConfirmAction("delete")}
                >
                  Eliminar viaje permanentemente
                </button>
              </section>
            </aside>
          </div>
        </div>
      </div>
      {confirmAction && (
        <AccountDialog
          title={confirmAction === "close" ? "Cerrar viaje" : "Eliminar viaje"}
          busy={closing || deleting}
          onClose={() => setConfirmAction(null)}
        >
          <>
            {error && (
              <div className="atlas-account-notice is-error" role="alert">
                {error}
              </div>
            )}
          </>
          <p>
            {confirmAction === "close"
              ? "El viaje se archivará permanentemente y todos sus módulos quedarán en modo lectura."
              : "El viaje se eliminará permanentemente. Esta operación no se puede deshacer."}
          </p>
          <div className="atlas-account-dialog-actions">
            <button
              className="atlas-account-button"
              disabled={closing || deleting}
              onClick={() => setConfirmAction(null)}
            >
              Cancelar
            </button>
            <button
              className={`atlas-account-button ${confirmAction === "delete" ? "is-danger" : "is-primary"}`}
              disabled={closing || deleting || !online}
              onClick={() =>
                void (confirmAction === "close"
                  ? handleCloseTrip()
                  : handleDelete())
              }
            >
              {closing || deleting
                ? "Procesando…"
                : confirmAction === "close"
                  ? "Sí, cerrar viaje"
                  : "Sí, eliminar todo"}
            </button>
          </div>
        </AccountDialog>
      )}
    </AppLayout>
  );
}

export function GroupSettingsPage() {
  const [params] = useSearchParams();
  const { localUser } = useAuth();
  const requestedId = String(
    params.get("groupId") || getCurrentGroup()?.id || "",
  );
  return (
    <GroupSettingsWorkspace
      key={requestedId + ":" + String(localUser?.id_usuario || "")}
      requestedId={requestedId}
    />
  );
}
export default GroupSettingsPage;
