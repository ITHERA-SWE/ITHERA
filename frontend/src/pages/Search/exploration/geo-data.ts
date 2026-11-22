import type {
  PlaceResult,
  GoogleLatLngLiteral,
  WeatherForecastDay,
} from "../../../services/maps";
const WEEKDAY_ALIASES: Record<string, string[]> = {
  domingo: ["domingo", "dom", "sunday", "sun"],
  lunes: ["lunes", "lun", "monday", "mon"],
  martes: ["martes", "mar", "tuesday", "tue"],
  miércoles: ["miércoles", "miercoles", "mié", "mie", "wednesday", "wed"],
  jueves: ["jueves", "jue", "thursday", "thu"],
  viernes: ["viernes", "vie", "friday", "fri"],
  sábado: ["sábado", "sabado", "sáb", "sab", "saturday", "sat"],
};

const normalizeOpeningText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .trim();

const toMinutesFromTimeText = (raw: string, inferredMeridiem?: "am" | "pm") => {
  const normalized = normalizeOpeningText(raw);
  const match = normalized.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/,
  );
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiemText = match[3]?.replace(/[^apm]/g, "");
  const meridiem = meridiemText?.startsWith("p")
    ? "pm"
    : meridiemText?.startsWith("a")
      ? "am"
      : inferredMeridiem;

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

export type OpeningHoursValidation = {
  status: "valid" | "invalid" | "unknown";
  message: string | null;
  rangesLabel: string | null;
};

function getOpeningDescriptionForDate(
  place: PlaceResult,
  isoDate: string | null,
) {
  const descriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];
  if (!isoDate || descriptions.length === 0) return null;

  const weekday = new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(
    new Date(`${isoDate}T12:00:00`),
  );
  const aliases = WEEKDAY_ALIASES[weekday] ?? [weekday];

  return (
    descriptions.find((description) => {
      const dayName = normalizeOpeningText(description.split(":")[0] ?? "");
      return aliases.some((alias) =>
        dayName.includes(normalizeOpeningText(alias)),
      );
    }) ?? null
  );
}

export function validateTimeAgainstOpeningHours(
  place: PlaceResult,
  isoDate: string | null,
  timeValue: string,
): OpeningHoursValidation {
  const openingDescription = getOpeningDescriptionForDate(place, isoDate);
  if (!openingDescription) {
    return {
      status: "unknown",
      message:
        "Google Maps no proporcionó horario de atención para ese día. Puedes continuar, pero verifica el horario antes de confirmar.",
      rangesLabel: null,
    };
  }

  const separatorIndex = openingDescription.indexOf(":");
  const detail = (
    separatorIndex >= 0
      ? openingDescription.slice(separatorIndex + 1)
      : openingDescription
  ).trim();
  const normalizedDetail = normalizeOpeningText(detail);

  if (
    !detail ||
    normalizedDetail.includes("cerrado") ||
    normalizedDetail.includes("closed")
  ) {
    return {
      status: "invalid",
      message:
        "El lugar aparece cerrado el día seleccionado. Elige otro día u otra actividad.",
      rangesLabel: "Cerrado",
    };
  }

  if (
    /(?:abierto\s+24\s+horas|open\s+24\s+hours|24\s*horas)/.test(
      normalizedDetail,
    )
  ) {
    return {
      status: "valid",
      message:
        "Este es el horario obtenido de Google Maps. Verifica para mayor seguridad antes de confirmar la actividad.",
      rangesLabel: "Abierto 24 horas",
    };
  }

  const selectedMinutes = toMinutesFromTimeText(timeValue);
  if (selectedMinutes == null) {
    return {
      status: "invalid",
      message: "Selecciona una hora válida para programar la actividad.",
      rangesLabel: detail,
    };
  }

  const ranges = detail
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean);
  const parsedRanges = ranges
    .map((range) => {
      const [startRaw, endRaw] = range
        .split(/[–—-]/)
        .map((part) => part?.trim());
      if (!startRaw || !endRaw) return null;

      const normalizedStart = normalizeOpeningText(startRaw);
      const normalizedEnd = normalizeOpeningText(endRaw);
      const startHourMatch = normalizedStart.match(/(\d{1,2})/);
      const endHourMatch = normalizedEnd.match(/(\d{1,2})/);
      const startHasMeridiem = /(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm)/.test(
        normalizedStart,
      );
      const endMeridiem = normalizedEnd.includes("p")
        ? "pm"
        : normalizedEnd.includes("a")
          ? "am"
          : undefined;
      const shouldInferStartAsPm =
        !startHasMeridiem &&
        endMeridiem === "pm" &&
        startHourMatch &&
        endHourMatch &&
        Number(startHourMatch[1]) <= Number(endHourMatch[1]) &&
        Number(startHourMatch[1]) <= 7;

      const start = toMinutesFromTimeText(
        startRaw,
        shouldInferStartAsPm ? "pm" : undefined,
      );
      const end = toMinutesFromTimeText(endRaw);
      if (start == null || end == null) return null;
      return { start, end };
    })
    .filter((range): range is { start: number; end: number } => Boolean(range));

  if (parsedRanges.length === 0) {
    return {
      status: "unknown",
      message:
        "No pudimos interpretar el horario de Google Maps. Verifica manualmente antes de confirmar.",
      rangesLabel: detail,
    };
  }

  const isInsideRange = parsedRanges.some(({ start, end }) => {
    if (start <= end) return selectedMinutes >= start && selectedMinutes <= end;
    return selectedMinutes >= start || selectedMinutes <= end;
  });

  if (!isInsideRange) {
    return {
      status: "invalid",
      message: `El lugar no aparece abierto a las ${timeValue}. Selecciona una hora dentro del horario disponible.`,
      rangesLabel: detail,
    };
  }

  return {
    status: "valid",
    message:
      "Este es el horario obtenido de Google Maps. Verifica para mayor seguridad antes de confirmar la actividad.",
    rangesLabel: detail,
  };
}

export function coordinates(
  value?: { latitude?: number | null; longitude?: number | null } | null,
): GoogleLatLngLiteral | null {
  const lat = value?.latitude,
    lng = value?.longitude;
  return typeof lat === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}
export function safeUrl(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}
export function placeKey(p: PlaceResult, index = 0) {
  return p.id || `${p.name ?? ""}|${p.formattedAddress ?? ""}|${index}`;
}
export function placeUrl(p: PlaceResult) {
  return (
    safeUrl(p.googleMapsUri) ||
    (p.id
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name || p.formattedAddress || p.id)}&query_place_id=${encodeURIComponent(p.id)}`
      : p.formattedAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.formattedAddress)}`
        : coordinates(p)
          ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`
          : null)
  );
}
export function numberText(value: unknown, unit = "") {
  return typeof value === "number" && Number.isFinite(value)
    ? `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value)}${unit}`
    : "No informado";
}
export function categoryName(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Categoría no informada";
}
export function distanceFrom(
  p: PlaceResult,
  origin: GoogleLatLngLiteral | null,
) {
  const q = coordinates(p);
  if (!q || !origin) return Infinity;
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(q.lat - origin.lat) / 2) ** 2 +
    Math.cos(rad(origin.lat)) *
      Math.cos(rad(q.lat)) *
      Math.sin(rad(q.lng - origin.lng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function nearbyResults(
  items: PlaceResult[],
  origin: GoogleLatLngLiteral | null,
) {
  return items
    .filter(
      (p) => !origin || !coordinates(p) || distanceFrom(p, origin) <= 80000,
    )
    .slice()
    .sort((a, b) => {
      const x = distanceFrom(a, origin),
        y = distanceFrom(b, origin);
      return x === y ? 0 : x - y;
    });
}
export function decodePolyline(encoded: string): GoogleLatLngLiteral[] {
  if (!encoded || encoded.length > 200000) return [];
  let index = 0,
    lat = 0,
    lng = 0;
  const points: GoogleLatLngLiteral[] = [];
  const part = () => {
    let result = 0,
      shift = 0;
    while (index < encoded.length) {
      const byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63 || shift > 30) return null;
      result |= (byte & 31) << shift;
      if (byte < 32) return result & 1 ? ~(result >> 1) : result >> 1;
      shift += 5;
    }
    return null;
  };
  while (index < encoded.length) {
    const a = part(),
      b = part();
    if (a === null || b === null) return [];
    lat += a;
    lng += b;
    const point = { lat: lat / 1e5, lng: lng / 1e5 };
    if (!coordinates({ latitude: point.lat, longitude: point.lng })) return [];
    points.push(point);
  }
  return points;
}
export function forecastForDate(items: WeatherForecastDay[], date: string) {
  return items.find((d) => d.date === date) ?? null;
}
export function hasForecastDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
