import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/components/account/account-data.ts", import.meta.url),
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
const doc = (extra = {}) => ({
  id: "document",
  user_id: "auth-uuid",
  ...extra,
});
test("Eliminar requiere UUID del autor; un ID local o rol admin no concede permiso", () => {
  assert.equal(d.canDeleteTripDocument(doc(), "auth-uuid"), true);
  for (const user of ["1", "other-uuid", undefined, null, ""])
    assert.equal(d.canDeleteTripDocument(doc(), user), false);
});
test("Comprobantes inmutables no son eliminables ni por el autor", () => {
  assert.equal(
    d.canDeleteTripDocument(
      doc({ metadata: { immutable: true } }),
      "auth-uuid",
    ),
    false,
  );
  assert.equal(
    d.canDeleteTripDocument(
      doc({ metadata: { immutable: false } }),
      "auth-uuid",
    ),
    true,
  );
});
test("Modo lectura bloquea eliminación aunque el archivo pertenezca al usuario", () =>
  assert.equal(d.canDeleteTripDocument(doc(), "auth-uuid", true), false));
test("Admite formatos reales del backend, sin aceptar SVG ni ejecutables", () => {
  for (const type of [
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
  ])
    assert.equal(d.validDocumentFile({ type, size: 1024 }), "");
  for (const type of [
    "application/javascript",
    "image/svg+xml",
    "application/zip",
    "",
  ])
    assert.match(d.validDocumentFile({ type, size: 1024 }), /Elige/);
});
test("Tamaño máximo se acepta en el límite exacto y rechaza un byte más", () => {
  assert.equal(
    d.validDocumentFile({ type: "application/pdf", size: 10485760 }),
    "",
  );
  assert.match(
    d.validDocumentFile({ type: "application/pdf", size: 10485761 }),
    /10 MB/,
  );
});
test("Tipo documental se determina con metadatos recibidos, sin miniaturas ficticias", () => {
  assert.equal(d.documentKind("application/pdf"), "PDF");
  assert.equal(d.documentKind("text/plain"), "TXT");
  assert.equal(d.documentKind("image/jpeg"), "IMAGEN");
  assert.equal(d.documentKind(undefined, "reserva.PDF"), "PDF");
  assert.equal(d.documentKind(undefined, "apunte.txt"), "TXT");
  assert.equal(d.documentKind(), "ARCHIVO");
});
test("Enlace firmado conserva exactamente consulta, firma y caracteres codificados", () => {
  const url =
    "https://storage.example.test/file.pdf?token=x%26%2F%2B%3D&expires=123&signature=a+b";
  assert.equal(d.safeDocumentUrl(url), url);
});
test("URLs no HTTP y valores ausentes no producen enlaces ejecutables", () => {
  for (const url of [
    undefined,
    null,
    "",
    "javascript:alert(1)",
    "data:text/html,test",
    "//storage.example.test/file",
    "/relative/file",
  ])
    assert.equal(d.safeDocumentUrl(url), null);
});
test("Tamaño desconocido no se presenta como cero", () => {
  for (const bytes of [undefined, NaN, -1])
    assert.equal(d.documentSize(bytes), "Tamaño no informado");
  assert.equal(d.documentSize(0), "0 B");
  assert.equal(d.documentSize(1024), "1.0 KB");
  assert.equal(d.documentSize(1048576), "1.0 MB");
});
test("Fechas ausentes o inválidas no se fabrican; fecha válida usa zona de México", () => {
  assert.equal(d.documentDate(), "Fecha no informada");
  assert.equal(d.documentDate("invalid"), "Fecha no informada");
  assert.match(d.documentDate("2026-11-22T01:00:00Z"), /21.*nov.*2026/);
});
