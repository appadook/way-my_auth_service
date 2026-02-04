# AGENTS.md

Directive rules for coding agents. No theory.

---

## Universal Rules

### Planning & Workflow
- Plan before implementing non-trivial changes
- Plans need: Goal, Constraints, Steps, Success criteria
- Tasks must be small, concrete, checkable
- Complete tasks sequentially

### Development Discipline
- Prefer small, incremental changes
- One concern per task
- Write/update tests alongside code
- Avoid speculative abstractions
- Don't refactor unrelated code
- If ambiguous → stop and ask, don't guess
- Follow existing style and conventions exactly

### Documentation
- Update docs when behavior changes
- Clear, explicit naming
- Minimal comments (only where intent is non-obvious)

### Session Hygiene
- Reload files instead of relying on chat memory
- Don't carry assumptions across sessions
- Persist decisions in files, not messages
- When unsure → ask

### Prohibitions
- Don't paste large specs into chat
- Don't invent requirements or constraints
- Don't assume prior decisions unless documented

### Dev rules
- Do not ever start a dev server but isntead type check your code when possible and let me know to run it myself with the command to do so.
- use context7 mcp when you need to research implementation or doc specifics for a technology or tool
- use your frontend design skill when appropriate
- do not use git commands


---

## TypeScript Rules

### Server vs Client (Next.js)
- Server Components → Fetch data, access DB/secrets, non-interactive UI
- Client Components → User interaction, effects, browser APIs
- Server Actions → Secure server-side mutations (create/update/delete)
- Keep client boundaries small and explicit

### React Hooks
- `useState`/`useReducer` → Local component-scoped UI state only
- `useEffect` → Sync with external systems (timers, subscriptions, DOM)
- Custom hooks → Encapsulate reusable logic, not state ownership

### React Query (TanStack Query)
- `useQuery` → Read/sync server-owned data
- `useMutation` → Client-initiated server mutations
- `useQueryClient` → Invalidate/update query cache
- Never use React Query for UI state
- Never read query cache directly during render

### State Management
- Zustand/Jotai → Global UI workflow state (modals, steps, selections)
- React Context → Dependency injection only, not state management
- Every state must have a clear owner

### Hard Rules
- Never fetch data in presentational components
- Run TypeScript type checker after code changes

---

## Bun Runtime Rules

### Commands (Use Instead of Node.js)
- `bun <file>` instead of `node`/`ts-node`
- `bun test` instead of `jest`/`vitest`
- `bun build` instead of `webpack`/`esbuild`
- `bun install` instead of `npm`/`yarn`/`pnpm install`
- `bun run` instead of `npm`/`yarn`/`pnpm run`
- `bunx` instead of `npx`

### Built-in APIs (Use Instead of NPM Packages)
- `Bun.serve()` → HTTP/WebSocket server (not Express)
- `bun:sqlite` → SQLite (not better-sqlite3)
- `Bun.redis` → Redis (not ioredis)
- `Bun.sql` → Postgres (not pg/postgres.js)
- `WebSocket` → Built-in (not ws)
- `Bun.file` → File operations (not node:fs)
- `Bun.$` → Shell commands (not execa)
- Auto-loads .env (don't use dotenv)

### Frontend
- Use HTML imports with `Bun.serve()` (not Vite)
- HTML can import .tsx/.jsx directly with auto-bundling


## Next.js Guidelines
> This section is a **high-signal, ultra-concise reference** for modern Next.js (TypeScript) development. It is intended for fast onboarding, coding agents, and day-to-day decision-making.

---

### Core Principles

* **Server-first by default**
* **Explicit server/client boundaries**
* **Thin components, thick domain logic**
* **One source of truth per state type**
* Prefer **clarity and correctness** over abstraction

If something feels awkward, it is likely in the wrong layer.

---

### Server vs Client

**Server (default)**

* Data fetching
* Database access
* Auth & authorization
* Business rules
* External integrations

Rules:

* Server code must not import client-only modules
* Centralize permissions and validation

**Client (`"use client"`)**

* React hooks (`useState`, `useEffect`, React Query)
* DOM APIs, animations, complex interactions

Rules:

* Client components should be **leaf nodes**
* Avoid client pages/layouts unless unavoidable

---

### Data & State Management

**Server State**

* Server is the source of truth
* Fetch on the server when possible
* Cache and revalidate intentionally

**Client-Side Server Data**

* Use React Query for interactive data
* Do not copy server payloads into client stores

**UI & Coordination State**

* Local UI → `useState` / `useReducer`
* Cross-route coordination → small client store (IDs, intent only)

Rule:

* Never store server payloads in client state managers

---

### Folder Structure (Intent-Based)

```
src/
  app/        # routing, layouts, boundaries
  features/   # domain-oriented modules
  components/ # reusable UI only
  server/     # backend logic (DB, auth, integrations)
  lib/        # shared utilities
```

Rule:

* Organize by **feature**, not by file type

---

### Logic Placement

**Components**

* Render UI
* Wire events
* No business logic

**Hooks**

* Client orchestration
* Data-fetching hooks

Example:

```ts
useExampleQuery()
useCreateExampleMutation()
```

**Server Modules**

* Validation
* Permissions
* DB queries
* Multi-step workflows

Rule:

* If logic is reusable or testable, it does not belong in a component

---

### Forms & Validation

* Define schemas once
* Reuse schemas on client and server

Typical stack:

* `react-hook-form`
* `zod`

Pattern:

```ts
schema → form validation → server validation
```

---

### APIs & Mutations

* **Server Actions** → UI-triggered mutations
* **Route Handlers** → webhooks, external APIs

Rules:

* Keep actions/handlers thin
* Call shared domain services
* Always validate inputs on the server

---

### Auth & Security

* Centralize authorization checks
* Never trust client input
* Keep secrets server-only

Auth must integrate cleanly with:

* Server Components
* Server Actions

---

### UI & Styling

Common modern stack:

* Tailwind CSS
* Accessible UI primitives
* Copy-and-own component patterns

Rule:

* Avoid opaque UI libraries you cannot control

---

### Performance

* Prefer server components
* Keep client bundles small
* Use dynamic imports for heavy UI
* Cache intentionally; do not guess

---

### Testing

* Test domain logic more than UI
* Use E2E tests for critical flows
* Keep tests deterministic

---

### Common Tools (Reference)

* Next.js App Router
* TypeScript (strict)
* React Query
* Zod
* React Hook Form
* Postgres + ORM (Prisma / Drizzle / Kysely)
* Tailwind CSS
* Playwright

---

### Final Rules of Thumb

* Server owns truth
* Client owns experience
* Features own complexity
* If state must survive navigation, question where it lives
* When in doubt, choose the simpler abstraction

---

