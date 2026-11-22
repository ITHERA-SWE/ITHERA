import { EditorialLoading } from "../ui/EditorialLoading";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../context/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, accessToken, localUser } = useAuth();
  const location = useLocation();

  if (loading)
    return <EditorialLoading full label="Conectando tu cuenta con ITHERA…" />;

  if (!accessToken || !localUser) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          location.pathname + location.search,
        )}`}
        state={{ sessionExpired: true }}
        replace
      />
    );
  }

  return <>{children}</>;
}
