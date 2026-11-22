import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { useAuth } from "../../context/useAuth";
import { useNetworkMonitor } from "../../hooks/useNetworkMonitor";
import { useSocket } from "../../hooks/useSocket";
import "./trip-access.css";
export function TripAccessLayout({ children }: { children: ReactNode }) {
  const { localUser, accessToken } = useAuth(),
    online = useNetworkMonitor(),
    { isConnected } = useSocket(accessToken);
  const name = localUser?.nombre || localUser?.email || "Invitación de viaje";
  return (
    <AppLayout
      editorial
      showTripSelector={false}
      showRightPanel={false}
      user={{
        name,
        role: localUser ? "Usuario" : "",
        initials: localUser
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "⌖",
      }}
      isOnline={online && (!accessToken || isConnected)}
    >
      <div className="atlas-access-scroll">
        <div className="atlas-access-page">{children}</div>
      </div>
    </AppLayout>
  );
}
export function TripBack() {
  return (
    <Link className="atlas-access-back" to="/my-trips">
      ← Mis viajes
    </Link>
  );
}
export function TripNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`atlas-access-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function TripField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="atlas-trip-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <p className="atlas-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function TripCompass() {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="42" stroke="currentColor" />
      <circle
        cx="60"
        cy="60"
        r="52"
        stroke="currentColor"
        strokeDasharray="1 7"
      />
      <path d="M76 33 66 66 33 87 54 54Z" stroke="currentColor" />
      <path d="m60 0 0 12m0 96v12M0 60h12m96 0h12" stroke="currentColor" />
    </svg>
  );
}
