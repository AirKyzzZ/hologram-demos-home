#!/usr/bin/env bash
# One-shot host setup for the home server. Idempotent.
# Run as the normal user (samsepiol). Needs passwordless sudo.
set -euo pipefail

log() { printf "\033[1;36m[setup]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[setup]\033[0m %s\n" "$*" >&2; }

# ---- 1. check prerequisites -----------------------------------------
if ! command -v sudo >/dev/null; then err "sudo required"; exit 1; fi
# Clear any cached sudo timestamp so we actually test NOPASSWD, not the cache.
sudo -k
if ! sudo -n true 2>/dev/null; then err "passwordless sudo not configured"; exit 1; fi

# ---- 2. install docker + compose ------------------------------------
if ! command -v docker >/dev/null; then
  log "installing docker + docker-compose-v2…"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker.io docker-compose-v2 git make
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  log "docker installed. You may need to re-login for the docker group to take effect."
else
  log "docker already installed: $(docker --version)"
fi

# ---- 3. source dirs --------------------------------------------------
mkdir -p "$HOME/bot-sources"
if [[ ! -d "$HOME/bot-sources/twitter/.git" ]]; then
  log "cloning hologram-twitter-bot-vs…"
  git clone https://github.com/AirKyzzZ/hologram-twitter-bot-vs.git \
    "$HOME/bot-sources/twitter"
else
  log "bot-sources/twitter already present"
fi

# ---- 4. tailscale funnel --------------------------------------------
if ! command -v tailscale >/dev/null; then
  err "tailscale not installed — install it manually first"
  exit 1
fi

log "configuring tailscale serve + funnel on :443 → http://localhost:8080…"
# --bg=true is idempotent on recent tailscale; wrap in || true for older.
sudo tailscale serve --bg --https=443 http://127.0.0.1:8080 || true
sudo tailscale funnel --bg --https=443 on || true

log "tailscale serve config:"
sudo tailscale serve status || true

# Heads-up about Funnel ACL requirement.
if ! sudo tailscale funnel status 2>/dev/null | grep -q "Funnel on"; then
  err "tailscale funnel does not appear to be on — enable Funnel in the"
  err "tailnet ACL/admin console (https://login.tailscale.com/admin/funnel)"
  err "and re-run this script."
fi

# ---- 5. show summary -------------------------------------------------
cat <<EOF

─────────────────────────────────────────────────
 Setup complete.

 Next:
   1. Edit .env              (shared stack config)
   2. Edit bots/twitter/.env (twitter credentials)
   3. cd $(pwd) && make up
   4. make logs              (watch it come up)
   5. Visit:   https://$(tailscale status --json 2>/dev/null | \
        python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')

 Add auto-update:
   sudo cp update.service update.timer /etc/systemd/system/
   sudo systemctl enable --now holo-update.timer
─────────────────────────────────────────────────
EOF
