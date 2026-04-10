import { z } from 'zod'

const MetadataSchema = z.object({
  id: z.string().min(1, 'metadata.id is required'),
  displayName: z.string().min(1, 'metadata.displayName is required'),
  defaultLanguage: z.string().min(2).max(5).default('en'),
  tags: z.array(z.string()).optional(),
})

const LanguageStringsSchema = z.object({
  greeting: z.string().optional(),
  systemPrompt: z.string().optional(),
  uiStrings: z.record(z.string()).optional(),
})

export const LLM_PROVIDERS = ['openai', 'anthropic', 'ollama', 'openrouter'] as const
export type LlmProvider = (typeof LLM_PROVIDERS)[number]

const LlmSchema = z
  .object({
    provider: z.enum(LLM_PROVIDERS),
    model: z.string().min(1),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().default(500),
    baseUrl: z.string().url().optional(),
  })
  .optional()

const MemorySchema = z
  .object({
    backend: z.enum(['in-memory', 'redis']).default('in-memory'),
    window: z.number().int().positive().default(8),
  })
  .optional()

const RagSchema = z
  .object({
    provider: z.enum(['langchain', 'vectorstore', 'none']).default('none'),
    docsPath: z.string().optional(),
    vectorStore: z.enum(['redis', 'pinecone', 'memory']).optional(),
    chunkSize: z.number().int().positive().default(1000),
    chunkOverlap: z.number().int().nonnegative().default(200),
  })
  .optional()

const ToolSchema = z.object({
  name: z.string().min(1),
  config: z.record(z.unknown()).optional(),
})

export const AgentPackSchema = z
  .object({
    metadata: MetadataSchema,
    languages: z.record(LanguageStringsSchema).refine(val => Object.keys(val).length > 0, {
      message: 'languages must contain at least one language',
    }),
    llm: LlmSchema,
    memory: MemorySchema,
    rag: RagSchema,
    flows: z.record(z.unknown()).optional(),
    tools: z.array(ToolSchema).optional(),
    integrations: z.record(z.unknown()).optional(),
  })
  .superRefine((pack, ctx) => {
    const defaultLang = pack.metadata.defaultLanguage
    if (!pack.languages[defaultLang]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `metadata.defaultLanguage "${defaultLang}" has no matching entry in languages`,
        path: ['metadata', 'defaultLanguage'],
      })
    }
  })

export type AgentPack = z.infer<typeof AgentPackSchema>
