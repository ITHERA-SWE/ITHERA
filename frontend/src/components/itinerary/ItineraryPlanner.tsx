import { ShareItineraryButton } from './ShareItineraryButton'
import { useRef, useState } from 'react'
import type { Group } from '../../types/groups'
import type { ItineraryDay } from '../../services/groups'
import { DayView, type DayViewProps } from '../ui/DayView/DayView'
import { chooseOverviewDay, localDateKey } from '../trip/editorial-data'
import { calendarLabel, itineraryDate } from './itinerary-data'
import { DayMap } from './DayMap'
import './itinerary.css'
type Props = {
  group: Group | null
  days: ItineraryDay[]
  selectedDay: number | null
  onSelect: (day: number) => void
  onSubgroups: () => void
  onExport: () => void
  onRefresh: () => void
  isReadOnly: boolean
  online: boolean
  dayActions: Omit<DayViewProps, 'dayNumber' | 'date' | 'activities'>
}
export function ItineraryPlanner({
  group,
  days,
  selectedDay,
  onSelect,
  onSubgroups,
  onExport,
  onRefresh,
  isReadOnly,
  online,
  dayActions,
}: Props) {
  const refs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [mapId, setMapId] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const selected = chooseOverviewDay(days, selectedDay, group?.fecha_inicio)
  const key = selected
    ? itineraryDate(group?.fecha_inicio, selected.dayNumber)
    : null
  const past = Boolean(key && key < localDateKey())
  const locked = Boolean(group?.modulo_itinerario_bloqueado)
  const editable = !isReadOnly && !past && !locked && online
  const confirmed = days.some((d) =>
    d.activities.some((a) => a.status === 'confirmada'),
  )
  const add = editable ? dayActions.onAddActivity : undefined
  return (
    <div className="atlas-itinerary-planner">
      <header className="atlas-planner-heading">
        <div>
          <p className="atlas-eyebrow">EL ATLAS DEL VIAJE / ITINERARIO</p>
          <h1>
            Cada día, <em>un nuevo capítulo.</em>
          </h1>
          <p>
            {group?.nombre}
            {group?.destino ? ` · ${group.destino}` : ''}
          </p>
          {group?.fecha_inicio && (
            <p>
              {calendarLabel(itineraryDate(group.fecha_inicio, 1))}
              {group.fecha_fin
                ? ` — ${calendarLabel(itineraryDate(group.fecha_fin, 1))}`
                : ''}
            </p>
          )}
        </div>
        <div className="atlas-planner-tools">
          <button
            className="atlas-button atlas-button-primary"
            disabled={!add || !selected}
            onClick={() => selected && add?.(selected.dayNumber)}
          >
            + Proponer actividad
          </button>
          <button
            className="atlas-button atlas-button-secondary"
            disabled={!confirmed}
            onClick={onExport}
          >
            Exportar confirmadas · PDF
          </button>
          {group?.id && (
            <ShareItineraryButton
              key={group.id}
              groupId={String(group.id)}
              online={online}
            />
          )}
          <button
            className="atlas-text-link"
            disabled={isReadOnly || locked}
            onClick={onSubgroups}
          >
            Programación de subgrupos ↗
          </button>
          <button className="atlas-text-link" onClick={onRefresh}>
            Actualizar agenda
          </button>
        </div>
      </header>
      {(isReadOnly || past || locked || !online) && (
        <p className="atlas-planner-notice" role="status">
          {isReadOnly
            ? 'Viaje de solo lectura. Puedes consultar sus actividades y exportar las confirmadas.'
            : locked
              ? 'El itinerario está bloqueado. Las operaciones de planificación están deshabilitadas.'
              : !online
                ? 'Sin conexión de colaboración. Reconecta para crear o modificar actividades.'
                : 'Día pasado. La programación se conserva para consulta.'}
        </p>
      )}
      {days.length === 0 ? (
        <section className="atlas-agenda-empty">
          <h2>No se recibió un calendario de días.</h2>
          <p>
            Verifica las fechas del viaje y actualiza la agenda. No se han
            creado días ficticios.
          </p>
          <button
            className="atlas-button atlas-button-secondary"
            onClick={onRefresh}
          >
            Actualizar calendario
          </button>
        </section>
      ) : (
        <>
          <nav className="atlas-planner-days" aria-label="Días del viaje">
            <div
              role="tablist"
              aria-label="Seleccionar día"
              onKeyDown={(e) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key))
                  return
                e.preventDefault()
                const index = days.findIndex(
                  (d) => d.dayNumber === selected?.dayNumber,
                )
                const next =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? days.length - 1
                      : (index +
                          (e.key === 'ArrowRight' ? 1 : -1) +
                          days.length) %
                        days.length
                onSelect(days[next].dayNumber)
                refs.current.get(days[next].dayNumber)?.focus()
                refs.current
                  .get(days[next].dayNumber)
                  ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
              }}
            >
              {days.map((d) => {
                const active = selected?.dayNumber === d.dayNumber
                return (
                  <button
                    key={d.dayNumber}
                    ref={(e) => {
                      if (e) refs.current.set(d.dayNumber, e)
                      else refs.current.delete(d.dayNumber)
                    }}
                    role="tab"
                    id={`atlas-day-tab-${d.dayNumber}`}
                    aria-selected={active}
                    aria-controls="atlas-day-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => onSelect(d.dayNumber)}
                  >
                    <span>Día {d.dayNumber}</span>
                    <strong>
                      {calendarLabel(
                        itineraryDate(group?.fecha_inicio, d.dayNumber),
                        true,
                      ) || d.date}
                    </strong>
                    <small>
                      {d.activities.length
                        ? `${d.activities.length} actividad(es)`
                        : 'Sin programación'}
                    </small>
                  </button>
                )
              })}
            </div>
          </nav>
          {selected && (
            <div
              className="atlas-planner-grid"
              id="atlas-day-panel"
              role="tabpanel"
              aria-labelledby={`atlas-day-tab-${selected.dayNumber}`}
              tabIndex={0}
            >
              <DayView
                key={selected.dayNumber}
                {...dayActions}
                dayNumber={selected.dayNumber}
                date={calendarLabel(key, true) || selected.date}
                activities={selected.activities}
                onAddActivity={add}
                onEdit={editable ? dayActions.onEdit : undefined}
                onDelete={editable ? dayActions.onDelete : undefined}
                onManageContext={
                  editable ? dayActions.onManageContext : undefined
                }
                isPastDay={past}
                actionsDisabled={!editable}
                actionsDisabledReason={
                  isReadOnly
                    ? 'Viaje de solo lectura'
                    : locked
                      ? 'Itinerario bloqueado'
                      : !online
                        ? 'Reconecta para modificar'
                        : 'Día pasado'
                }
                renderConfirmedActions={
                  editable ? dayActions.renderConfirmedActions : undefined
                }
                onLocate={(a) => {
                  setMapId(a.id)
                  mapRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  })
                }}
              />
              <div ref={mapRef}>
                <DayMap
                  key={`${group?.id}:${selected.dayNumber}`}
                  activities={selected.activities}
                  selectedId={mapId}
                  onSelect={(id) => {
                    setMapId(id)
                    document
                      .getElementById(`atlas-activity-${id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
export function ItineraryLoading() {
  return (
    <div
      className="atlas-itinerary-planner atlas-itinerary-loading"
      role="status"
      aria-busy="true"
    >
      <p className="atlas-eyebrow">ITINERARIO DEL VIAJE</p>
      <p>Cargando días, actividades y programación compartida…</p>
      <div className="atlas-planner-skeleton">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
export function ItineraryError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="atlas-itinerary-planner atlas-itinerary-error" role="alert">
      <p className="atlas-eyebrow">ITINERARIO DEL VIAJE</p>
      <h1>No pudimos cargar la agenda.</h1>
      <p>{message}</p>
      <button className="atlas-button atlas-button-primary" onClick={onRetry}>
        Reintentar itinerario
      </button>
    </div>
  )
}
