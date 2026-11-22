import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(
  new URL('../src/components/collaboration/proposal-data.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
const data = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)
const proposal = (extra = {}) => ({
  id: '1',
  tipo: 'vuelo',
  titulo: 'Propuesta real',
  estado: 'guardada',
  groupId: '41',
  creadoPor: '1',
  detalle: { precio: 3000, moneda: 'MXN' },
  ...extra,
})
test('Un precio ausente no se transforma en cero', () => {
  assert.equal(data.numberValue(null), null)
  assert.equal(data.numberValue(undefined), null)
  assert.equal(data.formatMoney(null, 'MXN'), 'Precio no informado')
  assert.ok(Number.isNaN(data.getPrice(proposal({ detalle: {} }))))
})
test('La moneda ausente no se sustituye por USD ni MXN', () => {
  const p = proposal({ detalle: { precio: 3000 } })
  assert.equal(data.getCurrency(p), null)
  assert.match(data.formatMoney(3000, null), /moneda no informada/)
})
test('No se equiparan monedas diferentes', () => {
  assert.equal(
    data.sameMoneyUnit([
      proposal(),
      proposal({ detalle: { precio: 100, moneda: 'USD' } }),
    ]),
    false,
  )
  assert.equal(data.sameMoneyUnit([proposal(), proposal()]), true)
  assert.equal(
    data.sameMoneyUnit([proposal({ detalle: { precio: 100 } })]),
    false,
  )
})
test('Etiquetas corresponden a los estados persistidos y conservan los desconocidos', () => {
  assert.equal(data.statusLabel('aprobada'), 'Aprobada')
  assert.equal(data.statusLabel('descartada'), 'Descartada')
  assert.equal(data.statusLabel('otro_estado'), 'otro_estado')
})
test('Las resoluciones existentes cierran la votación', () => {
  assert.equal(data.votingClosed(proposal()), false)
  for (const estado of ['aprobada', 'descartada', 'confirmado', 'cancelada'])
    assert.equal(data.votingClosed(proposal({ estado })), true)
})
test('La simulación completada se detecta desde el detalle, no desde aprobación', () => {
  assert.equal(data.simulationComplete(proposal({ estado: 'aprobada' })), false)
  assert.equal(
    data.simulationComplete(
      proposal({ detalle: { compra_estado: 'confirmada_simulada' } }),
    ),
    true,
  )
  assert.equal(
    data.simulationComplete(
      proposal({
        tipo: 'hospedaje',
        detalle: { reserva_estado: 'confirmada_simulada' },
      }),
    ),
    true,
  )
})
test('No se fabrican fotografías de un hotel', () => {
  assert.equal(
    data.getImageUrl(proposal({ tipo: 'hospedaje', detalle: {} })),
    null,
  )
  assert.equal(
    data.getImageUrl(
      proposal({
        tipo: 'hospedaje',
        payload: {
          normalizedOffer: { photoUrl: 'https://hotel.test/photo.jpg' },
        },
      }),
    ),
    'https://hotel.test/photo.jpg',
  )
})
test('La valoración del proveedor no se presenta como Google', () => {
  assert.match(
    data.getHotelRatingText(
      proposal({ tipo: 'hospedaje', detalle: { calificacion: 4 } }),
    ),
    /^Proveedor 4/,
  )
  assert.equal(
    data.getHotelRatingText(
      proposal({ tipo: 'hospedaje', detalle: { calificacion: null } }),
    ),
    'Valoración no informada',
  )
})
test('No se inventa un pasajero adulto ante datos ausentes', () => {
  assert.equal(data.getPassengersText(proposal()), 'Pasajeros no informados')
  assert.match(
    data.getPassengersText(
      proposal({ payload: { passengers: { adults: 2, children: 0 } } }),
    ),
    /2 adulto/,
  )
})
test('El texto de voto corresponde al voto del servidor', () => {
  assert.equal(data.voteLabel({ mi_voto: 'abstencion' }), 'Te abstuviste')
  assert.equal(data.voteLabel({ mi_voto: 'en_contra' }), 'Votaste en contra')
})
test('Los comentarios repetidos por sincronización conservan un solo identificador', () => {
  assert.deepEqual(
    data.uniqueComments([
      { id: '1', contenido: 'antes' },
      { id: '1', contenido: 'después' },
    ]),
    [{ id: '1', contenido: 'después' }],
  )
})
test('La hora del vuelo se mantiene como la informó el proveedor', () => {
  assert.equal(data.formatTime('2027-03-12T10:00:00+09:00'), '10:00')
  assert.equal(data.formatCommentDate(''), '')
})

test('La fecha de cierre registrada por el servidor bloquea otra votación', () => {
  assert.equal(
    data.votingClosed(proposal({ fecha_cierre: '2026-11-21T12:00:00Z' })),
    true,
  )
  assert.equal(data.votingClosed(proposal({ fecha_cierre: null })), false)
})
