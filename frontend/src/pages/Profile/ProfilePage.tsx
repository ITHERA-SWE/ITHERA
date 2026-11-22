import { useState, useRef, useEffect, useId } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { AccountAvatar } from "../../components/account/AccountAvatar";
import { AccountDialog } from "../../components/account/AccountDialog";
import "../../components/account/accounts-editorial.css";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/useAuth";
import { apiClient } from "../../services/apiClient";
import { supabase } from "../../lib/supabase";
import { notificationsService } from "../../services/notifications";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline
        points="6 9 12 15 18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="20 6 9 17 4 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEye({ show }: { show: boolean }) {
  if (show) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="1"
        y1="1"
        x2="23"
        y2="23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 font-body text-sm text-[#1E0A4E] placeholder-gray-400 outline-none transition focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/20 disabled:bg-[#F8FAFC] disabled:text-gray-400 disabled:cursor-default";

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  rightElement,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  type?: string;
  rightElement?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 atlas-profile-field">
      <label
        htmlFor={id}
        className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          disabled={disabled}
          className={inputBase + (rightElement ? " pr-10" : "")}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  disabled?: boolean;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[#E2E8F0] last:border-none">
      <div>
        <p className="font-body text-sm font-semibold text-[#1E0A4E]">
          {label}
        </p>
        <p className="font-body text-xs text-[#1E0A4E]/50 mt-0.5">
          {description}
        </p>
      </div>
      <button
        disabled={disabled}
        aria-label={label}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30",
          checked ? "bg-[#1E6FD9]" : "bg-gray-200",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        >
          {checked && <IconCheck />}
        </span>
      </button>
    </div>
  );
}

type TravelStats = {
  tripsAsAdmin: number;
  tripsAsTraveler: number;
  acceptedProposals: number;
  totalSpent: number;
  countriesVisited: number;
  destinations: string[];
  recentTrips: Array<{
    id: number;
    nombre: string;
    destino: string | null;
    estado: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    rol: string;
  }>;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatTripDateRange(
  start?: string | null,
  end?: string | null,
): string {
  if (!start && !end) return "Fechas sin definir";
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startText = start
    ? formatter.format(new Date(`${start}T00:00:00`))
    : "Inicio sin definir";
  const endText = end
    ? formatter.format(new Date(`${end}T00:00:00`))
    : "Fin sin definir";
  return `${startText} - ${endText}`;
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { localUser, accessToken, refreshMe, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkMonitor();
  const alive = useRef(true),
    actionLocks = useRef(new Set<string>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fullName = localUser?.nombre ?? "Usuario";
  const email = localUser?.email ?? "";
  const nameParts = fullName.trim().split(/\s+/);

  // ── Delete account state ──────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [travelStats, setTravelStats] = useState<TravelStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsExpanded, setStatsExpanded] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    setStatsLoading(true);
    setStatsError("");

    apiClient
      .get<{ ok: boolean; stats: TravelStats }>("/auth/me/stats", accessToken)
      .then((response) => {
        if (!cancelled) setTravelStats(response.stats);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar tus estadísticas.",
          );
          setTravelStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleDeleteAccount = async () => {
    if (
      !accessToken ||
      !online ||
      deleteConfirmText !== "ELIMINAR" ||
      actionLocks.current.has("deleteAccount")
    )
      return;
    actionLocks.current.add("deleteAccount");
    try {
      setDeleting(true);
      setDeleteError("");
      await deleteAccount(accessToken);
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "No se pudo eliminar la cuenta.",
      );
      if (alive.current) setDeleting(false);
    } finally {
      actionLocks.current.delete("deleteAccount");
    }
  };

  // ── Personal data state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false),
    [profileError, setProfileError] = useState(""),
    [profileMessage, setProfileMessage] = useState(""),
    [pwSaving, setPwSaving] = useState(false),
    [prefSaving, setPrefSaving] = useState(false),
    [prefError, setPrefError] = useState(""),
    [prefMessage, setPrefMessage] = useState(""),
    [prefReady, setPrefReady] = useState(false),
    [prefRetry, setPrefRetry] = useState(0);
  const [nombre, setNombre] = useState(nameParts[0] ?? "");
  const [apPat, setApPat] = useState(nameParts[1] ?? "");
  const [apMat, setApMat] = useState(nameParts.slice(2).join(" "));
  const [correo, setCorreo] = useState(email);

  const [savedName, setSavedName] = useState(nombre);
  const [savedApPat, setSavedApPat] = useState(apPat);
  const [savedApMat, setSavedApMat] = useState(apMat);
  const [savedEmail, setSavedEmail] = useState(correo);

  function handleEdit() {
    setEditing(true);
  }

  function handleCancel() {
    setNombre(savedName);
    setApPat(savedApPat);
    setApMat(savedApMat);
    setCorreo(savedEmail);
    setEditing(false);
  }

  async function handleSave() {
    if (!accessToken || !online || actionLocks.current.has("profile")) return;
    const nextName = [nombre, apPat, apMat].filter(Boolean).join(" ").trim();
    if (!nextName) {
      setProfileError("El nombre completo es obligatorio.");
      return;
    }
    actionLocks.current.add("profile");
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");
    try {
      await apiClient.patch("/auth/me", { nombre: nextName }, accessToken);
      await refreshMe(accessToken);
      if (!alive.current) return;
      setSavedName(nombre);
      setSavedApPat(apPat);
      setSavedApMat(apMat);
      setSavedEmail(correo);
      setEditing(false);
      setProfileMessage("Nombre actualizado correctamente.");
    } catch (e) {
      if (alive.current)
        setProfileError(
          e instanceof Error
            ? e.message
            : "No se pudo confirmar la actualización del nombre.",
        );
    } finally {
      actionLocks.current.delete("profile");
      if (alive.current) setProfileSaving(false);
    }
  }

  // ── Password state ────────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handlePasswordUpdate() {
    setPwError("");
    setPwSuccess(false);

    if (!accessToken) {
      setPwError("No hay sesión activa.");
      return;
    }

    if (!localUser?.email) {
      setPwError("No se pudo obtener el correo del usuario.");
      return;
    }

    if (!pwCurrent) {
      setPwError("Ingresa tu contraseña actual.");
      return;
    }

    if (pwNew.length < 8) {
      setPwError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (pwNew !== pwConfirm) {
      setPwError("Las contraseñas no coinciden.");
      return;
    }

    if (pwCurrent === pwNew) {
      setPwError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    if (actionLocks.current.has("password") || !online) return;
    actionLocks.current.add("password");
    setPwSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: localUser.email,
        password: pwCurrent,
      });
      if (!alive.current) return;

      if (signInError) {
        setPwError("La contraseña actual no es correcta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: pwNew,
      });
      if (!alive.current) return;

      if (updateError) {
        setPwError(updateError.message);
        return;
      }

      setPwSuccess(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");

      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      if (!alive.current) return;
      if (alive.current) setPwError("No se pudo actualizar la contraseña.");
    } finally {
      actionLocks.current.delete("password");
      if (alive.current) setPwSaving(false);
    }
  }

  // ── Photo state ───────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Solo se permiten imágenes PNG, JPG, JPEG o WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La imagen no puede pesar más de 5 MB.");
      return;
    }

    setPhotoError("");
    setPhotoSuccess(false);
    setPhotoFile(file);

    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function handleSavePhoto() {
    if (!photoFile) return;

    if (!accessToken) {
      setPhotoError("No hay sesión activa.");
      return;
    }

    if (!online || actionLocks.current.has("avatar")) return;
    actionLocks.current.add("avatar");
    try {
      setPhotoSaving(true);
      setPhotoError("");
      setPhotoSuccess(false);

      const formData = new FormData();
      formData.append("avatar", photoFile);

      await apiClient.upload("/auth/me/avatar", formData, accessToken);
      if (!alive.current) return;

      await refreshMe(accessToken);
      if (!alive.current) return;

      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoSuccess(true);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      if (!alive.current) return;
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la imagen.";

      setPhotoError(message);
    } finally {
      actionLocks.current.delete("avatar");
      if (alive.current) {
        setPhotoSaving(false);
      }
    }
  }

  async function handleDeletePhoto() {
    if (!accessToken) {
      setPhotoError("No hay sesión activa.");
      return;
    }

    if (!localUser?.avatar_url && !photoPreview) return;

    if (!online || actionLocks.current.has("avatar")) return;
    actionLocks.current.add("avatar");
    try {
      setPhotoDeleting(true);
      setPhotoError("");
      setPhotoSuccess(false);

      await apiClient.delete("/auth/me/avatar", accessToken);
      if (!alive.current) return;
      await refreshMe(accessToken);
      if (!alive.current) return;

      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoSuccess(true);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      if (!alive.current) return;
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la imagen.";

      setPhotoError(message);
    } finally {
      actionLocks.current.delete("avatar");
      if (alive.current) {
        setPhotoDeleting(false);
      }
    }
  }

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // ── Preferences state ─────────────────────────────────────────────────────
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifGroup, setNotifGroup] = useState(true);
  const [notifVotes, setNotifVotes] = useState(true);
  const [notifFinance, setNotifFinance] = useState(true);
  const [notifFlights, setNotifFlights] = useState(true);
  const [notifHotels, setNotifHotels] = useState(true);

  useEffect(() => {
    let active = true;
    setPrefError("");
    setPrefReady(false);
    if (accessToken)
      void notificationsService
        .getPreferences(accessToken)
        .then((res) => {
          if (!active) return;
          if (!res.ok || !res.preferences)
            throw new Error("No se recibieron las preferencias.");
          const p = res.preferences;
          setNotifEmail(p.notificaciones_correo);
          setNotifGroup(p.notificaciones_grupo);
          setNotifVotes(p.notificaciones_votos ?? true);
          setNotifFinance(p.notificaciones_finanzas ?? true);
          setNotifFlights(p.notificaciones_vuelos ?? true);
          setNotifHotels(p.notificaciones_hospedajes ?? true);
          setPrefReady(true);
        })
        .catch((e) => {
          if (active)
            setPrefError(
              e instanceof Error
                ? e.message
                : "No se pudieron cargar las preferencias.",
            );
        });
    return () => {
      active = false;
    };
  }, [accessToken, prefRetry]);

  type NotificationPreferenceKey =
    | "notificaciones_correo"
    | "notificaciones_grupo"
    | "notificaciones_votos"
    | "notificaciones_finanzas"
    | "notificaciones_vuelos"
    | "notificaciones_hospedajes";

  const preferenceSetters: Record<
    NotificationPreferenceKey,
    Dispatch<SetStateAction<boolean>>
  > = {
    notificaciones_correo: setNotifEmail,
    notificaciones_grupo: setNotifGroup,
    notificaciones_votos: setNotifVotes,
    notificaciones_finanzas: setNotifFinance,
    notificaciones_vuelos: setNotifFlights,
    notificaciones_hospedajes: setNotifHotels,
  };

  const preferenceValues: Record<NotificationPreferenceKey, boolean> = {
    notificaciones_correo: notifEmail,
    notificaciones_grupo: notifGroup,
    notificaciones_votos: notifVotes,
    notificaciones_finanzas: notifFinance,
    notificaciones_vuelos: notifFlights,
    notificaciones_hospedajes: notifHotels,
  };

  const handleTogglePref = async (
    key: NotificationPreferenceKey,
    val: boolean,
  ) => {
    if (
      !accessToken ||
      !online ||
      !prefReady ||
      actionLocks.current.has("preferences")
    )
      return;
    const previous = preferenceValues[key];
    actionLocks.current.add("preferences");
    setPrefSaving(true);
    setPrefError("");
    setPrefMessage("Guardando preferencia…");
    preferenceSetters[key](val);
    try {
      const r = await notificationsService.updatePreferences(
        { [key]: val },
        accessToken,
      );
      if (!alive.current) return;
      if (!r.ok) throw new Error("No se pudo confirmar la preferencia.");
      if (r.preferences && typeof r.preferences[key] === "boolean")
        preferenceSetters[key](r.preferences[key]);
      setPrefMessage("Preferencia guardada.");
    } catch (e) {
      if (alive.current) {
        preferenceSetters[key](previous);
        setPrefError(
          e instanceof Error ? e.message : "No se pudo guardar la preferencia.",
        );
        setPrefMessage("");
      }
    } finally {
      actionLocks.current.delete("preferences");
      if (alive.current) setPrefSaving(false);
    }
  };

  // ── NavUserInfo for AppLayout ─────────────────────────────────────────────
  const displayName =
    [savedName, savedApPat, savedApMat].filter(Boolean).join(" ") || fullName;
  const navUser = {
    name: displayName,
    role: "Usuario",
    initials: getInitials(displayName),
    color: "#1E6FD9",
  };

  return (
    <AppLayout
      editorial
      user={navUser}
      showRightPanel={false}
      showTripSelector={false}
    >
      <div className="atlas-account-scroll">
        <div className="atlas-account-page atlas-profile-page">
          <button
            className="atlas-account-link"
            onClick={() => navigate("/my-trips")}
          >
            ← Mis viajes
          </button>
          <header className="atlas-account-heading">
            <div>
              <p className="atlas-account-eyebrow">TU CUENTA / PERFIL</p>
              <h1>
                Tu espacio.
                <br />
                <em>Tu manera de viajar.</em>
              </h1>
              <p>Información personal, acceso y preferencias de tu cuenta.</p>
            </div>
          </header>
          {!online && (
            <div className="atlas-account-notice" role="status">
              Sin conexión. Puedes consultar tu información; reconecta para
              guardar cambios.
            </div>
          )}
          <div className="atlas-profile-layout">
            <aside className="atlas-profile-identity">
              <AccountAvatar
                src={photoPreview || localUser?.avatar_url}
                name={displayName}
              />
              <h2>{displayName}</h2>
              <p>{email}</p>
              {localUser?.proveedor_auth && (
                <small>Acceso: {localUser.proveedor_auth}</small>
              )}
              <button
                className="atlas-account-link"
                onClick={() => fileRef.current?.click()}
                disabled={!online || photoSaving || photoDeleting}
              >
                <IconCamera /> Cambiar fotografía
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Seleccionar fotografía de perfil"
                onChange={handleFileChange}
                hidden
              />
            </aside>
            <div className="atlas-profile-sections">
              <section className="atlas-account-section">
                <header>
                  <h2>Datos personales.</h2>
                  {!editing && (
                    <button
                      className="atlas-account-link"
                      onClick={handleEdit}
                      disabled={!online}
                    >
                      <IconEdit /> Editar información
                    </button>
                  )}
                </header>
                <div className="atlas-account-fields">
                  <Field
                    label="Nombre completo"
                    value={[nombre, apPat, apMat].filter(Boolean).join(" ")}
                    onChange={
                      editing
                        ? (v) => {
                            setNombre(v);
                            setApPat("");
                            setApMat("");
                            setProfileMessage("");
                          }
                        : undefined
                    }
                    disabled={!editing || profileSaving || !online}
                  />
                  <Field
                    label="Correo electrónico"
                    value={correo}
                    disabled
                    type="email"
                  />
                  <p className="atlas-account-caption">
                    El correo identifica tu cuenta y no se modifica desde este
                    formulario.
                  </p>
                  {profileError && (
                    <p role="alert" className="atlas-account-notice is-error">
                      {profileError}
                    </p>
                  )}
                  {profileMessage && (
                    <p role="status" className="atlas-account-notice">
                      {profileMessage}
                    </p>
                  )}
                  {editing && (
                    <div className="atlas-account-dialog-actions">
                      <button
                        className="atlas-account-button"
                        disabled={profileSaving}
                        onClick={handleCancel}
                      >
                        Cancelar
                      </button>
                      <button
                        className="atlas-account-button is-primary"
                        disabled={profileSaving || !online}
                        onClick={() => void handleSave()}
                      >
                        {profileSaving ? "Guardando…" : "Guardar nombre"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <section className="atlas-account-section">
                <button
                  className="atlas-account-section-toggle"
                  aria-expanded={pwOpen}
                  onClick={() => setPwOpen(!pwOpen)}
                >
                  <span>
                    <IconKey /> Cambiar contraseña
                  </span>
                  <IconChevron open={pwOpen} />
                </button>
                {pwOpen && (
                  <div className="atlas-account-fields">
                    {localUser?.proveedor_auth &&
                      localUser.proveedor_auth !== "email" && (
                        <p className="atlas-account-caption">
                          Tu cuenta utiliza {localUser.proveedor_auth}. Este
                          formulario requiere una contraseña de acceso por
                          correo existente; la contraseña del proveedor se
                          administra en ese servicio.
                        </p>
                      )}
                    <Field
                      label="Contraseña actual"
                      value={pwCurrent}
                      onChange={setPwCurrent}
                      disabled={pwSaving || !online}
                      type={showPw.current ? "text" : "password"}
                      rightElement={
                        <button
                          aria-label={
                            showPw.current
                              ? "Ocultar contraseña actual"
                              : "Mostrar contraseña actual"
                          }
                          onClick={() =>
                            setShowPw({ ...showPw, current: !showPw.current })
                          }
                        >
                          <IconEye show={showPw.current} />
                        </button>
                      }
                    />
                    <Field
                      label="Nueva contraseña"
                      value={pwNew}
                      onChange={setPwNew}
                      disabled={pwSaving || !online}
                      type={showPw.new ? "text" : "password"}
                      rightElement={
                        <button
                          aria-label={
                            showPw.new
                              ? "Ocultar nueva contraseña"
                              : "Mostrar nueva contraseña"
                          }
                          onClick={() =>
                            setShowPw({ ...showPw, new: !showPw.new })
                          }
                        >
                          <IconEye show={showPw.new} />
                        </button>
                      }
                    />
                    <Field
                      label="Confirmar nueva contraseña"
                      value={pwConfirm}
                      onChange={setPwConfirm}
                      disabled={pwSaving || !online}
                      type={showPw.confirm ? "text" : "password"}
                      rightElement={
                        <button
                          aria-label={
                            showPw.confirm
                              ? "Ocultar confirmación de contraseña"
                              : "Mostrar confirmación de contraseña"
                          }
                          onClick={() =>
                            setShowPw({ ...showPw, confirm: !showPw.confirm })
                          }
                        >
                          <IconEye show={showPw.confirm} />
                        </button>
                      }
                    />
                    <p className="atlas-account-caption">
                      Al menos 8 caracteres. Debe ser distinta de tu contraseña
                      actual.
                    </p>
                    {pwError && (
                      <p role="alert" className="atlas-account-notice is-error">
                        {pwError}
                      </p>
                    )}
                    {pwSuccess && (
                      <p role="status" className="atlas-account-notice">
                        Contraseña actualizada correctamente.
                      </p>
                    )}
                    <button
                      className="atlas-account-button is-primary"
                      disabled={pwSaving || !online}
                      onClick={() => void handlePasswordUpdate()}
                    >
                      {pwSaving ? "Actualizando…" : "Actualizar contraseña"}
                    </button>
                  </div>
                )}
              </section>
              <section className="atlas-account-section">
                <header>
                  <h2>Fotografía de perfil.</h2>
                </header>
                <div className="atlas-account-fields">
                  <p className="atlas-account-caption">
                    PNG, JPG, JPEG o WEBP · máximo 5 MB.
                  </p>
                  {photoPreview && (
                    <img
                      className="atlas-profile-photo-preview"
                      src={photoPreview}
                      alt="Vista previa local de la fotografía elegida"
                    />
                  )}
                  {photoFile && <p>{photoFile.name}</p>}
                  {photoError && (
                    <p className="atlas-account-notice is-error" role="alert">
                      {photoError}
                    </p>
                  )}
                  {photoSuccess && (
                    <p className="atlas-account-notice" role="status">
                      La fotografía de tu cuenta se actualizó.
                    </p>
                  )}
                  <div className="atlas-account-dialog-actions">
                    <button
                      className="atlas-account-button"
                      disabled={photoSaving || photoDeleting || !online}
                      onClick={() => fileRef.current?.click()}
                    >
                      Elegir imagen
                    </button>
                    {photoFile && (
                      <>
                        <button
                          className="atlas-account-button"
                          disabled={photoSaving || photoDeleting}
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                        >
                          Descartar selección
                        </button>
                        <button
                          className="atlas-account-button is-primary"
                          disabled={photoSaving || photoDeleting || !online}
                          onClick={() => void handleSavePhoto()}
                        >
                          {photoSaving ? "Guardando…" : "Guardar foto"}
                        </button>
                      </>
                    )}
                    {localUser?.avatar_url && (
                      <button
                        className="atlas-account-button is-danger"
                        disabled={photoSaving || photoDeleting || !online}
                        onClick={() => void handleDeletePhoto()}
                      >
                        {photoDeleting ? "Eliminando…" : "Eliminar fotografía"}
                      </button>
                    )}
                  </div>
                </div>
              </section>
              <section className="atlas-account-section">
                <header>
                  <h2>Preferencias de avisos.</h2>
                </header>
                {prefError && (
                  <div className="atlas-account-notice is-error" role="alert">
                    {prefError}
                    {!prefReady && (
                      <button
                        className="atlas-account-link"
                        onClick={() => setPrefRetry((n) => n + 1)}
                      >
                        Reintentar preferencias
                      </button>
                    )}
                  </div>
                )}
                {!prefReady ? (
                  <p role="status">
                    {prefError
                      ? "No hay preferencias verificadas para mostrar."
                      : "Cargando preferencias…"}
                  </p>
                ) : (
                  <div className="atlas-account-fields">
                    {prefMessage && (
                      <p role="status" className="atlas-account-caption">
                        {prefMessage}
                      </p>
                    )}
                    <Toggle
                      label="Notificaciones por correo"
                      description="Actualizaciones del itinerario en tu correo."
                      checked={notifEmail}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_correo", v)
                      }
                      disabled={!online || prefSaving}
                    />
                    <Toggle
                      label="Notificaciones del grupo"
                      description="Cambios e integrantes del grupo."
                      checked={notifGroup}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_grupo", v)
                      }
                      disabled={!online || prefSaving}
                    />
                    <Toggle
                      label="Votos y propuestas"
                      description="Decisiones colaborativas y participaciones."
                      checked={notifVotes}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_votos", v)
                      }
                      disabled={!online || prefSaving}
                    />
                    <Toggle
                      label="Finanzas"
                      description="Avisos existentes de gastos, pagos y ajustes."
                      checked={notifFinance}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_finanzas", v)
                      }
                      disabled={!online || prefSaving}
                    />
                    <Toggle
                      label="Vuelos"
                      description="Propuestas y actualizaciones de vuelos."
                      checked={notifFlights}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_vuelos", v)
                      }
                      disabled={!online || prefSaving}
                    />
                    <Toggle
                      label="Hospedajes"
                      description="Propuestas y actualizaciones de hospedajes."
                      checked={notifHotels}
                      onChange={(v) =>
                        void handleTogglePref("notificaciones_hospedajes", v)
                      }
                      disabled={!online || prefSaving}
                    />
                  </div>
                )}
              </section>
              <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStatsExpanded((current) => !current)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[#F8FAFC]"
                  aria-expanded={statsExpanded}
                  aria-controls="travel-statistics-panel"
                >
                  <div>
                    <h2 className="font-heading font-bold text-[#1E0A4E] text-base">
                      Mis estadísticas de viaje
                    </h2>
                    <p className="mt-0.5 font-body text-xs text-[#64748B]">
                      Resumen acumulado de tus viajes, propuestas aceptadas y
                      gasto registrado.
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-[#1E6FD9]">
                    <IconChevron open={statsExpanded} />
                  </span>
                </button>
                {statsExpanded && (
                  <div
                    id="travel-statistics-panel"
                    className="border-t border-[#E2E8F0] px-6 py-5"
                  >
                    {statsLoading ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="h-24 animate-pulse rounded-2xl bg-[#F1F5F9]"
                          />
                        ))}
                      </div>
                    ) : statsError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
                        {statsError}
                      </div>
                    ) : !travelStats ||
                      travelStats.tripsAsAdmin + travelStats.tripsAsTraveler ===
                        0 ? (
                      <div className="rounded-2xl border border-dashed border-[#D7DEEA] bg-[#F8FAFC] px-4 py-8 text-center">
                        <p className="font-body text-sm font-semibold text-[#1E0A4E]">
                          Aún no tienes estadísticas.
                        </p>
                        <p className="mt-1 font-body text-xs text-[#64748B]">
                          Crea o únete a tu primer viaje para empezar a
                          construir tu historial.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/my-trips")}
                          className="mt-4 rounded-xl bg-[#1E6FD9] px-4 py-2 font-body text-sm font-semibold text-white transition hover:bg-[#1a5fc2]"
                        >
                          Ir a mis viajes
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                            <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Como Admin
                            </p>
                            <p className="mt-2 font-heading text-2xl font-extrabold text-[#1E0A4E]">
                              {travelStats.tripsAsAdmin}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                            <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Como Viajero
                            </p>
                            <p className="mt-2 font-heading text-2xl font-extrabold text-[#1E0A4E]">
                              {travelStats.tripsAsTraveler}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                            <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Propuestas aceptadas
                            </p>
                            <p className="mt-2 font-heading text-2xl font-extrabold text-[#1E0A4E]">
                              {travelStats.acceptedProposals}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                            <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Gasto registrado
                            </p>
                            <p className="mt-2 font-heading text-xl font-extrabold text-[#1E0A4E]">
                              {formatMoney(travelStats.totalSpent)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                          <div className="rounded-2xl border border-[#E2E8F0] px-4 py-4">
                            <p className="font-body text-sm font-semibold text-[#1E0A4E]">
                              Destinos registrados
                            </p>
                            <p className="mt-1 font-body text-xs text-[#64748B]">
                              {travelStats.countriesVisited} destino(s)
                              detectado(s) en tu historial.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {travelStats.destinations
                                .slice(0, 6)
                                .map((destination) => (
                                  <span
                                    key={destination}
                                    className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-xs font-semibold text-[#1E6FD9]"
                                  >
                                    {destination}
                                  </span>
                                ))}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#E2E8F0] px-4 py-4">
                            <p className="font-body text-sm font-semibold text-[#1E0A4E]">
                              Viajes recientes
                            </p>
                            <div className="mt-3 divide-y divide-[#E2E8F0]">
                              {travelStats.recentTrips.length === 0 ? (
                                <p className="py-3 font-body text-sm text-[#64748B]">
                                  Sin viajes recientes.
                                </p>
                              ) : (
                                travelStats.recentTrips.map((trip) => (
                                  <div
                                    key={`${trip.id}-${trip.rol}`}
                                    className="py-3 first:pt-0 last:pb-0"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-body text-sm font-semibold text-[#1E0A4E]">
                                        {trip.nombre}
                                      </p>
                                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 font-body text-[11px] font-semibold text-[#64748B]">
                                        {trip.rol}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 font-body text-xs text-[#64748B]">
                                      {trip.destino || "Destino sin definir"}
                                    </p>
                                    <p className="mt-0.5 font-body text-[11px] text-[#94A3B8]">
                                      {formatTripDateRange(
                                        trip.fecha_inicio,
                                        trip.fecha_fin,
                                      )}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
              <section className="atlas-account-section atlas-account-danger">
                <header>
                  <h2>Gestión de la cuenta.</h2>
                </header>
                <div className="atlas-account-fields">
                  <p>
                    Eliminar la cuenta es una operación permanente. La
                    confirmación y las restricciones existentes se mantienen.
                  </p>
                  <button
                    className="atlas-account-button is-danger"
                    disabled={!online}
                    onClick={() => {
                      setShowDeleteModal(true);
                      setDeleteConfirmText("");
                      setDeleteError("");
                    }}
                  >
                    Eliminar cuenta
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {showDeleteModal && (
        <AccountDialog
          title="Eliminar tu cuenta"
          busy={deleting}
          onClose={() => setShowDeleteModal(false)}
        >
          <p>
            Esta acción es permanente e irreversible. Para confirmar, escribe{" "}
            <strong>ELIMINAR</strong>.
          </p>
          <label className="atlas-account-field" htmlFor="atlas-delete-account">
            Confirmación
            <input
              id="atlas-delete-account"
              value={deleteConfirmText}
              disabled={deleting}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
            />
          </label>
          {deleteError && (
            <p className="atlas-account-notice is-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="atlas-account-dialog-actions">
            <button
              className="atlas-account-button"
              disabled={deleting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </button>
            <button
              className="atlas-account-button is-danger"
              disabled={deleteConfirmText !== "ELIMINAR" || deleting || !online}
              onClick={() => void handleDeleteAccount()}
            >
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </AccountDialog>
      )}
    </AppLayout>
  );
}
