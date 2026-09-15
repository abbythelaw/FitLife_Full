#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-.}"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
OUTPUT="${2:-fitlife-code-extraction-${TIMESTAMP}.txt}"
FILE_LIST="$(mktemp)"

cleanup() {
  rm -f "$FILE_LIST"
}
trap cleanup EXIT

if [ ! -d "$ROOT" ]; then
  echo "ERROR: Directory does not exist: $ROOT"
  exit 1
fi

cd "$ROOT"

# File types to extract.
# Add another extension here if FitLife uses an additional text-based format.
find . -type f \
  \( \
    -name '*.js' \
    -o -name '*.jsx' \
    -o -name '*.ts' \
    -o -name '*.tsx' \
    -o -name '*.css' \
    -o -name '*.scss' \
    -o -name '*.sass' \
    -o -name '*.less' \
    -o -name '*.html' \
    -o -name '*.json' \
    -o -name '*.sql' \
    -o -name '*.md' \
    -o -name '*.txt' \
    -o -name '*.yml' \
    -o -name '*.yaml' \
    -o -name '*.toml' \
    -o -name '*.graphql' \
    -o -name '*.gql' \
    -o -name '*.env.example' \
    -o -name 'Dockerfile' \
    -o -name 'Procfile' \
    -o -name 'wrangler.toml' \
    -o -name 'vite.config.*' \
    -o -name 'eslint.config.*' \
    -o -name 'tailwind.config.*' \
    -o -name 'postcss.config.*' \
  \) \
  ! -path './node_modules/*' \
  ! -path './.git/*' \
  ! -path './dist/*' \
  ! -path './build/*' \
  ! -path './coverage/*' \
  ! -path './.next/*' \
  ! -path './.cache/*' \
  ! -path './.turbo/*' \
  ! -path './.wrangler/*' \
  ! -path './.vercel/*' \
  ! -path './.netlify/*' \
  ! -path './supabase/.temp/*' \
  ! -path './vendor/*' \
  ! -path './tmp/*' \
  ! -path './temp/*' \
  ! -path './backups/*' \
  ! -path './backup/*' \
  ! -name "$OUTPUT" \
  ! -name 'extract-fitlife-code.sh' \
  ! -name '*.before-*' \
  ! -name '*.backup-*' \
  ! -name '*.bak' \
  ! -name '*.min.js' \
  ! -name '*.min.css' \
  ! -name 'package-lock.json' \
  ! -name 'yarn.lock' \
  ! -name 'pnpm-lock.yaml' \
  ! -name '.env' \
  ! -name '.env.local' \
  ! -name '.env.production' \
  ! -name '.env.development' \
  -print0 |
  sort -z |
  while IFS= read -r -d '' file; do
    # Avoid accidentally extracting binary or unreadable files.
    if [ -r "$file" ] && grep -Iq . "$file"; then
      printf '%s\n' "$file"
    elif [ -r "$file" ] && [ ! -s "$file" ]; then
      printf '%s\n' "$file"
    fi
  done > "$FILE_LIST"

FILE_COUNT="$(wc -l < "$FILE_LIST" | tr -d ' ')"

{
  printf '%s\n' '================================================================================'
  printf '%s\n' 'FITLIFE CURRENT CODE EXTRACTION'
  printf '%s\n' '================================================================================'
  printf 'Generated: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf 'Repository: %s\n' "$(pwd)"
  printf 'Files extracted: %s\n' "$FILE_COUNT"

  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf 'Git branch: %s\n' "$(git branch --show-current 2>/dev/null || true)"
    printf 'Git commit: %s\n' "$(git rev-parse HEAD 2>/dev/null || true)"
    printf 'Git status: %s\n' "$(git status --porcelain | wc -l | tr -d ' ') changed files"
  fi

  printf '\n%s\n' 'SECURITY NOTE'
  printf '%s\n' 'Real environment files and common secret-bearing files were excluded.'
  printf '%s\n' 'Review the resulting extraction before sharing it externally.'

  printf '\n%s\n' '================================================================================'
  printf '%s\n' 'FILE INDEX'
  printf '%s\n' '================================================================================'

  nl -ba "$FILE_LIST"

  printf '\n%s\n' '================================================================================'
  printf '%s\n' 'SOURCE CODE'
  printf '%s\n' '================================================================================'

  while IFS= read -r file; do
    [ -f "$file" ] || continue

    SIZE="$(wc -c < "$file" | tr -d ' ')"
    LINES="$(wc -l < "$file" | tr -d ' ')"
    HASH="unavailable"

    if command -v sha256sum >/dev/null 2>&1; then
      HASH="$(sha256sum "$file" | awk '{print $1}')"
    fi

    printf '\n\n%s\n' '================================================================================'
    printf 'FILE: %s\n' "$file"
    printf 'SIZE: %s bytes\n' "$SIZE"
    printf 'LINES: %s\n' "$LINES"
    printf 'SHA256: %s\n' "$HASH"
    printf '%s\n' '================================================================================'
    printf 'BEGIN FILE: %s\n' "$file"
    printf '%s\n\n' '--------------------------------------------------------------------------------'

    cat "$file"

    printf '\n%s\n' '--------------------------------------------------------------------------------'
    printf 'END FILE: %s\n' "$file"
    printf '%s\n' '================================================================================'
  done < "$FILE_LIST"

  printf '\n\n%s\n' '================================================================================'
  printf '%s\n' 'END OF FITLIFE CODE EXTRACTION'
  printf '%s\n' '================================================================================'
} > "$OUTPUT"

echo
echo "Extraction complete."
echo "Output: $(pwd)/$OUTPUT"
echo "Files: $FILE_COUNT"
echo "Size: $(du -h "$OUTPUT" | awk '{print $1}')"
