#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/FitLife_Full
DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP=".recovery-before-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

for file in \
  src/features/fasting/FastingPage.jsx \
  src/features/fasting/FastingPage.css \
  src/features/fasting/FastingCalendar.jsx \
  src/features/fasting/FastingMetabolicInputs.jsx \
  src/features/fasting/FastingThirtyDayGraph.jsx \
  src/features/fasting/FastingGlycemicFoundation.jsx \
  src/features/fasting/FastingMetricAttachments.jsx \
  src/features/fasting/fastingNutritionStore.js \
  src/features/fasting/fastingStore.js \
  src/styles/peekRail.css \
  src/lib/peekRail.js
do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp "$file" "$BACKUP/$file"
  fi
  mkdir -p "$(dirname "$file")"
  cp "$DIR/files/$file" "$file"
done

# Ensure main.jsx loads the recovered rail files exactly once.
python3 - <<'PY'
from pathlib import Path
p=Path('src/main.jsx')
s=p.read_text()
for line in ["import './styles/peekRail.css'", "import './lib/peekRail.js'"]:
    if line not in s:
        s=line+'\n'+s
p.write_text(s)
PY

echo "[OK] Restored exact files captured at the cleanup checkpoint"
echo "[OK] Previous current files saved in $BACKUP"
npm run build
