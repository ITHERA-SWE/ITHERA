#!/usr/bin/env python3
"""Aplica un paquete documental ITHERA con verificaciones de seguridad.

Uso: python3 aplicar_docs_2027_1.py paquete.zip --check|--apply
Ejecutar desde la raíz del repositorio. No requiere dependencias externas.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

MANIFEST = 'docs/MANIFEST_DOCS_2027_1.json'
GUARD_FILES = ('README.md', 'CONTRIBUTING.md', 'LICENSE')
PROTECTED = ('main', 'develop', 'master')


def git(*args: str) -> str:
    process = subprocess.run(['git', *args], check=True, capture_output=True, text=True)
    return process.stdout.strip()


def safe_path(name: str) -> bool:
    p = PurePosixPath(name)
    return bool(name) and not p.is_absolute() and not name.startswith('/') and '..' not in p.parts and '\\' not in name and p.as_posix() == name


def read_package(zip_path: Path):
    with ZipFile(zip_path) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or not all(safe_path(n) for n in names):
            raise ValueError('ZIP con rutas no seguras o duplicadas.')
        manifest = json.loads(z.read(MANIFEST))
        expected = manifest['files']
        allowed = set(expected) | {MANIFEST}
        if set(names) != allowed:
            raise ValueError('Contenido inesperado o faltante en el ZIP.')
        files = {}
        for name, info in expected.items():
            data = z.read(name)
            if hashlib.sha256(data).hexdigest() != info['sha256']:
                raise ValueError(f'Hash no coincide: {name}')
            files[name] = data
        files[MANIFEST] = z.read(MANIFEST)
        return files


def verify(repo: Path, files: dict):
    if git('rev-parse', '--show-toplevel') != str(repo):
        raise ValueError('Ejecuta el instalador desde la raíz del repositorio.')
    branch = git('branch', '--show-current')
    if not branch or branch in PROTECTED or not branch.startswith('docs/'):
        raise ValueError(f'Rama incorrecta: {branch!r}. Crea una rama docs/* desde develop.')
    if git('status', '--porcelain'):
        raise ValueError('El árbol Git contiene cambios o archivos sin seguimiento. Guarda tu trabajo antes.')
    for f in GUARD_FILES:
        if not (repo / f).is_file():
            raise ValueError(f'Falta el archivo de origen: {f}')
    original = (repo / 'README.md').read_text(encoding='utf-8')
    if '2026/2' not in original or 'Idalia Maldonado' not in original or 'Demian Romero Bautista' not in original:
        raise ValueError('README no coincide con la documentación anterior esperada; no sobrescribir. Reconciliar cambios.')
    license_text = (repo / 'LICENSE').read_text(encoding='utf-8')
    if 'MIT License' not in license_text or 'Copyright (c) 2026 Demian Rom' not in license_text:
        raise ValueError('LICENSE no contiene el aviso MIT original esperado; revisar manualmente.')
    contributors = (repo / 'CONTRIBUTING.md').read_text(encoding='utf-8')
    if 'develop' not in contributors or 'main' not in contributors:
        raise ValueError('CONTRIBUTING no parece corresponder a la política de ramas anterior.')
    for f in files:
        if f not in GUARD_FILES and (repo / f).exists():
            raise ValueError(f'Archivo nuevo ya existe; se cancela para evitar sobrescritura: {f}')
    return branch


def write_atomic(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temp:
        temp.write(data)
        tmp = Path(temp.name)
    try:
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip', type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    repo = Path.cwd().resolve()
    files = read_package(args.zip)
    branch = verify(repo, files)
    print(f'Compatibilidad e integridad verificadas: {len(files)} archivos, rama {branch}.')
    if args.check:
        print('Comprobación finalizada sin modificar archivos.')
        return
    # Guardar originales y restaurar si falla cualquier escritura.
    backups = {name: (repo / name).read_bytes() if (repo / name).exists() else None for name in files}
    done = []
    try:
        for name, data in files.items():
            write_atomic(repo / name, data)
            done.append(name)
    except Exception:
        for name in reversed(done):
            prev = backups[name]
            if prev is None:
                (repo / name).unlink(missing_ok=True)
            else:
                write_atomic(repo / name, prev)
        raise
    print('Aplicación completada. Revisa git diff antes de realizar commit.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        sys.exit(1)
