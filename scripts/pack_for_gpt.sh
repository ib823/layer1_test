#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
DATE="$(date +"%Y%m%d_%H%M")"

OUT_DIR="$ROOT/gptdebug"
ARCHIVE_DIR="$OUT_DIR/archive/$DATE"
OUT_ENV_DIR="$OUT_DIR/env_report_$DATE"
ZIP_CODE="$OUT_DIR/sapmvp_$DATE.zip"
ZIP_ENV="$OUT_DIR/env_report_$DATE.zip"

# ---- archive old files ----
if [ "$(ls -A "$OUT_DIR" 2>/dev/null)" ]; then
  mkdir -p "$ARCHIVE_DIR"
  echo "Archiving existing gptdebug contents to $ARCHIVE_DIR ..."
  # move everything except the archive folder itself
  find "$OUT_DIR" -mindepth 1 -maxdepth 1 ! -name "archive" -exec mv {} "$ARCHIVE_DIR" \;
fi

echo "==> Ensuring utilities (zip, jq, ripgrep) ..."
need_update=0
for bin in zip jq rg; do
  if ! command -v "$bin" >/dev/null 2>&1; then need_update=1; fi
done
if [ "$need_update" -eq 1 ]; then
  sudo apt-get update -y >/dev/null 2>&1 || true
  command -v zip >/dev/null 2>&1 || sudo apt-get install -y zip >/dev/null 2>&1 || true
  command -v jq  >/dev/null 2>&1 || sudo apt-get install -y jq  >/dev/null 2>&1 || true
  command -v rg  >/dev/null 2>&1 || sudo apt-get install -y ripgrep >/dev/null 2>&1 || true
fi

mkdir -p "$OUT_ENV_DIR"

# --- system info ---
{
  echo "# System"
  date -Is
  uname -a || true
  cat /etc/os-release 2>/dev/null || true
  lscpu 2>/dev/null || true
  free -h 2>/dev/null || true
  df -h 2>/dev/null || true
} > "$OUT_ENV_DIR/system.txt"

# --- tooling ---
{
  command -v node && node -v
  command -v npm && npm -v
  command -v pnpm && pnpm -v || true
  command -v yarn && yarn -v || true
  command -v bun && bun -v || true
  npx --yes next --version 2>/dev/null || true
  npx --yes tsc -v 2>/dev/null || true
  npx --yes vitest --version 2>/dev/null || true
  npx --yes jest --version 2>/dev/null || true
  npx --yes prisma -v 2>/dev/null || true
} > "$OUT_ENV_DIR/tooling.txt"

# --- package.json snapshot ---
if [[ -f "$ROOT/package.json" ]]; then
  cp package.json "$OUT_ENV_DIR/package.json"
  node -e 'const fs=require("fs");const p=require("./package.json");fs.writeFileSync(process.argv[1],JSON.stringify({scripts:p.scripts||{},dependencies:p.dependencies||{},devDependencies:p.devDependencies||{}},null,2))' "$OUT_ENV_DIR/package_scripts_deps.json"
fi

# --- configs ---
for f in next.config.js tsconfig.json jest.config.js vitest.config.ts tailwind.config.js postcss.config.js; do
  [[ -f "$f" ]] && cp "$f" "$OUT_ENV_DIR/"
done

# --- prisma ---
if [[ -f "$ROOT/prisma/schema.prisma" ]]; then
  mkdir -p "$OUT_ENV_DIR/prisma"
  cp prisma/schema.prisma "$OUT_ENV_DIR/prisma/schema.prisma"
  npx --yes prisma migrate status > "$OUT_ENV_DIR/prisma_migrate_status.txt" 2>&1 || true
fi

# --- DB scan ---
{
  rg -n --hidden --glob ".env*" 'DATABASE_URL|DB_|POSTGRES|MYSQL|SQLITE|SUPABASE|MONGODB' || true
  rg -n 'datasource|provider|url' prisma/schema.prisma 2>/dev/null || true
} | sed -E 's#(=)[^ \t\r\n]+#=\*\*\*\*#g' > "$OUT_ENV_DIR/db_endpoints.txt"

# --- env vars masked ---
printenv | sort | sed -E 's#(^[^=]*(TOKEN|SECRET|PASSWORD|KEY|API|DB|DATABASE|URL)[^=]*=).*#\1****#I' > "$OUT_ENV_DIR/env_public.txt"

# --- ports/processes ---
(ss -tulpn 2>/dev/null || true) > "$OUT_ENV_DIR/ports.txt"
(ps aux --sort=-%mem 2>/dev/null | head -n 60 || true) > "$OUT_ENV_DIR/processes_top.txt"

# --- repo map ---
ls -al > "$OUT_ENV_DIR/repo_top_level.txt"

# --- .env.share ---
if [[ -f ".env.example" ]]; then
  cp .env.example "$OUT_ENV_DIR/.env.share"
else
  {
    rg -n -o --glob 'src/**' 'process\.env\.[A-Z0-9_]+' 2>/dev/null | sed -E 's/.*process\.env\.//' 
    rg -n --hidden --glob ".env*" '^[A-Z0-9_]+=' 2>/dev/null | sed -E 's/=.*$//'
  } | sort -u | awk '{print $0"="}' > "$OUT_ENV_DIR/.env.share" || true
fi

# --- README for GPT ---
cat > "$OUT_ENV_DIR/README_SHARE_WITH_GPT.md" <<'MD'
Upload this folder with your code so GPT understands your environment.
Includes system info, tool versions, scripts, configs, prisma, masked env & db endpoints, and smoke_test.sh.
MD

# --- smoke test ---
cat > "$OUT_ENV_DIR/smoke_test.sh" <<'SH'
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
SH
chmod +x "$OUT_ENV_DIR/smoke_test.sh"

# --- zip environment ---
( cd "$OUT_DIR" && zip -r "$(basename "$ZIP_ENV")" "$(basename "$OUT_ENV_DIR")" >/dev/null )
# --- zip code ---
zip -r "$ZIP_CODE" \
  src public docs scripts prisma tests \
  *.md *.js *.ts *.json *.yaml *.yml \
  next.config.js tailwind.config.js postcss.config.js jest.config.js vitest.config.ts \
  --exclude "node_modules/*" ".git/*" ".next/*" ".vscode/*" ".github/*" ".vercel/*" \
            "*.log" "*.tsbuildinfo" ".env*" "build-output.log" "test-output.log" "temp.json" "latestEnd" >/dev/null

echo
echo "==> New artifacts in $OUT_DIR"
ls -lh "$OUT_DIR"
