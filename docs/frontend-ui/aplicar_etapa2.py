#!/usr/bin/env python3
"""Comprueba compatibilidad e integridad antes de aplicar la entrega Etapa 2.
Uso desde la raíz del repositorio: python3 aplicar_etapa2.py archivo.zip --check|--apply
Solo usa la biblioteca estándar. No crea commits ni modifica referencias Git.
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

MANIFEST = "docs/frontend-ui/MANIFEST_ETAPA2.json"
BASE = "7abfe0156cd947b4a940b82b764afbca2ae21f72"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = Path.cwd().resolve()
    if Path(git("rev-parse", "--show-toplevel")).resolve() != root:
        raise ValueError("Ejecuta este comando desde la raíz del repositorio.")
    if git("branch", "--show-current") in ("", "main", "develop"):
        raise ValueError("Crea y selecciona primero feat/editorial-dashboard.")
    if git("status", "--porcelain", "--untracked-files=all"):
        raise ValueError("Hay cambios locales. Revísalos y guárdalos antes de aplicar el ZIP.")
    git("cat-file", "-e", BASE + "^{commit}")
    if subprocess.run(["git", "merge-base", "--is-ancestor", BASE, "HEAD"], check=False).returncode:
        raise ValueError("HEAD no desciende del commit base. Requiere revisión manual.")
    with zipfile.ZipFile(args.zip) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or len(names) > 50:
            raise ValueError("Estructura del ZIP no válida.")
        manifest_bytes = archive.read(MANIFEST)
        manifest = json.loads(manifest_bytes)
        if manifest["base_commit"] != BASE or manifest["deleted_files"]:
            raise ValueError("Manifiesto incompatible.")
        entries = manifest["files"]
        if set(names) != {MANIFEST, *(entry["path"] for entry in entries)}:
            raise ValueError("El ZIP contiene archivos no declarados.")
        payloads = {MANIFEST: manifest_bytes}
        for info in archive.infolist():
            relative = PurePosixPath(info.filename)
            if relative.is_absolute() or ".." in relative.parts or not relative.parts or info.is_dir():
                raise ValueError("Ruta no válida en el ZIP.")
            if stat.S_ISLNK(info.external_attr >> 16) or info.file_size > 2_000_000:
                raise ValueError("Tipo o tamaño de archivo no permitido.")
            target = root / info.filename
            if not target.resolve().is_relative_to(root) or target.is_symlink():
                raise ValueError("La ruta apunta fuera del repositorio.")
        if (root / MANIFEST).exists():
            raise ValueError("Ya existe un manifiesto de esta entrega. Revisa si ya fue aplicada.")
        for entry in entries:
            name = entry["path"]
            data = archive.read(name)
            if digest(data) != entry["result_sha256"]:
                raise ValueError("Archivo de entrega alterado: " + name)
            target = root / name
            expected = entry["base_sha256"]
            if expected is None:
                if target.exists():
                    raise ValueError("Ya existe un archivo nuevo de esta entrega: " + name)
            elif not target.is_file() or digest(target.read_bytes()) != expected:
                raise ValueError("La versión local difiere de la base: " + name + ". No se sobrescribió nada.")
            payloads[name] = data
    print("Base:", BASE)
    print("HEAD:", git("rev-parse", "HEAD"))
    print("Compatibilidad e integridad correctas:", len(payloads), "archivos; ninguna eliminación.")
    if not args.apply:
        print("Comprobación terminada. No se modificó ningún archivo.")
        return
    originals = {name: (root / name).read_bytes() if (root / name).exists() else None for name in payloads}
    written = []
    try:
        for name, data in payloads.items():
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
                temporary.write(data)
                temp_path = Path(temporary.name)
            try:
                os.chmod(temp_path, 0o644)
                os.replace(temp_path, target)
                written.append(name)
            finally:
                temp_path.unlink(missing_ok=True)
    except Exception:
        for name in reversed(written):
            target = root / name
            if originals[name] is None:
                target.unlink(missing_ok=True)
            else:
                target.write_bytes(originals[name])
        raise
    print("Entrega aplicada. Revisa git status y git diff antes de confirmar los cambios.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        print("DETENIDO:", error, file=sys.stderr)
        sys.exit(1)
