import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { AuthEditorialLayout } from "../../components/account/AuthEditorialLayout";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const toSpanishForgotPasswordError = (message: string): string => {
  const trimmed = message.trim();
  const rateLimitMatch = trimmed.match(
    /For security purposes, you can only request this after (\d+) seconds\.?/i,
  );
  if (rateLimitMatch) {
    const seconds = rateLimitMatch[1];
    return `Por seguridad, solo puedes solicitarlo de nuevo en ${seconds} segundos.`;
  }
  return message;
};

export function ForgotPasswordPage() {
  const accountLocks = useRef(new Set<string>());
  const accountAlive = useRef(true);
  useEffect(() => {
    accountAlive.current = true;
    return () => {
      accountAlive.current = false;
    };
  }, []);

  const { forgotPassword } = useAuth();
  const online = useNetworkMonitor();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedEmail = normalizeEmail(email);
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);
  const canSubmit = isEmailValid && !loading && online;

  const handleSubmit = async () => {
    if (accountLocks.current.has("submit")) return;

    setError("");
    setMessage("");
    if (!navigator.onLine) {
      setError("Sin conexión. Reconecta para solicitar la recuperación.");
      return;
    }

    if (!normalizedEmail) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError(
        "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
      );
      return;
    }

    accountLocks.current.add("submit");

    try {
      setLoading(true);
      await forgotPassword(normalizedEmail);
      if (!accountAlive.current) return;
      setMessage(
        "Si el correo existe, te enviaremos un enlace para restablecer tu contraseña.",
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo procesar la solicitud.";
      setError(toSpanishForgotPasswordError(msg));
    } finally {
      accountLocks.current.delete("submit");

      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#98A2B3] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

  return (
    <AuthEditorialLayout label="RECUPERAR ACCESO / TU CUENTA" busy={loading}>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#98A2B3] transition hover:text-[#667085]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M19 12H5M5 12l7-7M5 12l7 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Volver al inicio de sesión
      </Link>

      <div className="mb-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1E6FD9]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 8.4C4 7.56 4 7.14 4.16 6.82C4.3 6.54 4.54 6.3 4.82 6.16C5.14 6 5.56 6 6.4 6H17.6C18.44 6 18.86 6 19.18 6.16C19.46 6.3 19.7 6.54 19.84 6.82C20 7.14 20 7.56 20 8.4V15.6C20 16.44 20 16.86 19.84 17.18C19.7 17.46 19.46 17.7 19.18 17.84C18.86 18 18.44 18 17.6 18H6.4C5.56 18 5.14 18 4.82 17.84C4.54 17.7 4.3 17.46 4.16 17.18C4 16.86 4 16.44 4 15.6V8.4Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M4.5 7L10.94 11.83C11.32 12.11 11.51 12.25 11.72 12.31C11.9 12.37 12.1 12.37 12.28 12.31C12.49 12.25 12.68 12.11 13.06 11.83L19.5 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-[42px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
          ¿Olvidaste tu contraseña?
        </h1>

        <p className="mt-4 text-[15px] leading-[1.7] text-[#667085]">
          Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para
          recuperar el acceso.
        </p>
      </div>

      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div>
          <label
            className="mb-2 block text-[15px] font-semibold text-[#344054]"
            htmlFor="atlas-auth-forgotpassword-1"
          >
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
              setMessage("");

              const normalized = normalizeEmail(value);
              if (normalized.length > 0 && normalized.includes("@")) {
                if (!EMAIL_REGEX.test(normalized)) {
                  setError(
                    "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
                  );
                } else {
                  setError("");
                }
              } else {
                setError("");
              }
            }}
            onBlur={(e) => {
              const value = normalizeEmail(e.target.value);
              setEmail(value);

              if (!value) {
                setError("Ingresa tu correo electrónico.");
                return;
              }

              if (!EMAIL_REGEX.test(value)) {
                setError(
                  "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
                );
              }
            }}
            placeholder="correo@ejemplo.com"
            className={`${inputBase} ${error ? "border-[#EF4444]" : ""}`}
            id="atlas-auth-forgotpassword-1"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B42318]"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-2xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-sm text-[#067647]"
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-[16px] bg-[#1E6FD9] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#175FC0] disabled:cursor-not-allowed disabled:bg-[#98A2B3] disabled:opacity-70"
        >
          {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
        </button>

        <p className="pt-1 text-center text-[14px] text-[#98A2B3]">
          ¿Recordaste tu contraseña?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#7A4FD6] transition hover:text-[#6A3FD1]"
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthEditorialLayout>
  );
}
