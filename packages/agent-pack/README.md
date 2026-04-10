# @holo/agent-pack

Runtime-validated YAML configuration loader for hologram VS agents.

## What

Agent packs are YAML files that describe a bot's identity, languages, LLM setup, memory, RAG sources, and runtime flows, separately from the bot's code. This lets you swap configuration without rebuilding the image, and lets multiple bots share the same source.

## API

```ts
import { loadAgentPack, resolveEnvOverrides } from '@holo/agent-pack'

const pack = loadAgentPack('./agent-packs/my-bot/agent-pack.yaml')
const resolved = resolveEnvOverrides(pack)  // applies env vars on top
```

## Schema

```yaml
metadata:
  id: my-bot
  displayName: My Bot
  defaultLanguage: en           # must match a key in `languages`
  tags: [ai, demo]              # optional

languages:
  en:
    greeting: Hi
    systemPrompt: You are helpful
    uiStrings:
      menu.title: Main menu
  fr:
    greeting: Salut

llm:                            # optional
  provider: openai              # openai | anthropic | ollama | openrouter
  model: gpt-4o-mini
  temperature: 0.7              # 0..2, default 0.7
  maxTokens: 500                # default 500
  baseUrl: https://...          # optional (for openrouter/custom)

memory:                         # optional
  backend: redis                # in-memory | redis
  window: 20                    # default 8

rag:                            # optional
  provider: langchain           # langchain | vectorstore | none
  docsPath: ./docs
  vectorStore: redis            # redis | pinecone | memory
  chunkSize: 1000
  chunkOverlap: 200

tools:                          # optional
  - name: statistics_fetcher
  - name: geolocation
    config: { apiKey: xyz }

flows: {}                       # opaque — loaded by consuming bot
integrations: {}                # opaque — loaded by consuming bot
```

## Env var overrides

Pass environment variables via `resolveEnvOverrides(pack, process.env)` to override pack values at runtime without editing the YAML:

| Env var | Overrides |
|---|---|
| `LLM_PROVIDER` | `llm.provider` |
| `OPENAI_MODEL` or `LLM_MODEL` | `llm.model` |
| `OPENAI_TEMPERATURE` or `LLM_TEMPERATURE` | `llm.temperature` |
| `OPENAI_MAX_TOKENS` or `LLM_MAX_TOKENS` | `llm.maxTokens` |
| `OPENAI_BASE_URL` or `LLM_BASE_URL` | `llm.baseUrl` |
| `AGENT_MEMORY_BACKEND` | `memory.backend` |
| `AGENT_MEMORY_WINDOW` | `memory.window` |
| `AGENT_ID` | `metadata.id` |
| `AGENT_DISPLAY_NAME` | `metadata.displayName` |
| `AGENT_DEFAULT_LANGUAGE` | `metadata.defaultLanguage` |

The resolved pack is re-validated through the same Zod schema, so invalid combinations (e.g. bogus provider, out-of-range temperature) fail fast with a clear error message.

## Tests

```bash
pnpm --filter @holo/agent-pack test
```
