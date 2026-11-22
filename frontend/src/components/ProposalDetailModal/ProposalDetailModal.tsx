import { useCallback, useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { Activity as DayActivity } from '../ui/DayView'
import {
  proposalsService,
  type ProposalComment,
  type VoteResult,
} from '../../services/proposals'
import { useAuth } from '../../context/useAuth'
import { EditorialDialog } from '../collaboration/EditorialDialog'
import {
  formatCommentDate,
  formatMoney,
  uniqueComments,
  voteLabel,
} from '../collaboration/proposal-data'
import { isExpiredProposal } from '../trip/editorial-data'
import '../collaboration/collaboration.css'
export interface ProposalDetailModalProps {
  proposal: DayActivity
  tripId: string
  onClose: () => void
  onAccept: () => void
  socket?: Socket | null
  isOnline?: boolean
  isReadOnly?: boolean
  onUpdated?: () => void
}
export function ProposalDetailModal({
  proposal,
  tripId,
  onClose,
  onAccept,
  socket,
  isOnline = true,
  isReadOnly = false,
  onUpdated,
}: ProposalDetailModalProps) {
  const { accessToken } = useAuth()
  const [comments, setComments] = useState<ProposalComment[]>([])
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState<VoteResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [voted, setVoted] = useState(false)
  const lock = useRef(false)
  const sequence = useRef(0)
  const reload = useCallback(async () => {
    if (!accessToken || !proposal.proposalId) return
    const version = ++sequence.current
    setLoading(true)
    try {
      const [c, v] = await Promise.all([
        proposalsService.getComments(tripId, proposal.proposalId, accessToken),
        proposalsService.getVoteResults(tripId, accessToken),
      ])
      if (version !== sequence.current) return
      setComments(uniqueComments(c.comments))
      setResult(
        v.results.find(
          (item) => String(item.id_propuesta) === String(proposal.proposalId),
        ) ?? null,
      )
      setError('')
    } catch (e) {
      if (version === sequence.current)
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo actualizar la conversación.',
        )
    } finally {
      if (version === sequence.current) setLoading(false)
    }
  }, [accessToken, proposal.proposalId, tripId])
  useEffect(() => {
    const generation = sequence
    void reload()
    return () => {
      generation.current++
    }
  }, [reload])
  useEffect(() => {
    if (!socket) return
    const change = (payload: {
      proposalId?: string | number
      entidadId?: string | number
      grupoId?: string | number
      groupId?: string | number
    }) => {
      const group = payload.grupoId ?? payload.groupId
      if (group != null && String(group) !== String(tripId)) return
      if (
        String(payload.proposalId ?? payload.entidadId) ===
        String(proposal.proposalId)
      )
        void reload()
    }
    const events = [
      'proposal_comment_created',
      'proposal_comment_updated',
      'proposal_comment_deleted',
      'vote_updated',
    ]
    events.forEach((event) => socket.on(event, change))
    return () => {
      events.forEach((event) => socket.off(event, change))
    }
  }, [socket, tripId, proposal.proposalId, reload])
  const writable =
    isOnline &&
    !isReadOnly &&
    proposal.status !== 'confirmada' &&
    !isExpiredProposal(proposal)
  const vote = async (value: 'a_favor' | 'en_contra') => {
    if (
      !writable ||
      loading ||
      Boolean(error) ||
      ['aprobada', 'descartada'].includes(result?.estado_actual ?? '') ||
      !result ||
      result.mi_voto ||
      voted ||
      lock.current ||
      !accessToken ||
      !proposal.proposalId
    )
      return
    lock.current = true
    setBusy(true)
    try {
      await proposalsService.voteProposal(
        tripId,
        proposal.proposalId,
        { voto: value },
        accessToken,
      )
      setVoted(true)
      await reload()
      onUpdated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el voto.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const send = async () => {
    if (
      !draft.trim() ||
      !isOnline ||
      isReadOnly ||
      lock.current ||
      !accessToken ||
      !proposal.proposalId
    )
      return
    lock.current = true
    setBusy(true)
    try {
      await proposalsService.addComment(
        tripId,
        proposal.proposalId,
        { contenido: draft.trim() },
        accessToken,
      )
      setDraft('')
      await reload()
      onUpdated?.()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo publicar el comentario.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <EditorialDialog
      title="Detalle de la actividad"
      onClose={onClose}
      busy={busy}
    >
      <div className="atlas-legacy-proposal">
        <p className="atlas-eyebrow">PROPUESTA DEL ITINERARIO</p>
        <h3>{proposal.title}</h3>
        <p>{proposal.description || 'Sin descripción adicional.'}</p>
        <p>
          {proposal.time} · {proposal.location || 'Ubicación no informada'}
        </p>
        <p>{formatMoney(proposal.price, proposal.currency)}</p>
        {error && (
          <p className="atlas-collab-error" role="alert">
            {error}{' '}
            <button className="atlas-text-link" onClick={() => void reload()}>
              Reintentar
            </button>
          </p>
        )}
        {loading && (
          <p role="status">Actualizando conversación y participación…</p>
        )}
        <p>{result ? voteLabel(result) : 'Participación no disponible'}</p>
        {result && (
          <p>
            {result.votos_a_favor} a favor · {result.votos_en_contra} en contra
          </p>
        )}
        <div className="atlas-vote-buttons">
          <button
            disabled={
              busy ||
              loading ||
              !writable ||
              Boolean(error) ||
              ['aprobada', 'descartada'].includes(
                result?.estado_actual ?? '',
              ) ||
              !result ||
              Boolean(result.mi_voto) ||
              voted
            }
            onClick={() => void vote('a_favor')}
          >
            A favor
          </button>
          <button
            disabled={
              busy ||
              loading ||
              !writable ||
              Boolean(error) ||
              ['aprobada', 'descartada'].includes(
                result?.estado_actual ?? '',
              ) ||
              !result ||
              Boolean(result.mi_voto) ||
              voted
            }
            onClick={() => void vote('en_contra')}
          >
            En contra
          </button>
        </div>
        <section className="atlas-comments">
          <h3>Conversación</h3>
          {!loading && !error && comments.length === 0 && (
            <p>Aún no hay comentarios.</p>
          )}
          {comments.map((comment) => (
            <article key={comment.id} className="atlas-comment">
              <header>
                <strong>{comment.authorName || 'Integrante'}</strong>
                {comment.createdAt && (
                  <time>{formatCommentDate(comment.createdAt)}</time>
                )}
              </header>
              <p>{comment.contenido}</p>
            </article>
          ))}
          <form
            className="atlas-comment-compose"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <label htmlFor="atlas-activity-comment">Tu comentario</label>
            <textarea
              id="atlas-activity-comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy || !isOnline || isReadOnly}
            />
            <button
              className="atlas-button atlas-button-primary"
              disabled={busy || !draft.trim() || !isOnline || isReadOnly}
            >
              Publicar comentario
            </button>
          </form>
        </section>
        <button
          className="atlas-button atlas-button-secondary"
          disabled={busy || !writable}
          onClick={onAccept}
        >
          Confirmar propuesta
        </button>
      </div>
    </EditorialDialog>
  )
}
