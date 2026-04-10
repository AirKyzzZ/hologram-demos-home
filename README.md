# hologram-demos-home

> **Personal lab for building and hosting [Verana](https://github.com/verana-labs) / [2060.io](https://github.com/2060-io) / Hologram verifiable-service agents on a home server.**
>
> The point: **you do not need to be in the org to build with this stack.** Everything here — the scaffold, the deploy stack, the CI, the auto-update loop — is designed so anyone can fork it, drop in their own bot logic, point it at their home server, and have a public HTTPS URL anyone can scan with the [Hologram app](https://hologram.zone) within an afternoon.

## 🟢 Live demo

**[home-server.taila251a3.ts.net/twitter](https://home-server.taila251a3.ts.net/twitter)** — scan the QR with the Hologram app and chat with an LLM-backed Twitter drafting bot. Runs 24/7 on a NUC under my desk, exposed via **Tailscale Funnel** (no port forwarding, no domain, no cert-manager).

The bot is a fork of [`AirKyzzZ/hologram-twitter-bot-vs`](https://github.com/AirKyzzZ/hologram-twitter-bot-vs). Source for future bots (whisper, openclaw) will land in `apps/` here.

## Why this exists

Verana and 2060.io ship great infra for verifiable service agents: DIDComm, Credo wallets, the VS-Agent SDK, Hologram chatbot UX. But the published demo repos ([`verana-labs/verana-demos`](https://github.com/verana-labs/verana-demos), [`2060-io/hologram-demos-deploy`](https://github.com/2060-io/hologram-demos-deploy)) are geared for **inside-the-org** deployment: Kubernetes clusters on cloud providers, real domains under `*.dev.2060.io`, organizational trust registries, wallet keys in GitHub Actions secrets.

That's overkill for:

- Someone who wants to prototype a hologram bot on their home server
- A coworker or partner who isn't part of the org yet but wants to experiment
- Me, specifically, needing a place to iterate on `whisper-bot` and `openclaw` without asking for cluster access every time

So this repo is the minimum viable stack for "I want to run my own hologram bot and scan it from my iPhone". Docker Compose instead of k3s. Tailscale Funnel instead of ingress-nginx + cert-manager. A NUC under the desk instead of OVH. Same code patterns, same SDK, same protocols — just smaller and personal.

## Architecture

```
Internet  (iPhone, coworkers, anyone — no Tailscale needed on client)
    │
    ▼
Tailscale Funnel :443 (public HTTPS, auto Let's Encrypt)
    │   https://home-server.<tailnet>.ts.net
    │
    ▼
Traefik v3.6  (docker provider, path-based routing)
    │
    ├─ /                      → nginx: landing page listing all bots
    ├─ /twitter                → nginx: twitter bot page with QR embed
    ├─ /twitter/qr             → vs-agent :3000 /v1/qr  (420×420 PNG)
    ├─ /twitter/invitation     → vs-agent :3000 /v1/invitation  (JSON)
    ├─ /twitter/dm/*           → vs-agent :3001  (DIDComm POST, strip prefix)
    │
    ├─ /whisper                → … (tomorrow)
    └─ /openclaw               → … (whenever)

                     ┌─ chatbot  (NestJS, internal-only)
                     │
              vs-agent + sidecar
                     │
                shared infra:  postgres · redis · minio
```

**Design decisions worth knowing:**

- **One Tailscale Funnel entry, multiple bots behind it.** Each bot gets a path prefix. Adding a new bot = add a service block with three Traefik labels. Scales to ~dozens of bots before needing subdomain-level split.
- **Chatbot backend is never routed from the internet.** Its only routes are internal callbacks invoked by the vs-agent via `EVENTS_BASE_URL`. The vs-agent's admin API at `:3000/v1/qr` and `:3000/v1/invitation` is what users actually hit. This is non-obvious from reading the twitter bot source — I learned it the hard way.
- **Wallet key persistence.** `AGENT_WALLET_KEY` is stored as a random 32-byte base64 value in a gitignored `.env` on the home server. Without it, Credo regenerates the wallet on every restart and invalidates every previously issued invitation. Most demo repos don't set it explicitly.
- **Auto-update is a dumb systemd timer**, not Keel/Argo/Flux. Every 15 min: `git pull` the bot source, if HEAD changed rebuild the image locally, `docker compose up -d --no-deps <bot>`. One timer, one shell script, no extra control plane.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the deeper dive, including how `@2060.io/vs-agent-nestjs-client`'s `EventHandler` interface plugs into `packages/vs-agent-core`'s `BaseCoreService`.

## What's in here

| Path | What it is |
|---|---|
| `apps/_template-vs/` | Runnable NestJS echo agent — **copy this when starting a new bot**. 24 unit tests, `/health` probes, graceful shutdown, multi-stage Dockerfile. |
| `apps/whisper-bot-vs/` | Placeholder for a speech-to-text VS agent (audio → Whisper → transcript reply). |
| `apps/openclaw-vs/` | Placeholder. |
| `packages/vs-agent-core/` | Shared `BaseCoreService` (abstract event dispatch), `StateMachine`, session store. **Zero runtime deps** — structurally-typed over `@2060.io/vs-agent-nestjs-client` so tests don't need the full SDK. 32 tests. |
| `packages/agent-pack/` | YAML loader + Zod schema + env-var override resolver for per-bot runtime config. 36 tests. |
| `packages/tsconfig/` | Shared strict TS presets. |
| `agent-packs/` | Per-bot runtime config (languages, prompts, LLM settings, flow definitions). |
| `deploy/home-server/` | **Primary deploy path.** Docker Compose stack + Traefik + landing page + `setup.sh` + `update.sh` + systemd units. This is what's actually running the live demo. |
| `deploy/k3s/` + `deploy/charts/` | Alternative path: k3s + Helm + cert-manager + nginx-ingress, mirroring 2060-io's prod pattern. Intended for when the compose stack outgrows a single box. |
| `docs/ARCHITECTURE.md` | Runtime diagram, component roles, failure modes, 24/7 availability story. |
| `docs/ADDING_A_BOT.md` | 7-step checklist for scaffolding + deploying a new bot. |
| `.github/workflows/` | CI (typecheck + test all workspaces + helm lint + shellcheck), CD (matrix Docker build+push), Deploy (manual helm upgrade over SSH). |

**Test suite:** `pnpm -r test` runs **92 tests across 10 suites** — agent-pack schema/loader/env-resolver, vs-agent-core base service/state machine/session store, template bot logic + config + health endpoints.

## Quickstart

### Run the test suite locally

```bash
git clone https://github.com/AirKyzzZ/hologram-demos-home.git
cd hologram-demos-home
pnpm install
pnpm -r build
pnpm -r test       # 92 tests, ~5 seconds
```

### Deploy the compose stack on your own home server

Prerequisites:
- A Linux box with SSH access
- **Tailscale** installed, joined to a tailnet, with Funnel enabled in the admin console ([how to enable Funnel](https://tailscale.com/kb/1223/funnel))
- ~2 GB free RAM
- Nothing on ports `:8080` or `:443`

```bash
ssh your-server
git clone https://github.com/AirKyzzZ/hologram-demos-home.git ~/holo-stack
cd ~/holo-stack/deploy/home-server

# 1. install docker + clone the twitter bot source + configure tailscale funnel
./setup.sh

# 2. provide the shared stack config (postgres password, wallet keys, etc.)
cp .env.example .env
openssl rand -base64 32 | pbcopy  # generate a wallet key, paste into .env
$EDITOR .env

# 3. provide the twitter bot's .env (OpenAI/OpenRouter key, Twitter API creds)
cp bots/twitter/.env.example bots/twitter/.env
$EDITOR bots/twitter/.env

# 4. bring up the stack
make up
make logs                    # watch everything come up

# 5. enable auto-update every 15 min
sudo cp update.service update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now holo-update.timer

# 6. the live URL
echo "https://$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')/twitter"
```

That's it. Scan the QR on `/twitter` with the Hologram app on your phone and start chatting.

### Add a new bot

See [`docs/ADDING_A_BOT.md`](./docs/ADDING_A_BOT.md) for the full checklist. Short version:

```bash
cp -r apps/_template-vs apps/my-bot-vs
# rename, rewrite src/core/*.logic.ts with your logic
cp -r agent-packs/template agent-packs/my-bot
# edit the agent-pack.yaml
```

Add a service block in `deploy/home-server/docker-compose.yml` (copy the `twitter-*` block), add a static `landing/my-bot/index.html` with `<img src="/my-bot/qr">`, and you're done. The auto-update timer handles the rest on the next push.

## Related

- [`verana-labs/verana-demos`](https://github.com/verana-labs/verana-demos) — the official Verana issuer/verifier demos
- [`2060-io/hologram-demos-deploy`](https://github.com/2060-io/hologram-demos-deploy) — the official 2060.io production deployment pattern
- [`AirKyzzZ/hologram-twitter-bot-vs`](https://github.com/AirKyzzZ/hologram-twitter-bot-vs) — the twitter bot source that's running in the live demo
- [Hologram app](https://hologram.zone) — the mobile wallet that scans the QR codes
- [Tailscale Funnel docs](https://tailscale.com/kb/1223/funnel) — the public-HTTPS layer we lean on

## License

[MIT](./LICENSE) — do whatever you want, no warranty. Built by [Maxime Mansiet](https://maximemansiet.fr).
