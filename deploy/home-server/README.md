# deploy/home-server

Docker Compose deployment for running one or many hologram VS agents on a single home server, fronted by **Tailscale Funnel** for public HTTPS access.

This is the **simple path** — chosen over k3s because:
- Tailscale Funnel replaces ingress-nginx + cert-manager entirely (single public URL + auto-TLS)
- Saves ~500 MB of RAM vs k3s (matters when the server is tight)
- Adding a bot = adding one block to `docker-compose.yml`
- Zero router/DNS configuration

The `deploy/k3s/` + `deploy/charts/` tree is still here for the day you outgrow Compose.

## Shape

```
Internet  →  Tailscale Funnel 443
                    │
                    ▼
           traefik :8080 (docker)
                    │
  ┌─────────────────┼─────────────────┬──────────────┐
  │                 │                 │              │
  ▼                 ▼                 ▼              ▼
 /                 /twitter      /twitter/dm   /whisper…
landing.html   twitter-bot:3003  twitter-vsa:3001
                    │                 │
                    └── postgres ─────┤
                    └── redis  ───────┘
                    └── minio  ───────┘
```

One Tailscale Funnel entry, one Traefik, one shared postgres/redis/minio, one container pair (`-bot` + `-vsa`) per bot. Bots are added via new services in `docker-compose.yml`.

## Files

| Path | Role |
|---|---|
| `docker-compose.yml` | Main stack: traefik + shared infra + all bots |
| `.env.example` | Template for shared `.env` (pg password, shared keys) |
| `traefik/` | Traefik static configuration |
| `landing/` | Tiny static landing page at `/` listing all bots |
| `bots/twitter/.env.example` | Per-bot env template (copied from twitter repo's .env) |
| `setup.sh` | Host setup — installs docker, starts tailscale funnel, seeds dirs |
| `update.sh` | Auto-update logic: git pull, rebuild changed bots, recreate |
| `update.service`, `update.timer` | Systemd units for scheduled auto-update |
| `Makefile` | `make up`, `make down`, `make logs`, `make update`, `make status` |

## Quickstart

```bash
ssh home-server
git clone https://github.com/AirKyzzZ/hologram-demos-home.git ~/holo-stack
cd ~/holo-stack/deploy/home-server

# 1. install docker, create directories, wire tailscale funnel
./setup.sh

# 2. provide the shared .env
cp .env.example .env
# edit .env: POSTGRES_PASSWORD etc.

# 3. provide per-bot .env
cp bots/twitter/.env.example bots/twitter/.env
# OR scp your existing twitter bot .env into bots/twitter/.env

# 4. start the stack
make up

# 5. watch logs
make logs

# 6. install auto-update timer
sudo cp update.service update.timer /etc/systemd/system/
sudo systemctl enable --now holo-update.timer
```

Once the stack is up, the bot is live at:

- **Chatbot landing + QR:** `https://home-server.taila251a3.ts.net/twitter`
- **DIDComm endpoint:** `https://home-server.taila251a3.ts.net/twitter/dm`

Scan the QR from your iPhone. Chat with the bot. Done.

## Adding a new bot

1. Clone the bot's source repo into `~/bot-sources/<name>/` on the home server.
2. Add a per-bot `.env` under `bots/<name>/.env`.
3. Add a service block in `docker-compose.yml` copying the `twitter-*` pattern, changing name + path prefix.
4. `make up` — the auto-update timer will rebuild it on the next pull.

The monorepo `apps/_template-vs/` + `packages/` exists exactly so new bots can be scaffolded with `cp -r apps/_template-vs apps/my-bot` and dropped into this stack the same way.

## Updating

The systemd timer polls the twitter bot source repo every 15 minutes:

1. `git pull` in `~/bot-sources/twitter/`
2. If HEAD changed → `docker compose build twitter-bot`
3. `docker compose up -d twitter-bot` — rolling replace
4. Other bots untouched.

Force an immediate update:

```bash
make update
```

## Teardown

```bash
make down          # stop containers, keep volumes
make nuke          # stop, remove volumes, delete everything (irreversible)
```
