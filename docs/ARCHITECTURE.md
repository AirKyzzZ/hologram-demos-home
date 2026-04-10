# Architecture

## Big picture

```
         Hologram app (user's phone)
                    │
                    │ DIDComm over HTTPS
                    ▼
        ┌───────────────────────┐
        │ nginx ingress (k3s)   │──────┐
        └───────────────────────┘      │
              │                        │
              │ https://bot.<domain>   │ https://dm.bot.<domain>
              │                        │
              ▼                        ▼
        ┌──────────┐             ┌──────────┐
        │ bot-app  │◀────HTTP───▶│ bot-vsa  │
        │ (NestJS) │             │ vs-agent │
        └────┬─────┘             └────┬─────┘
             │                        │
             │                        │ talks to mediator,
             │                        │ holds wallet,
             ▼                        ▼ validates credentials
       ┌─────────┐              ┌────────────┐
       │ redis   │              │ postgres   │
       │(memory) │              │(sessions)  │
       └─────────┘              └────────────┘

    cert-manager + Let's Encrypt auto-provisions TLS
    for both bot.<domain> and dm.bot.<domain>
```

## Components

| Component | Role | Source |
|---|---|---|
| **nginx ingress** | TLS termination, HTTP routing | Helm chart `ingress-nginx/ingress-nginx` |
| **cert-manager** | Auto ACME cert issuance + renewal | Helm chart `jetstack/cert-manager` |
| **bot-app** | Your NestJS agent — handles user messages, runs LLM, writes to DB | Image built from `apps/<bot>/` |
| **bot-vsa** (VS Agent sidecar) | DIDComm endpoint + wallet + credential verification | Image `io2060/vs-agent` (from `veranalabs/vs-agent-chart`) |
| **redis** | Per-session conversation memory | Helm subchart |
| **postgres** | Long-term session + post history | Helm subchart |

## Request lifecycle (a user sending "ping")

1. User opens the Hologram app and scans the QR displayed at `https://bot.<domain>`.
2. The app establishes a DIDComm connection to `https://dm.bot.<domain>`, which nginx routes to the **bot-vsa** sidecar.
3. The vs-agent sidecar terminates the DIDComm encryption layer and forwards the decrypted `TextMessage` to **bot-app** via HTTP to `http://<bot-app>:3003/`.
4. `@2060.io/vs-agent-nestjs-client`'s `EventsModule` receives the message and calls your `CoreService.inputMessage(message)`.
5. `inputMessage` delegates to `BaseCoreService.dispatch()`, which classifies the message and routes it to `onTextMessage()`.
6. Your bot's `onTextMessage` generates a reply and calls `sender.sendText(connectionId, reply)`.
7. The sender — backed by `ApiClient` from the SDK — posts a new `TextMessage` to the vs-agent's admin API, which encrypts and delivers it back to the user's app.

End-to-end latency is dominated by the LLM call, not the DIDComm layer.

## Why two ingress hosts per bot?

The Hologram protocol splits user-facing UI (e.g. an invitation landing page) from the agent-to-agent DIDComm endpoint. We follow the same convention as `2060-io/hologram-demos-deploy`:

- `https://<bot>.<domain>` — where a user goes to scan the QR / view an invitation
- `https://dm.<bot>.<domain>` — where another agent (e.g. the user's wallet) talks DIDComm to this bot

Both hosts get their own Let's Encrypt certificate via cert-manager's HTTP-01 challenge.

## Why a shared `BaseCoreService`?

The twitter bot's real `CoreService` is ~1,400 lines. Most of it (~300) is boilerplate: typeswitching on `message.type`, logging, error handling, session upserts. Every new bot would duplicate that code.

`@holo/vs-agent-core` extracts the common shape:

```ts
export abstract class BaseCoreService<T extends HoloMessage = HoloMessage> {
  async dispatch(message: T): Promise<void> { /* typeswitch + error handling */ }
  protected async onTextMessage(_message: T): Promise<void> {}
  protected async onMediaMessage(_message: T): Promise<void> {}
  // ... etc
}
```

A new bot extends it and overrides only the kinds it cares about. See `apps/_template-vs/src/core/echo.logic.ts` for the minimal example.

## Why a dynamic SDK import?

The vs-agent SDK (`@2060.io/vs-agent-nestjs-client`) transitively pulls in NestJS, Credo, rhea (AMQP), TypeORM and roughly 200MB of `node_modules`. Loading it at module-import time means:

1. **Slow test startup** — jest has to parse all of that before running a trivial unit test.
2. **Tight coupling** — every consumer of `@holo/vs-agent-core` would inherit the dep.

So `packages/vs-agent-core` uses only structural types (`HoloMessage`) and `apps/_template-vs/src/core/message-sender.ts` imports the real SDK via `await import()` only when an actual message needs to be sent. Tests inject a fake `VsAgentSender` and never load the SDK.

## 24/7 availability story

| Concern | Mitigation |
|---|---|
| Pod crash | Kubernetes restart policy; liveness probe at `/health` |
| Slow startup | Readiness probe at `/ready` — ingress doesn't send traffic until ready |
| TLS expiry | cert-manager renews 30 days before expiry, fully automated |
| In-flight messages during rollouts | `app.enableShutdownHooks()` in `main.ts` drains NestJS gracefully |
| Home server reboot | k3s systemd unit auto-starts on boot |
| Router dropout | Out of scope — get a better ISP |
| Wallet key loss | Stored in `demos-secrets` K8s secret; back it up out-of-band |
| Database corruption | Postgres PVC — back up with `pg_dump` on a cron schedule |
| Sidecar crash | Independent pod — Kubernetes restarts it; bot-app retries its admin-URL calls |

The template already includes `/health`, `/healthz`, `/ready` and graceful shutdown. The Helm values in `deploy/charts/twitter-bot-values.yaml` wire them to k8s probes.
