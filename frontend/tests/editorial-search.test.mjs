import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(
  new URL('../src/pages/Search/search-data.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
const api = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)
const filters = (extra) => ({ ...api.EMPTY_FILTERS, ...extra })
const flight = (id, extra = {}) => ({
  id,
  airline: 'Aerolínea A',
  price: 200,
  currency: 'MXN',
  stops: 0,
  departureAt: '2027-03-12T10:00:00',
  arrivalAt: '2027-03-12T12:00:00',
  origin: 'MEX',
  destination: 'CUN',
  outboundSlice: null,
  returnSlice: null,
  ...extra,
})
const hotel = (id, extra = {}) => ({
  id,
  price: 200,
  currency: 'MXN',
  rating: null,
  ...extra,
})
test('La navegación codifica groupId y conserva el modo', () => {
  const result = new URL(
    api.travelPath('/search/flights-hotels', 'grupo/2', { mode: 'hotels' }),
    'https://ithera.test',
  )
  assert.equal(result.searchParams.get('groupId'), 'grupo/2')
  assert.equal(result.searchParams.get('mode'), 'hotels')
  assert.equal(
    api.travelPath('/dashboard', null, { tab: 'resumen' }),
    '/dashboard?tab=resumen',
  )
})
test('Los horarios del proveedor no se convierten a otra zona horaria', () => {
  assert.equal(api.formatTime('2027-03-12T10:30:00+09:00'), '10:30')
  assert.equal(api.formatTime(null), 'Hora no informada')
  assert.match(api.formatDate('2027-03-12'), /12/)
  assert.equal(api.formatDate('2027-02-30'), 'Fecha no informada')
})
test('Duración soporta días sin inventar una duración ausente', () => {
  assert.equal(api.formatDuration('P1DT2H30M'), '26 h 30 min')
  assert.equal(api.formatDuration(null), 'Duración no informada')
  assert.equal(api.buildStopsLabel(0), 'Directo')
  assert.equal(api.buildStopsLabel(-1), 'Escalas no informadas')
})
test('Precio desconocido o sin moneda nunca se presenta como una tarifa USD', () => {
  assert.equal(api.formatPrice(null, 'USD'), 'Precio no informado')
  assert.match(api.formatPrice(100, null), /moneda no informada/)
  assert.match(api.formatPrice(100, 'MXN'), /MXN/)
})
test('Filtro de escalas aplica también al regreso', () => {
  const rows = [
    flight('direct'),
    flight('return-stop', { returnSlice: { stops: 1 } }),
    flight('out-stop', { stops: 1 }),
  ]
  assert.deepEqual(
    api
      .filterFlights(rows, filters({ stops: '0' }), 'recommended')
      .map((o) => o.id),
    ['direct'],
  )
})
test('Filtrado por aerolínea y precio no muta las ofertas', () => {
  const rows = [
    flight('one', { price: 350 }),
    flight('two', { price: 150 }),
    flight('other', { airline: 'Otra' }),
  ]
  assert.deepEqual(
    api
      .filterFlights(
        rows,
        filters({ airline: 'Aerolínea A', maxPrice: '200' }),
        'price-up',
      )
      .map((o) => o.id),
    ['two'],
  )
  assert.deepEqual(
    rows.map((o) => o.id),
    ['one', 'two', 'other'],
  )
})
test('No se aplica un máximo a importes de distintas monedas sin seleccionar una', () => {
  const rows = [
    flight('mx', { price: 2000 }),
    flight('usd', { price: 100, currency: 'USD' }),
  ]
  assert.equal(
    api.filterFlights(rows, filters({ maxPrice: '150' }), 'recommended').length,
    2,
  )
  assert.deepEqual(
    api
      .filterFlights(
        rows,
        filters({ currency: 'USD', maxPrice: '150' }),
        'recommended',
      )
      .map((o) => o.id),
    ['usd'],
  )
})
test('Orden por precio agrupa monedas y deja precios desconocidos al final', () => {
  const rows = [
    flight('unknown', { price: null }),
    flight('usd', { price: 1, currency: 'USD' }),
    flight('mx2', { price: 20 }),
    flight('mx1', { price: 10 }),
  ]
  assert.deepEqual(
    api.filterFlights(rows, filters({}), 'price-up').map((o) => o.id),
    ['mx1', 'mx2', 'unknown', 'usd'],
  )
})
test('Hoteles sin valoración no se convierten en hoteles de cinco estrellas', () => {
  const rows = [
    hotel('unknown'),
    hotel('rated', { rating: 4.5 }),
    hotel('lower', { rating: 3 }),
  ]
  assert.deepEqual(
    api
      .filterHotels(rows, filters({ minRating: '4' }), 'recommended')
      .map((o) => o.id),
    ['rated'],
  )
  assert.equal(rows[0].rating, null)
})
test('No se fabrican precio, fecha o moneda para guardar una propuesta', () => {
  assert.equal(api.flightProposalIssue(flight('complete')), null)
  assert.ok(api.flightProposalIssue(flight('missing', { departureAt: null })))
  assert.ok(api.flightProposalIssue(flight('missing', { price: null })))
  assert.ok(api.hotelProposalIssue(hotel('missing', { currency: null })))
})
test('Cambiar el destino no conserva coordenadas de otra ciudad', () => {
  const group = {
    destino: 'Cancún',
    destino_latitud: 21,
    destino_longitud: -86,
    destino_place_id: 'cancun',
  }
  assert.equal(api.hotelLocationParams(' Cancun ', group).placeId, 'cancun')
  assert.deepEqual(api.hotelLocationParams('Oaxaca', group), {
    latitude: null,
    longitude: null,
    placeId: null,
  })
})
test('Los errores distinguen red, permisos y servicio temporalmente no disponible', () => {
  assert.match(
    api.searchFailure(Object.assign(new Error('Límite'), { status: 503 }))
      .title,
    /no está disponible/,
  )
  assert.match(
    api.searchFailure(new TypeError('fetch failed')).title,
    /conectar/,
  )
  assert.match(
    api.searchFailure(Object.assign(new Error('Prohibido'), { status: 403 }))
      .title,
    /permiso/,
  )
})
test('El tiempo límite no impide resolver búsquedas rápidas', async () => {
  assert.equal(await api.withSearchTimeout(Promise.resolve('ok'), 100), 'ok')
  await assert.rejects(
    api.withSearchTimeout(new Promise(() => {}), 5),
    (e) => e.status === 504,
  )
})
