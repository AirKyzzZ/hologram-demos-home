# template-vs

**Copy-me scaffold for a new Hologram VS agent.** It ships as a minimal echo bot: any DIDComm text message a user sends it comes back with `Echo: <their text>`, plus `ping` → `pong` and `help` → short usage text. Profile messages get a greeting.

## Why this is the template

- **Minimal, runnable, testable.** `pnpm install && pnpm test` from a fresh clone works with zero external services.
- **Separation of concerns.** All the interesting logic lives in `src/core/echo.logic.ts` as a plain class (no NestJS decorators, no SDK imports), so unit tests are trivial and fast. `src/core/echo-core.service.ts` is the thin NestJS glue.
- **24/7 ready.** Built-in `/health`, `/healthz`, `/ready` endpoints, graceful shutdown hooks, Docker HEALTHCHECK, non-root container user.
- **Zero SDK coupling at the type level.** The upstream `@2060.io/vs-agent-nestjs-client` is loaded dynamically only in `src/core/message-sender.ts` — swap a provider in tests and the SDK is never touched.

## Create a new bot from this template

```bash
# From repo root
cp -r apps/_template-vs apps/my-bot-vs
cd apps/my-bot-vs

# 1. rename in package.json
#    "name": "template-vs" → "my-bot-vs"

# 2. edit src/core/echo.logic.ts — rename EchoLogic → MyBotLogic
#    replace onTextMessage with your logic

# 3. copy and edit agent pack
cp -r ../../agent-packs/template ../../agent-packs/my-bot
# edit agent-pack.yaml — id, displayName, default language, prompts

# 4. copy and edit deploy values
cp ../../deploy/charts/twitter-bot-values.yaml ../../deploy/charts/my-bot-values.yaml
# edit name, image, ingress host, domain

# 5. pnpm install from the repo root
cd ../..
pnpm install
pnpm --filter my-bot-vs test
```

See [`../../docs/ADDING_A_BOT.md`](../../docs/ADDING_A_BOT.md) for the full checklist.

## Local development

```bash
# One-time
cp .env.example .env
# Edit VS_AGENT_ADMIN_URL to point at a running vs-agent container

# Dev mode (hot reload)
pnpm start:dev

# Prod mode (same as the Docker image)
pnpm build
pnpm start:prod
```

Health endpoints:

- `GET /health` — liveness (always 200 if the process is up)
- `GET /healthz` — alias for k8s convention
- `GET /ready` — readiness (equivalent here; specialise per-bot if a bot has external deps)

## Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

The unit tests cover:

- `EchoLogic` — all message kinds, edge cases (empty text, sender errors, unknown types), reply content, connection-id pass-through
- `HealthController` — all three endpoints, response shape, uptime monotonicity
- `getAppConfig` — env parsing, validation, defaults

No integration test talking to a real vs-agent: that happens in the [smoke test runbook](../../deploy/README.md) on the home server.
