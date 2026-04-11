#!/usr/bin/env bash
# Auto-update loop called by holo-update.timer every 15 min.
#
#  1. git pull the deploy repo (this repo) to catch docker-compose.yml changes
#  2. for each bot source under ~/bot-sources/<name>:
#       - git pull
#       - if HEAD changed or image missing → docker build → recreate
#  3. docker compose up -d to apply any compose.yml changes
#
# Safe to run concurrently with the timer (flock). Logs to stdout so
# journalctl -u holo-update.service captures it.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/holo-stack/deploy/home-server}"
SOURCES_DIR="${SOURCES_DIR:-$HOME/bot-sources}"
LOCK="/tmp/holo-update.lock"

log() { printf "[holo-update] %s %s\n" "$(date -Iseconds)" "$*"; }

exec 9>"$LOCK"
if ! flock -n 9; then
  log "another update already running, skipping"
  exit 0
fi

cd "$DEPLOY_DIR"

log "pulling deploy repo…"
git -C "$(git rev-parse --show-toplevel)" pull --ff-only --quiet || log "deploy repo pull failed (continuing)"

# Map of <compose-service-name> → <source-dir under SOURCES_DIR>
# Add a new line when you add a new bot.
declare -A BOTS=(
  [twitter-bot]=twitter
  [whisper-bot]=whisper
  # [openclaw-bot]=openclaw
)

for service in "${!BOTS[@]}"; do
  src="${SOURCES_DIR}/${BOTS[$service]}"
  if [[ ! -d "$src/.git" ]]; then
    log "skip $service: no source at $src"
    continue
  fi

  before=$(git -C "$src" rev-parse HEAD)
  git -C "$src" pull --ff-only --quiet || { log "pull failed for $service"; continue; }
  after=$(git -C "$src" rev-parse HEAD)

  image="${service/-bot/}-bot:latest"
  has_image=$(docker image inspect "$image" >/dev/null 2>&1 && echo yes || echo no)

  if [[ "$before" != "$after" || "$has_image" != "yes" ]]; then
    log "rebuilding $service ($before → $after)…"
    if docker build -t "$image" "$src"; then
      log "recreating $service container…"
      docker compose up -d --no-deps "$service"
    else
      log "BUILD FAILED for $service, leaving old container in place"
    fi
  else
    log "$service up-to-date"
  fi
done

log "reconciling compose state…"
docker compose up -d

log "pruning dangling images…"
docker image prune -f >/dev/null 2>&1 || true

log "done"
