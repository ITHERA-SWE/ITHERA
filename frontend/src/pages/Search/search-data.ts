import type { FlightOffer, FlightSliceSummary } from '../../services/flights'
import type { HotelOffer } from '../../services/hotels'

export type SearchKind = 'flights' | 'hotels'
export type SearchSort = 'recommended' | 'price-up' | 'price-down'
export interface SearchFilters {
  currency: string
  maxPrice: string
  stops: string
  airline: string
  minRating: string
}
export const EMPTY_FILTERS: SearchFilters = {
  currency: '',
  maxPrice: '',
  stops: '',
  airline: '',
  minRating: '',
}

export function travelPath(
  path: string,
  groupId?: string | number | null,
  parameters: Record<string, string> = {},
): string {
  const query = new URLSearchParams(parameters)
  if (groupId != null && String(groupId)) query.set('groupId', String(groupId))
  return `${path}${query.size ? `?${query}` : ''}`
}
export function getPrimaryRoute(flight: FlightOffer): FlightSliceSummary {
  return (
    flight.outboundSlice ?? {
      origin: flight.origin,
      originName: flight.originName,
      destination: flight.destination,
      destinationName: flight.destinationName,
      departureAt: flight.departureAt,
      arrivalAt: flight.arrivalAt,
      duration: flight.duration,
      stops: flight.stops,
      segments: [],
    }
  )
}
export function getReturnRoute(flight: FlightOffer) {
  return flight.returnSlice ?? null
}
export function formatTime(value: string | null): string {
  // Conserva la hora textual entregada por el proveedor, sin aplicar la zona del dispositivo.
  return (
    value?.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/)?.[1] ?? 'Hora no informada'
  )
}
export function formatDate(value: string | null): string {
  const key = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!key) return 'Fecha no informada'
  const date = new Date(`${key}T12:00:00Z`)
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === key
    ? new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)
    : 'Fecha no informada'
}
export function formatDuration(value: string | null): string {
  const match = value?.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?$/)
  if (!match) return value || 'Duración no informada'
  const hours = Number(match[1] ?? 0) * 24 + Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  return (
    [hours ? `${hours} h` : '', minutes ? `${minutes} min` : '']
      .filter(Boolean)
      .join(' ') || 'Duración no informada'
  )
}
export function formatPrice(
  price: number | null,
  currency: string | null,
): string {
  if (typeof price !== 'number' || !Number.isFinite(price))
    return 'Precio no informado'
  if (!currency)
    return `${new Intl.NumberFormat('es-MX').format(price)} · moneda no informada`
  try {
    return `${new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(price)} ${currency}`
  } catch {
    return `${new Intl.NumberFormat('es-MX').format(price)} ${currency}`
  }
}
export function buildStopsLabel(stops: number): string {
  if (!Number.isInteger(stops) || stops < 0) return 'Escalas no informadas'
  return stops === 0 ? 'Directo' : `${stops} escala${stops === 1 ? '' : 's'}`
}
export function currencies(
  offers: Array<{ currency: string | null }>,
): string[] {
  return [
    ...new Set(
      offers.map((o) => o.currency).filter((v): v is string => Boolean(v)),
    ),
  ].sort()
}
function priceMatches(
  offer: { price: number | null; currency: string | null },
  filters: SearchFilters,
  available: string[],
) {
  if (filters.currency && offer.currency !== filters.currency) return false
  const unit = filters.currency || (available.length === 1 ? available[0] : '')
  if (!filters.maxPrice || !unit) return true
  const cap = Number(filters.maxPrice)
  return (
    Number.isFinite(cap) &&
    cap >= 0 &&
    offer.currency === unit &&
    typeof offer.price === 'number' &&
    Number.isFinite(offer.price) &&
    offer.price <= cap
  )
}
function sortPrices<
  T extends { price: number | null; currency: string | null },
>(items: T[], sort: SearchSort): T[] {
  if (sort === 'recommended') return items
  // Agrupa monedas distintas: jamás compara un importe USD con uno MXN.
  return [...items].sort((a, b) => {
    const unitOrder = (a.currency ?? '\uffff').localeCompare(
      b.currency ?? '\uffff',
    )
    if (unitOrder) return unitOrder
    const ap =
      typeof a.price === 'number' && Number.isFinite(a.price) ? a.price : null
    const bp =
      typeof b.price === 'number' && Number.isFinite(b.price) ? b.price : null
    if (ap == null) return bp == null ? 0 : 1
    if (bp == null) return -1
    return sort === 'price-up' ? ap - bp : bp - ap
  })
}
export function filterFlights<T extends FlightOffer>(
  offers: T[],
  filters: SearchFilters,
  sort: SearchSort,
): T[] {
  const units = currencies(offers)
  return sortPrices(
    offers.filter(
      (o) =>
        priceMatches(o, filters, units) &&
        (!filters.airline || o.airline === filters.airline) &&
        (!filters.stops ||
          [getPrimaryRoute(o), getReturnRoute(o)]
            .filter(Boolean)
            .every(
              (s) =>
                s &&
                Number.isInteger(s.stops) &&
                s.stops <= Number(filters.stops),
            )),
    ),
    sort,
  )
}
export function filterHotels<T extends HotelOffer>(
  offers: T[],
  filters: SearchFilters,
  sort: SearchSort,
): T[] {
  const units = currencies(offers)
  return sortPrices(
    offers.filter(
      (o) =>
        priceMatches(o, filters, units) &&
        (!filters.minRating ||
          (typeof o.rating === 'number' &&
            Number.isFinite(o.rating) &&
            o.rating >= Number(filters.minRating))),
    ),
    sort,
  )
}
export function searchFailure(error: unknown): {
  title: string
  message: string
} {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number(error.status)
      : null
  const title =
    status === 401
      ? 'Tu sesión necesita renovarse'
      : status === 403
        ? 'No tienes permiso para esta operación'
        : status === 429 || (status != null && status >= 500)
          ? 'El servicio no está disponible por el momento'
          : status === 0 || error instanceof TypeError
            ? 'No pudimos conectar con el servicio'
            : 'No pudimos completar la búsqueda'
  return {
    title,
    message:
      error instanceof Error
        ? error.message
        : 'Revisa tu conexión y vuelve a intentar.',
  }
}
export function flightProposalIssue(f: FlightOffer): string | null {
  if (
    f.price == null ||
    !Number.isFinite(f.price) ||
    f.price < 0 ||
    !f.currency
  )
    return 'Falta un precio o una moneda válidos para guardar esta propuesta.'
  if (
    !f.origin ||
    !f.destination ||
    !f.departureAt ||
    !f.arrivalAt ||
    !Number.isFinite(Date.parse(f.departureAt)) ||
    !Number.isFinite(Date.parse(f.arrivalAt))
  )
    return 'El proveedor no informó los datos completos del trayecto.'
  return null
}

export function hotelProposalIssue(hotel: HotelOffer): string | null {
  return hotel.price == null ||
    !Number.isFinite(hotel.price) ||
    hotel.price < 0 ||
    !hotel.currency
    ? 'El proveedor debe informar un precio y una moneda válidos antes de guardar esta propuesta.'
    : null
}
export function hotelLocationParams(
  destination: string,
  group?: {
    destino?: string | null
    destino_formatted_address?: string | null
    destino_latitud?: number | null
    destino_longitud?: number | null
    destino_place_id?: string | null
  } | null,
) {
  const clean = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  const matches =
    (!destination.trim() &&
      group?.destino_latitud != null &&
      group?.destino_longitud != null) ||
    [group?.destino, group?.destino_formatted_address].some(
      (value) => value && clean(value) === clean(destination),
    )
  return {
    latitude: matches ? (group?.destino_latitud ?? null) : null,
    longitude: matches ? (group?.destino_longitud ?? null) : null,
    placeId: matches ? (group?.destino_place_id ?? null) : null,
  }
}
export async function withSearchTimeout<T>(
  request: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Object.assign(
                new Error(
                  'El servicio tardó demasiado en responder. Vuelve a intentar cuando esté disponible.',
                ),
                { status: 504 },
              ),
            ),
          milliseconds,
        )
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
