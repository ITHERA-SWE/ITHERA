import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo";
import { TripCompass } from "../trips/TripAccessLayout";
import "./accounts-editorial.css";
export function AuthEditorialLayout({
  children,
  label,
  busy = false,
}: {
  children: ReactNode;
  label: string;
  busy?: boolean;
}) {
  return (
    <div className="atlas-auth-screen">
      <aside
        className="atlas-auth-story"
        aria-label="ITHERA, planificación de viajes"
      >
        <Link to="/" aria-label="ITHERA, inicio">
          <Logo variant="white" height={48} />
        </Link>
        <div className="atlas-auth-story-copy">
          <p className="atlas-account-eyebrow">
            ITHERA / TU ATLAS COLABORATIVO
          </p>
          <h2>
            El próximo viaje
            <br />
            empieza <em>contigo.</em>
          </h2>
          <p>
            Un espacio para compartir ideas, construir un itinerario y decidir
            en compañía.
          </p>
          <TripCompass />
        </div>
        <footer>
          <span>PLANEAR JUNTOS.</span>
          <span>VIVIR EL VIAJE.</span>
        </footer>
      </aside>
      <main className="atlas-auth-form-panel">
        <Link
          to="/"
          className="atlas-auth-mobile-logo"
          aria-label="ITHERA, inicio"
        >
          <Logo variant="color" height={38} />
        </Link>
        <div className="atlas-auth-content" aria-busy={busy}>
          <p className="atlas-account-eyebrow">{label}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
