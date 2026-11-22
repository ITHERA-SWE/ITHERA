import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(
  new URL('../src/components/itinerary/itinerary-data.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
const d = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)
const activity = (extra = {}) => ({
  id: '1',
  title: 'Actividad',
  status: 'pendiente',
  createdBy: '1',
  time: '10:00',
  ...extra,
})
test('Fechas civiles atraviesan meses y años sin conversión de zona', () => {
  assert.equal(d.itineraryDate('2027-12-31', 2), '2028-01-01')
  assert.equal(d.itineraryDate('2028-02-28', 2), '2028-02-29')
})
test('Calendario rechaza fechas inválidas y números de día inválidos', () => {
  assert.equal(d.itineraryDate('2027-02-30', 1), null)
  assert.equal(d.itineraryDate(null, 1), null)
  assert.equal(d.itineraryDate('2027-03-12', 0), null)
})
test('Orden cronológico estable; horarios ausentes al final; conserva el original', () => {
  const a = [
    activity({ id: 'sin', time: 'Hora pendiente' }),
    activity({ id: 'tarde', time: '3:30 PM' }),
    activity({ id: 'temprano', time: '08:00' }),
  ]
  assert.deepEqual(
    d.orderedActivities(a).map((x) => x.id),
    ['temprano', 'tarde', 'sin'],
  )
  assert.equal(a[0].id, 'sin')
})
test('La etiqueta horaria del backend se respeta; ISO utiliza la zona del itinerario', () => {
  assert.equal(
    d.activityClock(
      activity({ time: '09:00', startsAt: '2027-03-12T15:00:00Z' }),
    ),
    '09:00',
  )
  assert.equal(d.clock('2027-03-12T15:00:00Z'), '09:00')
})
test('No se inventa un inicio ni un fin distinto cuando no se informó', () => {
  assert.deepEqual(d.timeRange(activity({ time: 'Hora pendiente' })), {
    start: null,
    end: null,
  })
  assert.deepEqual(
    d.timeRange(
      activity({
        startsAt: '2027-03-12T10:00:00',
        endsAt: '2027-03-12T10:00:00',
      }),
    ),
    { start: '10:00', end: null },
  )
})
test('Coincidencia de inicio advierte alternativas simultáneas', () => {
  assert.deepEqual(
    [...d.scheduleConflicts([activity(), activity({ id: '2' })])],
    ['1', '2'],
  )
})
test('Intervalos superpuestos se señalan, extremos consecutivos no', () => {
  const a = activity({
    startsAt: '2027-03-12T10:00:00',
    endsAt: '2027-03-12T11:00:00',
  })
  const b = activity({
    id: '2',
    time: '10:30',
    startsAt: '2027-03-12T10:30:00',
    endsAt: '2027-03-12T12:00:00',
  })
  assert.equal(d.scheduleConflicts([a, b]).size, 2)
  assert.equal(
    d.scheduleConflicts([
      a,
      { ...b, time: '11:00', startsAt: '2027-03-12T11:00:00' },
    ]).size,
    0,
  )
})
test('Sin horarios no se fabrican conflictos', () => {
  assert.equal(
    d.scheduleConflicts([
      activity({ time: 'Hora pendiente' }),
      activity({ id: '2', time: 'Hora pendiente' }),
    ]).size,
    0,
  )
})
test('Coordenadas inválidas o ausentes no producen un enlace de mapa', () => {
  for (const coords of [
    { latitude: null, longitude: null },
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: 181 },
    { latitude: NaN, longitude: 0 },
  ])
    assert.equal(d.mapUrl(activity(coords)), null)
  assert.equal(d.validCoordinates({ latitude: 0, longitude: 0 }), true)
})
test('Permisos de edición y eliminación conservan propietario y organizador', () => {
  assert.equal(d.activityPermissions(activity(), '1', 'viajero').edit, true)
  assert.equal(d.activityPermissions(activity(), '2', 'viajero').edit, false)
  assert.equal(d.activityPermissions(activity(), '2', 'admin').delete, true)
  assert.equal(
    d.activityPermissions(activity({ createdBy: null }), null, 'viajero').edit,
    false,
  )
})
test('Propuesta vencida solo permite la edición administrativa; no eliminación', () => {
  const a = activity({ startsAt: '2020-01-01T10:00:00Z' })
  assert.equal(d.activityPermissions(a, '1', 'viajero').edit, false)
  assert.equal(d.activityPermissions(a, '2', 'admin').edit, true)
  assert.equal(d.activityPermissions(a, '2', 'admin').delete, false)
})
test('Un bloque de subgrupos conserva sus operaciones específicas', () => {
  const p = d.activityPermissions(
    activity({ kind: 'subgroup-slot' }),
    '1',
    'admin',
  )
  assert.equal(p.edit, false)
  assert.equal(p.delete, false)
})
test('Editar sin cambiar hora ni fecha preserva el timestamp original exacto', () => {
  const original = '2027-03-12T15:00:00.123Z'
  assert.equal(d.activityTimestamp('2027-03-12', '09:00', original), original)
})
test('Nuevos horarios usan America/Mexico_City; no la zona del equipo', () => {
  assert.equal(
    d.activityTimestamp('2027-03-12', '09:30'),
    '2027-03-12T09:30:00-06:00',
  )
  assert.equal(d.activityTimestamp('2027-03-12', ''), null)
})
