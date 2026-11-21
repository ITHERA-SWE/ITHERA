import { useRef } from 'react'

export interface TripNavigationProps {
  activeTab: string
  tripName: string
  isReadOnly: boolean
  isAdmin: boolean
  onTabChange: (tab: string) => void
  onPeople: () => void
  onSettings: () => void
  onSubgroups: () => void
}

export function TripNavigation({
  activeTab,
  tripName,
  isReadOnly,
  isAdmin,
  onTabChange,
  onPeople,
  onSettings,
  onSubgroups,
}: TripNavigationProps) {
  const menu = useRef<HTMLDetailsElement>(null)
  const choose = (action: () => void) => {
    if (menu.current) menu.current.open = false
    action()
  }
  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'inicio', label: 'Itinerario' },
    ...(!isReadOnly ? [{ id: 'buscar', label: 'Explorar' }] : []),
    { id: 'decisiones', label: 'Decisiones' },
    { id: 'personas', label: 'Personas' },
    { id: 'boveda', label: 'Archivos' },
  ]
  return (
    <div className="atlas-context">
      <span className="atlas-context-name" title={tripName}>
        {tripName}
      </span>
      <nav className="atlas-tabs" aria-label="Secciones del viaje">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() =>
              tab.id === 'personas' ? onPeople() : onTabChange(tab.id)
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <details
        className="atlas-tools"
        ref={menu}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.current) {
            menu.current.open = false
            menu.current.querySelector('summary')?.focus()
          }
        }}
      >
        <summary aria-label="Más herramientas del viaje">
          Más <span aria-hidden="true">⌄</span>
        </summary>
        <div className="atlas-tools-menu">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => choose(() => onTabChange('comparar'))}
            >
              Comparar y reservar
            </button>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => choose(() => onTabChange('mapas'))}
            >
              Mapa del itinerario
            </button>
          )}
          <button
            type="button"
            onClick={() => choose(() => onTabChange('pagar'))}
          >
            Finanzas del viaje
          </button>
          {!isReadOnly && (
            <button type="button" onClick={() => choose(onSubgroups)}>
              Horario de subgrupos
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={() => choose(onSettings)}>
              Configuración del viaje
            </button>
          )}
        </div>
      </details>
    </div>
  )
}
