# AGENTS.md

## Repo Structure

Monorepo with three packages that are NOT linked via workspaces — each has its own `node_modules`:

- `backend/` — Node.js/Express, **CommonJS** (`"type": "commonjs"`), entry point `server.js`
- `frontend/` — Next.js 16 + React 19 + TypeScript, entry point `src/app/`
- `infra/` — Docker Compose stack (MongoDB, backend, worker, frontend, nginx)

## Dev Commands

**Backend** (two processes required):
```bash
cd backend
cp .env.example .env   # fill in JWT_SECRET, MONGO_URI, LLM keys
npm install
npm run dev             # API server on :5000
npm run worker          # agent runner (separate terminal)
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev             # Next.js on :3000
```

**Lint & format** (run from repo root):
```bash
npm run lint            # eslint frontend/src + backend/src
npm run format          # prettier --write frontend/src backend/src
```

**Backend tests**:
```bash
cd backend
npm test                # runs jest --testMatch '**/*.handler.test.js'
```
Only handler test files are included. There is no frontend test suite.

## Git Hooks

Husky runs on commit:
- **pre-commit**: `lint-staged` → eslint --fix + prettier --write on staged files
- **commit-msg**: commitlint enforces [Conventional Commits](https://www.conventionalcommits.org/)

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Header max 100 chars, subject lowercase, no trailing period.

## Code Style

- **Backend JS**: `prefer-const`, `eqeqeq`, no `var`, no `throw literal`, no `return await`
- **Frontend TS**: `@typescript-eslint/consistent-type-imports` enforced, `no-explicit-any` as warning, React hooks rules enforced
- **Prettier**: semi, singleQuote, tabWidth 2, trailingComma es5, printWidth 100, bracketSpacing, arrowParens always

## Architecture Notes

- Backend and frontend are separate processes communicating over REST + MongoDB
- MongoDB must run with **replica set** enabled (Docker compose handles this via `mongo-init-replica`)
- Worker (`npm run worker` / `node src/agents/runner.js`) polls for tasks — must run alongside the API server
- `backend/src/` layout: `agents/`, `config/`, `controllers/`, `models/`, `routes/`, `services/`, `tools/`, `workflow/`
- Frontend API URL in Docker is derived from `BACKEND_PORT` — do NOT set `NEXT_PUBLIC_API_URL` manually for Docker deploys
- Env vars are never committed; `backend/.env.example` is the source of truth for local dev, `infra/.env.example` for Docker

## Common Pitfalls

- Forgetting to run the worker — workflows won't execute without it
- Running lint from `backend/` or `frontend/` — the scripts `cd ..` to the root, so just run `npm run lint` from root
- Not initializing MongoDB replica set — the app requires it; use Docker compose or init manually
- Backend uses CommonJS (`require`), frontend uses ESM/TypeScript — do not mix patterns

## Installed Skills

| Skill | Use Case |
|-------|----------|
| next-best-practices | Next.js patterns: RSC boundaries, data fetching, route handlers, optimization |
| next-cache-components | Next.js 16 PPR & caching: Cache Components, cacheLife, cacheTag, updateTag |
| vercel-react-best-practices | React 19 best practices: hooks, performance, state management, patterns |
| vercel-composition-patterns | Component composition: layout patterns, page architecture, responsive design |
| typescript-advanced-types | Advanced TS: generics, utility types, conditional types, type guards |
| tailwind-design-system | Tailwind CSS: design systems, components, theming, spacing, responsive utilities |
| wcag-audit-patterns | Accessibility: WCAG compliance, semantic HTML, aria attributes, keyboard nav |
| accessibility-compliance | A11y standards: color contrast, focus states, screen readers, inclusive patterns |
| core-web-vitals | CWV optimization: LCP, INP, CLS tuning, performance metrics, page experience |
| api-design-principles | REST API design: naming, versioning, error handling, pagination, security |
| nodejs-backend-patterns | Node.js patterns: middleware, routing, error handling, async patterns, streams |
| nodejs-express-server | Express.js: server setup, middleware chains, route handlers, request/response |
| github-actions-docs | GitHub Actions: workflow syntax, triggers, matrices, artifacts, CI/CD pipelines |
| deploy-to-vercel | Vercel deployments: zero-config, preview envs, analytics, edge functions |
| eslint-prettier-config | Code quality: ESLint rules, Prettier formatting, git hooks, auto-fix setup |
