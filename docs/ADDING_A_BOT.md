# Adding a new bot

The whole point of this repo is that adding a new bot should take an afternoon, not a week. Here's the 7-step checklist.

## 1. Copy the template

```bash
cp -r apps/_template-vs apps/my-bot-vs
cd apps/my-bot-vs
```

## 2. Rename references

Files to edit:

- `package.json` — change `"name": "template-vs"` to `"name": "my-bot-vs"` and adjust the description.
- `README.md` — replace template references with your bot's name and purpose.

## 3. Write your bot's logic

Most of the work lives in `src/core/echo.logic.ts`. Rename it to `src/core/my-bot.logic.ts`, rename the `EchoLogic` class, and override the handlers you care about:

```ts
import { BaseCoreService, type HoloMessage } from '@holo/vs-agent-core'
import type { VsAgentSender } from './message-sender'

export class MyBotLogic extends BaseCoreService {
  constructor(private readonly sender: VsAgentSender) {
    super()
  }

  protected async onTextMessage(message: HoloMessage): Promise<void> {
    // your logic here
    await this.sender.sendText(message.connectionId, 'hello from my bot')
  }

  // override more handlers as needed:
  protected async onMediaMessage(message: HoloMessage): Promise<void> { /* ... */ }
  protected async onProfileMessage(message: HoloMessage): Promise<void> { /* ... */ }
}
```

Update `src/core/echo-core.service.ts` to extend your new logic class.

## 4. Write unit tests

Copy `src/__tests__/echo.logic.spec.ts` to `src/__tests__/my-bot.logic.spec.ts` and rewrite the assertions for your logic. Aim for:

- One test per message kind you handle.
- At least one test for the empty / whitespace / malformed input edge case.
- At least one test asserting the sender is *not* called for kinds you don't handle.

```bash
pnpm --filter my-bot-vs test
```

## 5. Create an agent pack

```bash
cp -r agent-packs/template agent-packs/my-bot
```

Edit `agent-packs/my-bot/agent-pack.yaml`:

- `metadata.id` → `my-bot`
- `metadata.displayName` → `My Bot`
- `languages.*.greeting` and `systemPrompt` → your copy
- `llm.*` → the model you want

The schema is defined in `packages/agent-pack/src/schema.ts`; `pnpm --filter @holo/agent-pack test` validates it.

## 6. Create a Helm values file

```bash
cp deploy/charts/twitter-bot-values.yaml deploy/charts/my-bot-values.yaml
```

Edit:

- `nameOverride: my-bot`
- `image.repository: yourdockerhub/my-bot-vs`
- `chatbot.name: my-bot`
- `chatbot.ingress.host: my-bot.home.yourdomain.tld`
- `chatbot.env[].AGENT_PACK_PATH: /app/agent-packs/my-bot/agent-pack.yaml`
- `vs-agent-chart.name: my-bot-vs-agent`
- `vs-agent-chart.ingress.host: dm.my-bot.home.yourdomain.tld`
- `vs-agent-chart.extraEnvFromSecret[].secretKey: MY_BOT_WALLET_KEY`

Add a new secret key to `deploy/k3s/secrets.local.env.example`:

```bash
MY_BOT_WALLET_KEY=change-me-random-32-bytes
```

## 7. Ship it

```bash
# From repo root
pnpm install
pnpm build
pnpm test

# Commit, push, let CI/CD build and push the Docker image
git add -A
git commit -m "feat(my-bot): initial scaffold"
git push

# Once CD has published the image, trigger deploy via GitHub Actions:
# .github/workflows/deploy.yml with bot=my-bot
```

On the home server:

```bash
ssh home-server
cd ~/hologram-demos-home
git pull
./deploy/k3s/05-create-secrets.sh    # refresh secret with new MY_BOT_WALLET_KEY
helm upgrade --install my-bot \
  <chart-source> \
  -f deploy/charts/my-bot-values.yaml \
  -n holo-demos
```

Wait for the pods and the certificate to go Ready, then scan the QR at `https://my-bot.home.yourdomain.tld`.

## Checklist

- [ ] New directory under `apps/`
- [ ] Logic class extending `BaseCoreService`
- [ ] Unit tests covering every message kind you handle
- [ ] `pnpm test` green
- [ ] New agent pack under `agent-packs/`
- [ ] New Helm values file under `deploy/charts/`
- [ ] Wallet key secret added to `secrets.local.env.example`
- [ ] Docker image builds locally (`docker build -f apps/my-bot-vs/Dockerfile .` from repo root)
- [ ] CI green on PR
- [ ] CD published the image
- [ ] Deployed to home-server
- [ ] QR code scan → chat works end-to-end
