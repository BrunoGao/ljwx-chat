# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

灵境万象 (OMNIVERSE) - A customized enterprise AI assistant platform based on LobeChat, supporting local Ollama models, knowledge base management, and multimodal conversations.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Ant Design, @lobehub/ui, antd-style, Zustand, SWR, react-i18next
- **Backend**: tRPC (type-safe API), PostgreSQL, Drizzle ORM, PGLite (WASM), pgvector
- **AI**: Ollama (local models), OpenAI API, LangChain, MCP (Model Context Protocol)
- **Storage**: MinIO (object storage), PostgreSQL/PGLite (database)
- **Testing**: Vitest (3000+ test cases)
- **Tools**: pnpm (package manager), bun (script runner), bunx (executable runner)

For more details, see @.cursor/rules/project-introduce.mdc

## Architecture

### Data Flow

- **Web with ClientDB**: React UI → Client Service → Direct Model Access → PGLite (Web WASM)
- **Web with ServerDB**: React UI → Client Service → tRPC Lambda → Server Services → PostgreSQL (Remote)
- **Desktop**: Electron UI → Client Service → tRPC Lambda → Server Services → PGLite/PostgreSQL

### Key Layers

- **UI Components**: `src/components`, `src/features`
- **Global Providers**: `src/layout`
- **State Management**: `src/store` (Zustand)
- **Client Services**: `src/services/<domain>/client.ts` (clientDB), `src/services/<domain>/server.ts` (serverDB)
- **API Routers**: `src/app/(backend)/webapi` (REST), `src/server/routers/{edge|lambda|async|desktop}` (tRPC)
- **Server Services**: `src/server/services` (can access serverDB)
- **Server Modules**: `src/server/modules` (third-party integrations, no DB access)
- **Database**: `packages/database/src/{schemas|models|repositories}` (Drizzle ORM)

For complete structure, see @.cursor/rules/project-structure.mdc

## Common Commands

### Development

```bash
pnpm dev           # Start dev server (port 3210)
pnpm build         # Build for production (includes lint, type-check, db migration)
pnpm start         # Start production server (port 3210)
bun run type-check # Run TypeScript type checking
pnpm lint          # Run all linters (ts, style, circular deps)
```

### Database

```bash
bun run db:studio   # Open Drizzle Studio (database GUI)
bun run db:generate # Generate migration files
bun run db:migrate  # Run database migrations
```

### Testing

```bash
# Run specific test file (ALWAYS use file pattern to avoid running all 3000+ tests)
bunx vitest run --silent='passed-only' '[file-path-pattern]'

# Run tests in packages
cd packages/database && bunx vitest run --silent='passed-only' '[file-path-pattern]'

# Run specific test case by name
bunx vitest run --silent='passed-only' -t "test case name"
```

**Important**: Never run `bun run test` or `npm test` - this runs all 3000+ tests and takes \~10 minutes. Always use file patterns.

**Before writing tests**: Read `@.cursor/rules/testing-guide/testing-guide.mdc` for comprehensive testing guidelines.

## Development Workflow

### Git Workflow

- The current release branch is `next` instead of `main` until v2.0.0 is officially released
- use rebase for git pull
- git commit message should prefix with gitmoji
- git branch name format example: tj/feat/feature-name
- use .github/PULL_REQUEST_TEMPLATE.md to generate pull request description

### Package Management

This repository adopts a monorepo structure with workspace packages under `@lobechat/` namespace.

- Use `pnpm` as the primary package manager for dependency management
- Use `bun` to run npm scripts
- Use `bunx` to run executable npm packages

### TypeScript Code Style

Key guidelines (see @.cursor/rules/typescript.mdc for full details):

- Avoid explicit type annotations when TypeScript can infer types
- Prefer `interface` over `type` for object shapes
- Prefer `async`/`await` over callbacks or chained `.then` promises
- Use object destructuring when accessing properties
- When importing a directory module, prefer explicit index path: `@/db/index` instead of `@/db`
- Use components from `@lobehub/ui` or Ant Design instead of raw HTML tags
- Use `antd-style` token system instead of hard-coded colors for dark mode support
- Never log user private information (API keys, etc.)

### Testing

- **Required Rule**: read `@.cursor/rules/testing-guide/testing-guide.mdc` before writing tests
- **Command**:
  - web: `bunx vitest run --silent='passed-only' '[file-path-pattern]'`
  - packages(eg: database): `cd packages/database && bunx vitest run --silent='passed-only' '[file-path-pattern]'`

**Important**:

- wrap the file path in single quotes to avoid shell expansion
- Never run `bun run test` etc to run tests, this will run all tests and cost about 10mins
- If trying to fix the same test twice, but still failed, stop and ask for help.

### Typecheck

- use `bun run type-check` to check type errors.

### i18n

- **Keys**: Add to `src/locales/default/namespace.ts`
- **Dev**: Translate `locales/zh-CN/namespace.json` and `locales/en-US/namespace.json` locales file only for dev preview
- DON'T run `pnpm i18n`, let CI auto handle it

## Rules Index

Some useful project rules are listed in @.cursor/rules/rules-index.mdc
