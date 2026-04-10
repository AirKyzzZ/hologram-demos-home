import { resolveEnvOverrides } from '../env-resolver'
import type { AgentPack } from '../schema'

const basePack: AgentPack = {
  metadata: { id: 'base', displayName: 'Base', defaultLanguage: 'en' },
  languages: { en: { greeting: 'Hi' } },
  llm: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 256 },
  memory: { backend: 'in-memory', window: 8 },
}

describe('resolveEnvOverrides', () => {
  it('returns pack unchanged when env is empty', () => {
    const result = resolveEnvOverrides(basePack, {})
    expect(result).toEqual(basePack)
  })

  it('overrides LLM model via OPENAI_MODEL', () => {
    const result = resolveEnvOverrides(basePack, { OPENAI_MODEL: 'gpt-4o' })
    expect(result.llm?.model).toBe('gpt-4o')
    expect(result.llm?.provider).toBe('openai')
  })

  it('overrides LLM provider via LLM_PROVIDER', () => {
    const result = resolveEnvOverrides(basePack, { LLM_PROVIDER: 'anthropic', LLM_MODEL: 'claude-3' })
    expect(result.llm?.provider).toBe('anthropic')
    expect(result.llm?.model).toBe('claude-3')
  })

  it('rejects invalid LLM_PROVIDER with a helpful error', () => {
    expect(() => resolveEnvOverrides(basePack, { LLM_PROVIDER: 'bogus' })).toThrow(
      /LLM_PROVIDER must be one of/,
    )
  })

  it('parses OPENAI_TEMPERATURE as a float', () => {
    const result = resolveEnvOverrides(basePack, { OPENAI_TEMPERATURE: '0.9' })
    expect(result.llm?.temperature).toBe(0.9)
  })

  it('rejects non-numeric OPENAI_TEMPERATURE', () => {
    expect(() => resolveEnvOverrides(basePack, { OPENAI_TEMPERATURE: 'hot' })).toThrow(/temperature/)
  })

  it('rejects out-of-range temperature after override', () => {
    expect(() => resolveEnvOverrides(basePack, { OPENAI_TEMPERATURE: '3.5' })).toThrow()
  })

  it('parses OPENAI_MAX_TOKENS as an integer', () => {
    const result = resolveEnvOverrides(basePack, { OPENAI_MAX_TOKENS: '1500' })
    expect(result.llm?.maxTokens).toBe(1500)
  })

  it('rejects non-integer OPENAI_MAX_TOKENS', () => {
    expect(() => resolveEnvOverrides(basePack, { OPENAI_MAX_TOKENS: '99.5' })).toThrow(/integer/)
  })

  it('overrides memory backend', () => {
    const result = resolveEnvOverrides(basePack, { AGENT_MEMORY_BACKEND: 'redis' })
    expect(result.memory?.backend).toBe('redis')
    expect(result.memory?.window).toBe(8)
  })

  it('rejects invalid memory backend', () => {
    expect(() => resolveEnvOverrides(basePack, { AGENT_MEMORY_BACKEND: 'mongodb' })).toThrow(
      /in-memory.*redis/,
    )
  })

  it('overrides AGENT_MEMORY_WINDOW', () => {
    const result = resolveEnvOverrides(basePack, { AGENT_MEMORY_WINDOW: '32' })
    expect(result.memory?.window).toBe(32)
  })

  it('overrides metadata fields', () => {
    const result = resolveEnvOverrides(basePack, {
      AGENT_ID: 'env-id',
      AGENT_DISPLAY_NAME: 'Env Display',
    })
    expect(result.metadata.id).toBe('env-id')
    expect(result.metadata.displayName).toBe('Env Display')
  })

  it('does not mutate the input pack', () => {
    const clone = JSON.parse(JSON.stringify(basePack))
    resolveEnvOverrides(basePack, { OPENAI_MODEL: 'different' })
    expect(basePack).toEqual(clone)
  })

  it('synthesises llm block from env when pack has none', () => {
    const packWithoutLlm: AgentPack = {
      metadata: { id: 'x', displayName: 'X', defaultLanguage: 'en' },
      languages: { en: {} },
    }
    const result = resolveEnvOverrides(packWithoutLlm, {
      LLM_PROVIDER: 'openai',
      OPENAI_MODEL: 'gpt-4o',
    })
    expect(result.llm?.provider).toBe('openai')
    expect(result.llm?.model).toBe('gpt-4o')
  })

  it('rejects changing defaultLanguage to a non-existent language', () => {
    expect(() => resolveEnvOverrides(basePack, { AGENT_DEFAULT_LANGUAGE: 'de' })).toThrow(
      /defaultLanguage/,
    )
  })
})
