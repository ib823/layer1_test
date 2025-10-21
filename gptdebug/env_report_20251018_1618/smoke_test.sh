#!/usr/bin/env bash
set -euo pipefail
LOG="smoke_run_$(date +"%Y%m%d_%H%M%S").log"
PM=""
if command -v pnpm >/dev/null; then PM=pnpm
elif command -v npm >/dev/null; then PM=npm
elif command -v yarn >/dev/null; then PM=yarn
elif command -v bun >/dev/null; then PM=bun
else echo "No package manager found"; exit 1; fi
echo "Using $PM" | tee "$LOG"
$PM install 2>&1 | tee -a "$LOG"
if [[ -f "prisma/schema.prisma" ]]; then npx prisma generate 2>&1 | tee -a "$LOG" || true; fi
$PM run build 2>&1 | tee -a "$LOG" || echo "[WARN] build failed"
$PM test --if-present 2>&1 | tee -a "$LOG" || echo "[WARN] tests failed"
echo "Log saved to $LOG"
