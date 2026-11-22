import "./landing-editorial.css";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Logo } from "../../components/ui/Logo";
import { Navbar } from "../../components/layout/Navbar";
import { useNavigate } from "react-router-dom";

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useIsOnline() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);
  return isOnline;
}

function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Small UI pieces ──────────────────────────────────────────────────────────

function Icon({
  type,
  className = "",
}: {
  type: "calendar" | "budget" | "chat" | "vote" | "vault" | "map" | "spark";
  className?: string;
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": true,
  };

  if (type === "budget") {
    return (
      <svg {...common}>
        <path
          d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "chat") {
    return (
      <svg {...common}>
        <path
          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "vote") {
    return (
      <svg {...common}>
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "vault") {
    return (
      <svg {...common}>
        <path
          d="M21 8a2 2 0 00-2-2h-3l-2-2h-4L8 6H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "map") {
    return (
      <svg {...common}>
        <path
          d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="10" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (type === "spark") {
    return (
      <svg {...common}>
        <path
          d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 2v4M16 2v4M3 10h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9E4F7] bg-white px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E6FD9] shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
      {children}
    </p>
  );
}

function HeroProductPreview() {
  return (
    <figure
      className="atlas-product-preview"
      aria-label="Ilustración del diseño Editorial Travel Atlas, sin datos reales"
    >
      <div className="atlas-preview-chrome">
        <i />
        <i />
        <i />
        <span>ITHERA / TU ATLAS COLABORATIVO</span>
      </div>
      <div className="atlas-preview-nav">
        <Logo variant="color" height={24} />
        <span>Resumen</span>
        <span>Itinerario</span>
        <span>Decisiones</span>
      </div>
      <div className="atlas-preview-cover">
        <span>EL PRÓXIMO CAPÍTULO</span>
        <h2>
          Un destino.
          <br />
          <em>Un plan en común.</em>
        </h2>
      </div>
      <div className="atlas-preview-body">
        <section>
          <p className="atlas-preview-eyebrow">EL ATLAS DEL VIAJE</p>
          <h3>Cada día, una historia.</h3>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Explora las posibilidades</strong>
                <small>Lugares, vuelos y hospedajes</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Comparte una propuesta</strong>
                <small>Conversen y decidan en grupo</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Construyan el itinerario</strong>
                <small>Actividades y documentos, juntos</small>
              </div>
            </li>
          </ol>
        </section>
        <aside>
          <p>VIAJAR EN COMPAÑÍA</p>
          <strong>
            Distintas ideas.
            <br />
            Un mismo viaje.
          </strong>
          <span>Proponer → Comparar → Decidir</span>
        </aside>
      </div>
      <figcaption>
        Representación ilustrativa de ITHERA · Sin datos personales
      </figcaption>
    </figure>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

/*

Esto se quitara despues, ya se añadio a /components/layout/Navbar/Navbar.tsx, esto es solo para mostrarlo en la landing page sin tener que usar el layout completo

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center transition-shadow duration-300 ${
      scrolled ? 'shadow-sm' : ''
    }`}>
      <a href="#" className="shrink-0">
        <Logo variant="color" height={44} />
      </a>

      <div className="hidden md:flex items-center gap-6 ml-8">
        <a href="#features" className="font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Explorar</a>
        <a href="#how" className="font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Cómo funciona</a>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <a href="#" className="hidden md:block font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Mis viajes</a>
        <a href="/login" className="font-body text-sm border border-[#E2E8F0] text-[#3D4A5C] rounded-lg px-4 py-1.5 hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition-colors">
          Iniciar sesión
        </a>
        <a href="/register" className="font-body text-sm font-medium bg-[#1E6FD9] text-white rounded-full px-4 py-1.5 hover:opacity-90 transition-opacity">
          Crear cuenta
        </a>
      </div>
    </nav>
  )
}
*/

// ── Hero ──────────────────────────────────────────────────────────────────────

// ── Offline Banner ───────────────────────────────────────────────────────────

function OfflineBanner() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-[#FFF7ED] border-b border-[#FED7AA] px-4 py-2.5 shadow-sm"
    >
      {/* WiFi-off icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[#B45309] shrink-0"
      >
        <line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.71 5.05A16 16 0 0 1 22.56 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.53 16.11a6 6 0 0 1 6.95 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
      <p className="font-body text-sm font-semibold text-[#B45309]">
        Sin conexión a internet
      </p>
      <span className="font-body text-sm text-[#92400E]">
        — Algunas acciones no estarán disponibles hasta recuperar la señal.
      </span>
    </div>
  );
}

function HeroSection({ isOnline }: { isOnline: boolean }) {
  const [tripName, setTripName] = useState("");
  const [dates, setDates] = useState("");
  const [people, setPeople] = useState("2");
  const navigate = useNavigate();

  const handlePeopleChange = (value: string) => {
    if (value === "") {
      setPeople("");
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const safeValue = Math.min(30, Math.max(1, Math.trunc(parsed)));
    setPeople(String(safeValue));
  };

  const handleCreateItinerary = () => {
    const params = new URLSearchParams();
    if (tripName) params.append("name", tripName);
    if (dates) params.append("destination", dates);
    if (people) params.append("members", people);
    navigate(`/create-group?${params.toString()}`);
  };

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-primary-dark px-4 pb-16 pt-24">
      <img
        src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=900&fit=crop"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(30,10,78,0.96)_0%,rgba(30,10,78,0.86)_42%,rgba(30,10,78,0.58)_100%)]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="landing-glow absolute left-[8%] top-[18%] h-28 w-28 rounded-full bg-[#35C56A]/30 blur-3xl" />
        <div className="landing-glow absolute bottom-[14%] right-[18%] h-36 w-36 rounded-full bg-[#1E6FD9]/35 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        <div className="text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green" />
            </span>
            <span className="font-body text-xs font-semibold text-white/85">
              Colaboracion en tiempo real
            </span>
          </div>

          <h1 className="max-w-3xl font-heading text-5xl font-bold leading-[1.02] text-white md:text-6xl">
            Planea viajes grupales con decisiones claras.
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-8 text-white/70">
            ITHERA une itinerarios, propuestas, votos, presupuesto y documentos
            en una sola experiencia para que el grupo avance sin perder
            contexto.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/create-group")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3 font-body text-sm font-bold text-white shadow-[0_14px_30px_rgba(53,197,106,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(53,197,106,0.34)]"
            >
              Crear mi primer viaje
              <Icon type="spark" />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("how")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-body text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Ver como funciona
            </button>
          </div>

          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[
              ["Explora", "posibilidades"],
              ["Comparte", "propuestas"],
              ["Decide", "en compañía"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <p className="font-heading text-2xl font-bold text-white">
                  {value}
                </p>
                <p className="font-body text-xs font-semibold text-white/55">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 w-full max-w-3xl rounded-2xl border border-white/20 bg-white/95 p-2 shadow-[0_24px_60px_rgba(9,5,28,0.35)] backdrop-blur-md">
            <div className="grid gap-2 md:grid-cols-[1.2fr_1.2fr_0.7fr_auto]">
              <div className="flex min-w-0 flex-col rounded-xl px-4 py-3 transition-all duration-300 hover:bg-[#F0F5FF] focus-within:bg-[#F0F5FF] focus-within:ring-2 focus-within:ring-[#1E6FD9]/20">
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-[#1E6FD9]">
                  <Icon type="calendar" className="h-3 w-3" />
                  Nombre del viaje
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aventura verano 2026"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="bg-transparent font-body text-base font-medium text-primary-dark outline-none placeholder-gray-400"
                />
              </div>
              <div className="flex min-w-0 flex-col rounded-xl px-4 py-3 transition-all duration-300 hover:bg-[#F0F5FF] focus-within:bg-[#F0F5FF] focus-within:ring-2 focus-within:ring-[#1E6FD9]/20 md:border-l md:border-gray-100">
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-[#7A4FD6]">
                  <Icon type="map" className="h-3 w-3" />
                  Destino
                </label>
                <input
                  type="text"
                  placeholder="A donde vamos"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  className="bg-transparent font-body text-base font-medium text-primary-dark outline-none placeholder-gray-400"
                />
              </div>
              <div className="flex min-w-0 flex-col rounded-xl px-4 py-3 transition-all duration-300 hover:bg-[#F0F5FF] focus-within:bg-[#F0F5FF] focus-within:ring-2 focus-within:ring-[#1E6FD9]/20 md:border-l md:border-gray-100">
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-[#35C56A]">
                  <Icon type="vote" className="h-3 w-3" />
                  Personas
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  step={1}
                  inputMode="numeric"
                  placeholder="2"
                  value={people}
                  onChange={(e) => handlePeopleChange(e.target.value)}
                  onBlur={() => {
                    if (!people) setPeople("2");
                  }}
                  className="w-full bg-transparent font-body text-base font-medium text-primary-dark outline-none placeholder-gray-400"
                />
              </div>
              <button
                onClick={isOnline ? handleCreateItinerary : undefined}
                disabled={!isOnline}
                title={!isOnline ? "Sin conexión a internet" : undefined}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-7 py-3 font-body text-sm font-bold text-white transition-all duration-300 hover:opacity-90 hover:shadow-[0_10px_24px_rgba(30,111,217,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crear
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <HeroProductPreview />
          <p className="mt-7 text-center font-body text-xs font-semibold text-white/55">
            Planea, compara y construye el itinerario en compañía.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const stats = [
  {
    value: "Itinerarios",
    label: "Actividades y horarios por día",
    color: "#4B2FA3",
    icon: "calendar" as const,
  },
  {
    value: "Decisiones",
    label: "Propuestas, votos y conversación",
    color: "#4B2FA3",
    icon: "vote" as const,
  },
  {
    value: "Documentos",
    label: "Archivos relacionados con el viaje",
    color: "#1E6FD9",
    icon: "vault" as const,
  },
  {
    value: "Comunidad",
    label: "Tu grupo, conectado en tiempo real",
    color: "#1E6FD9",
    icon: "chat" as const,
  },
];

function StatsSection() {
  return (
    <section className="border-b border-[#E2E8F0] bg-white px-4 py-8">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-[#E2E8F0] bg-[#FAFCFF] px-4 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#CFE0FF] hover:shadow-[0_18px_40px_rgba(30,10,78,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ color: s.color, backgroundColor: `${s.color}18` }}
              >
                <Icon type={s.icon} />
              </span>
              <span
                className="h-2 w-2 rounded-full landing-glow"
                style={{ backgroundColor: s.color }}
              />
            </div>
            <p className="font-heading text-2xl font-bold text-[#1E0A4E]">
              {s.value}
            </p>
            <p className="font-body text-xs font-semibold text-[#7A8799]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: "vote" as const,
    color: "#1E6FD9",
    title: "Decidan sin discusiones eternas",
    description:
      "Cada propuesta muestra votos, estado y responsables para que el grupo avance con claridad.",
    preview: "votes",
  },
  {
    icon: "budget" as const,
    color: "#35C56A",
    title: "Controlen gastos sin hojas sueltas",
    description:
      "Presupuesto, comprometido y disponible se actualizan mientras el grupo propone y confirma.",
    preview: "budget",
  },
  {
    icon: "vault" as const,
    color: "#7A4FD6",
    title: "Guarden lo importante en contexto",
    description:
      "Documentos, reservas y notas quedan conectados al viaje, no perdidos en chats separados.",
    preview: "vault",
  },
];

function FeaturePreview({ type, color }: { type: string; color: string }) {
  if (type === "budget") {
    return (
      <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#FAFCFF] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-body text-xs font-bold text-[#64748B]">
            Disponible
          </span>
          <span className="font-heading text-lg font-bold text-[#1E0A4E]">
            $38,200
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div className="h-full w-[42%] rounded-full bg-[#35C56A]" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-white px-3 py-2 font-body text-[11px] font-bold text-[#7A8799]">
            Comprometido $11,800
          </span>
          <span className="rounded-xl bg-white px-3 py-2 font-body text-[11px] font-bold text-[#35C56A]">
            0 deudas
          </span>
        </div>
      </div>
    );
  }
  if (type === "vault") {
    return (
      <div className="mt-5 grid gap-2">
        {["Reserva hotel", "PDF itinerario", "Seguro viaje"].map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#FAFCFF] px-3 py-2"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ color, backgroundColor: `${color}18` }}
            >
              <Icon type="vault" />
            </span>
            <span className="font-body text-xs font-bold text-[#1E0A4E]">
              {item}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#FAFCFF] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] font-bold text-[#1E6FD9]">
          Comida frente al mar
        </span>
        <span className="font-body text-xs font-bold text-[#64748B]">5/7</span>
      </div>
      <div className="flex -space-x-2">
        {["#1E6FD9", "#35C56A", "#7A4FD6", "#F59E0B", "#E11D48"].map(
          (avatarColor) => (
            <span
              key={avatarColor}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              ✓
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function FeaturesSection() {
  const ref = useFadeIn();
  return (
    <section id="features" ref={ref} className="bg-white px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <SectionEyebrow>Producto</SectionEyebrow>
          <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold text-primary-dark md:text-4xl">
            Una app pensada para decisiones compartidas, no solo listas bonitas.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-[26px] border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#CFE0FF] hover:shadow-[0_24px_60px_rgba(30,10,78,0.10)]"
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ color: f.color, backgroundColor: `${f.color}18` }}
              >
                <Icon type={f.icon} />
              </div>
              <h3 className="font-heading text-lg font-bold leading-tight text-primary-dark">
                {f.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-7 text-gray-500">
                {f.description}
              </p>
              <FeaturePreview type={f.preview} color={f.color} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Demo / In Action ──────────────────────────────────────────────────────────

function DemoSection() {
  const ref = useFadeIn();
  return (
    <section ref={ref} className="atlas-landing-demo">
      <div>
        <SectionEyebrow>UN SOLO ATLAS</SectionEyebrow>
        <h2>
          Del primer «¿y si vamos?»
          <br />
          <em>al plan del viaje.</em>
        </h2>
        <p>
          Reúne las ideas, consulta las propuestas y organiza las actividades
          sin perder la conversación del grupo.
        </p>
        <ul>
          <li>Un itinerario para consultar cada día.</li>
          <li>Alternativas guardadas para comparar y votar.</li>
          <li>Documentos y comunicación en el contexto del viaje.</li>
        </ul>
      </div>
      <HeroProductPreview />
    </section>
  );
}

// ── Destinations ──────────────────────────────────────────────────────────────

const destinations = [
  {
    name: "Cancún",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop",
    fallback: "#4B8A6E",
    tag: "Playa",
  },
  {
    name: "Ciudad de México",
    image:
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=600&fit=crop",
    fallback: "#8A6E4B",
    tag: "Cultura",
  },
  {
    name: "Oaxaca",
    image:
      "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&h=600&fit=crop",
    fallback: "#8A4B6E",
    tag: "Gastronomia",
  },
  {
    name: "Los Cabos",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=600&fit=crop",
    fallback: "#4B6E8A",
    tag: "Relax",
  },
  {
    name: "Puerto Vallarta",
    image:
      "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=600&fit=crop",
    fallback: "#6E4B8A",
    tag: "Grupo",
  },
];

function DestinationsSection() {
  const ref = useFadeIn();
  return (
    <section ref={ref} className="bg-white px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <SectionEyebrow>Inspiracion</SectionEyebrow>
            <h2 className="font-heading text-2xl font-bold text-primary-dark md:text-3xl">
              Destinos que se prestan para decidir en grupo
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 transition-colors hover:border-primary-dark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="15 18 9 12 15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 transition-colors hover:border-primary-dark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="9 18 15 12 9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {destinations.map((dest) => (
            <div
              key={dest.name}
              className="group relative h-64 w-52 shrink-0 cursor-pointer overflow-hidden rounded-[24px] transition-transform duration-300 hover:-translate-y-1"
              style={{ backgroundColor: dest.fallback }}
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-300 group-hover:from-black/90" />
              <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/20 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                {dest.tag}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-heading text-lg font-bold text-white">
                  {dest.name}
                </p>
                <p className="mt-1 font-body text-xs font-semibold text-white/65 transition-all duration-300 group-hover:text-white">
                  Planear viaje →
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const ref = useFadeIn();
  return (
    <section ref={ref} className="atlas-landing-promises">
      <SectionEyebrow>PLANEAR EN COMPAÑÍA</SectionEyebrow>
      <h2>Más claridad para lo que viene.</h2>
      <div>
        {[
          {
            title: "Cada idea tiene su lugar.",
            text: "Guarda alternativas de viaje para que el grupo pueda consultarlas, comentarlas y votar.",
          },
          {
            title: "El plan se construye juntos.",
            text: "Organiza actividades, horarios y subgrupos, manteniendo el contexto de cada día.",
          },
          {
            title: "Lo importante, a la mano.",
            text: "Reúne documentos y conversaciones relacionados con el viaje en el mismo espacio.",
          },
        ].map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const steps = [
  {
    number: "1",
    color: "#1E6FD9",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[#1E6FD9]"
      >
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Crea el grupo",
    description: "Define nombre, fechas y destino",
  },
  {
    number: "2",
    color: "#7A4FD6",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[#7A4FD6]"
      >
        <path
          d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Invita a tu gente",
    description: "Comparte el enlace o código QR",
  },
  {
    number: "3",
    color: "#35C56A",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[#35C56A]"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8v4l3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Planeen juntos",
    description: "Propuestas, votos y presupuesto en tiempo real",
  },
];

function HowItWorksSection() {
  const ref = useFadeIn();
  return (
    <section id="how" ref={ref} className="bg-background py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-heading font-bold text-primary-dark text-3xl md:text-4xl mb-16">
          ¿Cómo funciona?
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className="relative w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4"
                style={{ borderColor: `${step.color}50` }}
              >
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white font-heading font-bold text-xs flex items-center justify-center"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </span>
                {step.icon}
              </div>
              <h3 className="font-heading font-semibold text-primary-dark text-base mb-2">
                {step.title}
              </h3>
              <p className="font-body text-gray-500 text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────

function CTASection() {
  const ref = useFadeIn();
  const navigate = useNavigate();
  return (
    <section ref={ref} className="bg-white px-4 py-20">
      <div className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[30px] bg-[#1E0A4E] px-6 py-12 shadow-[0_24px_70px_rgba(30,10,78,0.20)] md:grid-cols-[1fr_360px] md:px-10">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=600&fit=crop"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(30,10,78,0.94),rgba(30,10,78,0.72))]" />
        <div className="relative">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AF0B8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
            Empezar
          </p>
          <h2 className="max-w-2xl font-heading text-4xl font-bold leading-tight text-white md:text-5xl">
            Crea el grupo, invita a todos y deja que el plan avance.
          </h2>
          <p className="mt-4 max-w-xl font-body text-sm leading-7 text-white/65">
            En menos de dos minutos puedes abrir un espacio compartido para
            proponer, votar y ordenar el viaje.
          </p>
          <button
            onClick={() => navigate("/create-group")}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green px-7 py-3 font-body text-sm font-bold text-white shadow-[0_16px_34px_rgba(53,197,106,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(53,197,106,0.34)]"
          >
            Empezar ahora
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline
                points="9 18 15 12 9 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="mt-4 font-body text-xs text-white/40">
            Sin tarjeta de credito · Sin instalacion
          </p>
        </div>
        <div className="relative mt-10 hidden md:block">
          <div className="landing-float rounded-3xl border border-white/20 bg-white/95 p-4 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1E6FD9]">
                <Icon type="calendar" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-[#1E0A4E]">
                  Viaje creado
                </p>
                <p className="font-body text-xs text-[#7A8799]">
                  8 dias · 10 personas
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="rounded-xl bg-[#EAFBF1] px-3 py-2 font-body text-xs font-bold text-[#167A3D]">
                Invitacion lista
              </span>
              <span className="rounded-xl bg-[#F3EEFF] px-3 py-2 font-body text-xs font-bold text-[#6D45C0]">
                Presupuesto configurado
              </span>
              <span className="rounded-xl bg-[#EEF4FF] px-3 py-2 font-body text-xs font-bold text-[#1E6FD9]">
                Primer dia preparado
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

const footerLinks = {
  Producto: ["Explorar", "Cómo funciona", "Precios", "Testimonios"],
  Compañía: ["Acerca de", "Blog", "Carreras", "Contacto"],
  Legal: ["Privacidad", "Términos", "Cookies", "Soporte"],
};

function Footer() {
  return (
    <footer className="bg-primary-dark border-t border-white/10 py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Logo variant="white" height={40} />
            </div>
            <p className="font-body text-white/40 text-xs leading-relaxed mb-4">
              Planifica viajes grupales sin complicaciones.
            </p>
            <div className="flex gap-3">
              {["ig", "tw", "in", "yt"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={social}
                >
                  <span className="font-body text-white/60 text-[9px] uppercase">
                    {social}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <p className="font-heading font-semibold text-white text-xs uppercase tracking-wider mb-4">
                {col}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-body text-white/40 text-xs hover:text-white/70 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="font-body text-white/25 text-xs text-center">
            © 2026 Ithera. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const isOnline = useIsOnline();
  return (
    <div className={`atlas-landing font-body${!isOnline ? " pt-[44px]" : ""}`}>
      {!isOnline && <OfflineBanner />}
      <Navbar variant="landing" />
      <HeroSection isOnline={isOnline} />
      <StatsSection />
      <FeaturesSection />
      <DemoSection />
      <DestinationsSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
}
