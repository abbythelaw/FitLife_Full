#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/workspaces/FitLife_Full}"
CSS="$ROOT/src/features/fasting/FastingPage.css"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$ROOT"

if [ ! -f "$CSS" ]; then
  echo "ERROR: Missing $CSS"
  exit 1
fi

cp "$CSS" "$CSS.backup-fullscreen-$STAMP"

git add -A
git commit -m "chore: backup before fasting tablet phone fullscreen overlays" >/dev/null 2>&1 || true
git tag "fasting-before-fullscreen-overlays-$STAMP" 2>/dev/null || true

cat >> "$CSS" <<'CSS'

/* ==============================================================
   FASTING RESPONSIVE FULL-SCREEN OVERLAYS
   Tablet/iPad and phone only. Desktop presentation is unchanged.
   ============================================================== */
@media (max-width: 1050px) {
  html:has(.fast-layer),
  body:has(.fast-layer) {
    overflow: hidden !important;
    overscroll-behavior: none !important;
  }

  .fast-layer {
    position: fixed !important;
    inset: 0 !important;
    z-index: 20000 !important;
    display: block !important;
    width: 100vw !important;
    height: 100dvh !important;
    min-width: 100vw !important;
    min-height: 100dvh !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #08120d !important;
  }

  .fast-layer > .fast-backdrop {
    display: none !important;
  }

  .fast-layer > .fast-drawer,
  .fast-layer > .fast-phase-panel,
  .fast-layer > .recent-fast-modal,
  .fast-layer > .metabolic-record-detail,
  .fast-layer > .metric-attachment-picker,
  .fast-layer > .metric-choice-drawer,
  .fast-layer > .metric-card-picker,
  .fast-layer > .metric-recorder,
  .fast-layer > .nutrition-editor,
  .fast-layer > .quick-fast-editor,
  .fast-layer > .custom-target-editor,
  .fast-layer > section,
  .fast-layer > aside {
    box-sizing: border-box !important;
    position: relative !important;
    inset: auto !important;
    z-index: 2 !important;
    display: block !important;
    width: 100vw !important;
    min-width: 100vw !important;
    max-width: none !important;
    height: 100dvh !important;
    min-height: 100dvh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    padding:
      max(22px, env(safe-area-inset-top))
      max(24px, env(safe-area-inset-right))
      max(96px, calc(env(safe-area-inset-bottom) + 78px))
      max(24px, env(safe-area-inset-left)) !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: #08120d !important;
    box-shadow: none !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* iPad readability: full-screen shell with a comfortably sized form body. */
  .fast-layer > .fast-drawer > :not(.close):not(.fast-editor-close):not(.fast-editor-actions),
  .fast-layer > .metric-choice-drawer > :not(.close):not(.fast-editor-actions),
  .fast-layer > .metric-card-picker > :not(.close):not(.fast-editor-actions),
  .fast-layer > .metric-recorder > :not(.close):not(.fast-editor-actions),
  .fast-layer > .nutrition-editor > :not(.close):not(.fast-editor-actions) {
    max-width: 820px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .fast-layer .close,
  .fast-layer .phase-close,
  .fast-layer .recent-fast-close,
  .fast-layer .metabolic-detail-close,
  .fast-layer .fast-editor-close {
    position: sticky !important;
    z-index: 50 !important;
    top: max(10px, env(safe-area-inset-top)) !important;
    left: auto !important;
    right: max(10px, env(safe-area-inset-right)) !important;
    float: right !important;
    display: grid !important;
    place-items: center !important;
    width: 46px !important;
    min-width: 46px !important;
    height: 46px !important;
    min-height: 46px !important;
    margin: 0 0 10px 14px !important;
    padding: 0 !important;
    border: 1px solid var(--line) !important;
    border-radius: 50% !important;
    background: #102019 !important;
    color: var(--text) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,.34) !important;
  }

  .fast-layer .fast-editor-actions,
  .fast-layer .metabolic-detail-actions,
  .fast-layer .recent-fast-modal > footer {
    box-sizing: border-box !important;
    position: fixed !important;
    z-index: 60 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    display: flex !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    width: 100% !important;
    max-width: none !important;
    min-height: calc(72px + env(safe-area-inset-bottom)) !important;
    margin: 0 !important;
    padding:
      12px
      max(24px, env(safe-area-inset-right))
      max(12px, env(safe-area-inset-bottom))
      max(24px, env(safe-area-inset-left)) !important;
    border-top: 1px solid var(--line) !important;
    background: rgba(8,18,13,.96) !important;
    box-shadow: 0 -12px 30px rgba(0,0,0,.28) !important;
    backdrop-filter: blur(14px) !important;
  }

  .fast-layer .fast-editor-actions > button,
  .fast-layer .metabolic-detail-actions > button,
  .fast-layer .recent-fast-modal > footer > button {
    min-height: 48px !important;
    padding: 10px 16px !important;
  }

  .fast-layer .fast-phase-panel {
    display: grid !important;
    grid-template-columns: minmax(260px, .75fr) minmax(360px, 1.25fr) !important;
    padding: 0 !important;
  }

  .fast-layer .fast-phase-panel .fast-phase-art {
    min-height: 100dvh !important;
    border-radius: 0 !important;
  }

  .fast-layer .fast-phase-panel .phase-copy {
    align-self: start !important;
    padding:
      max(76px, calc(env(safe-area-inset-top) + 66px))
      max(28px, env(safe-area-inset-right))
      max(40px, env(safe-area-inset-bottom))
      28px !important;
    overflow-y: auto !important;
  }
}

@media (max-width: 650px) {
  .fast-layer > .fast-drawer,
  .fast-layer > .fast-phase-panel,
  .fast-layer > .recent-fast-modal,
  .fast-layer > .metabolic-record-detail,
  .fast-layer > .metric-attachment-picker,
  .fast-layer > .metric-choice-drawer,
  .fast-layer > .metric-card-picker,
  .fast-layer > .metric-recorder,
  .fast-layer > .nutrition-editor,
  .fast-layer > .quick-fast-editor,
  .fast-layer > .custom-target-editor,
  .fast-layer > section,
  .fast-layer > aside {
    padding:
      max(16px, env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right))
      max(108px, calc(env(safe-area-inset-bottom) + 88px))
      max(16px, env(safe-area-inset-left)) !important;
  }

  .fast-layer .fast-phase-panel {
    display: block !important;
    padding: 0 !important;
  }

  .fast-layer .fast-phase-panel .fast-phase-art {
    width: 100% !important;
    min-height: 34dvh !important;
    height: 34dvh !important;
    max-height: 34dvh !important;
    border-radius: 0 !important;
  }

  .fast-layer .fast-phase-panel .phase-copy {
    box-sizing: border-box !important;
    height: 66dvh !important;
    padding:
      20px
      max(18px, env(safe-area-inset-right))
      max(32px, env(safe-area-inset-bottom))
      max(18px, env(safe-area-inset-left)) !important;
    overflow-y: auto !important;
  }

  .fast-layer .fast-time-grid,
  .fast-layer .fast-editor-preview,
  .fast-layer .metric-recorder-grid,
  .fast-layer .nutrition-editor-grid,
  .fast-layer .recent-fast-stats,
  .fast-layer .recent-metric-grid,
  .fast-layer .quick-fast-preview {
    grid-template-columns: 1fr !important;
  }

  .fast-layer .fast-editor-actions,
  .fast-layer .metabolic-detail-actions,
  .fast-layer .recent-fast-modal > footer {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0,1fr)) !important;
    gap: 8px !important;
    padding:
      10px
      max(14px, env(safe-area-inset-right))
      max(10px, env(safe-area-inset-bottom))
      max(14px, env(safe-area-inset-left)) !important;
  }

  .fast-layer .fast-editor-actions > button:only-child,
  .fast-layer .metabolic-detail-actions > button:only-child,
  .fast-layer .recent-fast-modal > footer > button:only-child {
    grid-column: 1 / -1 !important;
  }

  .fast-layer input,
  .fast-layer select,
  .fast-layer textarea {
    font-size: 16px !important;
  }
}
CSS

npm run build

echo
echo "SUCCESS: Fasting full-screen overlays installed for iPad and iPhone."
echo "Backup: $CSS.backup-fullscreen-$STAMP"
echo "Rollback tag: fasting-before-fullscreen-overlays-$STAMP"
