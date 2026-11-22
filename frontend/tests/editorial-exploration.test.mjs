import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const compile = (source, module = ts.ModuleKind.ESNext) =>
  ts.transpileModule(source, {
    compilerOptions: { module, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const source = readFileSync(
  new URL("../src/pages/Search/exploration/geo-data.ts", import.meta.url),
  "utf8",
);
const d = await import(
  `data:text/javascript;base64,${Buffer.from(compile(source)).toString("base64")}`
);
test("Geografía: coordenadas cero son válidas; faltantes, cadenas y fuera de rango no", () => {
  assert.deepEqual(d.coordinates({ latitude: 0, longitude: 0 }), {
    lat: 0,
    lng: 0,
  });
  for (const v of [
    null,
    {},
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: 181 },
    { latitude: NaN, longitude: 0 },
    { latitude: "21", longitude: -86 },
  ])
    assert.equal(d.coordinates(v), null);
});
test("Lugares: sin origen conserva todos; sin coordenadas conserva la ficha sin fabricar distancia", () => {
  const a = { id: "a", latitude: null, longitude: null },
    b = { id: "b", latitude: 21, longitude: -86 };
  assert.deepEqual(d.nearbyResults([a, b], null), [a, b]);
  assert.equal(d.distanceFrom(a, { lat: 21, lng: -86 }), Infinity);
  assert.deepEqual(d.nearbyResults([a, b], { lat: 21, lng: -86 }), [b, a]);
});
test("Radio existente: descarta puntos lejanos y ordena cercanos sin mutar la respuesta", () => {
  const a = { id: "a", latitude: 21.2, longitude: -86 },
    b = { id: "b", latitude: 21.1, longitude: -86 },
    c = { id: "c", latitude: 40, longitude: 0 };
  const data = [a, b, c];
  assert.deepEqual(
    d.nearbyResults(data, { lat: 21, lng: -86 }).map((x) => x.id),
    ["b", "a"],
  );
  assert.equal(data[0], a);
});
test("Seguridad: no expone enlaces javascript ni genera una ubicación sin datos", () => {
  assert.equal(d.safeUrl("javascript:alert(1)"), null);
  assert.equal(d.safeUrl("data:text/html,hi"), null);
  assert.equal(d.placeUrl({}), null);
  const p = {
    id: "abc &/123",
    name: "Museo & Arte",
    googleMapsUri: "javascript:x",
  };
  const u = new URL(d.placeUrl(p));
  assert.equal(u.searchParams.get("query_place_id"), p.id);
});
test("Valores meteorológicos ausentes no se convierten en cero ni en grados", () => {
  assert.equal(d.numberText(null, " °C"), "No informado");
  assert.equal(d.numberText(undefined, "%"), "No informado");
  assert.equal(d.numberText(NaN), "No informado");
  assert.equal(d.numberText(0, " km/h"), "0 km/h");
});
test("Pronóstico: fecha exacta recibida, rango futuro no inventado y fechas imposibles rechazadas", () => {
  const day = { date: "2026-11-22", min: null, max: 0 };
  assert.equal(d.forecastForDate([day], "2026-11-22"), day);
  assert.equal(d.forecastForDate([day], "2027-03-12"), null);
  for (const date of ["2026-02-30", "2026-13-01", "2026-11-22T12:00:00Z", ""])
    assert.equal(d.hasForecastDate(date), false);
  assert.equal(d.hasForecastDate("2028-02-29"), true);
});
test("Polilínea de referencia Google decodifica puntos exactos", () => {
  assert.deepEqual(d.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
});
test("Polilínea malformada, truncada o excesiva no causa ciclos ni ubicaciones falsas", () => {
  for (const encoded of [
    "",
    "_",
    "~".repeat(100),
    "\u0000",
    "_".repeat(200001),
  ])
    assert.deepEqual(d.decodePolyline(encoded), []);
});
const hours = (value) => ({
  regularOpeningHours: { weekdayDescriptions: [`viernes: ${value}`] },
});
test("Horarios reales: cerrado bloquea; horario ausente permite con advertencia", () => {
  assert.equal(
    d.validateTimeAgainstOpeningHours(hours("Cerrado"), "2027-03-12", "10:00")
      .status,
    "invalid",
  );
  assert.equal(
    d.validateTimeAgainstOpeningHours({}, "2027-03-12", "10:00").status,
    "unknown",
  );
});
test("Horarios: franjas partidas y nocturnas respetan la hora solicitada", () => {
  for (const time of ["09:30", "16:00"])
    assert.equal(
      d.validateTimeAgainstOpeningHours(
        hours("09:00–12:00, 15:00–18:00"),
        "2027-03-12",
        time,
      ).status,
      "valid",
    );
  assert.equal(
    d.validateTimeAgainstOpeningHours(
      hours("09:00–12:00, 15:00–18:00"),
      "2027-03-12",
      "13:00",
    ).status,
    "invalid",
  );
  assert.equal(
    d.validateTimeAgainstOpeningHours(
      hours("20:00–02:00"),
      "2027-03-12",
      "01:30",
    ).status,
    "valid",
  );
});
test("Horarios: 24 horas explícito e interpretación desconocida se distinguen", () => {
  assert.equal(
    d.validateTimeAgainstOpeningHours(
      hours("Abierto 24 horas"),
      "2027-03-12",
      "23:30",
    ).status,
    "valid",
  );
  assert.equal(
    d.validateTimeAgainstOpeningHours(
      hours("Consultar con recepción"),
      "2027-03-12",
      "11:00",
    ).status,
    "unknown",
  );
  assert.equal(
    d.validateTimeAgainstOpeningHours(
      hours("10:00–18:00"),
      "2027-03-12",
      "25:00",
    ).status,
    "invalid",
  );
});
const mapsSource = readFileSync(
  new URL("../src/services/maps.ts", import.meta.url),
  "utf8",
);
const loader = mapsSource.slice(
  mapsSource.indexOf("export function loadGoogleMaps"),
  mapsSource.indexOf("export const mapsService"),
);
function loaderFixture() {
  let script = null,
    created = 0,
    timerCallback;
  const handlers = {};
  const win = {
    setTimeout(fn) {
      timerCallback = fn;
      return 1;
    },
    clearTimeout() {},
  };
  const doc = {
    querySelector() {
      return script;
    },
    createElement() {
      created++;
      return {
        dataset: {},
        addEventListener(name, fn) {
          handlers[name] = fn;
        },
        remove() {
          script = null;
        },
      };
    },
    head: {
      appendChild(s) {
        script = s;
      },
    },
  };
  const context = {
    window: win,
    document: doc,
    exports: {},
    Promise,
    Error,
    encodeURIComponent,
  };
  vm.runInNewContext(compile(loader, ts.ModuleKind.CommonJS), context);
  return {
    load: context.exports.loadGoogleMaps,
    win,
    get created() {
      return created;
    },
    get script() {
      return script;
    },
    event: (n) => handlers[n](),
    timeout: () => timerCallback(),
  };
}
test("Cargador Maps: sin clave rechaza sin insertar scripts", async () => {
  const f = loaderFixture();
  await assert.rejects(f.load(""), /VITE_GOOGLE/);
  assert.equal(f.created, 0);
});
test("Cargador Maps: llamadas simultáneas comparten script; carga requiere namespace real", async () => {
  const f = loaderFixture(),
    p = f.load("fixture-only");
  assert.equal(f.load("fixture-only"), p);
  assert.equal(f.created, 1);
  f.win.google = { maps: {} };
  f.event("load");
  await p;
  await f.load("fixture-only");
  assert.equal(f.created, 1);
});
test("Cargador Maps: error libera la promesa y permite reintentar", async () => {
  const f = loaderFixture(),
    p = f.load("fixture-only");
  f.event("error");
  await assert.rejects(p, /No se pudo cargar/);
  assert.equal(f.script, null);
  const next = f.load("fixture-only");
  assert.notEqual(next, p);
  assert.equal(f.created, 2);
  f.win.google = { maps: {} };
  f.event("load");
  await next;
});
test("Cargador Maps: timeout y carga sin namespace producen error recuperable", async () => {
  for (const event of ["timeout", "load"]) {
    const f = loaderFixture(),
      p = f.load("fixture-only");
    if (event === "timeout") f.timeout();
    else f.event("load");
    await assert.rejects(p, /No se pudo cargar/);
    assert.equal(f.win.__itheraGoogleMapsLoading, undefined);
  }
});
