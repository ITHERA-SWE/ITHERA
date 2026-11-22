import { AccountDialog } from "../account/AccountDialog";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { useEffect, useMemo, useState, useRef } from "react";
import { groupsService } from "../../services/groups";

type Member = {
  id: number;
  initials: string;
  name: string;
  role: "Admin" | "Miembro";
};

type InviteSettings = {
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
};

type InviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  inviteLink: string;
  qrBase64?: string;
  inviteSettings?: InviteSettings;
  groupId: string;
  accessToken: string;
  members: Member[];
  onInvitationsSent?: () => void;
  onInviteSettingsUpdated?: (settings: InviteSettings) => void;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

function parseEmails(value: string) {
  return value
    .split(/[\n,;]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/;

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

function getDaysUntil(expirationDate?: string | null) {
  if (!expirationDate) return 7;

  const expiresAt = new Date(expirationDate).getTime();
  if (Number.isNaN(expiresAt)) return 7;

  const diffDays = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 1) return 1;
  if (diffDays <= 3) return 3;
  if (diffDays <= 7) return 7;
  if (diffDays <= 14) return 14;
  return 30;
}

function formatExpiration(expiresAt?: string | null) {
  if (!expiresAt) return "Sin expiración configurada";

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InviteModal({
  isOpen,
  onClose,
  inviteLink,
  qrBase64,
  inviteSettings,
  groupId,
  accessToken,
  members,
  onInvitationsSent,
  onInviteSettingsUpdated,
}: InviteModalProps) {
  const alive = useRef(true),
    lock = useRef(false),
    online = useNetworkMonitor();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [copied, setCopied] = useState(false);
  const [emailsText, setEmailsText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [usageLimit, setUsageLimit] = useState("unlimited");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const emails = useMemo(() => parseEmails(emailsText), [emailsText]);
  const invalidEmails = emails.filter((email) => !isValidEmail(email));
  const hasEmailText = emailsText.trim().length > 0;
  const emailValidationError =
    hasEmailText && invalidEmails.length > 0
      ? "Ingresa un correo electrónico válido (ej. usuario@dominio.com)."
      : "";
  const canSendInvitations =
    online &&
    !savingSettings &&
    !sending &&
    emails.length > 0 &&
    invalidEmails.length === 0;
  const usedCount = inviteSettings?.usedCount ?? 0;

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast(null),
      toast.type === "success" ? 3000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) {
      setEmailsText("");
      setMessage("");
      setError("");
      setCopied(false);
      setToast(null);
      return;
    }

    setExpirationDays(getDaysUntil(inviteSettings?.expiresAt));
    setUsageLimit(
      inviteSettings?.maxUses ? String(inviteSettings.maxUses) : "unlimited",
    );
  }, [inviteSettings?.expiresAt, inviteSettings?.maxUses, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      if (!alive.current) return;
      setCopied(true);
      showToast({ type: "success", message: "Enlace copiado" });
    } catch {
      showToast({ type: "error", message: "No se pudo copiar el enlace." });
      setError("No se pudo copiar el enlace.");
    }
  };

  const handleDownloadQr = () => {
    if (!qrBase64) {
      showToast({
        type: "error",
        message: "No se pudo descargar el QR. Inténtalo de nuevo.",
      });
      return;
    }

    try {
      setDownloadingQr(true);
      const link = document.createElement("a");
      link.href = qrBase64;
      link.download = `ithera-invitacion-${groupId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast({ type: "success", message: "QR descargado" });
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!online || !isOpen || lock.current) return;
    lock.current = true;
    try {
      setSavingSettings(true);
      setError("");
      setMessage("");

      const maxUses = usageLimit === "unlimited" ? null : Number(usageLimit);
      const response = await groupsService.updateInviteSettings(
        groupId,
        {
          expirationDays,
          maxUses,
        },
        accessToken,
      );

      if (!alive.current) return;
      onInviteSettingsUpdated?.(response.inviteSettings);
      setMessage("Configuración del enlace actualizada correctamente.");
      showToast({
        type: "success",
        message: "Configuración de invitación guardada",
      });
    } catch (err) {
      if (!alive.current) return;
      const nextError =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la configuración del enlace.";
      setError(nextError);
      showToast({ type: "error", message: nextError });
    } finally {
      lock.current = false;
      if (alive.current) setSavingSettings(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!emails.length) {
      setError("Agrega al menos un correo.");
      return;
    }

    if (invalidEmails.length > 0) {
      setError(`Correo inválido: ${invalidEmails[0]}`);
      return;
    }

    if (!online || !isOpen || lock.current) return;
    lock.current = true;
    try {
      setSending(true);
      setError("");
      setMessage("");

      const response = await groupsService.sendInvitations(
        groupId,
        emails,
        accessToken,
      );

      if (!alive.current) return;
      const created = response.invitations.filter(
        (item) => item.status === "created",
      ).length;
      const pending = response.invitations.filter(
        (item) => item.status === "already_invited",
      ).length;
      const existing = response.invitations.filter(
        (item) => item.status === "existing_member",
      ).length;
      setMessage(
        `${created} invitación(es) creada(s), ${pending} ya pendiente(s) y ${existing} integrante(s) existente(s).`,
      );
      setEmailsText("");
      onInvitationsSent?.();
    } catch (err) {
      if (!alive.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron enviar las invitaciones.",
      );
    } finally {
      lock.current = false;
      if (alive.current) setSending(false);
    }
  };

  return (
    <AccountDialog
      title="Invitar al viaje"
      busy={sending || savingSettings}
      onClose={onClose}
    >
      <p>
        Comparte el enlace o envía invitaciones personales con las reglas
        actuales del viaje.
      </p>
      {!online && (
        <div className="atlas-account-notice" role="status">
          Sin conexión. Reconecta para enviar invitaciones o guardar la
          configuración.
        </div>
      )}
      {error && (
        <div className="atlas-account-notice is-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="atlas-account-notice" role="status">
          {message}
        </div>
      )}
      {toast && (
        <p role={toast.type === "error" ? "alert" : "status"}>
          {toast.message}
        </p>
      )}
      <fieldset disabled={sending || savingSettings}>
        <div className="atlas-invite-grid">
          <div>
            {qrBase64 ? (
              <img src={qrBase64} alt="Código QR de invitación al viaje" />
            ) : (
              <p className="atlas-account-caption">
                QR no disponible. Puedes utilizar el enlace.
              </p>
            )}
            <button
              className="atlas-account-button"
              onClick={handleDownloadQr}
              disabled={!qrBase64 || downloadingQr}
            >
              Descargar QR
            </button>
          </div>
          <div>
            <label className="atlas-account-field" htmlFor="atlas-invite-link">
              Enlace de invitación
              <input id="atlas-invite-link" readOnly value={inviteLink} />
            </label>
            <button
              className="atlas-account-button"
              onClick={handleCopy}
              disabled={!inviteLink}
            >
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
            <p className="atlas-account-caption">
              {formatExpiration(inviteSettings?.expiresAt)} · {usedCount} de{" "}
              {inviteSettings?.maxUses ?? "ilimitados"} usos.
            </p>
          </div>
        </div>
        <section className="atlas-account-section">
          <h2>Vigencia del enlace.</h2>
          <div className="atlas-account-field-row">
            <label
              className="atlas-account-field"
              htmlFor="atlas-invite-expiration"
            >
              Expiración
              <select
                id="atlas-invite-expiration"
                value={expirationDays}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
              >
                {[1, 3, 7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} día(s)
                  </option>
                ))}
              </select>
            </label>
            <label className="atlas-account-field" htmlFor="atlas-invite-uses">
              Límite de usos
              <select
                id="atlas-invite-uses"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              >
                <option value="unlimited">Ilimitado</option>
                {[1, 5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} uso(s)
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="atlas-account-button"
            disabled={!online || savingSettings}
            onClick={() => void handleSaveSettings()}
          >
            {savingSettings ? "Guardando…" : "Guardar configuración del enlace"}
          </button>
        </section>
        <section className="atlas-account-section">
          <h2>Una invitación personal.</h2>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendInvitations();
            }}
          >
            <label
              className="atlas-account-field"
              htmlFor="atlas-invite-emails"
            >
              Correos electrónicos
              <textarea
                id="atlas-invite-emails"
                value={emailsText}
                rows={3}
                placeholder="usuario@dominio.com"
                aria-invalid={Boolean(emailValidationError)}
                aria-describedby="atlas-invite-email-help"
                onChange={(e) => {
                  setEmailsText(e.target.value);
                  setError("");
                  setMessage("");
                }}
              />
            </label>
            <p id="atlas-invite-email-help" className="atlas-account-caption">
              {emailValidationError ||
                "Separa los correos con coma, punto y coma o salto de línea."}
            </p>
            <button
              className="atlas-account-button is-primary"
              type="submit"
              disabled={!canSendInvitations}
            >
              {sending ? "Enviando…" : "Enviar invitaciones"}
            </button>
          </form>
        </section>
        <section className="atlas-account-section">
          <h2>En el viaje.</h2>
          <ul className="atlas-invite-members">
            {members.map((member) => (
              <li key={member.id}>
                <strong>{member.name}</strong>
                <span>
                  {member.role === "Admin" ? "Organizador" : "Viajero"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </fieldset>
      <div className="atlas-account-dialog-actions">
        <button
          className="atlas-account-button"
          disabled={sending || savingSettings}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </AccountDialog>
  );
}
