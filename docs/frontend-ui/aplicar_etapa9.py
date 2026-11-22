#!/usr/bin/env python3
"""Verifica la continuidad de Etapa 8 y aplica el ZIP de Etapa 9 desde la raíz del repo.
Uso: python3 aplicar_etapa9.py archivo.zip --check | --apply
Solo biblioteca estándar; no crea commits ni modifica ramas o referencias Git.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import tempfile
import zipfile

BASE = "7abfe0156cd947b4a940b82b764afbca2ae21f72"
OVERLAY = "dbc08f2927319277cf63f7337a88f1ac5c206eab29427f2304e935cc17a5e753"
MANIFEST = "docs/frontend-ui/MANIFEST_ETAPA9.json"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def repository_check(root):
    if Path(git("rev-parse", "--show-toplevel")).resolve() != root.resolve():
        raise ValueError("Ejecuta el comando desde la raíz del repositorio.")
    if git("branch", "--show-current") in ("", "main", "develop"):
        raise ValueError("Selecciona una rama de trabajo, por ejemplo feat/editorial-estabilizacion.")
    if git("ls-files", "--unmerged"):
        raise ValueError("Hay conflictos Git sin resolver. No se aplicó ningún archivo.")
    if git("status", "--porcelain", "--untracked-files=all"):
        raise ValueError("Hay cambios locales. Revísalos y guárdalos en Git antes de aplicar la entrega.")
    git("cat-file", "-e", BASE + "^{commit}")
    if subprocess.run(["git", "merge-base", "--is-ancestor", BASE, "HEAD"], check=False).returncode:
        raise ValueError("La historia no contiene el commit base conocido. Requiere revisión manual.")


def read_payloads(root, archive_path):
    """Comprueba todos los archivos antes de efectuar la primera escritura."""
    root = root.resolve()
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or len(names) > 50:
            raise ValueError("La estructura del ZIP no es válida.")
        for info in archive.infolist():
            relative = PurePosixPath(info.filename)
            if relative.is_absolute() or ".." in relative.parts or not relative.parts or info.is_dir() or "\\" in info.filename or str(relative) != info.filename:
                raise ValueError("Ruta no válida en la entrega.")
            if relative.parts[0] not in ("frontend", "docs") and info.filename not in ("README.md","CONTRIBUTING.md"):
                raise ValueError("La entrega incluye una ruta ajena a esta etapa.")
            if any(part in (".git", "node_modules", "dist") or part.startswith(".env") for part in relative.parts):
                raise ValueError("Archivo no permitido en la entrega.")
            if stat.S_ISLNK(info.external_attr >> 16) or info.file_size > 2_000_000:
                raise ValueError("Tipo o tamaño no permitido.")
            target = root / info.filename
            if target.is_symlink() or not target.resolve().is_relative_to(root):
                raise ValueError("Una ruta apunta fuera del repositorio.")
        manifest_bytes = archive.read(MANIFEST)
        manifest = json.loads(manifest_bytes)
        if manifest["base_commit"] != BASE or manifest["base_overlay_sha256"] != OVERLAY or manifest["deleted_files"]:
            raise ValueError("La versión base del manifiesto no coincide con esta entrega.")
        entries = manifest["files"]
        for entry in entries:
            if entry["path"] not in names:
                raise ValueError("El manifiesto declara un archivo ausente del ZIP.")
        if len({entry["path"] for entry in entries}) != len(entries):
            raise ValueError("Hay entradas repetidas en el manifiesto.")
        for guard in manifest["requires"]:
            path = PurePosixPath(guard["path"])
            target = root / guard["path"]
            if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] not in ("frontend", "docs") or "\\" in guard["path"] or target.is_symlink() or not target.resolve().is_relative_to(root):
                raise ValueError("Ruta de dependencia no válida.")
        if set(names) != {MANIFEST, *(entry["path"] for entry in entries)}:
            raise ValueError("El ZIP contiene archivos sin declarar o faltantes.")
        if (root / MANIFEST).exists():
            raise ValueError("Ya existe el manifiesto de Etapa 9. Revisa si ya aplicaste estos cambios.")
        for guard in manifest["requires"]:
            target = root / guard["path"]
            if not target.is_file() or sha(target.read_bytes()) != guard["sha256"]:
                raise ValueError("La Etapa 8 o una dependencia difiere de la base: " + guard["path"] + ". No se sobrescribió nada.")
        payloads = {MANIFEST: manifest_bytes}
        for entry in entries:
            name = entry["path"]
            data = archive.read(name)
            if sha(data) != entry["result_sha256"]:
                raise ValueError("La integridad del archivo no coincide: " + name)
            target = root / name
            expected = entry["base_sha256"]
            accepted=set(entry.get("accepted_base_sha256",[]))
            if expected is not None:accepted.add(expected)
            if target.exists():
                if not target.is_file() or sha(target.read_bytes()) not in accepted:
                    raise ValueError("Archivo incompatible o documentación actualizada por otro PR: " + name + ". No se sobrescribió nada.")
            elif expected is not None:
                raise ValueError("Falta el archivo base esperado: " + name + ". No se sobrescribió nada.")
            payloads[name] = data
    return payloads, manifest


def apply_payloads(root, payloads):
    originals = {name: (root / name).read_bytes() if (root / name).exists() else None for name in payloads}
    written = []
    try:
        for name, data in payloads.items():
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
                temporary.write(data)
                temporary_path = Path(temporary.name)
            try:
                os.chmod(temporary_path, 0o644)
                os.replace(temporary_path, target)
                written.append(name)
            finally:
                temporary_path.unlink(missing_ok=True)
    except Exception:
        for name in reversed(written):
            target = root / name
            if originals[name] is None:
                target.unlink(missing_ok=True)
            else:
                target.write_bytes(originals[name])
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = Path.cwd().resolve()
    repository_check(root)
    payloads, manifest = read_payloads(root, args.zip)
    print("Base Git:", BASE)
    print("Continuidad: Etapa 8, ZIP SHA256", OVERLAY)
    print("HEAD local:", git("rev-parse", "HEAD"))
    print("Compatibilidad e integridad correctas:", len(payloads), "archivos; ninguna eliminación.")
    if args.check:
        print("Comprobación finalizada sin modificar archivos.")
        return
    apply_payloads(root, payloads)
    print("Etapa 9 aplicada. Revisa git status y git diff antes de crear el commit.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        print("DETENIDO:", error, file=sys.stderr)
        sys.exit(1)
