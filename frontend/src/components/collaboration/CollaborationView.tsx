import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { Proposal } from '../../services/proposals'
import type { ProposalWorkspace } from './useProposalWorkspace'
import { EditorialDialog } from './EditorialDialog'
import { HotelPhoto } from '../../pages/Search/SearchResults'
import { travelPath } from '../../pages/Search/search-data'
import * as facts from './proposal-data'
import './collaboration.css'

export function ProposalFacts({
  proposal,
  compact = false,
}: {
  proposal: Proposal
  compact?: boolean
}) {
  const flight = proposal.tipo === 'vuelo',
    hotel = proposal.tipo === 'hospedaje'
  const rows = flight
    ? [
        ['Trayecto', facts.getFlightRoute(proposal)],
        ['Ida', facts.getOutboundText(proposal)],
        ['Regreso', facts.getReturnText(proposal)],
        ['Duración', facts.getDurationText(proposal)],
        ['Escalas', facts.getSubtitle(proposal)],
        ['Viajeros', facts.getPassengersText(proposal)],
      ]
    : hotel
      ? [
          ['Ubicación', facts.getRouteOrLocation(proposal)],
          ['Estancia', facts.getOutboundText(proposal)],
          ['Noches', facts.getDurationText(proposal)],
          ['Valoración', facts.getHotelRatingText(proposal)],
          ['Habitación', facts.getHotelRoomText(proposal)],
          ['Régimen y condiciones', facts.getHotelBoardText(proposal)],
          ['Huéspedes', facts.getHotelOccupancyText(proposal)],
        ]
      : []
  const offer = facts.getNormalizedOffer(proposal)
  return (
    <div className="atlas-proposal-facts">
      {proposal.tipo === 'hospedaje' && !compact && (
        <HotelPhoto
          src={facts.getImageUrl(proposal)}
          name={facts.getTitle(proposal)}
        />
      )}
      <p>{proposal.descripcion || 'Sin descripción adicional.'}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {flight && offer && (
        <details>
          <summary>Tarifa y equipaje informados</summary>
          <p>
            {facts.stringValue(offer.fareBrand) ||
              facts.stringValue(offer.cabinClass) ||
              'Tarifa no informada'}
          </p>
          {Array.isArray(offer.baggage) ? (
            offer.baggage.map((item, i) => {
              const baggage = facts.asRecord(item)
              return baggage ? (
                <p key={i}>
                  {String(baggage.type ?? 'Equipaje')}:{' '}
                  {String(baggage.quantity ?? 'No informado')} pieza(s)
                </p>
              ) : null
            })
          ) : (
            <p>Equipaje no informado.</p>
          )}
        </details>
      )}
      {hotel && !compact && facts.getHotelRooms(proposal).length > 0 && (
        <details>
          <summary>Ver habitaciones y tarifas</summary>
          {facts.getHotelRooms(proposal).map((room, i) => (
            <div className="atlas-room-line" key={i}>
              <p>
                {facts.stringValue(room.name) || 'Habitación sin nombre'} ·{' '}
                {facts.stringValue(room.boardName) || 'Plan no informado'}
              </p>
              <strong>
                {facts.formatMoney(
                  room.price,
                  facts.stringValue(room.currency) ||
                    facts.getCurrency(proposal),
                )}
              </strong>
              <p>
                {facts.stringValue(room.refundableTag) ||
                  'Política no informada'}
              </p>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

function ProposalPanel({
  proposal: p,
  data: d,
  onCheckout,
}: {
  proposal: Proposal
  data: ProposalWorkspace
  onCheckout: (p: Proposal) => void
}) {
  const { loadComments } = d
  useEffect(() => {
    void loadComments(p.id)
  }, [p.id, loadComments])
  const result = d.results.get(p.id)
  const commentState = d.commentStates[p.id]
  const comments = d.comments[p.id]
  const disabled = Boolean(d.busy) || !d.fresh
  const finished = facts.simulationComplete(p)
  return (
    <div className="atlas-proposal-panel">
      {d.error && (
        <p className="atlas-collab-error" role="alert">
          {d.error}
        </p>
      )}
      <div className="atlas-panel-kicker">
        <span className="atlas-collab-status">
          {facts.statusLabel(p.estado)}
        </span>
        <span>
          {p.tipo === 'vuelo'
            ? 'VUELO'
            : p.tipo === 'hospedaje'
              ? 'HOSPEDAJE'
              : 'PROPUESTA'}
        </span>
      </div>
      <h2>{facts.getTitle(p)}</h2>
      <p className="atlas-panel-price">
        {facts.formatMoney(facts.getPrice(p), facts.getCurrency(p))}
      </p>
      <ProposalFacts proposal={p} />
      <section
        className="atlas-vote-section"
        aria-label={`Votación de ${p.titulo}`}
      >
        <h3>La voz del grupo</h3>
        {d.votesAvailable && result ? (
          <>
            <p>
              {result.votos_a_favor} a favor · {result.votos_en_contra} en
              contra · {result.abstenciones} abstenciones
              {typeof result.votos_pendientes === 'number'
                ? ` · ${result.votos_pendientes} por participar`
                : ''}
            </p>
            <p className="atlas-my-vote">{facts.voteLabel(result)}</p>
            {result.requiere_desempate_admin && (
              <p className="atlas-collab-notice">
                El organizador debe resolver el empate registrado.
              </p>
            )}
          </>
        ) : (
          <p>
            Participación no disponible.{' '}
            <button className="atlas-text-link" onClick={() => void d.reload()}>
              Actualizar
            </button>
          </p>
        )}
        <div className="atlas-vote-buttons">
          {(
            [
              { id: 'a_favor', label: 'A favor' },
              { id: 'en_contra', label: 'En contra' },
              { id: 'abstencion', label: 'Abstenerme' },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              aria-pressed={result?.mi_voto === v.id}
              disabled={disabled || !d.canVote(p)}
              onClick={() => void d.vote(p, v.id)}
            >
              {d.busy === `${p.id}-vote` ? 'Registrando…' : v.label}
            </button>
          ))}
        </div>
        {facts.votingClosed(p) && (
          <p>La votación de esta propuesta está cerrada.</p>
        )}
      </section>
      <div className="atlas-proposal-tools">
        {d.canManage(p) && (
          <>
            <button
              disabled={disabled}
              onClick={() =>
                d.setEditing({
                  proposal: p,
                  title: p.titulo,
                  description: p.descripcion ?? '',
                })
              }
            >
              Editar propuesta
            </button>
            <button
              disabled={disabled}
              onClick={() =>
                d.setConfirmation({ kind: 'delete-proposal', proposal: p })
              }
            >
              Eliminar propuesta
            </button>
          </>
        )}
        {d.admin && d.writable && !facts.votingClosed(p) && (
          <>
            <button
              disabled={disabled}
              onClick={() =>
                d.setConfirmation({
                  kind: 'decision',
                  proposal: p,
                  decision: 'aprobar',
                })
              }
            >
              Aprobar
            </button>
            <button
              disabled={disabled}
              onClick={() =>
                d.setConfirmation({
                  kind: 'decision',
                  proposal: p,
                  decision: 'rechazar',
                })
              }
            >
              Descartar
            </button>
          </>
        )}
      </div>
      {finished ? (
        <p className="atlas-collab-notice">
          {p.tipo === 'vuelo' ? 'Compra' : 'Reserva'} simulada registrada.
          Consulta el comprobante en Archivos.
        </p>
      ) : (
        p.estado === 'aprobada' &&
        ['vuelo', 'hospedaje'].includes(p.tipo) && (
          <div className="atlas-next-step">
            <h3>La propuesta está aprobada</h3>
            <p>
              Puedes continuar al checkout simulado. No se emite un boleto ni
              una reserva real.
            </p>
            <button
              className="atlas-button atlas-button-primary"
              disabled={disabled || !d.online || d.readOnly}
              onClick={() => onCheckout(p)}
            >
              Continuar a simulación ↗
            </button>
          </div>
        )
      )}
      <section
        className="atlas-comments"
        aria-label="Conversación de la propuesta"
      >
        <h3>Conversemos</h3>
        {commentState?.loading && <p role="status">Cargando conversación…</p>}
        {commentState?.error ? (
          <p className="atlas-collab-error" role="alert">
            {commentState.error}{' '}
            <button
              className="atlas-text-link"
              onClick={() => void d.loadComments(p.id)}
            >
              Reintentar comentarios
            </button>
          </p>
        ) : !commentState?.loading && comments?.length === 0 ? (
          <p>
            La conversación está abierta. Comparte tu opinión sobre esta
            alternativa.
          </p>
        ) : null}
        {(comments ?? []).map((comment) => (
          <article
            className={`atlas-comment ${String(comment.usuarioId) === d.userId ? 'atlas-comment-own' : ''}`}
            key={comment.id}
          >
            <header>
              <strong>
                {comment.authorName ||
                  (String(comment.usuarioId) === d.userId
                    ? 'Tú'
                    : 'Integrante')}
              </strong>
              {comment.createdAt && (
                <time dateTime={comment.createdAt}>
                  {facts.formatCommentDate(comment.createdAt)}
                </time>
              )}
            </header>
            {d.editingComment?.comment.id === comment.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void d.saveComment()
                }}
              >
                <label htmlFor="atlas-comment-edit">Editar comentario</label>
                <textarea
                  id="atlas-comment-edit"
                  value={d.editingComment.text}
                  onChange={(e) =>
                    d.setEditingComment((prev) =>
                      prev ? { ...prev, text: e.target.value } : null,
                    )
                  }
                  disabled={disabled}
                />
                <button
                  className="atlas-text-link"
                  disabled={disabled || !d.editingComment.text.trim()}
                >
                  Guardar comentario
                </button>
                <button
                  className="atlas-text-link"
                  type="button"
                  disabled={Boolean(d.busy)}
                  onClick={() => d.setEditingComment(null)}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <p>{comment.contenido}</p>
            )}
            {d.canManageComment(comment) &&
              d.editingComment?.comment.id !== comment.id && (
                <div>
                  <button
                    disabled={disabled}
                    onClick={() =>
                      d.setEditingComment({
                        proposalId: p.id,
                        comment,
                        text: comment.contenido,
                      })
                    }
                  >
                    Editar comentario
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() =>
                      d.setConfirmation({
                        kind: 'delete-comment',
                        proposal: p,
                        comment,
                      })
                    }
                  >
                    Eliminar comentario
                  </button>
                </div>
              )}
          </article>
        ))}
        <form
          className="atlas-comment-compose"
          onSubmit={(e) => {
            e.preventDefault()
            void d.addComment(p)
          }}
        >
          <label htmlFor="atlas-comment-draft">Tu comentario</label>
          <textarea
            id="atlas-comment-draft"
            value={d.drafts[p.id] ?? ''}
            onChange={(e) =>
              d.setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
            }
            disabled={!d.writable || disabled}
            placeholder={
              d.readOnly
                ? 'Viaje de solo lectura'
                : '¿Qué opinas de esta alternativa?'
            }
          />
          <button
            className="atlas-button atlas-button-primary"
            disabled={!d.writable || disabled || !d.drafts[p.id]?.trim()}
          >
            {d.busy === `${p.id}-comment` ? 'Enviando…' : 'Publicar comentario'}
          </button>
        </form>
      </section>
    </div>
  )
}

export function CollaborationView({
  data: d,
  mode,
  onBack,
}: {
  data: ProposalWorkspace
  mode: 'compare' | 'decisions'
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [category, setCategory] = useState('todas')
  const [state, setState] = useState('todas')
  const [selection, setSelection] = useState<string[] | null>(null)
  const location = useLocation()
  const [selected, setSelected] = useState<string | null>(() =>
    new URLSearchParams(location.search).get('proposalId'),
  )
  const [detail, setDetail] = useState<string | null>(null)
  const base = d.proposals.filter(
    (p) =>
      (mode === 'decisions' || ['vuelo', 'hospedaje'].includes(p.tipo)) &&
      (category === 'todas' || p.tipo === category),
  )
  const filtered = base.filter((p) => state === 'todas' || p.estado === state)
  const ids = selection ?? filtered.slice(0, 4).map((p) => p.id)
  const visible = filtered.filter((p) => ids.includes(p.id)).slice(0, 4)
  const current = filtered.find((p) => p.id === selected) ?? filtered[0] ?? null
  const dialogProposal = d.proposals.find((p) => p.id === detail)
  const categories = useMemo(
    () => [...new Set(d.proposals.map((p) => p.tipo))],
    [d.proposals],
  )
  const checkout = (p: Proposal) =>
    navigate(
      travelPath(
        `/checkout/${p.tipo === 'vuelo' ? 'flight' : 'hotel'}/${encodeURIComponent(p.id)}`,
        d.groupId,
      ),
    )
  const browse = (kind: string = 'flights') =>
    navigate(travelPath('/search/flights-hotels', d.groupId, { mode: kind }), {
      state: { group: d.group },
    })
  const selectedBudget =
    current &&
    facts.getCurrency(current) === 'MXN' &&
    Number.isFinite(facts.getPrice(current)) &&
    d.budget &&
    Number.isFinite(d.budget.available) &&
    facts.getPrice(current) > d.budget.available
  const toggle = (id: string) =>
    setSelection((prev) => {
      const list = prev ?? filtered.slice(0, 4).map((p) => p.id)
      return list.includes(id)
        ? list.filter((value) => value !== id)
        : list.length < 4
          ? [...list, id]
          : list
    })
  if (d.loading)
    return (
      <div
        className="atlas-collab atlas-collab-loading"
        role="status"
        aria-busy="true"
      >
        <p>Cargando propuestas, participación y contexto del viaje…</p>
        <div className="atlas-collab-skeleton-heading" />
        <div className="atlas-collab-skeleton-grid">
          {[0, 1, 2].map((n) => (
            <span key={n} />
          ))}
        </div>
      </div>
    )
  return (
    <div className="atlas-collab">
      <header className="atlas-collab-heading">
        <div>
          <p className="atlas-eyebrow">
            {mode === 'compare'
              ? 'ALTERNATIVAS / COMPARAR'
              : 'COLABORACIÓN / DECISIONES'}
          </p>
          <h1>
            {mode === 'compare' ? (
              <>
                Diferentes caminos.
                <br />
                <em>Una decisión compartida.</em>
              </>
            ) : (
              'Decidir, juntos.'
            )}
          </h1>
          <p>
            {mode === 'compare'
              ? 'Revisa hasta cuatro propuestas a la vez. Elegir una opción para revisarla no registra un voto.'
              : 'Propuestas, conversaciones y acuerdos del viaje, en un mismo lugar.'}
          </p>
        </div>
        <div className="atlas-collab-heading-tools">
          <button className="atlas-text-link" onClick={onBack}>
            ← Volver al resumen
          </button>
          <button
            className="atlas-button atlas-button-secondary"
            onClick={() => browse()}
          >
            Buscar alternativas ↗
          </button>
        </div>
      </header>
      {d.error && (
        <div className="atlas-collab-error" role="alert">
          <p>{d.error}</p>
          <button
            className="atlas-text-link"
            disabled={d.refreshing}
            onClick={() => void d.reload()}
          >
            Reintentar carga
          </button>
        </div>
      )}
      {d.success && (
        <p className="atlas-collab-success" role="status">
          {d.success}
        </p>
      )}
      {!d.votesAvailable && (
        <p className="atlas-collab-notice">
          No se pudo actualizar la participación. Los votos permanecen
          deshabilitados hasta recuperar esos datos.
        </p>
      )}
      {!d.writable && (
        <p className="atlas-collab-notice">
          {d.readOnly
            ? 'Viaje de solo lectura. Puedes consultar sus propuestas y conversaciones.'
            : !d.online
              ? 'Sin conexión. Reconecta para participar.'
              : 'El itinerario está bloqueado; las acciones de cambio están deshabilitadas.'}
        </p>
      )}
      <ol className="atlas-decision-guide" aria-label="Guía del proceso">
        <li>01 · Proponer</li>
        <li>02 · Comparar y votar</li>
        <li>03 · Registrar la decisión</li>
        <li>04 · Simular (si corresponde)</li>
      </ol>
      <div className="atlas-collab-filters">
        <label htmlFor="atlas-proposal-category">
          Categoría
          <select
            id="atlas-proposal-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setSelection(null)
              setSelected(null)
            }}
          >
            <option value="todas">Todas</option>
            {categories
              .filter(
                (c) =>
                  mode === 'decisions' || ['vuelo', 'hospedaje'].includes(c),
              )
              .map((c) => (
                <option key={c} value={c}>
                  {c === 'vuelo'
                    ? 'Vuelos'
                    : c === 'hospedaje'
                      ? 'Hoteles'
                      : c === 'actividad'
                        ? 'Actividades'
                        : c}
                </option>
              ))}
          </select>
        </label>
        <label htmlFor="atlas-proposal-state">
          Estado
          <select
            id="atlas-proposal-state"
            value={state}
            onChange={(e) => {
              setState(e.target.value)
              setSelection(null)
            }}
          >
            <option value="todas">Todos los estados</option>
            {[...new Set(base.map((p) => p.estado))].map((s) => (
              <option value={s} key={s}>
                {facts.statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <span role="status">
          {filtered.length} propuesta(s){d.refreshing ? ' · Actualizando…' : ''}
        </span>
        <button
          className="atlas-text-link"
          disabled={d.refreshing || Boolean(d.busy)}
          onClick={() => void d.reload()}
        >
          Actualizar
        </button>
      </div>
      {filtered.length === 0 ? (
        <section className="atlas-collab-empty">
          <h2>
            {d.proposals.length
              ? 'No hay propuestas con estos filtros'
              : 'Las mejores ideas aún están por llegar.'}
          </h2>
          <p>
            {d.proposals.length
              ? 'Amplía la categoría o el estado para consultar otras propuestas.'
              : 'Guarda alternativas desde Explorar para revisarlas, comentarlas y votar con tu grupo.'}
          </p>
          <button
            className="atlas-button atlas-button-secondary"
            onClick={() => {
              if (d.proposals.length) {
                setState('todas')
                setCategory('todas')
              } else browse()
            }}
          >
            {d.proposals.length
              ? 'Quitar filtros'
              : 'Explorar vuelos y hoteles'}
          </button>
        </section>
      ) : mode === 'compare' ? (
        <>
          <details className="atlas-comparison-picker">
            <summary>Elegir alternativas · {visible.length} de 4</summary>
            <div>
              {filtered.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(p.id)}
                    disabled={!ids.includes(p.id) && ids.length >= 4}
                    onChange={() => toggle(p.id)}
                  />
                  <span>
                    {facts.getTitle(p)}
                    <small>
                      {facts.formatMoney(
                        facts.getPrice(p),
                        facts.getCurrency(p),
                      )}{' '}
                      · {facts.statusLabel(p.estado)}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="atlas-text-link"
              onClick={() => setSelection(null)}
            >
              Restaurar las primeras opciones
            </button>
          </details>
          {!facts.sameMoneyUnit(visible) && visible.length > 1 && (
            <p className="atlas-collab-notice">
              Hay importes de monedas distintas o sin moneda informada. Se
              muestran por separado, sin conversión ni clasificación por precio.
            </p>
          )}
          <div
            className="atlas-comparison-columns"
            style={
              {
                '--comparison-count': Math.max(1, visible.length),
              } as React.CSSProperties
            }
          >
            {visible.map((p) => (
              <article
                className={`atlas-comparison-option ${selected === p.id ? 'atlas-option-selected' : ''}`}
                key={p.id}
              >
                {p.tipo === 'hospedaje' ? (
                  <HotelPhoto
                    src={facts.getImageUrl(p)}
                    name={facts.getTitle(p)}
                  />
                ) : (
                  <div className="atlas-flight-identity">
                    <span>
                      {(facts.asRecord(p.detalle)?.aerolinea as string) ||
                        'Vuelo'}
                    </span>
                    <strong>{facts.getFlightRoute(p)}</strong>
                    <p>{facts.getSubtitle(p)}</p>
                  </div>
                )}
                <div className="atlas-option-heading">
                  <span className="atlas-collab-status">
                    {facts.statusLabel(p.estado)}
                  </span>
                  <h2>{facts.getTitle(p)}</h2>
                  <strong>
                    {facts.formatMoney(facts.getPrice(p), facts.getCurrency(p))}
                  </strong>
                </div>
                <ProposalFacts proposal={p} compact />
                <div className="atlas-option-participation">
                  {d.votesAvailable && d.results.has(p.id)
                    ? `${d.results.get(p.id)!.votos_a_favor} a favor · ${d.results.get(p.id)!.votos_en_contra} en contra`
                    : 'Participación no disponible'}
                </div>
                <div className="atlas-option-actions">
                  <button
                    className="atlas-button atlas-button-secondary"
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    {selected === p.id ? 'En revisión' : 'Revisar esta opción'}
                  </button>
                  <button
                    className="atlas-text-link"
                    onClick={() => setDetail(p.id)}
                  >
                    Detalle, votos y conversación ↗
                  </button>
                  <button
                    className="atlas-text-link"
                    disabled={ids.length <= 1}
                    onClick={() => toggle(p.id)}
                  >
                    Quitar de esta comparación
                  </button>
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && (
            <p>Selecciona al menos una propuesta para abrir la comparación.</p>
          )}
        </>
      ) : (
        <div className="atlas-decisions-workspace">
          <section
            className="atlas-decisions-index"
            aria-label="Listado de decisiones"
          >
            {filtered.map((p) => (
              <button
                className={
                  current?.id === p.id ? 'atlas-decision-selected' : ''
                }
                key={p.id}
                onClick={() => setSelected(p.id)}
                aria-current={current?.id === p.id ? 'true' : undefined}
              >
                <span className="atlas-collab-status">
                  {facts.statusLabel(p.estado)}
                </span>
                <h2>{p.titulo}</h2>
                <p>
                  {p.tipo === 'vuelo'
                    ? 'Vuelo'
                    : p.tipo === 'hospedaje'
                      ? 'Hotel'
                      : 'Propuesta'}{' '}
                  · {facts.formatMoney(facts.getPrice(p), facts.getCurrency(p))}
                </p>
                {d.votesAvailable && d.results.has(p.id) && (
                  <small>{facts.voteLabel(d.results.get(p.id))}</small>
                )}
              </button>
            ))}
          </section>
          {current && (
            <ProposalPanel
              key={current.id}
              proposal={current}
              data={d}
              onCheckout={checkout}
            />
          )}
        </div>
      )}
      {selectedBudget && (
        <p className="atlas-collab-notice">
          La opción revisada supera el disponible registrado del grupo (
          {facts.formatMoney(d.budget!.available, 'MXN')}). Esto no convierte
          divisas ni modifica las reglas de aprobación.
        </p>
      )}
      {dialogProposal && (
        <EditorialDialog
          title="Detalle de la propuesta"
          onClose={() => setDetail(null)}
          busy={Boolean(d.busy)}
        >
          <ProposalPanel
            proposal={dialogProposal}
            data={d}
            onCheckout={checkout}
          />
        </EditorialDialog>
      )}
      {d.editing && (
        <EditorialDialog
          title="Editar propuesta"
          onClose={() => d.setEditing(null)}
          busy={Boolean(d.busy)}
        >
          <form
            className="atlas-collab-edit"
            onSubmit={(e) => {
              e.preventDefault()
              void d.saveEdit()
            }}
          >
            {d.error && (
              <p className="atlas-collab-error" role="alert">
                {d.error}
              </p>
            )}
            <label>
              Título
              <input
                value={d.editing.title}
                onChange={(e) =>
                  d.setEditing((prev) =>
                    prev ? { ...prev, title: e.target.value } : null,
                  )
                }
                required
                disabled={Boolean(d.busy)}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={d.editing.description}
                onChange={(e) =>
                  d.setEditing((prev) =>
                    prev ? { ...prev, description: e.target.value } : null,
                  )
                }
                disabled={Boolean(d.busy)}
              />
            </label>
            <button
              className="atlas-button atlas-button-primary"
              disabled={Boolean(d.busy) || !d.fresh || !d.editing.title.trim()}
            >
              Guardar cambios
            </button>
          </form>
        </EditorialDialog>
      )}
      {d.confirmation && (
        <EditorialDialog
          title={
            d.confirmation.kind === 'decision'
              ? 'Registrar decisión'
              : d.confirmation.kind === 'delete-proposal'
                ? 'Eliminar propuesta'
                : 'Eliminar comentario'
          }
          onClose={() => d.setConfirmation(null)}
          busy={Boolean(d.busy)}
        >
          <div className="atlas-collab-confirm">
            {d.error && (
              <p className="atlas-collab-error" role="alert">
                {d.error}
              </p>
            )}
            <h3>{d.confirmation.proposal.titulo}</h3>
            <p>
              {d.confirmation.kind === 'decision'
                ? `Se registrará la decisión de ${d.confirmation.decision === 'aprobar' ? 'aprobar' : 'descartar'} esta propuesta. No realiza una compra ni una reserva.`
                : 'La eliminación se reflejará para el grupo cuando el servidor la confirme.'}
            </p>
            <button
              className="atlas-button atlas-button-primary"
              disabled={Boolean(d.busy) || !d.fresh}
              onClick={() => void d.confirm()}
            >
              {d.busy ? 'Procesando…' : 'Confirmar acción'}
            </button>
          </div>
        </EditorialDialog>
      )}
    </div>
  )
}
