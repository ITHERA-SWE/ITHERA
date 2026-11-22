import type {
  Proposal,
  ProposalDetailFlight,
  ProposalDetailHotel,
  VoteResult,
} from "../../services/proposals";
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function formatMoney(value: unknown, currency?: string | null) {
  const amount = numberValue(value);
  if (amount === null) return "Precio no informado";
  if (!currency)
    return `${amount.toLocaleString("es-MX")} · moneda no informada`;
  try {
    return `${new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount)} ${currency}`;
  } catch {
    return `${amount.toLocaleString("es-MX")} ${currency}`;
  }
}
export function formatTime(value?: string | null) {
  return (
    value?.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/)?.[1] ?? "Hora no informada"
  );
}
export function formatDate(value?: string | null) {
  const key = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!key) return "Fecha no informada";
  const date = new Date(key + "T12:00:00Z");
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Fecha no informada";
}
export function formatCommentDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "";
}
export function formatDuration(value?: string | null) {
  if (!value) return "Duración no informada";
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  return match
    ? [match[1] ? `${match[1]} h` : "", match[2] ? `${match[2]} min` : ""]
        .filter(Boolean)
        .join(" ") || value
    : value;
}

export function getPayload(proposal: Proposal) {
  return asRecord(proposal.payload);
}

export function getDetailPayload(proposal: Proposal) {
  const detail = asRecord(proposal.detalle);
  return asRecord(detail?.payload);
}

export function getNormalizedOffer(proposal: Proposal) {
  return (
    asRecord(getPayload(proposal)?.normalizedOffer) ??
    asRecord(getDetailPayload(proposal)?.normalizedOffer)
  );
}

export function getSlice(
  proposal: Proposal,
  key: "outboundSlice" | "returnSlice",
) {
  const normalized = getNormalizedOffer(proposal);
  return (
    asRecord(normalized?.[key]) ?? asRecord(getDetailPayload(proposal)?.[key])
  );
}

export function getPassengers(proposal: Proposal) {
  const payload = getPayload(proposal);
  const normalized = getNormalizedOffer(proposal);
  const passengers =
    asRecord(payload?.passengers) ?? asRecord(normalized?.passengers);

  const adults = Math.max(0, numberValue(passengers?.adults) ?? 0);
  const children = Math.max(0, numberValue(passengers?.children) ?? 0);
  const infantsWithoutSeat = Math.max(
    0,
    numberValue(passengers?.infantsWithoutSeat) ?? 0,
  );

  return {
    adults,
    children,
    infantsWithoutSeat,
    total: adults + children + infantsWithoutSeat,
  };
}

export function getPassengersText(proposal: Proposal) {
  const passengers =
    asRecord(getPayload(proposal)?.passengers) ??
    asRecord(getNormalizedOffer(proposal)?.passengers);
  if (!passengers) return "Pasajeros no informados";
  return (
    [
      ["adults", "adulto(s)"],
      ["children", "niño(s)"],
      ["infantsWithoutSeat", "infante(s)"],
    ]
      .map(([key, label]) =>
        numberValue(passengers[key]) !== null
          ? `${passengers[key]} ${label}`
          : null,
      )
      .filter(Boolean)
      .join(" · ") || "Pasajeros no informados"
  );
}

export function getHotelOffer(proposal: Proposal) {
  const payload = getPayload(proposal);
  const detailPayload = getDetailPayload(proposal);
  return (
    asRecord(payload?.normalizedOffer) ??
    asRecord(detailPayload?.normalizedOffer)
  );
}

export function getHotelSearch(proposal: Proposal) {
  const payload = getPayload(proposal);
  const detailPayload = getDetailPayload(proposal);
  return asRecord(payload?.search) ?? asRecord(detailPayload?.search);
}

export function getHotelRooms(proposal: Proposal): Record<string, unknown>[] {
  const offer = getHotelOffer(proposal);
  const detailPayload = getDetailPayload(proposal);
  const fromOffer = Array.isArray(offer?.rooms) ? offer.rooms : null;
  const fromPayload = Array.isArray(detailPayload?.rooms)
    ? detailPayload.rooms
    : null;
  return ((fromOffer ?? fromPayload ?? []) as unknown[])
    .map(asRecord)
    .filter((room): room is Record<string, unknown> => Boolean(room));
}

export function getHotelOccupancyText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return getPassengersText(proposal);

  const search = getHotelSearch(proposal);
  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const adults =
    numberValue(search?.adults) ??
    numberValue(offer?.adultCount) ??
    numberValue(rooms[0]?.adultCount) ??
    null;
  const childrenAges = Array.isArray(search?.childrenAges)
    ? search.childrenAges
    : [];
  const children =
    childrenAges.length ||
    numberValue(search?.children) ||
    numberValue(offer?.childCount) ||
    numberValue(rooms[0]?.childCount) ||
    0;
  const roomCount = numberValue(search?.rooms);
  const parts = [
    adults !== null ? `${adults} adulto(s)` : null,
    numberValue(search?.children) !== null
      ? `${search?.children} niño(s)`
      : children > 0
        ? `${children} niño(s)`
        : null,
    roomCount !== null ? `${roomCount} habitación(es)` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

export function getHotelRatingText(proposal: Proposal) {
  const offer = getHotelOffer(proposal);
  const google = numberValue(offer?.googleRating);
  const rating =
    google ??
    numberValue(offer?.rating) ??
    numberValue(asRecord(proposal.detalle)?.calificacion);
  return rating === null
    ? "Valoración no informada"
    : `${google !== null ? "Google" : "Proveedor"} ${rating.toFixed(1)}${google !== null && numberValue(offer?.googleUserRatingCount) !== null ? ` · ${offer?.googleUserRatingCount} reseñas` : ""}`;
}

export function getHotelRoomText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return "No aplica";

  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const roomName =
    stringValue(offer?.roomName) ??
    stringValue(rooms[0]?.name) ??
    "Habitación no informada";
  const rateCount = numberValue(offer?.rateCount) ?? rooms.length;
  const priceMin = numberValue(offer?.priceMin);
  const priceMax = numberValue(offer?.priceMax);
  const currency = stringValue(offer?.currency) ?? getCurrency(proposal);
  const range =
    priceMin !== null && priceMax !== null && priceMax > priceMin
      ? ` · rango ${formatMoney(priceMin, currency)} - ${formatMoney(priceMax, currency)}`
      : "";
  return `${roomName}${rateCount ? ` · ${rateCount} tarifa(s)` : ""}${range}`;
}

export function getHotelBoardText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return "No aplica";

  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const board =
    stringValue(offer?.boardName) ??
    stringValue(rooms[0]?.boardName) ??
    stringValue(rooms[0]?.boardType);
  const refundable =
    stringValue(offer?.refundableTag) ?? stringValue(rooms[0]?.refundableTag);
  const paymentTypes = Array.isArray(rooms[0]?.paymentTypes)
    ? rooms[0].paymentTypes.map(String).filter(Boolean)
    : [];
  const parts = [
    board ?? "Régimen no especificado",
    refundable,
    paymentTypes.length ? `Pago: ${paymentTypes.slice(0, 2).join(", ")}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function getProviderText(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const payload = getPayload(proposal);
    return (
      stringValue(payload?.provider) ?? stringValue(payload?.fuente) ?? "Duffel"
    );
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  const offer = getHotelOffer(proposal);
  const provider =
    detail?.proveedor ?? stringValue(offer?.provider) ?? "LiteAPI";
  const googlePlaceId =
    stringValue(offer?.googlePlaceId) ??
    stringValue(getPayload(proposal)?.googlePlaceId);
  return googlePlaceId ? `${provider} + Google Places` : provider;
}

export function getStayOrReturnText(proposal: Proposal) {
  if (proposal.tipo === "hospedaje") return getDurationText(proposal);
  return getReturnText(proposal);
}

export function getImageUrl(proposal: Proposal) {
  const offer = getNormalizedOffer(proposal);
  const detail = asRecord(proposal.detalle);
  return (
    stringValue(offer?.photoUrl) ??
    stringValue(getPayload(proposal)?.photoUrl) ??
    stringValue(getDetailPayload(proposal)?.photoUrl) ??
    stringValue(detail?.foto_url) ??
    (proposal.tipo === "actividad"
      ? stringValue(getPayload(proposal)?.imageUrl)
      : null)
  );
}

export function getPrice(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    return Number(detail?.precio ?? NaN);
  }

  if (proposal.tipo === "hospedaje") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return Number(detail?.precio_total ?? NaN);
  }

  return Number.NaN;
}

export function getCurrency(proposal: Proposal): string | null {
  return (
    stringValue(asRecord(proposal.detalle)?.moneda) ??
    stringValue(getNormalizedOffer(proposal)?.currency)
  );
}

export function getFlightRoute(proposal: Proposal) {
  const detail = proposal.detalle as ProposalDetailFlight | null;
  const outbound = getSlice(proposal, "outboundSlice");
  const origin =
    stringValue(outbound?.origin) ?? detail?.origen_codigo ?? "---";
  const destination =
    stringValue(outbound?.destination) ?? detail?.destino_codigo ?? "---";
  return `${origin} → ${destination}`;
}

export function getTitle(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    return `${detail?.aerolinea ?? "Vuelo"} ${detail?.numero_vuelo ?? ""} ${getFlightRoute(proposal)}`.trim();
  }

  if (proposal.tipo === "hospedaje") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return detail?.nombre ?? proposal.titulo;
  }

  return proposal.titulo;
}

export function getSubtitle(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    const stops = numberValue(detail?.escalas);
    const stopsLabel =
      stops === null
        ? "Escalas no informadas"
        : stops === 0
          ? "Directo"
          : stops === 1
            ? "1 escala"
            : `${stops} escalas`;
    return `${detail?.aerolinea ?? "Aerolínea"} · ${detail?.numero_vuelo ?? "Sin número"} · ${stopsLabel}`;
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  const rating = detail?.calificacion ? ` · ${detail.calificacion} ★` : "";
  return `${detail?.proveedor ?? "Hospedaje"}${rating}`;
}

export function getRouteOrLocation(proposal: Proposal) {
  if (proposal.tipo === "vuelo") return getFlightRoute(proposal);
  const detail = proposal.detalle as ProposalDetailHotel | null;
  return detail?.direccion ?? detail?.nombre ?? "Ubicación no disponible";
}

export function getOutboundText(proposal: Proposal) {
  if (proposal.tipo !== "vuelo") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return `${detail?.check_in ?? "Check-in sin definir"} → ${detail?.check_out ?? "Check-out sin definir"}`;
  }

  const detail = proposal.detalle as ProposalDetailFlight | null;
  const outbound = getSlice(proposal, "outboundSlice");
  const departure =
    stringValue(outbound?.departureAt) ?? detail?.salida ?? null;
  const arrival = stringValue(outbound?.arrivalAt) ?? detail?.llegada ?? null;
  return `${formatDate(departure)} · ${formatTime(departure)} → ${formatTime(arrival)}`;
}

export function getReturnText(proposal: Proposal) {
  if (proposal.tipo !== "vuelo") return "No aplica";

  const inbound = getSlice(proposal, "returnSlice");
  if (!inbound) return "Vuelo sencillo";

  const origin = stringValue(inbound.origin) ?? "---";
  const destination = stringValue(inbound.destination) ?? "---";
  const departure = stringValue(inbound.departureAt);
  const arrival = stringValue(inbound.arrivalAt);
  return `${origin} → ${destination} · ${formatDate(departure)} · ${formatTime(departure)} → ${formatTime(arrival)}`;
}

export function getDurationText(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    const outbound = getSlice(proposal, "outboundSlice");
    const inbound = getSlice(proposal, "returnSlice");
    const ida = formatDuration(
      stringValue(outbound?.duration) ?? detail?.duracion ?? null,
    );
    const regreso = inbound
      ? ` · Regreso ${formatDuration(stringValue(inbound.duration))}`
      : "";
    return `Ida ${ida}${regreso}`;
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  if (!detail?.check_in || !detail?.check_out) return "Noches no definidas";
  const start = new Date(detail.check_in);
  const end = new Date(detail.check_out);
  const nights = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 86400000),
  );
  return nights > 0 ? `${nights} noche(s)` : "Noches no definidas";
}

export function voteLabel(result?: VoteResult) {
  if (!result?.mi_voto) return "Sin tu voto";
  if (result.mi_voto === "a_favor") return "Votaste a favor";
  if (result.mi_voto === "en_contra") return "Votaste en contra";
  return "Te abstuviste";
}

export function statusLabel(state: string) {
  return (
    (
      {
        guardada: "Guardada",
        en_votacion: "En votación",
        pendiente: "Pendiente",
        aprobada: "Aprobada",
        descartada: "Descartada",
        rechazada: "Rechazada",
        archivada: "Archivada",
        confirmado: "Confirmada",
        confirmada: "Confirmada",
        cancelada: "Cancelada",
      } as Record<string, string>
    )[state] ||
    state ||
    "Estado no informado"
  );
}
export function votingClosed(p: Proposal) {
  return (
    Boolean(asRecord(p)?.fecha_cierre) ||
    [
      "aprobada",
      "descartada",
      "confirmado",
      "confirmada",
      "cancelada",
    ].includes(p.estado)
  );
}
export function simulationComplete(p: Proposal) {
  const detail = asRecord(p.detalle);
  return (
    (p.tipo === "vuelo" ? detail?.compra_estado : detail?.reserva_estado) ===
    "confirmada_simulada"
  );
}
export function sameMoneyUnit(proposals: Proposal[]) {
  return (
    proposals.length > 0 &&
    Boolean(getCurrency(proposals[0])) &&
    proposals.every((p) => getCurrency(p) === getCurrency(proposals[0]))
  );
}
export function uniqueComments<T extends { id: string }>(comments: T[]) {
  return [...new Map(comments.map((c) => [c.id, c])).values()];
}

export function proposalCategory(p: Proposal) {
  return p.tipo === "actividad" &&
    (asRecord(p.payload)?.googlePlaceId ||
      asRecord(asRecord(p.payload)?.place)?.id)
    ? "lugar"
    : p.tipo;
}
export function proposalCategoryLabel(kind: string) {
  return (
    (
      {
        vuelo: "Vuelos",
        hospedaje: "Hoteles",
        actividad: "Actividades",
        lugar: "Lugares",
      } as Record<string, string>
    )[kind] ||
    kind ||
    "Otras propuestas"
  );
}
