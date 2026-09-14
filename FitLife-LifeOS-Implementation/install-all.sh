#!/usr/bin/env bash
set -euo pipefail
BUNDLE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(pwd)"; PHASE=all
while [ $# -gt 0 ]; do case "$1" in --root) ROOT="$2"; shift 2;; --phase) PHASE="$2"; shift 2;; *) echo "Unknown argument: $1" >&2; exit 2;; esac; done
cd "$ROOT"
"$BUNDLE/preflight.sh" "$ROOT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"; BACKUP="$ROOT/.fitlife-implementation-backups/$STAMP"
mkdir -p "$BACKUP/files"
FILES=(src/App.jsx src/features/settings/SettingsPage.jsx src/features/settings/SettingsPage.css src/features/nutrition/NutritionPage.jsx src/features/nutrition/NutritionPage.css src/data/repositories/baseRepository.js src/data/repositories/profileRepository.js src/data/repositories/nutritionRepository.js src/data/repositories/healthRepository.js src/data/repositories/habitRepository.js src/data/repositories/fastingRepository.js src/data/repositories/activityRepository.js src/data/repositories/gratitudeRepository.js src/data/repositories/index.js supabase/migrations/20260914_fitlife_canonical_foundation.sql)
printf '%s\n' "${FILES[@]}" > "$BACKUP/manifest.txt"
for f in "${FILES[@]}"; do if [ -f "$f" ]; then mkdir -p "$BACKUP/files/$(dirname "$f")"; cp -a "$f" "$BACKUP/files/$f"; fi; done
echo "$STAMP" > "$ROOT/.fitlife-implementation-backups/LAST_RUN"
copy_payload(){ mkdir -p "$(dirname "$2")"; cp -a "$1" "$2"; }
if [ "$PHASE" = all ] || [ "$PHASE" = 01 ]; then mkdir -p supabase/migrations; copy_payload "$BUNDLE/sql/FitLife-LifeOS-Combined-Migration.sql" supabase/migrations/20260914_fitlife_canonical_foundation.sql; fi
if [ "$PHASE" = all ] || [ "$PHASE" = 02 ]; then mkdir -p src/data/repositories; cp -a "$BUNDLE/payload/src/data/repositories/." src/data/repositories/; fi
if [ "$PHASE" = all ] || [ "$PHASE" = 03 ]; then copy_payload "$BUNDLE/payload/src/features/settings/SettingsPage.jsx" src/features/settings/SettingsPage.jsx; copy_payload "$BUNDLE/payload/src/features/settings/SettingsPage.css" src/features/settings/SettingsPage.css; fi
if [ "$PHASE" = all ] || [ "$PHASE" = 04 ]; then mkdir -p src/features/nutrition; cp -a "$BUNDLE/payload/src/features/nutrition/." src/features/nutrition/; python3 - <<'PY'
from pathlib import Path
p=Path('src/App.jsx'); s=p.read_text()
imp="import NutritionPage from './features/nutrition/NutritionPage'\n"
if imp.strip() not in s:
    anchor="import HealthMetricsPage from './features/health/HealthMetricsPage'"
    if anchor not in s: raise SystemExit('ERROR: HealthMetricsPage import anchor missing; App.jsx was not modified.')
    s=s.replace(anchor,anchor+'\n'+imp.rstrip())
s=s.replace("'Health Metrics','Exercises'","'Health Metrics','Nutrition','Exercises'")
s=s.replace("HeartPulse,Dumbbell,Bike","HeartPulse,Leaf,Dumbbell,Bike")
s=s.replace("'health','exercises'","'health','nutrition','exercises'")
needle="health:<HealthMetricsPage/>,"
if needle not in s: raise SystemExit('ERROR: App route anchor missing; App.jsx was not modified.')
s=s.replace(needle,needle+"nutrition:<NutritionPage/>,")
p.write_text(s)
PY
fi
if [ "$PHASE" = all ]; then "$BUNDLE/verify/data-integrity-check.sh" "$ROOT"; if [ ! -x node_modules/.bin/vite ]; then echo "Installing npm dependencies..."; if [ -f package-lock.json ]; then npm ci; else npm install; fi; fi; npm run build; fi
echo "Backup: $BACKUP"
echo "Changed files:"
for f in "${FILES[@]}"; do [ -e "$f" ] && echo "  $f"; done
echo
if [ "$PHASE" = all ]; then echo "Code installed. Apply supabase/migrations/20260914_fitlife_canonical_foundation.sql to the linked Supabase project, then run the cross-device checklist."; fi
