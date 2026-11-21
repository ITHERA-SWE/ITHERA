import { useState } from 'react'
import type { Activity } from '../ui/DayView/DayView'
import type { ItineraryDay } from '../../services/groups'
import type { Group } from '../../types/groups'
import type { VoteResult } from '../../services/proposals'
import {
  chooseOverviewDay,
  dayDateKey,
  formatEditorialDate,
  isExpiredProposal,
  localDateKey,
  pendingProposals,
  sortAgenda,
  uniqueProposals,
} from './editorial-data'
import './editorial.css'

export interface TripOverviewProps {
  group: Group | null
  days: ItineraryDay[]
  selectedDay: number | null
  memberCount?: number
  votes: Record<string, VoteResult>
  votesAvailable: boolean
  membersAvailable: boolean
  isReadOnly: boolean
  isOnline: boolean
  onSelectDay: (day: number) => void
  onPropose: (day: number) => void
  onItinerary: (day?: number) => void
  onDecisions: () => void
  onExplore: () => void
  onPeople: () => void
  onExport: () => void
  onComments: (activity: Activity) => void
  onVoteHistory: (activity: Activity) => void
  onRetry: () => void
}

function ActivityImage({ src, label }: { src?: string | null; label: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return src && src !== failedSrc ? (
    <img
      className="atlas-option-image"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <span className="atlas-option-fallback" aria-hidden="true">
      {label.slice(0, 1)}
    </span>
  )
}

export function EditorialLoading() {
  return (
    <div
      className="atlas-overview atlas-loading"
      role="status"
      aria-label="Cargando el resumen del viaje"
      aria-busy="true"
    >
      <span className="atlas-skeleton atlas-skeleton-hero" />
      <div className="atlas-overview-grid">
        {[0, 1].map((column) => (
          <section key={column}>
            <span className="atlas-skeleton atlas-skeleton-heading" />
            {[0, 1, 2].map((row) => (
              <span className="atlas-skeleton atlas-skeleton-row" key={row} />
            ))}
          </section>
        ))}
      </div>
      <span className="sr-only">Cargando destino, agenda y decisiones…</span>
    </div>
  )
}

export function EditorialError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="atlas-error" role="alert">
      <p className="atlas-eyebrow">Resumen del viaje</p>
      <h1>No pudimos abrir tu viaje</h1>
      <p>{message}</p>
      <button className="atlas-button atlas-button-primary" onClick={onRetry}>
        Volver a intentar
      </button>
    </div>
  )
}

export function TripDecisionRow({
  activity,
  votes,
  votesAvailable,
  membersAvailable,
  isReadOnly,
  onReview,
  onComments,
  onVoteHistory,
}: {
  activity: Activity
  votes?: VoteResult
  votesAvailable: boolean
  membersAvailable: boolean
  isReadOnly: boolean
  onReview: () => void
  onComments: () => void
  onVoteHistory: () => void
}) {
  const expired = isExpiredProposal(activity)
  const state =
    activity.status === 'confirmada'
      ? 'Confirmada'
      : expired
        ? 'Vencida'
        : isReadOnly
          ? 'Sin confirmar'
          : 'Por decidir'
  return (
    <article className="atlas-decision-row">
      <ActivityImage src={activity.image} label={activity.title} />
      <div className="atlas-decision-body">
        <span
          className={`atlas-status ${activity.status === 'confirmada' ? 'atlas-status-confirmed' : ''}`}
        >
          {state}
        </span>
        <h3>
          <button className="atlas-title-link" onClick={onReview}>
            {activity.title}
          </button>
        </h3>
        {activity.proposedBy && (
          <p className="atlas-meta">Propuesta por {activity.proposedBy}</p>
        )}
        {votesAvailable && votes ? (
          <p className="atlas-participation">
            {votes.votos_a_favor ?? votes.votos ?? 0} a favor ·{' '}
            {votes.votos_en_contra ?? 0} en contra
            {typeof votes.votos_pendientes === 'number'
              ? ` · ${votes.votos_pendientes} por participar`
              : ''}
          </p>
        ) : (
          <p className="atlas-meta">Participación no disponible</p>
        )}
        <div className="atlas-inline-actions">
          <button onClick={onComments}>Comentarios</button>
          <button
            onClick={onVoteHistory}
            disabled={!votesAvailable || !membersAvailable || !votes}
          >
            Ver votación
          </button>
        </div>
      </div>
    </article>
  )
}

export function TripOverview(props: TripOverviewProps) {
  const {
    group,
    days,
    selectedDay,
    memberCount,
    votes,
    votesAvailable,
    membersAvailable,
    isReadOnly,
    isOnline,
  } = props
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const destination =
    group?.destino || group?.destino_formatted_address || 'Destino por definir'
  const photo = group?.destino_photo_url
  const selected = chooseOverviewDay(days, selectedDay, group?.fecha_inicio)
  const agenda = sortAgenda(selected?.activities ?? [])
  const highlights = isReadOnly
    ? uniqueProposals(days).filter(
        (activity) => activity.status === 'confirmada',
      )
    : pendingProposals(days)
  const today = localDateKey()
  const availableDay =
    selected &&
    (dayDateKey(group?.fecha_inicio, selected.dayNumber) ?? '') >= today
      ? selected
      : days.find(
          (day) =>
            (dayDateKey(group?.fecha_inicio, day.dayNumber) ?? '') >= today,
        )
  const canPropose = Boolean(
    !isReadOnly &&
    isOnline &&
    !group?.modulo_itinerario_bloqueado &&
    availableDay,
  )
  const state = isReadOnly
    ? 'Viaje en modo lectura'
    : 'Planificación colaborativa'
  const memberLabel =
    typeof memberCount === 'number'
      ? `${memberCount} integrante${memberCount === 1 ? '' : 's'}`
      : 'Integrantes por consultar'
  const anyActivity = days.some((day) => day.activities.length > 0)
  const confirmed = days.some((day) =>
    day.activities.some(
      (activity) =>
        activity.kind !== 'subgroup-slot' && activity.status === 'confirmada',
    ),
  )
  return (
    <div className="atlas-overview">
      <header
        className={`atlas-hero ${!photo || failedPhoto === photo ? 'atlas-hero-fallback' : ''}`}
      >
        {photo && failedPhoto !== photo && (
          <img
            className="atlas-hero-image"
            src={photo}
            alt=""
            fetchPriority="high"
            onError={() => setFailedPhoto(photo)}
          />
        )}
        <div className="atlas-hero-shade" />
        <div className="atlas-hero-copy">
          <p className="atlas-eyebrow">
            {isReadOnly
              ? 'LAS HISTORIAS QUE COMPARTIMOS'
              : 'TU PRÓXIMA HISTORIA, JUNTOS'}
          </p>
          <h1>{group?.nombre || 'Tu viaje'}</h1>
          <p className="atlas-destination">{destination}</p>
          <div className="atlas-hero-meta">
            <span>
              {formatEditorialDate(group?.fecha_inicio)} —{' '}
              {formatEditorialDate(group?.fecha_fin)}
            </span>
            <span>{memberLabel}</span>
            <span>{state}</span>
          </div>
        </div>
        <div className="atlas-hero-index" aria-hidden="true">
          ITHERA <span>TRAVEL ATLAS</span>
        </div>
      </header>

      <div className="atlas-action-bar">
        <p>
          <span className="atlas-status-dot" />
          {isReadOnly
            ? 'Tu itinerario, para volver a recorrerlo.'
            : 'Un buen viaje empieza con una buena idea.'}
        </p>
        <div className="atlas-action-buttons">
          {canPropose && (
            <button
              className="atlas-button atlas-button-primary"
              onClick={() => props.onPropose(availableDay!.dayNumber)}
            >
              <span aria-hidden="true">＋</span> Proponer actividad
            </button>
          )}
          {confirmed && (
            <button
              className="atlas-button atlas-button-quiet"
              onClick={props.onExport}
            >
              Exportar itinerario <span aria-hidden="true">↗</span>
            </button>
          )}
          <button
            className="atlas-button atlas-button-quiet"
            onClick={props.onPeople}
          >
            {isReadOnly ? 'Ver integrantes' : 'Integrantes e invitaciones'}
          </button>
        </div>
      </div>
      {isReadOnly && (
        <p className="atlas-notice" role="status">
          Este viaje está{' '}
          {group?.estado === 'activo' ? 'en modo lectura' : group?.estado}.
          Puedes consultar su información; las acciones de edición están
          deshabilitadas.
        </p>
      )}
      {!isReadOnly && !isOnline && (
        <p className="atlas-notice" role="status">
          Sin conexión en tiempo real. Puedes consultar el viaje; reconecta para
          proponer y votar.
        </p>
      )}
      {!isReadOnly && group?.modulo_itinerario_bloqueado && (
        <p className="atlas-notice">
          El organizador ha bloqueado los cambios del itinerario.
        </p>
      )}
      {(!votesAvailable || !membersAvailable) && (
        <p className="atlas-notice" role="status">
          Parte de la información colaborativa no pudo actualizarse.{' '}
          <button onClick={props.onRetry}>Reintentar</button>
        </p>
      )}

      <div className="atlas-overview-grid">
        <section className="atlas-agenda" aria-labelledby="atlas-agenda-title">
          <div className="atlas-section-heading">
            <div>
              <p className="atlas-eyebrow">EL VIAJE TOMA FORMA</p>
              <h2 id="atlas-agenda-title">Tu agenda</h2>
            </div>
            <button
              className="atlas-text-link"
              onClick={() => props.onItinerary(selected?.dayNumber)}
            >
              Ver itinerario <span aria-hidden="true">↗</span>
            </button>
          </div>
          {days.length > 0 && (
            <div className="atlas-day-control">
              <label htmlFor="atlas-day">Explorar día</label>
              <select
                id="atlas-day"
                value={selected?.dayNumber ?? ''}
                onChange={(event) =>
                  props.onSelectDay(Number(event.target.value))
                }
              >
                {days.map((day) => (
                  <option value={day.dayNumber} key={day.dayNumber}>
                    Día {day.dayNumber} · {day.date}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selected && (
            <p className="atlas-day-caption">
              Día {selected.dayNumber} <span>{selected.date}</span>
            </p>
          )}
          {agenda.length > 0 ? (
            <ol className="atlas-timeline">
              {agenda.slice(0, 3).map((activity) => (
                <li key={activity.id}>
                  <time>{activity.time || 'Por definir'}</time>
                  <span className="atlas-timeline-dot" aria-hidden="true" />
                  <div>
                    <span className="atlas-activity-type">
                      {activity.category === 'transporte'
                        ? 'Transporte'
                        : activity.category === 'hospedaje'
                          ? 'Hospedaje'
                          : 'Experiencia'}
                    </span>
                    <h3>
                      <button
                        className="atlas-title-link"
                        onClick={() => props.onItinerary(selected?.dayNumber)}
                      >
                        {activity.title}
                      </button>
                    </h3>
                    <p>{activity.location || 'Ubicación por definir'}</p>
                    <span
                      className={`atlas-status ${activity.status === 'confirmada' ? 'atlas-status-confirmed' : ''}`}
                    >
                      {activity.status === 'confirmada'
                        ? 'Confirmada'
                        : isExpiredProposal(activity)
                          ? 'Propuesta vencida'
                          : 'Por confirmar'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="atlas-empty">
              <span className="atlas-empty-mark" aria-hidden="true">
                ✧
              </span>
              <h3>
                {anyActivity
                  ? 'Un día abierto a nuevas ideas'
                  : 'La primera página está por escribirse'}
              </h3>
              <p>
                {isReadOnly
                  ? 'No hay actividades registradas para este día.'
                  : 'Explora el destino o propone una actividad para empezar a organizarlo juntos.'}
              </p>
              {canPropose && (
                <button
                  className="atlas-text-link"
                  onClick={() => props.onPropose(availableDay!.dayNumber)}
                >
                  Proponer la primera actividad →
                </button>
              )}
            </div>
          )}
          {agenda.length > 3 && (
            <button
              className="atlas-text-link atlas-agenda-more"
              onClick={() => props.onItinerary(selected?.dayNumber)}
            >
              Ver las {agenda.length} actividades del día →
            </button>
          )}
        </section>

        <section
          className="atlas-decisions"
          aria-labelledby="atlas-decisions-title"
        >
          <div className="atlas-section-heading">
            <div>
              <p className="atlas-eyebrow">LAS MEJORES IDEAS SE COMPARTEN</p>
              <h2 id="atlas-decisions-title">
                {isReadOnly ? 'Acuerdos del viaje' : 'Por decidir'}
              </h2>
            </div>
            <span
              className="atlas-count"
              aria-label={`${highlights.length} propuestas ${isReadOnly ? 'confirmadas' : 'pendientes'}`}
            >
              {highlights.length}
            </span>
          </div>
          {highlights.length > 0 ? (
            highlights
              .slice(0, 3)
              .map((activity) => (
                <TripDecisionRow
                  key={activity.proposalId}
                  activity={activity}
                  votes={votes[String(activity.proposalId)]}
                  votesAvailable={votesAvailable}
                  membersAvailable={membersAvailable}
                  isReadOnly={isReadOnly}
                  onReview={() =>
                    props.onItinerary(
                      days.find((day) =>
                        day.activities.some((item) => item.id === activity.id),
                      )?.dayNumber,
                    )
                  }
                  onComments={() => props.onComments(activity)}
                  onVoteHistory={() => props.onVoteHistory(activity)}
                />
              ))
          ) : (
            <div className="atlas-empty atlas-empty-decisions">
              <span className="atlas-empty-mark" aria-hidden="true">
                ◇
              </span>
              <h3>
                {isReadOnly
                  ? 'Sin acuerdos confirmados'
                  : uniqueProposals(days).length
                    ? 'Sin decisiones pendientes'
                    : 'Las ideas comienzan contigo'}
              </h3>
              <p>
                {isReadOnly
                  ? 'Puedes consultar el historial en todas las decisiones.'
                  : uniqueProposals(days).length
                    ? 'Consulta las propuestas y los acuerdos del viaje.'
                    : 'Las propuestas del grupo aparecerán aquí para revisarlas juntos.'}
              </p>
            </div>
          )}
          <button
            className="atlas-text-link atlas-all-decisions"
            onClick={props.onDecisions}
          >
            Ver todas las decisiones <span aria-hidden="true">↗</span>
          </button>
        </section>
      </div>
      <footer className="atlas-overview-footer">
        <div>
          <p className="atlas-eyebrow">SIGUE EXPLORANDO</p>
          <h2>El destino es solo el comienzo.</h2>
          <p>Vuelos, hospedajes y lugares para darle forma al viaje.</p>
        </div>
        {!isReadOnly && (
          <button
            className="atlas-button atlas-button-secondary"
            onClick={props.onExplore}
          >
            Explorar opciones <span aria-hidden="true">↗</span>
          </button>
        )}
        <span className="atlas-footer-signature" aria-hidden="true">
          I.
        </span>
      </footer>
    </div>
  )
}

export function TripDecisions({
  days,
  votes,
  votesAvailable,
  membersAvailable,
  isReadOnly,
  onReview,
  onComments,
  onVoteHistory,
}: Pick<
  TripOverviewProps,
  | 'days'
  | 'votes'
  | 'votesAvailable'
  | 'membersAvailable'
  | 'isReadOnly'
  | 'onComments'
  | 'onVoteHistory'
> & { onReview: (activity: Activity) => void }) {
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'all'>(
    'pending',
  )
  const proposals = uniqueProposals(days)
  const filtered =
    filter === 'pending'
      ? pendingProposals(days)
      : filter === 'confirmed'
        ? proposals.filter((activity) => activity.status === 'confirmada')
        : proposals
  return (
    <div className="atlas-overview atlas-decision-page">
      <p className="atlas-eyebrow">PLANIFICACIÓN COLABORATIVA</p>
      <h1>Decidir, juntos.</h1>
      <p className="atlas-page-description">
        Revisa propuestas, conversaciones y decisiones confirmadas del viaje.
      </p>
      <div
        className="atlas-filter"
        role="group"
        aria-label="Filtrar decisiones"
      >
        {(
          [
            { id: 'pending', label: 'Pendientes' },
            { id: 'confirmed', label: 'Confirmadas' },
            { id: 'all', label: 'Todas' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!votesAvailable && (
        <p className="atlas-notice">
          No se pudo actualizar la participación. Abre el resumen para volver a
          intentar.
        </p>
      )}
      {filtered.length ? (
        <div className="atlas-decision-list">
          {filtered.map((activity) => (
            <TripDecisionRow
              key={activity.proposalId}
              activity={activity}
              votes={votes[String(activity.proposalId)]}
              votesAvailable={votesAvailable}
              membersAvailable={membersAvailable}
              isReadOnly={isReadOnly}
              onReview={() => onReview(activity)}
              onComments={() => onComments(activity)}
              onVoteHistory={() => onVoteHistory(activity)}
            />
          ))}
        </div>
      ) : (
        <div className="atlas-empty">
          <h2>No hay propuestas en esta sección</h2>
          <p>Los cambios del grupo se actualizarán aquí.</p>
        </div>
      )}
    </div>
  )
}
