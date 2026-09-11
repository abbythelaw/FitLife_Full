#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/FitLife_Full

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
CSS="src/features/fasting/FastingPage.css"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${CSS}.before-p47-${STAMP}"

if [ ! -f "$CSS" ]; then
  echo "[ERROR] Missing $CSS"
  exit 1
fi

cp "$CSS" "$BACKUP"
mkdir -p public/assets/fasting-phases
cp "$PATCH_DIR"/assets/phase-*.jpg public/assets/fasting-phases/

python3 - <<'PY'
from pathlib import Path
from textwrap import dedent

path=Path('src/features/fasting/FastingPage.css')
css=path.read_text()
marker='/* FASTING PATCH 47 PADDED PHASE ART AND SOFTER CENTRE */'
if marker in css:
    css=css[:css.index(marker)].rstrip()+'\n'

css+=dedent(r'''

/* FASTING PATCH 47 PADDED PHASE ART AND SOFTER CENTRE */

/* Softer inner circle: still readable, but no near-black disc. */
.layered-ring-centre,
.layered-ring-centre:hover,
.layered-ring-centre:focus,
.layered-ring-centre:focus-visible,
.revised-ring-center,
.revised-ring-center:hover,
.revised-ring-center:focus,
.revised-ring-center:focus-visible {
  border: 1px solid rgba(55, 128, 96, .26) !important;
  outline: 0 !important;
  background:
    radial-gradient(circle at 50% 36%, #173c2e 0%, #102f24 50%, #0d281f 100%) !important;
  background-image:
    radial-gradient(circle at 50% 36%, #173c2e 0%, #102f24 50%, #0d281f 100%) !important;
  box-shadow:
    inset 0 0 22px rgba(44, 112, 83, .18),
    0 0 0 1px rgba(0, 0, 0, .14) !important;
}

.layered-ring-centre strong,
.revised-ring-center strong {
  color: #f5fbf7 !important;
}

.layered-ring-centre small,
.revised-ring-center small {
  color: #a9bbb2 !important;
}

/* Compact Current Phase thumbnail remains full-bleed. */
.fast-current-phase.compact-phase-card .fast-phase-art,
.fast-current-phase .fast-phase-art {
  padding: 0 !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

/*
  Details popout: the replacement assets already contain intentional dark
  padding. Cover now fills the panel without enlarging the central symbol.
*/
.fast-layer:has(.phase-panel) .fast-phase-art,
.fast-layer:has(.phase-detail-layout) .fast-phase-art,
.phase-panel .fast-phase-art,
.phase-detail-layout .fast-phase-art,
.fast-phase-modal .fast-phase-art,
.fast-phase-detail .fast-phase-art,
.phase-detail-art .fast-phase-art {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 360px !important;
  max-height: min(620px, calc(100dvh - 140px)) !important;
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 18px !important;
  background-color: #06131b !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}

/* Broad image fallback in case the visual renders as an actual img element. */
.fast-layer:has(.phase-panel) img,
.fast-layer:has(.phase-detail-layout) img,
.phase-panel img,
.phase-detail-layout img,
.fast-phase-modal img,
.fast-phase-detail img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 360px !important;
  max-height: min(620px, calc(100dvh - 140px)) !important;
  padding: 0 !important;
  object-fit: contain !important;
  object-position: center !important;
  border-radius: 18px !important;
  background: #06131b !important;
}

/* Prevent decorative CSS layers from sitting over the approved images. */
.fast-layer:has(.phase-panel) .fast-phase-art::before,
.fast-layer:has(.phase-panel) .fast-phase-art::after,
.fast-layer:has(.phase-detail-layout) .fast-phase-art::before,
.fast-layer:has(.phase-detail-layout) .fast-phase-art::after,
.phase-panel .fast-phase-art::before,
.phase-panel .fast-phase-art::after,
.phase-detail-layout .fast-phase-art::before,
.phase-detail-layout .fast-phase-art::after,
.fast-phase-modal .fast-phase-art::before,
.fast-phase-modal .fast-phase-art::after,
.phase-panel .art-body,
.phase-panel .art-orbit,
.phase-panel .art-particle,
.phase-detail-layout .art-body,
.phase-detail-layout .art-orbit,
.phase-detail-layout .art-particle {
  content: none !important;
  display: none !important;
}

@media (min-width: 851px) {
  .phase-detail-layout,
  .phase-panel .phase-detail-layout,
  .fast-phase-modal .phase-detail-layout {
    grid-template-columns: minmax(300px, 38%) minmax(0, 1fr) !important;
    gap: 22px !important;
  }
}

@media (max-width: 850px) {
  .phase-detail-layout,
  .phase-panel .phase-detail-layout,
  .fast-phase-modal .phase-detail-layout {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto !important;
  }

  .fast-layer:has(.phase-panel) .fast-phase-art,
  .fast-layer:has(.phase-detail-layout) .fast-phase-art,
  .phase-panel .fast-phase-art,
  .phase-detail-layout .fast-phase-art,
  .fast-phase-modal .fast-phase-art,
  .fast-phase-detail .fast-phase-art,
  .phase-detail-art .fast-phase-art,
  .phase-panel img,
  .phase-detail-layout img,
  .fast-phase-modal img {
    height: min(42vh, 360px) !important;
    min-height: 250px !important;
    max-height: 360px !important;
  }
}

@media (max-width: 520px) {
  .fast-layer:has(.phase-panel) .fast-phase-art,
  .fast-layer:has(.phase-detail-layout) .fast-phase-art,
  .phase-panel .fast-phase-art,
  .phase-detail-layout .fast-phase-art,
  .fast-phase-modal .fast-phase-art,
  .fast-phase-detail .fast-phase-art,
  .phase-detail-art .fast-phase-art,
  .phase-panel img,
  .phase-detail-layout img,
  .fast-phase-modal img {
    height: 250px !important;
    min-height: 220px !important;
    max-height: 250px !important;
  }
}
''')

path.write_text(css)
print('[OK] Padded approved artwork installed')
print('[OK] Detail artwork now fits without oversized symbols')
print('[OK] Current Phase thumbnail remains full-bleed')
print('[OK] Ring centre changed from near-black to a softer green panel')
PY

npm run build

echo "[OK] Patch 47 complete"
echo "[OK] Backup: $BACKUP"
