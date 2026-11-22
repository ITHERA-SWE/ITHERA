import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
async function module(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
const docs = await module("../src/components/account/account-data.ts"),
  trips = await module("../src/components/trips/trip-data.ts"),
  position = await module("../src/components/ui/editorial-position.ts"),
  proposal = await module("../src/components/collaboration/proposal-data.ts");
const doc = (id, name = "reserva.pdf", metadata = {}) => ({
  id,
  file_name: name,
  metadata,
});
test("Subida y actualización en tiempo real convergen en un único registro por ID", () => {
  const response = doc("1");
  let items = docs.mergeTripDocuments([], [response]);
  items = docs.mergeTripDocuments(items, [response]);
  assert.equal(items.length, 1);
  assert.equal(items[0], response);
});
test("Documentos con el mismo nombre y distinto ID siguen siendo dos archivos legítimos", () => {
  const items = docs.mergeTripDocuments([doc("1")], [doc("2")]);
  assert.deepEqual(
    items.map((d) => d.id),
    ["2", "1"],
  );
});
test("Snapshot repetido de API se representa una vez por identidad sin mutarlo", () => {
  const input = [doc("1"), doc("1"), doc("2")],
    original = [...input];
  assert.equal(docs.mergeTripDocuments([], input).length, 2);
  assert.deepEqual(input, original);
});
test("Respuesta actualizada conserva metadatos y asociaciones del mismo archivo", () => {
  const updated = doc("1", "reserva.pdf", {
    notes: "nota final",
    linked_entity_id: "activity-2",
  });
  const result = docs.mergeTripDocuments([doc("1"), doc("2")], [updated]);
  assert.deepEqual(result[0], updated);
  assert.equal(result.length, 2);
});
test("Identidad documental compara de forma consistente IDs numéricos y cadenas", () =>
  assert.equal(docs.mergeTripDocuments([{ id: 1 }], [{ id: "1" }]).length, 1));
test("Combinar archivos es idempotente ante repetición de eventos", () => {
  const initial = [doc("1"), doc("2")],
    next = [doc("3")];
  assert.deepEqual(
    docs.mergeTripDocuments(docs.mergeTripDocuments(initial, next), next),
    docs.mergeTripDocuments(initial, next),
  );
});
const item = (id, name, start, end, estado = "activo") => ({
  rol: "viajero",
  grupos_viaje: {
    id,
    nombre: name,
    fecha_inicio: start,
    fecha_fin: end,
    estado,
  },
});
const collection = [
  item("1", "Ávila", "2026-11-01", "2026-11-03"),
  item("2", "Viaje 10", "2027-02-01", "2027-02-04"),
  item("3", "Zacatecas", "2026-11-20", "2026-11-24"),
  item("4", "Viaje 2", "2027-01-01", "2027-01-04"),
  item("5", "Sin fechas", null, null),
  item("6", "Reciente", "2026-11-10", "2026-11-14"),
];
test("Fecha produce orden estable en curso, próximos, sin fechas e históricos recientes primero", () => {
  assert.deepEqual(
    trips
      .orderTrips(collection, "date", "2026-11-22")
      .map((i) => i.grupos_viaje.id),
    ["3", "4", "2", "5", "6", "1"],
  );
});
test("Fecha es consistente ante distintas permutaciones de la misma colección", () => {
  const expected = trips.orderTrips(collection, "date", "2026-11-22");
  for (let i = 0; i < collection.length; i++) {
    const permuted = [...collection.slice(i), ...collection.slice(0, i)];
    assert.deepEqual(
      trips.orderTrips(permuted, "date", "2026-11-22"),
      expected,
    );
  }
});
test("Nombre usa orden español, ignora acentos al comparar y ordena números naturalmente", () => {
  const sorted = trips
    .orderTrips(collection, "name", "2026-11-22")
    .map((i) => i.grupos_viaje.nombre);
  assert.equal(sorted[0], "Ávila");
  assert.ok(sorted.indexOf("Viaje 2") < sorted.indexOf("Viaje 10"));
});
test("Ordenamiento no muta el historial ni pierde filtros previos", () => {
  const original = [...collection],
    selected = collection.filter(
      (i) => trips.tripSection(i.grupos_viaje, "2026-11-22") === "past",
    );
  const sorted = trips.orderTrips(selected, "date", "2026-11-22");
  assert.deepEqual(
    sorted.map((i) => i.grupos_viaje.id),
    ["6", "1"],
  );
  assert.deepEqual(collection, original);
});
test("Empate de fecha se resuelve por nombre e ID sin depender del orden de llegada", () => {
  const a = item("12", "Plan", "2027-01-01", "2027-01-03"),
    b = item("2", "Plan", "2027-01-01", "2027-01-03");
  assert.deepEqual(
    trips
      .orderTrips([a, b], "date", "2026-11-22")
      .map((i) => i.grupos_viaje.id),
    ["2", "12"],
  );
});
test("Fechas inválidas no se convierten en valores de calendario inventados", () => {
  assert.equal(
    trips.tripSection(
      item("x", "Inválido", "2027-02-30", "2027-03-01").grupos_viaje,
      "2026-11-22",
    ),
    "undated",
  );
});
for (const [name, anchor] of [
  ["izquierdo", { left: 0, right: 30, top: 10, bottom: 40, width: 30 }],
  ["derecho", { left: 370, right: 395, top: 100, bottom: 130, width: 25 }],
  ["inferior", { left: 330, right: 360, top: 740, bottom: 770, width: 30 }],
])
  test("Ayuda permanece en el viewport cerca del borde " + name, () => {
    const p = position.tooltipPosition(
      anchor,
      { width: 310, height: 160 },
      390,
      800,
      "right",
    );
    assert.ok(p.left >= 12 && p.left + 310 <= 378);
    assert.ok(p.top >= 12 && p.top + 160 <= 788);
  });
test("Ayuda cercana al borde inferior se coloca por encima del disparador", () =>
  assert.ok(
    position.tooltipPosition(
      { left: 100, right: 130, top: 740, bottom: 770, width: 30 },
      { width: 300, height: 150 },
      390,
      800,
    ).top +
      150 <
      740,
  ));
test("Ayuda sobredimensionada se limita al área visible disponible", () => {
  const p = position.tooltipPosition(
    { left: -100, right: -70, top: -10, bottom: 20, width: 30 },
    { width: 900, height: 1000 },
    390,
    800,
  );
  assert.deepEqual(p, { left: 12, top: 12 });
});
test("Lugares guardados se reconocen por el payload real sin cambiar su tipo de propuesta", () => {
  const p = { tipo: "actividad", payload: { googlePlaceId: "real-place-id" } };
  assert.equal(proposal.proposalCategory(p), "lugar");
  assert.equal(p.tipo, "actividad");
  assert.equal(
    proposal.proposalCategory({ tipo: "actividad", payload: {} }),
    "actividad",
  );
});
test("Tipos existentes y desconocidos se conservan sin excluir alternativas del backend", () => {
  for (const tipo of ["vuelo", "hospedaje", "lugar", "otro", "actividad"])
    assert.equal(proposal.proposalCategory({ tipo }), tipo);
  assert.equal(proposal.proposalCategoryLabel("lugar"), "Lugares");
  assert.equal(proposal.proposalCategoryLabel("otro"), "otro");
});
