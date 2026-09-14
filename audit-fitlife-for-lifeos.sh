#!/usr/bin/env bash

set -euo pipefail

ROOT="$(pwd)"
OUTPUT="$ROOT/FitLife-LifeOS-Integration-Audit.txt"
FILES="$(mktemp)"

cleanup() {
  rm -f "$FILES"
}

trap cleanup EXIT

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "ERROR: Run this from the FitLife repository root."
  exit 1
fi

find src supabase \
  -type f \
  \( \
    -name '*.js' \
    -o -name '*.jsx' \
    -o -name '*.ts' \
    -o -name '*.tsx' \
    -o -name '*.css' \
    -o -name '*.sql' \
    -o -name '*.json' \
  \) \
  ! -name '*.before-*' \
  ! -name '*.backup-*' \
  ! -name '*.bak' \
  ! -path '*/node_modules/*' \
  ! -path '*/dist/*' \
  ! -path '*/build/*' \
  ! -path '*/.temp/*' \
  2>/dev/null \
  | sort > "$FILES"

{
  echo "================================================================"
  echo "FITLIFE TO LIFEOS INTEGRATION AUDIT"
  echo "================================================================"
  echo "Generated: $(date)"
  echo "Repository: $ROOT"
  echo "Branch: $(git branch --show-current 2>/dev/null || true)"
  echo "Commit: $(git rev-parse HEAD 2>/dev/null || true)"
  echo

  echo "================================================================"
  echo "1. GIT STATUS"
  echo "================================================================"
  git status --short 2>/dev/null || true
  echo

  echo "================================================================"
  echo "2. PACKAGE CONFIGURATION"
  echo "================================================================"
  cat package.json
  echo

  echo "================================================================"
  echo "3. ACTIVE SOURCE TREE"
  echo "================================================================"
  cat "$FILES"
  echo

  echo "================================================================"
  echo "4. MAIN APPLICATION AND IMPORT ORDER"
  echo "================================================================"
  for file in \
    src/main.jsx \
    src/main.tsx \
    src/App.jsx \
    src/App.tsx
  do
    if [ -f "$file" ]; then
      echo
      echo "---------------- FILE: $file ----------------"
      cat "$file"
    fi
  done
  echo

  echo "================================================================"
  echo "5. FEATURE DIRECTORIES"
  echo "================================================================"
  find src/features \
    -mindepth 1 \
    -maxdepth 2 \
    -type d \
    2>/dev/null \
    | sort
  echo

  echo "================================================================"
  echo "6. DATABASE TABLE REFERENCES"
  echo "================================================================"
  grep -RInE \
    "\.from\(['\"][A-Za-z0-9_-]+['\"]\)" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "7. DATABASE WRITE OPERATIONS"
  echo "================================================================"
  grep -RInE \
    "\.(insert|upsert|update|delete)\(" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "8. LOCALSTORAGE KEYS"
  echo "================================================================"
  grep -RhoE \
    "fitlife-[A-Za-z0-9:_-]+" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort -u || true
  echo

  echo "================================================================"
  echo "9. LOCALSTORAGE READS AND WRITES"
  echo "================================================================"
  grep -RInE \
    "localStorage\.(getItem|setItem|removeItem|clear)|localStorage\[[^]]+\]" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "10. LOCALSTORAGE OVERRIDES"
  echo "================================================================"
  grep -RInE \
    "localStorage\.(setItem|removeItem)[[:space:]]*=|nativeSet|nativeRemove" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "11. REALTIME AND AUTH"
  echo "================================================================"
  grep -RInE \
    "onAuthStateChange|auth\.getSession|auth\.getUser|channel\(|postgres_changes|subscribe\(|removeChannel" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "12. CREATE, SAVE AND UPDATE FUNCTIONS"
  echo "================================================================"
  grep -RInE \
    "function[[:space:]]+(save|create|add|update)|const[[:space:]]+(save|create|add|update)[A-Za-z0-9_]*[[:space:]]*=|export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+(save|create|add|update)" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "13. DELETE FUNCTIONS AND TOMBSTONES"
  echo "================================================================"
  grep -RInE \
    "function[[:space:]]+(delete|remove)|const[[:space:]]+(delete|remove)[A-Za-z0-9_]*[[:space:]]*=|deleted_at|tombstone|suppression" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "14. SYNC SYSTEMS"
  echo "================================================================"
  grep -RInE \
    "sync|hydrate|download|upload|merge|conflict|pending|retry|cursor|offline" \
    src/lib src/features \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "15. DATA IMPORT AND FILE HANDLING"
  echo "================================================================"
  grep -RInE \
    "csv|xlsx|excel|gpx|fit|tcx|FileReader|input[^>]+type=['\"]file|accept=|import.*file|parse.*file" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "16. PHOTO AND MEDIA HANDLING"
  echo "================================================================"
  grep -RInE \
    "activity-media|fitlife-media|storage_path|signedUrl|createSignedUrl|upload\(|image|photo|crop|zoom|rotation" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "17. SNAPSHOT DATA SOURCES"
  echo "================================================================"
  grep -RInE \
    "localStorage|fitlife-|repository|list[A-Z]|supabase|from\(" \
    src/features/snapshot \
    --include='*.js' \
    --include='*.jsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "18. MY LIFE DATA SOURCES"
  echo "================================================================"
  grep -RInE \
    "localStorage|fitlife-|history|source_id|repository|supabase|from\(" \
    src/features/my-life \
    --include='*.js' \
    --include='*.jsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "19. ANALYTICS DATA SOURCES"
  echo "================================================================"
  grep -RInE \
    "localStorage|fitlife-|calculate|average|correlation|regression|bivariate|repository|supabase|from\(" \
    src/features/analytics \
    src/features/snapshot \
    --include='*.js' \
    --include='*.jsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "20. DEMO AND SYNTHETIC DATA"
  echo "================================================================"
  grep -RInE \
    "demo|dummy|seed|starter|sample|fallback|mock|synthetic" \
    src \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sort || true
  echo

  echo "================================================================"
  echo "21. DATABASE MIGRATIONS"
  echo "================================================================"
  find supabase \
    -type f \
    -name '*.sql' \
    ! -name '*.before-*' \
    ! -name '*.backup-*' \
    -print \
    2>/dev/null \
    | sort \
    | while IFS= read -r file; do
        echo
        echo "---------------- FILE: $file ----------------"
        cat "$file"
        echo
      done
  echo

  echo "================================================================"
  echo "22. ACTIVE STORE, REPOSITORY AND SYNC FILES"
  echo "================================================================"
  find src \
    -type f \
    \( \
      -iname '*store.js' \
      -o -iname '*store.jsx' \
      -o -iname '*repository.js' \
      -o -iname '*sync.js' \
      -o -iname '*service.js' \
    \) \
    ! -name '*.before-*' \
    ! -name '*.backup-*' \
    -print \
    | sort \
    | while IFS= read -r file; do
        echo
        echo "---------------- FILE: $file ----------------"
        cat "$file"
        echo
      done
  echo

  echo "================================================================"
  echo "23. FEATURE ENTRY FILES"
  echo "================================================================"
  find src/features \
    -type f \
    \( \
      -name '*Page.jsx' \
      -o -name '*Page.js' \
      -o -name '*Form.jsx' \
      -o -name '*Form.js' \
    \) \
    ! -name '*.before-*' \
    ! -name '*.backup-*' \
    -print \
    | sort \
    | while IFS= read -r file; do
        echo
        echo "---------------- FILE: $file ----------------"
        cat "$file"
        echo
      done
  echo

  echo "================================================================"
  echo "END OF FITLIFE TO LIFEOS AUDIT"
  echo "================================================================"
} > "$OUTPUT"

echo
echo "Created:"
ls -lh "$OUTPUT"
