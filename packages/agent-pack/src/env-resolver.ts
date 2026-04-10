import { AgentPackSchema, type AgentPack, LLM_PROVIDERS, type LlmProvider } from './schema'

export type EnvOverrideSource = Record<string, string | undefined>

function parseNumber(value: string | undefined, fieldName: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new Error(`${fieldName} must be a number, got "${value}"`)
  }
  return n
}

function parseInteger(value: string | undefined, fieldName: string): number | undefined {
  const n = parseNumber(value, fieldName)
  if (n === undefined) return undefined
  if (!Number.isInteger(n)) {
    throw new Error(`${fieldName} must be an integer, got "${value}"`)
  }
  return n
}

function assertLlmProvider(value: string): LlmProvider {
  if (!(LLM_PROVIDERS as readonly string[]).includes(value)) {
    throw new Error(`LLM_PROVIDER must be one of ${LLM_PROVIDERS.join(', ')}, got "${value}"`)
  }
  return value as LlmProvider
}

/**
 * Overlay environment variables on top of an agent pack.
 *
 * Env takes precedence over pack values, but the resulting object is still
 * validated through the pack schema so we fail fast on bad combinations
 * (e.g. LLM_PROVIDER set without a model).
 */
export function resolveEnvOverrides(pack: AgentPack, env: EnvOverrideSource = process.env): AgentPack {
  const draft: AgentPack = structuredClone(pack)

  // LLM overrides
  const llmProviderEnv = env.LLM_PROVIDER
  const llmModelEnv = env.OPENAI_MODEL ?? env.LLM_MODEL
  const llmTemperatureEnv = parseNumber(env.OPENAI_TEMPERATURE ?? env.LLM_TEMPERATURE, 'LLM temperature')
  const llmMaxTokensEnv = parseInteger(env.OPENAI_MAX_TOKENS ?? env.LLM_MAX_TOKENS, 'LLM max tokens')
  const llmBaseUrlEnv = env.OPENAI_BASE_URL ?? env.LLM_BASE_URL

  if (llmProviderEnv || llmModelEnv || llmTemperatureEnv !== undefined || llmMaxTokensEnv !== undefined || llmBaseUrlEnv) {
    const existing = draft.llm ?? {
      provider: 'openai' as LlmProvider,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
    }
    draft.llm = {
      provider: llmProviderEnv ? assertLlmProvider(llmProviderEnv) : existing.provider,
      model: llmModelEnv ?? existing.model,
      temperature: llmTemperatureEnv ?? existing.temperature,
      maxTokens: llmMaxTokensEnv ?? existing.maxTokens,
      baseUrl: llmBaseUrlEnv ?? existing.baseUrl,
    }
  }

  // Memory overrides
  const memoryBackendEnv = env.AGENT_MEMORY_BACKEND
  const memoryWindowEnv = parseInteger(env.AGENT_MEMORY_WINDOW, 'AGENT_MEMORY_WINDOW')

  if (memoryBackendEnv || memoryWindowEnv !== undefined) {
    if (memoryBackendEnv && memoryBackendEnv !== 'in-memory' && memoryBackendEnv !== 'redis') {
      throw new Error(`AGENT_MEMORY_BACKEND must be "in-memory" or "redis", got "${memoryBackendEnv}"`)
    }
    const existing = draft.memory ?? { backend: 'in-memory' as const, window: 8 }
    draft.memory = {
      backend: (memoryBackendEnv as 'in-memory' | 'redis' | undefined) ?? existing.backend,
      window: memoryWindowEnv ?? existing.window,
    }
  }

  // Metadata overrides
  if (env.AGENT_ID) draft.metadata.id = env.AGENT_ID
  if (env.AGENT_DISPLAY_NAME) draft.metadata.displayName = env.AGENT_DISPLAY_NAME
  if (env.AGENT_DEFAULT_LANGUAGE) draft.metadata.defaultLanguage = env.AGENT_DEFAULT_LANGUAGE

  // Re-validate — catches e.g. invalid language override
  return AgentPackSchema.parse(draft)
}
