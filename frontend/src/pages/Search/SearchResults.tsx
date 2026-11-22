import { useEffect, useRef, useState } from 'react'
import type { FlightOffer, FlightSliceSummary } from '../../services/flights'
import type { HotelOffer } from '../../services/hotels'
import {
  buildStopsLabel,
  flightProposalIssue,
  hotelProposalIssue,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
  getPrimaryRoute,
  getReturnRoute,
} from './search-data'

export interface OfferState {
  proposed: boolean
  saving?: boolean
}
interface OfferActions {
  canPropose: boolean
  disabledReason: string
  onPropose: () => void
  onCompare: () => void
}

export function SearchSkeleton({ kind }: { kind: 'flights' | 'hotels' }) {
  return (
    <div
      className={`atlas-search-skeleton atlas-search-skeleton-${kind}`}
      role="status"
      aria-busy="true"
      aria-label={kind === 'flights' ? 'Buscando vuelos' : 'Buscando hoteles'}
    >
      <p>
        Consultando{' '}
        {kind === 'flights'
          ? 'opciones de vuelo con Duffel'
          : 'estancias con LiteAPI'}
        …
      </p>
      {[0, 1, 2].map((n) => (
        <div key={n} className="atlas-search-skeleton-row">
          {kind === 'hotels' && (
            <span className="atlas-search-skeleton-photo" />
          )}
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

export function HotelPhoto({
  src,
  name,
  large = false,
}: {
  src: string | null
  name: string
  large?: boolean
}) {
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const available = Boolean(src && failed !== src)
  return (
    <div
      className={`atlas-hotel-photo ${large ? 'atlas-hotel-photo-large' : ''}`}
      aria-busy={available && loaded !== src}
    >
      {available ? (
        <>
          <span
            className={
              loaded === src ? 'atlas-photo-ready' : 'atlas-photo-loading'
            }
            aria-hidden="true"
          />
          <img
            src={src!}
            alt={`Fotografía de ${name}`}
            loading={large ? 'eager' : 'lazy'}
            onLoad={() => setLoaded(src)}
            onError={() => setFailed(src)}
          />
        </>
      ) : (
        <div className="atlas-photo-fallback">
          <span aria-hidden="true">I.</span>
          <p>Fotografía no disponible</p>
        </div>
      )}
    </div>
  )
}

function RouteLine({
  route,
  label,
}: {
  route: FlightSliceSummary
  label: string
}) {
  return (
    <div className="atlas-flight-route">
      <span className="atlas-route-label">
        {label}
        <small>{formatDate(route.departureAt)}</small>
      </span>
      <div className="atlas-flight-end">
        <time>{formatTime(route.departureAt)}</time>
        <span title={route.originName ?? undefined}>
          {route.origin || 'Origen no informado'}
        </span>
      </div>
      <div className="atlas-flight-line">
        <span>{formatDuration(route.duration)}</span>
        <span className="atlas-route-rule" aria-hidden="true" />
        <strong>{buildStopsLabel(route.stops)}</strong>
      </div>
      <div className="atlas-flight-end">
        <time>{formatTime(route.arrivalAt)}</time>
        <span title={route.destinationName ?? undefined}>
          {route.destination || 'Destino no informado'}
        </span>
        <small>{formatDate(route.arrivalAt)}</small>
      </div>
    </div>
  )
}

export function FlightResult({
  flight,
  canPropose,
  disabledReason,
  onPropose,
  onCompare,
}: { flight: FlightOffer & OfferState } & OfferActions) {
  const outbound = getPrimaryRoute(flight),
    inbound = getReturnRoute(flight)
  const issue = flightProposalIssue(flight)
  return (
    <article
      className="atlas-flight-result"
      aria-label={`${flight.airline || 'Aerolínea no informada'}, ${outbound.origin || ''} a ${outbound.destination || ''}`}
    >
      <div className="atlas-flight-row">
        <div className="atlas-flight-airline">
          <span className="atlas-airline-code" aria-hidden="true">
            {flight.airlineCode ||
              flight.airline?.slice(0, 2).toUpperCase() ||
              '—'}
          </span>
          <h3>{flight.airline || 'Aerolínea no informada'}</h3>
          <p>{flight.flightNumber || 'Número no informado'}</p>
          <span
            className={`atlas-search-tag ${!flight.liveMode ? 'atlas-search-tag-test' : ''}`}
          >
            {flight.liveMode ? 'Oferta del proveedor' : 'Oferta en modo prueba'}
          </span>
        </div>
        <div className="atlas-flight-routes">
          <RouteLine route={outbound} label="IDA" />
          {inbound && <RouteLine route={inbound} label="REGRESO" />}
        </div>
        <div className="atlas-offer-price">
          <span>Total reportado</span>
          <strong>{formatPrice(flight.price, flight.currency)}</strong>
          <small>{flight.passengers?.total ?? 'Cantidad de'} pasajero(s)</small>
          <button
            className="atlas-button atlas-button-primary"
            onClick={flight.proposed ? onCompare : onPropose}
            disabled={
              Boolean(flight.saving) ||
              (!flight.proposed && (!canPropose || Boolean(issue)))
            }
            aria-describedby={`flight-issue-${flight.id}`}
          >
            {flight.saving
              ? 'Guardando propuesta…'
              : flight.proposed
                ? 'Ver en comparador'
                : 'Proponer vuelo'}
          </button>
          <small id={`flight-issue-${flight.id}`}>
            {flight.proposed
              ? 'Propuesta guardada para el grupo'
              : issue ||
                (!canPropose
                  ? disabledReason
                  : 'Guarda la alternativa para comparar y votar.')}
          </small>
        </div>
      </div>
      <details className="atlas-flight-details">
        <summary>Trayectos y condiciones informadas</summary>
        <div>
          <p className="atlas-flight-disclaimer">
            Horarios tal como los informa el proveedor, sin convertirlos a la
            zona de este dispositivo.
          </p>
          <dl>
            <div>
              <dt>Tarifa</dt>
              <dd>{flight.fareBrand || 'No informada'}</dd>
            </div>
            <div>
              <dt>Cabina</dt>
              <dd>{flight.cabinClass || 'No informada'}</dd>
            </div>
            {flight.aircraft && (
              <div>
                <dt>Aeronave</dt>
                <dd>{flight.aircraft}</dd>
              </div>
            )}
            {flight.baggage?.map((b, i) => (
              <div key={i}>
                <dt>
                  {b.type === 'checked'
                    ? 'Equipaje documentado'
                    : b.type === 'carry_on'
                      ? 'Equipaje de cabina'
                      : b.type}
                </dt>
                <dd>{b.quantity} pieza(s)</dd>
              </div>
            ))}
          </dl>
          {[outbound, ...(inbound ? [inbound] : [])].map(
            (route, index) =>
              route.segments.length > 0 && (
                <div key={index} className="atlas-segment-list">
                  <h4>{index ? 'Regreso' : 'Ida'} · segmentos</h4>
                  {route.segments.map((segment, i) => (
                    <p key={i}>
                      {segment.origin} → {segment.destination} ·{' '}
                      {formatTime(segment.departureAt)} —{' '}
                      {formatTime(segment.arrivalAt)}
                      {segment.airline ? ` · ${segment.airline}` : ''}
                      {segment.flightNumber
                        ? ` ${segment.flightNumber}`
                        : ''} · {formatDuration(segment.duration)}
                    </p>
                  ))}
                </div>
              ),
          )}
          <p>
            Las reglas de cambio y cancelación no se desglosan en esta búsqueda.
            Revisa las condiciones del proveedor antes de continuar.
          </p>
        </div>
      </details>
    </article>
  )
}

export function HotelResult({
  hotel,
  canPropose,
  disabledReason,
  onPropose,
  onCompare,
  onDetails,
}: { hotel: HotelOffer & OfferState; onDetails: () => void } & OfferActions) {
  const issue = hotelProposalIssue(hotel)
  return (
    <article className="atlas-hotel-result">
      <HotelPhoto src={hotel.photoUrl} name={hotel.name} />
      <div className="atlas-hotel-copy">
        <p className="atlas-eyebrow">
          {[hotel.city, hotel.country].filter(Boolean).join(' · ') ||
            'DESTINO DE LA BÚSQUEDA'}
        </p>
        <h3>
          <button className="atlas-title-link" onClick={onDetails}>
            {hotel.name}
          </button>
        </h3>
        <p>{hotel.address || 'Dirección no informada'}</p>
        <div className="atlas-hotel-facts">
          {typeof hotel.rating === 'number' && Number.isFinite(hotel.rating) ? (
            <span>
              <strong>{hotel.rating.toFixed(1)}</strong>{' '}
              {hotel.googleRating != null
                ? 'Calificación Google'
                : 'Valoración del proveedor'}
            </span>
          ) : (
            <span>Calificación no informada</span>
          )}
          {typeof hotel.googleUserRatingCount === 'number' && (
            <span>{hotel.googleUserRatingCount} reseñas Google</span>
          )}
        </div>
        <div className="atlas-hotel-features">
          {hotel.roomName && <span>{hotel.roomName}</span>}
          {hotel.boardName && <span>{hotel.boardName}</span>}
          {hotel.refundableTag && <span>{hotel.refundableTag}</span>}
          <span>{hotel.nights} noche(s)</span>
        </div>
        <button className="atlas-text-link" onClick={onDetails}>
          Habitaciones y condiciones <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="atlas-offer-price">
        <span>Total reportado</span>
        <strong>{formatPrice(hotel.price, hotel.currency)}</strong>
        <small>
          {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)}
        </small>
        <button
          className="atlas-button atlas-button-primary"
          onClick={hotel.proposed ? onCompare : onPropose}
          disabled={
            Boolean(hotel.saving) ||
            (!hotel.proposed &&
              (!canPropose || Boolean(hotelProposalIssue(hotel))))
          }
        >
          {hotel.saving
            ? 'Guardando propuesta…'
            : hotel.proposed
              ? 'Ver en comparador'
              : 'Proponer hotel'}
        </button>
        <small>
          {hotel.proposed
            ? 'Propuesta guardada para el grupo'
            : issue ||
              (!canPropose
                ? disabledReason
                : 'Proponer no confirma una reserva.')}
        </small>
      </div>
    </article>
  )
}

export function HotelDetails({
  hotel,
  onClose,
  onPropose,
  canPropose,
  disabledReason,
  onCompare,
}: { hotel: HotelOffer & OfferState; onClose: () => void } & OfferActions) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    element?.showModal()
    return () => {
      element?.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="atlas-hotel-dialog"
      aria-labelledby="atlas-hotel-detail-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="atlas-hotel-detail-heading">
        <div>
          <p className="atlas-eyebrow">TU ESTANCIA · DETALLES DEL PROVEEDOR</p>
          <h2 id="atlas-hotel-detail-title">{hotel.name}</h2>
          <p>{hotel.address || 'Dirección no informada'}</p>
        </div>
        <button
          className="atlas-button atlas-button-quiet"
          onClick={onClose}
          aria-label="Cerrar detalles del hotel"
          autoFocus
        >
          Cerrar ×
        </button>
      </div>
      <HotelPhoto src={hotel.photoUrl} name={hotel.name} large />
      <div className="atlas-hotel-detail-body">
        <div className="atlas-hotel-detail-summary">
          <p>
            {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)} ·{' '}
            {hotel.nights} noche(s)
          </p>
          <strong>{formatPrice(hotel.price, hotel.currency)}</strong>
        </div>
        <h3>Habitaciones y tarifas informadas</h3>
        <p className="atlas-search-muted">
          La propuesta utiliza la oferta principal mostrada. Este desglose
          permite consultar las demás tarifas; no cambia la habitación
          propuesta.
        </p>
        {hotel.rooms.length ? (
          hotel.rooms.map((room, i) => (
            <section className="atlas-room-rate" key={`${room.rateId}-${i}`}>
              <div>
                <h4>{room.name || 'Nombre de habitación no informado'}</h4>
                <p>
                  {room.boardName || 'Plan no informado'} ·{' '}
                  {room.refundableTag || 'Política no informada'}
                </p>
                <small>
                  Adultos: {room.adultCount ?? 'N/D'} · Niños:{' '}
                  {room.childCount ?? 'N/D'} · Ocupación máxima:{' '}
                  {room.maxOccupancy ?? 'N/D'}
                </small>
                {room.paymentTypes.length > 0 && (
                  <p>Métodos informados: {room.paymentTypes.join(', ')}</p>
                )}
              </div>
              <strong>
                {formatPrice(room.price, room.currency || hotel.currency)}
              </strong>
            </section>
          ))
        ) : (
          <p className="atlas-search-state">
            El proveedor no informó un desglose de habitaciones.
          </p>
        )}
        <div className="atlas-hotel-detail-action">
          <p>
            Guardar la propuesta no confirma disponibilidad ni cobra. Las
            compras y reservas de esta versión son simuladas.
          </p>
          <button
            className="atlas-button atlas-button-primary"
            onClick={hotel.proposed ? onCompare : onPropose}
            disabled={
              Boolean(hotel.saving) ||
              (!hotel.proposed &&
                (!canPropose || Boolean(hotelProposalIssue(hotel))))
            }
          >
            {hotel.saving
              ? 'Guardando…'
              : hotel.proposed
                ? 'Ver en comparador'
                : 'Proponer hotel'}
          </button>
          {!canPropose && !hotel.proposed && <p>{disabledReason}</p>}
        </div>
      </div>
    </dialog>
  )
}
