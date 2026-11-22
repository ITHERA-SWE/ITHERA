import type { SimulatedCheckoutResult } from '../../services/checkout'
import { asRecord } from '../collaboration/proposal-data'
import { EditorialDialog } from '../collaboration/EditorialDialog'
export function PurchaseSuccessModal({
  result,
  mode,
  onClose,
}: {
  result: SimulatedCheckoutResult
  mode: 'vuelo' | 'hospedaje'
  onClose: () => void
}) {
  const url = result.document?.file_url
  const extra = asRecord(result)
  const expense = asRecord(extra?.expense)
  return (
    <EditorialDialog title="Resultado de la simulación" onClose={onClose}>
      <div className="atlas-success-body">
        <p className="atlas-eyebrow">OPERACIÓN SIMULADA</p>
        <h3>
          {mode === 'vuelo'
            ? 'Compra simulada registrada'
            : 'Reserva simulada registrada'}
        </h3>
        <p>
          No se emitió un boleto ni se confirmó una reserva real con un
          proveedor.
        </p>
        <dl>
          <dt>Estado informado</dt>
          <dd>{result.status}</dd>
          <dt>Folio de simulación</dt>
          <dd>{result.folio}</dd>
        </dl>
        {result.document ? (
          <p>
            El servidor devolvió un comprobante para esta operación. Puedes
            consultarlo también en Archivos.
          </p>
        ) : (
          <p>No se recibió información de un comprobante en esta respuesta.</p>
        )}
        {url && /^https?:\/\//i.test(url) && (
          <a
            className="atlas-button atlas-button-primary"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Abrir comprobante de simulación ↗
          </a>
        )}
        {result.payment?.message && <p>{result.payment.message}</p>}
        {extra && 'expense' in extra && (
          <p>
            {expense?.id != null
              ? `Gasto asociado registrado: ${String(expense.id)}.`
              : 'La respuesta no incluye un gasto asociado. Revisa su registro en Finanzas.'}
          </p>
        )}
        <button className="atlas-button atlas-button-quiet" onClick={onClose}>
          Volver a las propuestas
        </button>
      </div>
    </EditorialDialog>
  )
}
