import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from '../../types/groups'
import { useAuth } from '../../context/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor'
import { useGroupRealtimeRefresh } from '../../hooks/useGroupRealtimeRefresh'
import {
  proposalsService,
  type Proposal,
  type ProposalComment,
  type VoteResult,
} from '../../services/proposals'
import { budgetService, type BudgetSummary } from '../../services/budget'
import { withSearchTimeout } from '../../pages/Search/search-data'
import { uniqueComments, votingClosed } from './proposal-data'

export function useProposalWorkspace(group: Group | null) {
  const { accessToken, localUser } = useAuth()
  const { socket } = useSocket(accessToken)
  const online = useNetworkMonitor()
  const groupId = String(group?.id ?? '')
  const userId = String(localUser?.id_usuario ?? '')
  const admin = group?.myRole === 'admin'
  const readOnly = ['cerrado', 'archivado', 'finalizado'].includes(
    group?.estado ?? '',
  )
  const writable = Boolean(
    groupId && online && !readOnly && !group?.modulo_itinerario_bloqueado,
  )
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votes, setVotes] = useState<VoteResult[]>([])
  const [votesAvailable, setVotesAvailable] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [budget, setBudget] = useState<BudgetSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const mutation = useRef(false)
  const localVotes = useRef(new Set<string>())
  const life = useRef({
    active: true,
    generation: 0,
    comments: new Map<string, number>(),
  })
  const [comments, setComments] = useState<Record<string, ProposalComment[]>>(
    {},
  )
  const [commentStates, setCommentStates] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<{
    proposalId: string
    comment: ProposalComment
    text: string
  } | null>(null)
  const [editing, setEditing] = useState<{
    proposal: Proposal
    title: string
    description: string
  } | null>(null)
  const [confirmation, setConfirmation] = useState<{
    kind: 'delete-proposal' | 'decision' | 'delete-comment'
    proposal: Proposal
    decision?: 'aprobar' | 'rechazar'
    comment?: ProposalComment
  } | null>(null)
  useEffect(() => {
    const guard = life.current
    guard.active = true
    return () => {
      guard.active = false
      guard.generation++
      guard.comments.clear()
    }
  }, [])
  const reload = useCallback(async () => {
    if (!accessToken || !groupId) {
      setError('Selecciona un viaje para abrir sus propuestas.')
      setLoading(false)
      return false
    }
    const sequence = ++life.current.generation
    setRefreshing(true)
    try {
      const [p, v, b] = await Promise.allSettled([
        withSearchTimeout(
          proposalsService.getGroupProposals(groupId, accessToken),
          15000,
        ),
        withSearchTimeout(
          proposalsService.getVoteResults(groupId, accessToken),
          15000,
        ),
        withSearchTimeout(
          budgetService.getDashboard(groupId, accessToken),
          15000,
        ),
      ])
      if (!life.current.active || sequence !== life.current.generation)
        return false
      if (p.status !== 'fulfilled') throw p.reason
      if (p.value.proposals.some((item) => String(item.groupId) !== groupId))
        throw new Error('Las propuestas no corresponden al viaje seleccionado.')
      setProposals(p.value.proposals)
      setVotes(v.status === 'fulfilled' ? v.value.results : [])
      setVotesAvailable(v.status === 'fulfilled')
      setBudget(b.status === 'fulfilled' ? b.value.summary : null)
      setFresh(true)
      setError(null)
      return true
    } catch (e) {
      if (life.current.active && sequence === life.current.generation) {
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudieron actualizar las propuestas.',
        )
        setFresh(false)
      }
      return false
    } finally {
      if (life.current.active && sequence === life.current.generation) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [accessToken, groupId])
  useEffect(() => {
    void reload()
  }, [reload])
  const loadComments = useCallback(
    async (id: string) => {
      if (!accessToken || !groupId) return
      const sequence = (life.current.comments.get(id) ?? 0) + 1
      life.current.comments.set(id, sequence)
      setCommentStates((prev) => ({
        ...prev,
        [id]: { loading: true, error: null },
      }))
      try {
        const response = await withSearchTimeout(
          proposalsService.getComments(groupId, id, accessToken),
          12000,
        )
        if (life.current.active && life.current.comments.get(id) === sequence) {
          setComments((prev) => ({
            ...prev,
            [id]: uniqueComments(response.comments),
          }))
          setCommentStates((prev) => ({
            ...prev,
            [id]: { loading: false, error: null },
          }))
        }
      } catch (e) {
        if (life.current.active && life.current.comments.get(id) === sequence)
          setCommentStates((prev) => ({
            ...prev,
            [id]: {
              loading: false,
              error:
                e instanceof Error
                  ? e.message
                  : 'No se pudo cargar la conversación.',
            },
          }))
      }
    },
    [accessToken, groupId],
  )
  useGroupRealtimeRefresh({
    socket,
    groupId,
    events: ['dashboard_updated', 'vote_updated', 'checkout_updated'],
    debounceMs: 700,
    onRefresh: async (payload) => {
      await reload()
      const id = String(payload.entidadId ?? '')
      if (id && proposals.some((p) => p.id === id)) await loadComments(id)
    },
  })
  useEffect(() => {
    if (!socket) return
    const changed = (payload: {
      grupoId?: string | number
      groupId?: string | number
      proposalId?: string | number
      entidadId?: string | number
    }) => {
      const scope = payload.grupoId ?? payload.groupId
      if (scope != null && String(scope) !== groupId) return
      const id = String(payload.proposalId ?? payload.entidadId ?? '')
      if (proposals.some((p) => p.id === id)) void loadComments(id)
    }
    const events = [
      'proposal_comment_created',
      'proposal_comment_updated',
      'proposal_comment_deleted',
    ]
    events.forEach((e) => socket.on(e, changed))
    return () => {
      events.forEach((e) => socket.off(e, changed))
    }
  }, [socket, groupId, proposals, loadComments])
  const results = useMemo(
    () => new Map(votes.map((v) => [String(v.id_propuesta), v])),
    [votes],
  )
  const canManage = (p: Proposal) =>
    writable && (admin || String(p.creadoPor ?? p.creado_por) === userId)
  const canManageComment = (comment: ProposalComment) =>
    writable && String(comment.usuarioId) === userId
  const canVote = (p: Proposal) =>
    writable &&
    fresh &&
    votesAvailable &&
    results.has(p.id) &&
    !votingClosed(p) &&
    !results.get(p.id)?.mi_voto &&
    !localVotes.current.has(p.id)
  const mutate = async (
    key: string,
    operation: () => Promise<void>,
    message: string,
    refresh = true,
  ) => {
    if (!accessToken || !writable || !fresh || mutation.current) return
    mutation.current = true
    setBusy(key)
    setError(null)
    setSuccess(null)
    try {
      await operation()
      if (!life.current.active) return
      if (refresh) {
        const updated = await reload()
        setSuccess(
          updated
            ? message
            : 'La operación se registró. Recarga para actualizar los datos.',
        )
      } else setSuccess(message)
    } catch (e) {
      if (life.current.active)
        setError(
          e instanceof Error ? e.message : 'No se pudo completar la operación.',
        )
    } finally {
      mutation.current = false
      if (life.current.active) setBusy(null)
    }
  }
  const vote = (p: Proposal, value: 'a_favor' | 'en_contra' | 'abstencion') => {
    if (!canVote(p)) return
    return mutate(
      `${p.id}-vote`,
      async () => {
        await proposalsService.voteProposal(
          groupId,
          p.id,
          { voto: value },
          accessToken!,
        )
        localVotes.current.add(p.id)
      },
      'Tu voto quedó registrado.',
    )
  }
  const saveEdit = () => {
    if (!editing || !editing.title.trim() || !canManage(editing.proposal))
      return
    return mutate(
      `${editing.proposal.id}-edit`,
      async () => {
        await proposalsService.updateProposal(
          editing.proposal.id,
          {
            titulo: editing.title.trim(),
            descripcion: editing.description.trim() || null,
          },
          accessToken!,
        )
        setEditing(null)
      },
      'Propuesta actualizada.',
    )
  }
  const addComment = (p: Proposal) => {
    const text = drafts[p.id]?.trim()
    if (!text) return
    return mutate(
      `${p.id}-comment`,
      async () => {
        await proposalsService.addComment(
          groupId,
          p.id,
          { contenido: text },
          accessToken!,
        )
        setDrafts((prev) => ({ ...prev, [p.id]: '' }))
        await loadComments(p.id)
      },
      'Comentario publicado.',
      false,
    )
  }
  const saveComment = () => {
    if (
      !editingComment ||
      !editingComment.text.trim() ||
      !canManageComment(editingComment.comment)
    )
      return
    return mutate(
      `${editingComment.proposalId}-edit-comment`,
      async () => {
        await proposalsService.updateComment(
          groupId,
          editingComment.proposalId,
          editingComment.comment.id,
          { contenido: editingComment.text.trim() },
          accessToken!,
        )
        await loadComments(editingComment.proposalId)
        setEditingComment(null)
      },
      'Comentario actualizado.',
      false,
    )
  }
  const confirm = () => {
    if (!confirmation) return
    const { proposal: p, kind, decision, comment } = confirmation
    if (kind === 'decision' && (!admin || votingClosed(p))) return
    if (kind === 'delete-proposal' && !canManage(p)) return
    if (kind === 'delete-comment' && (!comment || !canManageComment(comment)))
      return
    return mutate(
      `${p.id}-${kind}`,
      async () => {
        if (kind === 'decision')
          await proposalsService.applyAdminDecision(
            groupId,
            p.id,
            { decision: decision! },
            accessToken!,
          )
        else if (kind === 'delete-proposal')
          await proposalsService.deleteProposal(p.id, accessToken!)
        else if (comment) {
          await proposalsService.deleteComment(
            groupId,
            p.id,
            comment.id,
            accessToken!,
          )
          await loadComments(p.id)
        }
        setConfirmation(null)
      },
      kind === 'decision'
        ? 'Decisión administrativa registrada.'
        : kind === 'delete-proposal'
          ? 'Propuesta eliminada.'
          : 'Comentario eliminado.',
      kind !== 'delete-comment',
    )
  }
  return {
    group,
    groupId,
    userId,
    admin,
    readOnly,
    online,
    writable,
    proposals,
    results,
    votesAvailable,
    fresh,
    loading,
    refreshing,
    budget,
    error,
    success,
    busy,
    comments,
    commentStates,
    drafts,
    setDrafts,
    editing,
    setEditing,
    editingComment,
    setEditingComment,
    confirmation,
    setConfirmation,
    reload,
    loadComments,
    canManage,
    canManageComment,
    canVote,
    vote,
    saveEdit,
    addComment,
    saveComment,
    confirm,
  }
}
export type ProposalWorkspace = ReturnType<typeof useProposalWorkspace>
