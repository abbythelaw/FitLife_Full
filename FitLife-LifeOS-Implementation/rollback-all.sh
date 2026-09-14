#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"; cd "$ROOT"
BASE=.fitlife-implementation-backups
LATEST="${2:-$(find "$BASE" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -1)}"
[ -n "$LATEST" ] && [ -d "$LATEST" ] || { echo "No backup found" >&2; exit 1; }
[ -f "$LATEST/manifest.txt" ] || { echo "Backup manifest missing" >&2; exit 1; }
while IFS= read -r f; do if [ -f "$LATEST/files/$f" ]; then mkdir -p "$(dirname "$f")"; cp -a "$LATEST/files/$f" "$f"; else rm -f "$f"; fi; done < "$LATEST/manifest.txt"
echo "Rolled back files from $LATEST"
npm run build
