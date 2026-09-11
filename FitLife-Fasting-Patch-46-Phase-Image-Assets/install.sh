#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/FitLife_Full

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".fasting-p46-backup-$STAMP"
mkdir -p "$BACKUP/src/features/fasting" public/assets/fasting-phases

cp src/features/fasting/FastingPage.jsx "$BACKUP/src/features/fasting/FastingPage.jsx"
cp src/features/fasting/FastingPage.css "$BACKUP/src/features/fasting/FastingPage.css"
cp "$PATCH_DIR"/assets/phase-*.jpg public/assets/fasting-phases/

python3 - <<'PY'
from pathlib import Path
import re

page=Path('src/features/fasting/FastingPage.jsx')
text=page.read_text()

# A milestone can be current only after its threshold has actually been reached.
text=text.replace(
    'const current=currentPhase.hour===hour',
    'const current=reached && currentPhase?.hour===hour'
)
text=text.replace(
    'const current=currentPhase?.hour===hour',
    'const current=reached && currentPhase?.hour===hour'
)
text=text.replace(
    'const current=phase.hour===currentPhase.hour',
    'const current=reached && phase.hour===currentPhase?.hour'
)
text=text.replace(
    'const current=phase.hour===currentPhase?.hour',
    'const current=reached && phase.hour===currentPhase?.hour'
)

# Before 4h there is deliberately no current milestone.
text=text.replace(
    'const currentPhase=phaseAt(elapsedHours)',
    'const currentPhase=elapsedHours<4?null:phaseAt(elapsedHours)'
)
text=text.replace(
    'const currentPhase=phaseAt(elapsed)',
    'const currentPhase=elapsed<4?null:phaseAt(elapsed)'
)

# Safe centre label while the first phase is still locked.
text=text.replace(
    '<em>{currentPhase.icon} {shortPhaseLabel(elapsedHours)}</em>',
    "<em>{currentPhase?.icon||'◌'} {shortPhaseLabel(elapsedHours)}</em>"
)
text=text.replace(
    '<em>{currentPhase.icon} {shortPhase(elapsed)}</em>',
    "<em>{currentPhase?.icon||'◌'} {shortPhase(elapsed)}</em>"
)

page.write_text(text)

css=Path('src/features/fasting/FastingPage.css')
styles=css.read_text()
marker='/* FASTING PATCH 46 USER-SUPPLIED PHASE IMAGES */'
if marker in styles:
    styles=styles[:styles.index(marker)].rstrip()+'\n'

styles += r'''

/* FASTING PATCH 46 USER-SUPPLIED PHASE IMAGES */
/* Exact artwork cropped from the user-approved first illustration board. */
.fast-phase-art{
  background-color:#06131b!important;
  background-repeat:no-repeat!important;
  background-position:center!important;
  background-size:cover!important;
  border:1px solid rgba(80,136,151,.28)!important;
  box-shadow:inset 0 0 25px rgba(0,0,0,.36)!important;
}

.fast-phase-art.art-fed{background-image:url('/assets/fasting-phases/phase-4h.jpg')!important}
.fast-phase-art.art-balance{background-image:url('/assets/fasting-phases/phase-8h.jpg')!important}
.fast-phase-art.art-fat{background-image:url('/assets/fasting-phases/phase-12h.jpg')!important}
.fast-phase-art.art-deep{background-image:url('/assets/fasting-phases/phase-16h.jpg')!important}
.fast-phase-art.art-ketone{background-image:url('/assets/fasting-phases/phase-18h.jpg')!important}
.fast-phase-art.art-autophagy{background-image:url('/assets/fasting-phases/phase-24h.jpg')!important}
.fast-phase-art.art-adapt{background-image:url('/assets/fasting-phases/phase-36h.jpg')!important}
.fast-phase-art.art-repair{background-image:url('/assets/fasting-phases/phase-48h.jpg')!important}
.fast-phase-art.art-long{background-image:url('/assets/fasting-phases/phase-72h.jpg')!important}

/* Remove the previous generated CSS illustration layers. */
.fast-phase-art::before,
.fast-phase-art::after,
.fast-phase-art .art-body,
.fast-phase-art .art-orbit,
.fast-phase-art .art-particle{
  content:none!important;
  display:none!important;
}

/* Current Phase card keeps a compact image crop beside the explanation. */
.fast-current-phase.compact-phase-card .fast-phase-art{
  background-size:cover!important;
  background-position:center!important;
}

/* Phase explanation popout uses the same artwork at a larger scale. */
.phase-panel .fast-phase-art,
.phase-detail-layout .fast-phase-art,
.fast-phase-modal .fast-phase-art{
  min-height:310px!important;
  background-size:cover!important;
  background-position:center!important;
}

/* Unreached milestones, including 4h before 04:00:00, never glow. */
.layered-milestone.locked,
.layered-milestone.locked.current,
.fast-phase-point.locked,
.fast-phase-point.locked.current{
  border-color:#10384a!important;
  background:#172930!important;
  color:#829198!important;
  box-shadow:0 4px 11px rgba(0,0,0,.48),inset 0 0 0 1px #35515c!important;
}

.layered-milestone.locked span,
.fast-phase-point.locked span{
  filter:grayscale(1)!important;
  opacity:.58!important;
}

@media(max-width:650px){
  .phase-panel .fast-phase-art,
  .phase-detail-layout .fast-phase-art,
  .fast-phase-modal .fast-phase-art{
    min-height:220px!important;
  }
}
'''
css.write_text(styles)

print('[OK] User-approved phase image assets installed')
print('[OK] 4h remains locked before 04:00:00')
print('[OK] Phase card and phase popout now use matching approved artwork')
PY

npm run build

echo "[OK] Patch 46 complete"
echo "[OK] Backup: $BACKUP"
