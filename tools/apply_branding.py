#!/usr/bin/env python3
"""Apply the UI branding to existing Vite/Capacitor project configuration.

The source files and public icon files are shipped separately in this update ZIP.
Run after extracting the ZIP into the root of the existing Vite project.
Does not touch internal role IDs, save keys, or unrelated app settings.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import html
import json
import re
import shutil
import sys

APP_NAME = "血濡れた時計台ヘルパー"
TITLE = html.escape(APP_NAME)


def replace_once(text: str, pattern: str, replacement: str, flags: int = 0) -> tuple[str, bool]:
    changed, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=flags)
    return changed, count > 0


def patch_index_html(root: Path) -> bool:
    path = root / "index.html"
    if not path.is_file():
        return False
    before = path.read_text(encoding="utf-8")
    updated, found_title = replace_once(before, r"<title\b[^>]*>.*?</title>", f"<title>{TITLE}</title>", re.I | re.S)
    if not found_title:
        updated = re.sub(r"</head>", f"  <title>{TITLE}</title>\n</head>", updated, count=1, flags=re.I)
    icon_tag = '<link rel="icon" type="image/png" href="./favicon.png" />'
    updated, found_icon = replace_once(updated, r"<link\b(?=[^>]*\brel\s*=\s*['\"]icon['\"])[^>]*>", icon_tag, re.I)
    if not found_icon:
        updated = re.sub(r"</head>", f"  {icon_tag}\n</head>", updated, count=1, flags=re.I)
    manifest_tag = '<link rel="manifest" href="./manifest.webmanifest" />'
    updated, found_manifest = replace_once(updated, r"<link\b(?=[^>]*\brel\s*=\s*['\"]manifest['\"])[^>]*>", manifest_tag, re.I)
    if not found_manifest:
        updated = re.sub(r"</head>", f"  {manifest_tag}\n</head>", updated, count=1, flags=re.I)
    if updated != before:
        path.write_text(updated, encoding="utf-8")
    return True


def patch_capacitor(root: Path) -> bool:
    path = next((root / f"capacitor.config.{suffix}" for suffix in ("ts", "js", "json") if (root / f"capacitor.config.{suffix}").is_file()), None)
    if not path:
        return False
    original = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        data = json.loads(original)
        data["appName"] = APP_NAME
        revised = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    else:
        # Preserve all settings except the string literal of appName.
        revised, found = replace_once(original, r"\bappName\s*:\s*(['\"])[^'\"\n]*\1", f"appName: '{APP_NAME}'")
        if not found:
            print("  Capacitor config found, but appName literal was not recognized; update appName manually.")
            return False
    if revised != original:
        path.write_text(revised, encoding="utf-8")
    return True


def patch_android(root: Path, package: Path) -> bool:
    dest = root / "android/app/src/main/res"
    if not dest.is_dir():
        return False
    source = package / "android_branding/res"
    for path in source.rglob("*"):
        if path.is_file():
            output = dest / path.relative_to(source)
            output.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, output)
    values = dest / "values/strings.xml"
    values.parent.mkdir(parents=True, exist_ok=True)
    original = values.read_text(encoding="utf-8") if values.exists() else '<resources>\n</resources>\n'
    revised = original
    for key in ("app_name", "title_activity_main"):
        tag = f'<string name="{key}">{TITLE}</string>'
        pattern = rf"<string\b(?=[^>]*\bname\s*=\s*['\"]{key}['\"])[^>]*>.*?</string\s*>"
        revised, found = replace_once(revised, pattern, tag, re.I | re.S)
        if not found:
            revised = re.sub(r"</resources>", f"    {tag}\n</resources>", revised, count=1, flags=re.I)
    if revised != original:
        values.write_text(revised, encoding="utf-8")
    # In standard Capacitor manifests @string/app_name is used already.
    manifest = root / "android/app/src/main/AndroidManifest.xml"
    if manifest.is_file():
        original = manifest.read_text(encoding="utf-8")
        match = re.search(r"<application\b[^>]*>", original, re.S)
        if match:
            tag = match.group()
            changed_tag = re.sub(r'android:label\s*=\s*["\'][^"\']*["\']', 'android:label="@string/app_name"', tag, count=1)
            if changed_tag != tag:
                manifest.write_text(original[:match.start()] + changed_tag + original[match.end():], encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply BOTC helper app name and launcher icon")
    parser.add_argument("project_root", nargs="?", default=".", help="Existing Vite/Capacitor project root")
    opts = parser.parse_args()
    root = Path(opts.project_root).expanduser().resolve()
    package = Path(__file__).resolve().parent.parent
    if not root.is_dir():
        print(f"Project does not exist: {root}", file=sys.stderr)
        return 1
    print(f"Target: {root}")
    if not (root / 'src').is_dir():
        print('WARNING: src/ was not found. Copy the ZIP src/ into the project first.')
    if not (root / 'public/manifest.webmanifest').is_file():
        print('WARNING: Copy the ZIP public/ into this project for the web icon and manifest.')
    print('index.html:', 'updated' if patch_index_html(root) else 'not present (runtime title still applies)')
    print('Capacitor config:', 'updated' if patch_capacitor(root) else 'not present or needs manual editing')
    print('Android launcher icon + label:', 'updated' if patch_android(root, package) else 'Android project not present; prepared resources remain in android_branding/')
    print('Finished. Rebuild/reinstall the Android app to refresh its launcher icon.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
