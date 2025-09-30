#!/bin/bash
# smart_snapshot.sh
# Extract a detailed snapshot of repo + environment + build

set -e  # Stop on errors
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "=== REPOSITORY STATUS SNAPSHOT ==="
echo "Date: $TIMESTAMP"
echo "Repository: $(basename "$(pwd)")"
echo "Path: $(pwd)"
echo ""

# --- Git Info ---
echo "=== GIT STATUS ==="
git status -s
echo ""

echo "=== GIT BRANCH & LAST 20 COMMITS ==="
git branch --show-current
git log --oneline -20
echo ""

# --- File structure ---
echo "=== FILE STRUCTURE (depth=3, exclude noise) ==="
if command -v tree &> /dev/null; then
  tree -I 'node_modules|.next|.git|dist|build' -L 3
else
  find . -maxdepth 3 -type d \( -name node_modules -o -name .git -o -name .next -o -name dist -o -name build \) -prune -o -print
fi
echo ""

# --- Package info ---
echo "=== PACKAGE.JSON (scripts + dependencies) ==="
if [ -f package.json ]; then
  jq '{scripts, dependencies, devDependencies}' package.json 2>/dev/null || cat package.json
else
  echo "No package.json found"
fi
echo ""

# --- Dependencies ---
echo "=== INSTALLED DEPENDENCIES (pnpm) ==="
if command -v pnpm &> /dev/null; then
  pnpm list --depth=0
elif command -v npm &> /dev/null; then
  npm list --depth=0
elif command -v yarn &> /dev/null; then
  yarn list --depth=0
else
  echo "No JS package manager found"
fi
echo ""

echo "=== PYTHON PACKAGES (if applicable) ==="
if command -v pip &> /dev/null; then
  pip list | head -20
fi
echo ""

# --- Modified / new source files ---
echo "=== SOURCE FILES MODIFIED SINCE LAST PULL ==="
if [ -f .git/FETCH_HEAD ]; then
  find src -type f \( -name "*.ts" -o -name "*.tsx" \) -newer .git/FETCH_HEAD 2>/dev/null | head -20
else
  git ls-files -m -- src/**/*.ts src/**/*.tsx || echo "No recent changes detected"
fi
echo ""

# --- Key project files ---
echo "=== TIMELINE FILES (if present) ==="
ls -la src/data/*.ts 2>/dev/null || true
ls -la src/lib/timeline/*.ts 2>/dev/null || true
ls -la src/stores/timeline-store.ts 2>/dev/null || true
ls -la src/app/timeline/page.tsx 2>/dev/null || true
echo ""

# --- Code stats ---
echo "=== LINE COUNTS ==="
if [ -d src ]; then
  echo "Total TypeScript lines in src:"
  find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
else
  echo "No src directory found"
fi
echo ""

# --- Build ---
echo "=== BUILD STATUS ==="
if command -v pnpm &> /dev/null && grep -q "\"build\"" package.json; then
  pnpm build 2>&1 | tail -10
elif command -v npm &> /dev/null && grep -q "\"build\"" package.json; then
  npm run build 2>&1 | tail -10
else
  echo "No build script found"
fi
echo ""

# --- Environment ---
echo "=== ENVIRONMENT ==="
[ -x "$(command -v node)" ] && echo "Node: $(node -v)"
[ -x "$(command -v npm)" ] && echo "npm: $(npm -v)"
[ -x "$(command -v pnpm)" ] && echo "pnpm: $(pnpm -v)"
[ -x "$(command -v yarn)" ] && echo "yarn: $(yarn -v)"
[ -x "$(command -v python3)" ] && echo "Python: $(python3 --version)"
[ -x "$(command -v pip)" ] && echo "pip: $(pip --version)"
[ -f package.json ] && echo "Next.js: $(grep '\"next\":' package.json | cut -d'\"' -f4)"
echo ""

tree -a -I 'node_modules|.next|dist|build' > structure.txt
