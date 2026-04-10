import { join } from 'node:path'
import { loadAgentPack, loadAgentPackFromString, AgentPackLoadError } from '../loader'

const FIXTURES = join(__dirname, 'fixtures')

describe('loadAgentPack', () => {
  it('loads a minimal pack from disk', () => {
    const pack = loadAgentPack(join(FIXTURES, 'minimal.yaml'))
    expect(pack.metadata.id).toBe('minimal-bot')
    expect(pack.languages.en.greeting).toBe('Hi there')
  })

  it('loads a full pack with llm, memory, rag, tools, flows', () => {
    const pack = loadAgentPack(join(FIXTURES, 'full.yaml'))
    expect(pack.metadata.id).toBe('full-bot')
    expect(pack.metadata.tags).toEqual(['ai', 'demo'])
    expect(pack.llm?.provider).toBe('openai')
    expect(pack.llm?.temperature).toBe(0.8)
    expect(pack.memory?.backend).toBe('redis')
    expect(pack.memory?.window).toBe(20)
    expect(pack.rag?.provider).toBe('langchain')
    expect(pack.tools).toHaveLength(2)
    expect(pack.languages.fr?.greeting).toBe('Bienvenue !')
  })

  it('throws AgentPackLoadError for missing file', () => {
    expect(() => loadAgentPack(join(FIXTURES, 'does-not-exist.yaml'))).toThrow(AgentPackLoadError)
  })

  it('throws AgentPackLoadError when defaultLanguage has no matching language entry', () => {
    expect(() => loadAgentPack(join(FIXTURES, 'missing-default-language.yaml'))).toThrow(
      /defaultLanguage.*no matching entry/,
    )
  })
})

describe('loadAgentPackFromString', () => {
  it('parses valid YAML', () => {
    const yaml = `
metadata:
  id: inline
  displayName: Inline
  defaultLanguage: en
languages:
  en:
    greeting: Hi
`
    const pack = loadAgentPackFromString(yaml)
    expect(pack.metadata.id).toBe('inline')
  })

  it('throws on invalid YAML syntax', () => {
    expect(() => loadAgentPackFromString('metadata:\n  id: [unclosed')).toThrow(AgentPackLoadError)
  })

  it('throws on empty input', () => {
    expect(() => loadAgentPackFromString('')).toThrow(/empty/)
  })

  it('throws on schema violation with a helpful error path', () => {
    const yaml = `
metadata:
  id: bad
  displayName: Bad
  defaultLanguage: en
languages:
  en: {}
llm:
  provider: bogus
  model: x
`
    try {
      loadAgentPackFromString(yaml)
      fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AgentPackLoadError)
      expect((err as Error).message).toMatch(/llm\.provider/)
    }
  })
})
