import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { TripNavigation } from '../../components/trip/TripNavigation'
import { CheckoutSummaryCard } from '../../components/checkout/CheckoutSummaryCard'
import { PaymentCardForm } from '../../components/checkout/PaymentCardForm'
import { PurchaseSuccessModal } from '../../components/checkout/PurchaseSuccessModal'
import { useAuth } from '../../context/useAuth'
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor'
import {
  checkoutService,
  type SimulatedCheckoutPayload,
  type SimulatedCheckoutResult,
} from '../../services/checkout'
import { proposalsService, type Proposal } from '../../services/proposals'
import { groupsService } from '../../services/groups'
import type { Group } from '../../types/groups'
import { travelPath, withSearchTimeout } from '../Search/search-data'
import { simulationComplete } from '../../components/collaboration/proposal-data'
import '../../components/collaboration/collaboration.css'

function CheckoutSession({
  type,
  proposalId,
}: {
  type?: string
  proposalId?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, sessionUser, localUser } = useAuth()
  const online = useNetworkMonitor()
  const [data, setData] = useState<{ proposal: Proposal; group: Group } | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulatedCheckoutResult | null>(null)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const life = useRef(true)
  const requestedGroup = new URLSearchParams(location.search).get('groupId')
  useEffect(() => {
    life.current = true
    return () => {
      life.current = false
    }
  }, [])
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (
          !accessToken ||
          !proposalId ||
          !['flight', 'hotel'].includes(type ?? '')
        )
          throw new Error('La ruta de simulación no es válida.')
        const response = await withSearchTimeout(
          proposalsService.getProposal(proposalId, accessToken),
          15000,
        )
        const proposal = response.proposal
        if (proposal.tipo !== (type === 'flight' ? 'vuelo' : 'hospedaje'))
          throw new Error('El tipo de checkout no coincide con la propuesta.')
        if (requestedGroup && String(proposal.groupId) !== requestedGroup)
          throw new Error('La propuesta no corresponde al viaje solicitado.')
        const group = await withSearchTimeout(
          groupsService.getGroupDetails(proposal.groupId, accessToken),
          12000,
        )
        if (String(group.group.id) !== String(proposal.groupId))
          throw new Error('No se pudo verificar el grupo de la propuesta.')
        if (active) {
          setData({ proposal, group: group.group })
          setError(null)
        }
      } catch (e) {
        if (active) {
          setData(null)
          setError(
            e instanceof Error ? e.message : 'No se pudo abrir la simulación.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [accessToken, proposalId, type, requestedGroup, retry])
  const group = data?.group
  const proposal = data?.proposal
  const readOnly = ['finalizado', 'cerrado', 'archivado'].includes(
    group?.estado ?? '',
  )
  const approved = proposal?.estado === 'aprobada'
  const completed = proposal ? simulationComplete(proposal) : false
  const back = () =>
    !group && !requestedGroup
      ? navigate('/my-trips')
      : navigate(
          travelPath('/dashboard', group?.id || requestedGroup, {
            tab: 'comparar',
          }),
        )
  const go = (tab: string) =>
    navigate(travelPath('/dashboard', group?.id || requestedGroup, { tab }), {
      state: { group, groupId: group?.id, activeTab: tab },
    })
  const disabled =
    !data || !approved || completed || readOnly || !online || Boolean(result)
  const submit = async (payload: SimulatedCheckoutPayload) => {
    if (!accessToken || !proposalId || lock.current || disabled) return
    lock.current = true
    setProcessing(true)
    setError(null)
    try {
      const response =
        type === 'flight'
          ? await checkoutService.simulateFlightPayment(
              proposalId,
              payload,
              accessToken,
            )
          : await checkoutService.simulateHotelReservation(
              proposalId,
              payload,
              accessToken,
            )
      if (life.current) setResult(response.data)
    } catch (e) {
      if (life.current)
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo completar la simulación. Revisa el estado antes de reintentar.',
        )
    } finally {
      lock.current = false
      if (life.current) setProcessing(false)
    }
  }
  return (
    <AppLayout
      editorial
      user={{
        name: localUser?.nombre || localUser?.email || 'Usuario',
        initials: (localUser?.nombre || 'U').slice(0, 2).toUpperCase(),
        role: group?.myRole === 'admin' ? 'Organizador' : 'Viajero',
      }}
      trip={
        group
          ? {
              name: group.nombre,
              subtitle: group.destino || 'Destino por definir',
              dates: '',
              people: '',
            }
          : undefined
      }
      showTripSelector={false}
      isOnline={online}
      contextualNavigation={
        group ? (
          <TripNavigation
            activeTab="decisiones"
            tripName={group.nombre}
            isAdmin={group.myRole === 'admin'}
            isReadOnly={readOnly}
            onTabChange={go}
            onPeople={() => navigate(travelPath('/grouppanel', group.id))}
            onSettings={() => navigate(travelPath('/group-settings', group.id))}
            onSubgroups={() =>
              navigate(travelPath('/dashboard', group.id, { tab: 'inicio' }), {
                state: { groupId: group.id, group, dashboardView: 'subgrupos' },
              })
            }
          />
        ) : undefined
      }
    >
      <div className="atlas-checkout">
        <button
          className="atlas-text-link"
          disabled={processing}
          onClick={back}
        >
          ← Volver al comparador
        </button>
        <p className="atlas-eyebrow">ITHERA / SIMULACIÓN</p>
        <h1>
          {type === 'hotel'
            ? 'Tu estancia, en una simulación.'
            : 'Tu vuelo, en una simulación.'}
        </h1>
        <p className="atlas-checkout-intro">
          Esta operación no cobra dinero, no emite boletos y no confirma
          reservas reales. El flujo existente puede generar el comprobante y el
          gasto asociado en el grupo; sus efectos financieros se conservan.
        </p>
        {loading ? (
          <div className="atlas-collab-loading" role="status" aria-busy="true">
            <p>Verificando propuesta y viaje…</p>
            <div className="atlas-collab-skeleton-grid">
              <span />
              <span />
            </div>
          </div>
        ) : (
          <>
            {error && (
              <p className="atlas-collab-error" role="alert">
                {error}
              </p>
            )}
            {!data ? (
              <button
                className="atlas-button atlas-button-primary"
                onClick={() => {
                  setLoading(true)
                  setRetry((n) => n + 1)
                }}
              >
                Reintentar carga
              </button>
            ) : (
              <>
                {!approved && (
                  <p className="atlas-collab-notice">
                    Esta propuesta no está aprobada. Regresa a las decisiones
                    del grupo para revisar su estado.
                  </p>
                )}
                {completed && (
                  <p className="atlas-collab-notice">
                    Esta operación ya está confirmada en simulación. Consulta su
                    comprobante en Archivos.
                  </p>
                )}
                {readOnly && (
                  <p className="atlas-collab-notice">
                    El viaje está en solo lectura. La simulación está
                    deshabilitada.
                  </p>
                )}
                {!online && (
                  <p className="atlas-collab-notice">
                    Sin conexión. Reconecta antes de confirmar la simulación.
                  </p>
                )}
                <div className="atlas-checkout-grid">
                  <CheckoutSummaryCard proposal={data.proposal} />
                  <PaymentCardForm
                    mode={type === 'hotel' ? 'hospedaje' : 'vuelo'}
                    loading={processing}
                    disabled={disabled}
                    defaultEmail={sessionUser?.email || localUser?.email || ''}
                    onSubmit={submit}
                  />
                </div>
              </>
            )}
          </>
        )}
        {result && (
          <PurchaseSuccessModal
            result={result}
            mode={type === 'hotel' ? 'hospedaje' : 'vuelo'}
            onClose={back}
          />
        )}
      </div>
    </AppLayout>
  )
}
export function CheckoutPage() {
  const { type, proposalId } = useParams()
  return (
    <CheckoutSession
      key={`${type}:${proposalId}`}
      type={type}
      proposalId={proposalId}
    />
  )
}
