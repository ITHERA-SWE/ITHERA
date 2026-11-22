import { useRef, useState } from 'react'
import type { Activity as DayActivity } from '../ui/DayView'
import { proposalsService } from '../../services/proposals'
import { useAuth } from '../../context/useAuth'
import { EditorialDialog } from '../collaboration/EditorialDialog'
import { formatMoney } from '../collaboration/proposal-data'
import '../collaboration/collaboration.css'
export interface ConfirmProposalModalProps {
  proposal: DayActivity
  onClose: () => void
  onConfirm: () => void
  isOnline?: boolean
  isReadOnly?: boolean
}
export function ConfirmProposalModal({
  proposal,
  onClose,
  onConfirm,
  isOnline = true,
  isReadOnly = false,
}: ConfirmProposalModalProps) {
  const { accessToken } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const confirm = async () => {
    if (
      !proposal.proposalId ||
      !accessToken ||
      lock.current ||
      !isOnline ||
      isReadOnly ||
      proposal.status === 'confirmada'
    )
      return
    lock.current = true
    setProcessing(true)
    setError('')
    try {
      await proposalsService.updateProposal(
        proposal.proposalId,
        { estado: 'confirmado' },
        accessToken,
      )
      onConfirm()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo registrar la confirmación. Revisa su estado antes de reintentar.',
      )
    } finally {
      lock.current = false
      setProcessing(false)
    }
  }
  return (
    <EditorialDialog
      title="Confirmar propuesta"
      onClose={onClose}
      busy={processing}
    >
      <div className="atlas-collab-confirm">
        <p className="atlas-eyebrow">REGISTRAR CONFIRMACIÓN</p>
        <h3>{proposal.title}</h3>
        <p>{formatMoney(proposal.price, proposal.currency)}</p>
        <p>
          Se enviará la confirmación al servidor y se aplicarán las
          restricciones existentes de la propuesta. Esta acción no realiza una
          compra ni una reserva.
        </p>
        {error && (
          <p className="atlas-collab-error" role="alert">
            {error}
          </p>
        )}
        {(!isOnline || isReadOnly) && (
          <p className="atlas-collab-notice">
            Reconecta y verifica que el viaje sea editable antes de confirmar.
          </p>
        )}
        <button
          className="atlas-button atlas-button-primary"
          disabled={
            processing ||
            !isOnline ||
            isReadOnly ||
            proposal.status === 'confirmada'
          }
          onClick={() => void confirm()}
        >
          {processing ? 'Confirmando…' : 'Registrar confirmación'}
        </button>
        <button
          className="atlas-button atlas-button-quiet"
          disabled={processing}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </EditorialDialog>
  )
}
