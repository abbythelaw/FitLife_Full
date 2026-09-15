#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"; HERE="$(cd "$(dirname "$0")" && pwd)"; TS="$(date +%Y%m%d-%H%M%S)"
test -f "$ROOT/package.json" || { echo "Run from the FitLife repository root."; exit 1; }
if command -v git >/dev/null && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git add -A; git commit -m "chore: pre completion bundle backup $TS" || true; git tag "fitlife-pre-completion-$TS" || true; fi
mkdir -p "$ROOT/src/lib" "$ROOT/src/styles" "$ROOT/supabase/migrations" "$ROOT/public" "$ROOT/docs/fitlife-completion"
cp "$HERE/patches/fitlifeProductionBridge.js" "$ROOT/src/lib/fitlifeProductionBridge.js"
cp "$HERE/patches/fitlife-final-responsive.css" "$ROOT/src/styles/fitlife-final-responsive.css"
cp "$HERE/sql/fitlife-production-migration.sql" "$ROOT/supabase/migrations/${TS}_fitlife_production.sql"
cp "$HERE/public/_redirects" "$ROOT/public/_redirects"
cp "$HERE/docs/README.md" "$ROOT/docs/fitlife-completion/README.md"
python3 - <<'PY'
from pathlib import Path
p=Path('src/main.jsx'); s=p.read_text()
imports="import {installProductionBridge} from './lib/fitlifeProductionBridge.js'\nimport './styles/fitlife-final-responsive.css'\n"
if 'installProductionBridge' not in s: s=imports+s
if 'installProductionBridge()' not in s: s=s.replace('startFitLifeUserDataSync()','startFitLifeUserDataSync()\ninstallProductionBridge()')
p.write_text(s)
PY
npm install
npm run build
if command -v git >/dev/null && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git add -A; git commit -m "feat: FitLife completion bundle" || true; git tag "fitlife-completion-$TS" || true; fi
echo "FitLife completion bundle installed and built successfully."
