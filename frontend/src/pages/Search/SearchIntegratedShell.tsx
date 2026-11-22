import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { TripNavigation } from '../../components/trip/TripNavigation'
import { useAuth } from '../../context/useAuth'
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor'
import { useSocket } from '../../hooks/useSocket'
import type { NavUserInfo } from '../../components/layout/Navbar'
import type { Group } from '../../types/groups'
import { travelPath } from './search-data'
import './search-editorial.css'

export function SearchIntegratedShell({
  children,
  group,
  user,
}: {
  children: ReactNode
  group?: Group | null
  user: NavUserInfo
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as {
    group?: Group
    groupId?: string | number
  } | null
  const groupId =
    new URLSearchParams(location.search).get('groupId') ||
    group?.id ||
    routeState?.group?.id ||
    routeState?.groupId
  const { accessToken } = useAuth()
  const online = useNetworkMonitor()
  const { isConnected } = useSocket(accessToken)
  const readOnly = ['finalizado', 'archivado', 'cerrado'].includes(
    group?.estado ?? '',
  )
  const goDashboard = (tab: string) =>
    navigate(travelPath('/dashboard', groupId, { tab }), {
      state: { group, groupId, activeTab: tab },
    })
  const go = (path: string, mode?: string) =>
    navigate(travelPath(path, groupId, mode ? { mode } : {}), {
      state: { group, groupId },
    })
  const links = [
    { label: 'Vuelos', path: '/search/flights-hotels', mode: 'flights' },
    { label: 'Hoteles', path: '/search/flights-hotels', mode: 'hotels' },
    { label: 'Lugares', path: '/search/map-places' },
    { label: 'Rutas y clima', path: '/search/routes-weather' },
    { label: 'Guardados', path: '/search/history' },
  ]
  const mode = new URLSearchParams(location.search).get('mode') ?? 'flights'
  return (
    <AppLayout
      editorial
      showTripSelector={Boolean(group)}
      showRightPanel={false}
      trip={
        group
          ? {
              name: group.nombre,
              subtitle:
                group.destino_formatted_address ||
                group.destino ||
                'Destino por definir',
              dates: `${group.fecha_inicio ?? ''} — ${group.fecha_fin ?? ''}`,
              people:
                typeof group.memberCount === 'number'
                  ? `${group.memberCount} integrantes`
                  : 'Integrantes del viaje',
            }
          : undefined
      }
      user={user}
      isOnline={online && isConnected}
      contextualNavigation={
        <>
          {group ? (
            <TripNavigation
              activeTab="buscar"
              tripName={group.nombre}
              isReadOnly={readOnly}
              isAdmin={group.myRole === 'admin'}
              onTabChange={goDashboard}
              onPeople={() => go('/grouppanel')}
              onSettings={() => go('/group-settings')}
              onSubgroups={() =>
                navigate(
                  travelPath('/dashboard', group.id, { tab: 'inicio' }),
                  {
                    state: {
                      group,
                      groupId: group.id,
                      activeTab: 'inicio',
                      dashboardView: 'subgrupos',
                    },
                  },
                )
              }
            />
          ) : (
            <div className="atlas-search-no-group">
              {groupId
                ? 'Contexto del viaje seleccionado.'
                : 'Exploración sin viaje seleccionado.'}{' '}
              <button onClick={() => navigate('/my-trips')}>
                Elegir un viaje
              </button>
            </div>
          )}
          <nav
            className="atlas-explore-nav"
            aria-label="Herramientas de exploración"
          >
            {links.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => go(link.path, link.mode)}
                aria-current={
                  location.pathname === link.path &&
                  (!link.mode || mode === link.mode)
                    ? 'page'
                    : undefined
                }
              >
                {link.label}
              </button>
            ))}
            <button
              className="atlas-explore-compare"
              onClick={() => goDashboard('comparar')}
              disabled={!group || readOnly}
            >
              Abrir comparador <span aria-hidden="true">↗</span>
            </button>
          </nav>
        </>
      }
    >
      <div className="atlas-search-scroll">{children}</div>
    </AppLayout>
  )
}
