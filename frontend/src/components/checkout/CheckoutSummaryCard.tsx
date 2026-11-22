import type { Proposal } from '../../services/proposals'
import { ProposalFacts } from '../collaboration/CollaborationView'
import * as facts from '../collaboration/proposal-data'
export function CheckoutSummaryCard({ proposal }: { proposal: Proposal }) {
  return (
    <section
      className="atlas-checkout-summary"
      aria-label="Resumen de la simulación"
    >
      <p className="atlas-eyebrow">ALTERNATIVA APROBADA</p>
      <h2>{facts.getTitle(proposal)}</h2>
      <span className="atlas-collab-status">
        {facts.statusLabel(proposal.estado)}
      </span>
      <ProposalFacts proposal={proposal} />
      <div className="atlas-checkout-total">
        <span>Total informado de la alternativa</span>
        <strong>
          {facts.formatMoney(
            facts.getPrice(proposal),
            facts.getCurrency(proposal),
          )}
        </strong>
        <span>Operación simulada · no hay un cargo real.</span>
      </div>
    </section>
  )
}
