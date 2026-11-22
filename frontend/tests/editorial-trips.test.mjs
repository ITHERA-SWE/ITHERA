import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/components/trips/trip-data.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const d = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const g = (extra = {}) => ({
  id: "41",
  nombre: "Prueba",
  estado: "activo",
  fecha_inicio: "2026-11-20",
  fecha_fin: "2026-11-24",
  ...extra,
});
const form = {
  name: "Mi viaje",
  destination: "México",
  description: "",
  startDate: "2027-03-12",
  endDate: "2027-03-18",
  maxMembers: "10",
  totalBudget: "20000.50",
  isPublic: false,
};
test("Hoy usa America/Mexico_City incluso alrededor del cambio de fecha UTC", () => {
  assert.equal(d.todayInMexico(new Date("2026-11-22T01:00:00Z")), "2026-11-21");
  assert.equal(d.todayInMexico(new Date("2026-11-22T07:00:00Z")), "2026-11-22");
});
test("Fechas civiles imposibles o con formato distinto no se aceptan", () => {
  for (const date of [
    "2027-02-29",
    "2026-11-31",
    "2026-1-02",
    "not-date",
    "2026-11-22T00:00:00Z",
  ])
    assert.equal(d.civilDate(date), null);
  assert.equal(d.civilDate("2028-02-29"), "2028-02-29");
});
test("Sumar días atraviesa meses, año bisiesto y año sin desplazamiento local", () => {
  assert.equal(d.addCivilDays("2027-12-31", 1), "2028-01-01");
  assert.equal(d.addCivilDays("2028-02-28", 2), "2028-03-01");
  assert.equal(d.dayDifference("2026-12-31", "2027-01-02"), 2);
});
test("Rangos incompletos no convierten fechas nulas en enero de 1970", () => {
  assert.equal(d.tripDateRange(null, null), "Fechas por definir");
  assert.match(d.tripDateRange(null, "2027-03-18"), /^Hasta/);
  assert.match(d.tripDateRange("2027-03-12", null), /^Desde/);
  assert.match(
    d.tripDateRange("2027-03-12", "2027-03-18"),
    /12 mar 2027.*18 mar 2027/,
  );
});
test("En curso incluye fechas de salida y regreso; próximo y pasado usan datos reales", () => {
  for (const today of ["2026-11-20", "2026-11-22", "2026-11-24"])
    assert.equal(d.tripSection(g(), today), "current");
  assert.equal(d.tripSection(g(), "2026-11-19"), "upcoming");
  assert.equal(d.tripSection(g(), "2026-11-25"), "past");
});
test("Cerrado, finalizado y archivado se clasifican como anteriores sin mutar el estado", () => {
  for (const estado of ["cerrado", "finalizado", "archivado"]) {
    const group = g({ estado });
    assert.equal(d.tripSection(group, "2026-01-01"), "past");
    assert.equal(group.estado, estado);
  }
  const group = g();
  d.tripSection(group, "2027-01-01");
  assert.equal(group.estado, "activo");
});
test("Calendarios ausentes, invertidos o inicio sin fin no se presentan como viaje en curso", () => {
  for (const extra of [
    { fecha_inicio: null, fecha_fin: null },
    { fecha_inicio: "2026-11-24", fecha_fin: "2026-11-20" },
    { fecha_fin: null },
  ])
    assert.equal(d.tripSection(g(extra), "2026-11-22"), "undated");
});
test("Historial repetido se deduplica por identificador, preservando rol y objetos originales", () => {
  const item = { rol: "viajero", grupos_viaje: g() };
  const items = d.uniqueTrips([
    item,
    item,
    { rol: "admin", grupos_viaje: g({ id: "42" }) },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0], item);
  assert.equal(items[0].rol, "viajero");
});
test("Orden fecha/nombre es local, estable ante fechas ausentes y no muta el historial", () => {
  const items = [
    {
      rol: "admin",
      grupos_viaje: g({ id: "1", nombre: "Zeta", fecha_inicio: null }),
    },
    { rol: "viajero", grupos_viaje: g({ id: "2", nombre: "Alfa" }) },
  ];
  assert.equal(d.orderTrips(items, "name")[0].grupos_viaje.id, "2");
  assert.equal(d.orderTrips(items, "date")[0].grupos_viaje.id, "2");
  assert.equal(items[0].grupos_viaje.id, "1");
});
test("No se inventan estados, roles ni fotos; el filtro ignora acentos", () => {
  assert.equal(d.statusLabel("borrador"), "borrador");
  assert.equal(d.roleLabel(null), null);
  assert.equal(d.safePhoto("javascript:alert(1)"), null);
  assert.equal(d.safePhoto(null), null);
  assert.equal(d.normalizedText("Cancún"), "cancun");
});
test("Presupuesto obligatorio rechaza ausente, cero, negativo, infinito y exceso de precisión", () => {
  for (const totalBudget of [
    "",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "1e6",
    "100.001",
    "10000000000",
    "1,000",
  ])
    assert.ok(
      d.validateTrip({ ...form, totalBudget }, "2026-11-22").totalBudget,
    );
  assert.equal(
    d.validateTrip({ ...form, totalBudget: "9999999999.99" }, "2026-11-22")
      .totalBudget,
    undefined,
  );
});
test("Creación exige salida futura, regreso posterior y máximo 60 días", () => {
  assert.ok(
    d.validateTrip({ ...form, startDate: "2020-01-01" }, "2026-11-22")
      .startDate,
  );
  assert.ok(
    d.validateTrip({ ...form, endDate: form.startDate }, "2026-11-22").endDate,
  );
  assert.ok(
    d.validateTrip(
      { ...form, endDate: d.addCivilDays(form.startDate, 61) },
      "2026-11-22",
    ).endDate,
  );
  assert.equal(
    d.validateTrip(
      { ...form, endDate: d.addCivilDays(form.startDate, 60) },
      "2026-11-22",
    ).endDate,
    undefined,
  );
});
test("Contrato de creación conserva límites de nombre, descripción y capacidad", () => {
  assert.ok(
    d.validateTrip({ ...form, name: " ".repeat(3) }, "2026-11-22").name,
  );
  assert.ok(
    d.validateTrip({ ...form, name: "a".repeat(61) }, "2026-11-22").name,
  );
  assert.ok(
    d.validateTrip({ ...form, description: "a".repeat(301) }, "2026-11-22")
      .description,
  );
  for (const maxMembers of ["0", "51", "1.5", "abc"])
    assert.ok(d.validateTrip({ ...form, maxMembers }, "2026-11-22").maxMembers);
  assert.deepEqual(d.validateTrip(form, "2026-11-22"), {});
});
test("Invitaciones mantienen la validación de correo existente, sin aceptar entradas incompletas", () => {
  assert.equal(d.validEmail(" persona+viaje@example.com "), true);
  for (const email of [
    "",
    "a@",
    "persona@dominio",
    "persona con espacios@example.com",
  ])
    assert.equal(d.validEmail(email), false);
});
