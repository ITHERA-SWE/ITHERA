import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from 'react'
import type { ContextEntitySummary } from '../../../services/context-links'
import { EditorialDialog } from '../../collaboration/EditorialDialog'
import { formatMoney } from '../../collaboration/proposal-data'
import {
  activityPermissions,
  orderedActivities,
  scheduleConflicts,
  timeRange,
  mapUrl,
  dateInItineraryZone,
  calendarLabel,
  validCoordinates,
} from '../../itinerary/itinerary-data'
import '../../itinerary/itinerary.css'
export interface Activity {
  id: string
  kind?: 'activity' | 'subgroup-slot'
  proposalId?: string | null
  createdBy?: string | null
  hasVoted?: boolean
  myVote?: 'a_favor' | 'en_contra' | 'abstencion' | null
  title: string
  description: string
  category: 'transporte' | 'hospedaje' | 'actividad'
  status: 'confirmada' | 'pendiente'
  price: number
  currency: string
  time: string
  location?: string
  votes?: number
  votesFor?: number
  votesAgainst?: number
  pendingVotes?: number
  requiresAdminTieBreak?: boolean
  proposedBy?: string
  image: string
  externalReference?: string | null
  latitude?: number | null
  longitude?: number | null
  routeDistanceText?: string | null
  routeDurationText?: string | null
  routeTravelMode?: string | null
  adminDecisionType?: 'A' | 'B' | 'C' | null
  linkedContext?: ContextEntitySummary[]
  startsAt?: string | null
  endsAt?: string | null
  subgroupSlot?: {
    slotId: number
    startsAt: string
    endsAt: string
    groupCount: number
    participantCount: number
    targetSubgroupId?: number | null
  }
}

export interface DayViewProps {
  dayNumber: number
  date: string
  activities: Activity[]
  isActive?: boolean
  defaultExpanded?: boolean
  isExpanded?: boolean
  onSelect?: (dayNumber: number) => void
  onAccept?: (activityId: string) => void | Promise<void>
  onReject?: (activityId: string) => void | Promise<void>
  onDelete?: (activityId: string) => void | Promise<void>
  onEdit?: (activityId: string) => void
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
  currentUserId?: string | number | null
  currentUserRole?: 'admin' | 'viajero' | string | null
  onAddActivity?: (dayNumber: number) => void
  renderConfirmedActions?: (activity: Activity) => ReactNode
  renderPendingActions?: (activity: Activity) => ReactNode
  isPastDay?: boolean
  actionsDisabled?: boolean
  actionsDisabledReason?: string
  onDecisions?: (activity: Activity) => void
  onLocate?: (activity: Activity) => void
}

export interface DayViewHandle {
  scrollIntoView: () => void
}

export const DayView = forwardRef<DayViewHandle, DayViewProps>(
  function DayView(props, ref) {
    const {
      dayNumber,
      date,
      activities,
      onAddActivity,
      onEdit,
      onDelete,
      onManageContext,
      onOpenBudget,
      onOpenVault,
      currentUserId,
      currentUserRole,
      isPastDay = false,
      actionsDisabled = false,
      actionsDisabledReason,
      onDecisions,
      onLocate,
      renderConfirmedActions,
      renderPendingActions,
    } = props
    const root = useRef<HTMLDivElement>(null)
    const [filter, setFilter] = useState('todas')
    const [detailId, setDetailId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const lock = useRef(false)
    const [error, setError] = useState('')
    useImperativeHandle(
      ref,
      () => ({
        scrollIntoView() {
          root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
      }),
      [],
    )
    const ordered = orderedActivities(activities),
      conflicts = scheduleConflicts(activities)
    const visible = ordered.filter(
      (a) => filter === 'todas' || a.status === filter,
    )
    const detail = activities.find((a) => a.id === detailId)
    const run = async (
      id: string,
      callback?: (id: string) => void | Promise<void>,
    ) => {
      if (lock.current || actionsDisabled || !callback) return
      lock.current = true
      setBusy(true)
      setError('')
      try {
        await callback(id)
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'No se pudo completar la acción.',
        )
      } finally {
        lock.current = false
        setBusy(false)
      }
    }
    const tools = (a: Activity) => {
      const permissions = activityPermissions(a, currentUserId, currentUserRole)
      const disabled = busy || actionsDisabled || isPastDay
      const slot = a.kind === 'subgroup-slot'
      return (
        <div className="atlas-agenda-actions">
          <button onClick={() => setDetailId(a.id)}>Ver detalles</button>
          {onDecisions && a.proposalId && (
            <button onClick={() => onDecisions(a)}>
              Decisiones y conversación ↗
            </button>
          )}
          {onLocate && validCoordinates(a) && (
            <button onClick={() => onLocate(a)}>Ubicar en el mapa</button>
          )}
          {!slot && permissions.edit && onEdit && (
            <button
              disabled={disabled}
              title={actionsDisabledReason}
              onClick={() => onEdit(a.id)}
            >
              Editar actividad
            </button>
          )}
          {!slot && permissions.delete && onDelete && (
            <button
              disabled={disabled}
              title={actionsDisabledReason}
              onClick={() => void run(a.id, onDelete)}
            >
              Eliminar actividad
            </button>
          )}
          {slot
            ? renderConfirmedActions?.(a)
            : a.status === 'confirmada'
              ? renderConfirmedActions?.(a)
              : renderPendingActions?.(a)}
        </div>
      )
    }
    return (
      <section
        ref={root}
        className="atlas-day-agenda"
        aria-label={`Agenda del día ${dayNumber}`}
      >
        <header className="atlas-agenda-heading">
          <div>
            <p className="atlas-eyebrow">DÍA {dayNumber}</p>
            <h2>{date}</h2>
          </div>
          <span>{activities.length} actividad(es)</span>
        </header>
        <div className="atlas-agenda-filter" aria-label="Filtrar agenda">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'confirmada', label: 'Confirmadas' },
            { id: 'pendiente', label: 'Propuestas' },
          ].map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}{' '}
              <span>
                {f.id === 'todas'
                  ? activities.length
                  : activities.filter((a) => a.status === f.id).length}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="atlas-collab-error" role="alert">
            {error}
          </p>
        )}
        {conflicts.size > 0 && (
          <p className="atlas-planner-notice">
            Hay actividades con el mismo inicio o intervalos superpuestos.
            Revisa sus horarios; las validaciones del servidor se mantienen al
            guardar. Las propuestas simultáneas pueden ser alternativas.
          </p>
        )}
        {visible.length === 0 ? (
          <div className="atlas-agenda-empty">
            <h3>
              {activities.length
                ? 'Sin actividades con este filtro.'
                : 'Un día abierto a nuevas ideas.'}
            </h3>
            <p>
              {activities.length
                ? 'Cambia el filtro para consultar el resto de la agenda.'
                : isPastDay
                  ? 'Este día ya pasó; su agenda permanece disponible en modo consulta.'
                  : 'Añade un lugar, una visita o un traslado para comenzar a planificar.'}
            </p>
            {onAddActivity && !isPastDay && (
              <button
                className="atlas-button atlas-button-primary"
                disabled={actionsDisabled}
                onClick={() => onAddActivity(dayNumber)}
              >
                Proponer actividad
              </button>
            )}
          </div>
        ) : (
          <ol className="atlas-agenda-timeline">
            {visible.map((a, index) => {
              const t = timeRange(a),
                permissions = activityPermissions(
                  a,
                  currentUserId,
                  currentUserRole,
                ),
                slot = a.kind === 'subgroup-slot'
              return (
                <li
                  key={a.id}
                  id={`atlas-activity-${a.id}`}
                  className={`atlas-agenda-entry ${conflicts.has(a.id) ? 'atlas-agenda-conflict' : ''}`}
                >
                  <div className="atlas-agenda-clock">
                    {t.start ? (
                      <>
                        <strong>{t.start}</strong>
                        {t.end && <span>hasta {t.end}</span>}
                      </>
                    ) : (
                      <span>Hora pendiente</span>
                    )}
                    <i aria-hidden="true" />
                  </div>
                  <article>
                    <div className="atlas-agenda-kicker">
                      <span>
                        {slot
                          ? 'SUBGRUPOS'
                          : a.category === 'transporte'
                            ? 'TRASLADO'
                            : a.category === 'hospedaje'
                              ? 'HOSPEDAJE'
                              : 'ACTIVIDAD'}
                      </span>
                      <span
                        className={`atlas-agenda-status ${a.status === 'confirmada' ? 'is-confirmed' : ''}`}
                      >
                        {a.status === 'confirmada'
                          ? 'Confirmada en itinerario'
                          : 'Propuesta'}
                      </span>
                      {permissions.expired && <span>Horario transcurrido</span>}
                    </div>
                    <h3>{a.title}</h3>
                    {a.location && (
                      <p className="atlas-agenda-location">{a.location}</p>
                    )}
                    {a.description && (
                      <p className="atlas-agenda-description">
                        {a.description}
                      </p>
                    )}
                    {slot && a.subgroupSlot && (
                      <p>
                        {a.subgroupSlot.groupCount} opción(es) ·{' '}
                        {a.subgroupSlot.participantCount} participante(s)
                      </p>
                    )}
                    {!slot && a.proposedBy && (
                      <p className="atlas-agenda-author">
                        Propuesta por {a.proposedBy}
                      </p>
                    )}
                    {conflicts.has(a.id) && (
                      <p className="atlas-agenda-conflict-text">
                        Revisar coincidencia de horario
                      </p>
                    )}
                    {tools(a)}
                    <span className="atlas-agenda-order" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </article>
                </li>
              )
            })}
          </ol>
        )}
        {onAddActivity && !isPastDay && activities.length > 0 && (
          <button
            className="atlas-agenda-add"
            disabled={actionsDisabled}
            onClick={() => onAddActivity(dayNumber)}
          >
            + Añadir otra actividad al día {dayNumber}
          </button>
        )}
        {detail && (
          <EditorialDialog
            title="Detalle de actividad"
            onClose={() => setDetailId(null)}
          >
            <div className="atlas-activity-detail">
              <p className="atlas-eyebrow">
                {detail.kind === 'subgroup-slot'
                  ? 'PROGRAMACIÓN DE SUBGRUPOS'
                  : detail.status === 'confirmada'
                    ? 'CONFIRMADA EN ITINERARIO'
                    : 'PROPUESTA'}
              </p>
              <h3>{detail.title}</h3>
              {detail.description && <p>{detail.description}</p>}
              <dl>
                <dt>Fecha</dt>
                <dd>{date}</dd>
                <dt>Horario</dt>
                <dd>
                  {timeRange(detail).start ?? 'Inicio no informado'}
                  {timeRange(detail).end
                    ? ` — ${timeRange(detail).end}`
                    : ' · Sin hora de fin distinta informada'}
                </dd>
                {detail.endsAt &&
                  detail.startsAt &&
                  dateInItineraryZone(detail.endsAt) !==
                    dateInItineraryZone(detail.startsAt) && (
                    <>
                      <dt>Fecha de fin</dt>
                      <dd>
                        {calendarLabel(dateInItineraryZone(detail.endsAt))}
                      </dd>
                    </>
                  )}
                {detail.location && (
                  <>
                    <dt>Ubicación</dt>
                    <dd>{detail.location}</dd>
                  </>
                )}
                {detail.kind !== 'subgroup-slot' && (
                  <>
                    <dt>Importe informado</dt>
                    <dd>{formatMoney(detail.price, detail.currency)}</dd>
                  </>
                )}
              </dl>
              <p>
                Confirmar una actividad en el itinerario no equivale a una
                compra ni a una reserva con un proveedor.
              </p>
              {mapUrl(detail) && (
                <a
                  className="atlas-text-link"
                  href={mapUrl(detail)!}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir ubicación ↗
                </a>
              )}
              {detail.routeDistanceText && (
                <p>
                  Traslado informado: {detail.routeDistanceText}
                  {detail.routeDurationText
                    ? ` · ${detail.routeDurationText}`
                    : ''}
                </p>
              )}
              {detail.linkedContext?.length ? (
                <section>
                  <h4>Gastos y documentos vinculados</h4>
                  {detail.linkedContext.map((e) => (
                    <button
                      className="atlas-text-link"
                      key={`${e.type}:${e.id}`}
                      onClick={
                        e.type === 'expense' ? onOpenBudget : onOpenVault
                      }
                    >
                      {e.type === 'expense' ? 'Gasto' : 'Documento'}: {e.label}{' '}
                      ↗
                    </button>
                  ))}
                </section>
              ) : null}
              {onManageContext &&
                activityPermissions(detail, currentUserId, currentUserRole)
                  .edit &&
                !isPastDay && (
                  <button
                    className="atlas-button atlas-button-secondary"
                    disabled={actionsDisabled}
                    onClick={() => {
                      setDetailId(null)
                      onManageContext(detail)
                    }}
                  >
                    Editar y gestionar vínculos
                  </button>
                )}
              {detail.proposalId && onDecisions && (
                <button
                  className="atlas-button atlas-button-primary"
                  onClick={() => onDecisions(detail)}
                >
                  Abrir decisiones, votos y comentarios ↗
                </button>
              )}
            </div>
          </EditorialDialog>
        )}
      </section>
    )
  },
)
