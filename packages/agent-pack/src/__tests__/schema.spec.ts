import { AgentPackSchema } from '../schema'

describe('AgentPackSchema', () => {
  const validMinimal = {
    metadata: { id: 'x', displayName: 'X', defaultLanguage: 'en' },
    languages: { en: { greeting: 'Hi' } },
  }

  it('accepts a minimal valid pack', () => {
    const result = AgentPackSchema.parse(validMinimal)
    expect(result.metadata.id).toBe('x')
    expect(result.metadata.defaultLanguage).toBe('en')
  })

  it('applies default for metadata.defaultLanguage when omitted', () => {
    const input = {
      metadata: { id: 'x', displayName: 'X' },
      languages: { en: {} },
    }
    const result = AgentPackSchema.parse(input)
    expect(result.metadata.defaultLanguage).toBe('en')
  })

  it('rejects missing metadata.id', () => {
    const input = { ...validMinimal, metadata: { displayName: 'X', defaultLanguage: 'en' } }
    expect(() => AgentPackSchema.parse(input)).toThrow(/metadata/)
  })

  it('rejects empty languages map', () => {
    const input = { ...validMinimal, languages: {} }
    expect(() => AgentPackSchema.parse(input)).toThrow(/at least one language/)
  })

  it('rejects defaultLanguage without a matching language entry', () => {
    const input = {
      metadata: { id: 'x', displayName: 'X', defaultLanguage: 'de' },
      languages: { en: { greeting: 'Hi' } },
    }
    expect(() => AgentPackSchema.parse(input)).toThrow(/defaultLanguage.*no matching entry/)
  })

  it('rejects invalid LLM provider', () => {
    const input = {
      ...validMinimal,
      llm: { provider: 'bogus', model: 'x' },
    }
    expect(() => AgentPackSchema.parse(input)).toThrow()
  })

  it('applies LLM defaults for temperature and maxTokens', () => {
    const input = {
      ...validMinimal,
      llm: { provider: 'openai', model: 'gpt-4o-mini' },
    }
    const result = AgentPackSchema.parse(input)
    expect(result.llm?.temperature).toBe(0.7)
    expect(result.llm?.maxTokens).toBe(500)
  })

  it('clamps temperature between 0 and 2', () => {
    const high = {
      ...validMinimal,
      llm: { provider: 'openai', model: 'gpt-4o-mini', temperature: 3 },
    }
    expect(() => AgentPackSchema.parse(high)).toThrow()
  })

  it('accepts multiple languages', () => {
    const input = {
      metadata: { id: 'x', displayName: 'X', defaultLanguage: 'fr' },
      languages: { en: { greeting: 'Hi' }, fr: { greeting: 'Salut' } },
    }
    const result = AgentPackSchema.parse(input)
    expect(Object.keys(result.languages)).toContain('fr')
  })

  it('rejects negative memory window', () => {
    const input = {
      ...validMinimal,
      memory: { backend: 'redis', window: -1 },
    }
    expect(() => AgentPackSchema.parse(input)).toThrow()
  })

  it('allows rag config with defaults', () => {
    const input = {
      ...validMinimal,
      rag: { provider: 'langchain', docsPath: './docs' },
    }
    const result = AgentPackSchema.parse(input)
    expect(result.rag?.chunkSize).toBe(1000)
    expect(result.rag?.chunkOverlap).toBe(200)
  })

  it('accepts tools with and without config', () => {
    const input = {
      ...validMinimal,
      tools: [{ name: 'a' }, { name: 'b', config: { key: 'value' } }],
    }
    const result = AgentPackSchema.parse(input)
    expect(result.tools).toHaveLength(2)
  })
})
