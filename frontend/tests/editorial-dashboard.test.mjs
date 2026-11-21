// Sin dependencias de pruebas adicionales. Los tipos de dominio se eliminan al transpilar.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(
  new URL('../src/components/trip/editorial-data.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
})
const {
  dayDateKey,
  chooseOverviewDay,
  sortAgenda,
  uniqueProposals,
  pendingProposals,
  formatEditorialDate,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)
const item = (id, extra = {}) => ({
  id,
  proposalId: id,
  title: id,
  status: 'pendiente',
  ...extra,
})
const days = [1, 2, 3].map((dayNumber) => ({
  dayNumber,
  date: '',
  activities: [],
}))
test('Viaje futuro: selecciona el primer día, sin llamarlo hoy', () => {
  assert.equal(
    chooseOverviewDay(days, null, '2027-03-12', '2026-11-20').dayNumber,
    1,
  )
})
test('Viaje en curso: escoge la fecha actual y respeta la selección explícita', () => {
  assert.equal(
    chooseOverviewDay(days, null, '2027-03-12', '2027-03-13').dayNumber,
    2,
  )
  assert.equal(
    chooseOverviewDay(days, 3, '2027-03-12', '2027-03-13').dayNumber,
    3,
  )
})
test('Viaje pasado, grupo nuevo y agenda vacía tienen un resultado seguro', () => {
  assert.equal(
    chooseOverviewDay(days, 99, '2027-03-12', '2027-03-30').dayNumber,
    1,
  )
  assert.equal(chooseOverviewDay([], null, null), undefined)
})
test('Fechas civiles: cambio de mes/año, sin desplazamiento por zona horaria', () => {
  assert.equal(dayDateKey('2027-12-31', 2), '2028-01-01')
  assert.equal(dayDateKey('2028-02-28T00:00:00Z', 2), '2028-02-29')
  assert.equal(dayDateKey('2027-02-30', 1), null)
  assert.equal(dayDateKey('', 1), null)
  assert.equal(dayDateKey('2027-03-12', 0), null)
  assert.equal(formatEditorialDate(null), 'Fecha pendiente')
})
test('Cronología ordena horas; no muta la agenda y deja horarios desconocidos al final', () => {
  const activities = [
    item('late', { time: '18:20' }),
    item('unknown'),
    item('early', { time: '08:05' }),
  ]
  assert.deepEqual(
    sortAgenda(activities).map((a) => a.id),
    ['early', 'late', 'unknown'],
  )
  assert.equal(activities[0].id, 'late')
})
test('Los subgrupos y duplicados de varios días no inflan las decisiones', () => {
  const input = [
    {
      activities: [
        item('a'),
        item('slot', { kind: 'subgroup-slot' }),
        item('no', { proposalId: null }),
      ],
    },
    { activities: [item('a'), item('b')] },
  ]
  assert.deepEqual(
    uniqueProposals(input).map((a) => a.id),
    ['a', 'b'],
  )
})
test('Pendientes excluye propuestas confirmadas y vencidas; no inventa participaciones', () => {
  const now = Date.parse('2027-03-12T12:00:00Z')
  const input = [
    {
      activities: [
        item('future', { startsAt: '2027-03-13T12:00:00Z' }),
        item('past', { startsAt: '2027-03-11T12:00:00Z' }),
        item('ok', { status: 'confirmada' }),
        item('undated'),
      ],
    },
  ]
  assert.deepEqual(
    pendingProposals(input, now).map((a) => a.id),
    ['future', 'undated'],
  )
  assert.equal(pendingProposals(input, now)[0].votesFor, undefined)
})
