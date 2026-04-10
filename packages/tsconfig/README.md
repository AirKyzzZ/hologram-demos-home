# @holo/tsconfig

Shared TypeScript configs for the monorepo. Not published.

| File | Use case |
|---|---|
| `base.json` | Strict ES2022 library baseline |
| `nestjs.json` | NestJS apps (adds decorator metadata + jest types) |
| `library.json` | Publishable libraries (rootDir/outDir, excludes tests) |

Usage in a package's `tsconfig.json`:

```json
{ "extends": "@holo/tsconfig/library.json" }
```
