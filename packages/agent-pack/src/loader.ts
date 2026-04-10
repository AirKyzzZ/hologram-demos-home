import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as YAML from 'yaml'
import { ZodError } from 'zod'
import { AgentPackSchema, type AgentPack } from './schema'

export class AgentPackLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AgentPackLoadError'
  }
}

export function loadAgentPack(filePath: string): AgentPack {
  const absolute = resolve(filePath)

  if (!existsSync(absolute)) {
    throw new AgentPackLoadError(`Agent pack file not found: ${absolute}`)
  }

  let raw: string
  try {
    raw = readFileSync(absolute, 'utf-8')
  } catch (err) {
    throw new AgentPackLoadError(`Failed to read agent pack at ${absolute}`, err)
  }

  return loadAgentPackFromString(raw, absolute)
}

export function loadAgentPackFromString(raw: string, source = '<string>'): AgentPack {
  let parsed: unknown
  try {
    parsed = YAML.parse(raw)
  } catch (err) {
    throw new AgentPackLoadError(`Invalid YAML in agent pack (${source})`, err)
  }

  if (parsed === null || parsed === undefined) {
    throw new AgentPackLoadError(`Agent pack is empty (${source})`)
  }

  try {
    return AgentPackSchema.parse(parsed)
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues
        .map(issue => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('\n')
      throw new AgentPackLoadError(`Agent pack failed validation (${source}):\n${details}`, err)
    }
    throw err
  }
}
