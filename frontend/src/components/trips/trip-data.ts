import type { Group, GroupHistoryItem } from "../../types/groups";
export type TripSection = "current" | "upcoming" | "past" | "undated";
export const tripSections: Array<{
  id: TripSection;
  label: string;
  description: string;
}> = [
  {
    id: "current",
    label: "En curso",
    description:
      "El viaje ya comenzó. Sigue construyendo el plan con tu grupo.",
  },
  {
    id: "upcoming",
    label: "Próximos viajes",
    description: "Destinos que ya tienen un lugar en tu calendario.",
  },
  {
    id: "undated",
    label: "Por organizar",
    description: "Viajes con fechas pendientes de confirmar o revisar.",
  },
  {
    id: "past",
    label: "Viajes anteriores",
    description:
      "El itinerario y los acuerdos siguen disponibles para consulta.",
  },
];
export const MAX_BUDGET = 9999999999.99;
export const MAX_DURATION = 60;
export function civilDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value
    ? value
    : null;
}
export function todayInMexico(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}-${p.find((x) => x.type === "day")?.value}`;
}
export function addCivilDays(value: string, days: number) {
  if (!civilDate(value) || !Number.isInteger(days)) return "";
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dayDifference(a: string, b: string) {
  return civilDate(a) && civilDate(b)
    ? Math.round(
        (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) /
          86400000,
      )
    : null;
}
export function dateLabel(value?: string | null) {
  return civilDate(value)
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T12:00:00Z`))
    : null;
}
export function tripDateRange(start?: string | null, end?: string | null) {
  const a = dateLabel(start),
    b = dateLabel(end);
  return a && b
    ? `${a} — ${b}`
    : a
      ? `Desde ${a}`
      : b
        ? `Hasta ${b}`
        : "Fechas por definir";
}
export function tripSection(g: Group, today = todayInMexico()): TripSection {
  if (["finalizado", "cerrado", "archivado"].includes(g.estado)) return "past";
  const a = civilDate(g.fecha_inicio),
    b = civilDate(g.fecha_fin);
  if (a && b && b < a) return "undated";
  if (b && b < today) return "past";
  if (a && a > today) return "upcoming";
  if (a && b && a <= today && b >= today) return "current";
  return "undated";
}
export function uniqueTrips(items: GroupHistoryItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const id = i?.grupos_viaje?.id;
    if (id == null || !String(id).trim() || seen.has(String(id))) return false;
    seen.add(String(id));
    return true;
  });
}
export function statusLabel(value?: string | null) {
  return (
    (
      {
        activo: "Activo",
        finalizado: "Finalizado",
        cerrado: "Cerrado",
        archivado: "Archivado",
      } as Record<string, string>
    )[value ?? ""] ||
    value ||
    "Estado no informado"
  );
}
export function roleLabel(value?: string | null) {
  return value === "admin"
    ? "Organizador"
    : value === "viajero"
      ? "Viajero"
      : null;
}
export function safePhoto(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}
export function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}
export function orderTrips(
  items: GroupHistoryItem[],
  order: "date" | "name",
  today = todayInMexico(),
) {
  return [...items].sort((a, b) => {
    if (order === "name")
      return (a.grupos_viaje.nombre || "").localeCompare(
        b.grupos_viaje.nombre || "",
        "es",
      );
    const x = civilDate(a.grupos_viaje.fecha_inicio),
      y = civilDate(b.grupos_viaje.fecha_inicio);
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    const bothPast =
      tripSection(a.grupos_viaje, today) === "past" &&
      tripSection(b.grupos_viaje, today) === "past";
    return bothPast ? y.localeCompare(x) : x.localeCompare(y);
  });
}
export interface CreateTripForm {
  name: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  maxMembers: string;
  totalBudget: string;
  isPublic: boolean;
}
export function validateTrip(form: CreateTripForm, today = todayInMexico()) {
  const e: Partial<Record<keyof CreateTripForm, string>> = {};
  if (!form.name.trim()) e.name = "Escribe el nombre del viaje.";
  else if (form.name.trim().length > 60)
    e.name = "El nombre admite hasta 60 caracteres.";
  if (!form.destination.trim()) e.destination = "Indica el destino del viaje.";
  if (form.description.trim().length > 300)
    e.description = "La descripción admite hasta 300 caracteres.";
  if (!civilDate(form.startDate))
    e.startDate = "Selecciona una fecha de salida válida.";
  else if (form.startDate < today)
    e.startDate = "La salida no puede ser anterior a hoy.";
  if (!civilDate(form.endDate))
    e.endDate = "Selecciona una fecha de regreso válida.";
  else if (form.endDate < today)
    e.endDate = "El regreso no puede ser anterior a hoy.";
  const duration = dayDifference(form.startDate, form.endDate);
  if (duration !== null) {
    if (duration < 1) e.endDate = "El regreso debe ser posterior a la salida.";
    else if (duration > MAX_DURATION)
      e.endDate = "El viaje puede durar como máximo 60 días.";
  }
  const members = Number(form.maxMembers),
    budget = Number(form.totalBudget);
  if (!Number.isInteger(members) || members < 1 || members > 50)
    e.maxMembers = "La capacidad debe ser un número entero entre 1 y 50.";
  if (!form.totalBudget.trim())
    e.totalBudget = "El presupuesto total es obligatorio.";
  else if (
    !/^\d{1,10}(\.\d{1,2})?$/.test(form.totalBudget.trim()) ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > MAX_BUDGET
  )
    e.totalBudget =
      "Indica un monto positivo, hasta 9,999,999,999.99 MXN y dos decimales.";
  return e;
}
export const validEmail = (value: string) =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/.test(
    value.trim().toLowerCase(),
  );
