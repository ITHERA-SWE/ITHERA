import { EditorialLoading } from "../ui/EditorialLoading";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../../context/useAuth";

export function PublicRoute({ children }: { children: ReactNode }) {
  const { loading, accessToken, localUser } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (accessToken && localUser && location.pathname === "/login")
      sessionStorage.removeItem("ithera_post_login_redirect");
  }, [accessToken, localUser, location.pathname]);
  if (loading)
    return <EditorialLoading full label="Conectando tu cuenta con ITHERA…" />;
  if (accessToken && localUser) {
    // El proveedor puede confirmar la sesión antes de resolver login(). El retorno
    // se resuelve también aquí para conservar enlaces de invitación completos.
    const requested =
      location.pathname === "/login"
        ? new URLSearchParams(location.search).get("redirect") ||
          sessionStorage.getItem("ithera_post_login_redirect")
        : null;
    const target =
      requested?.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.includes("\\") &&
      !Array.from(requested).some((char) => char.charCodeAt(0) < 32)
        ? requested
        : "/my-trips";
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
