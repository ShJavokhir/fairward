# CODEX.md

Guidance for Codex CLI (OpenAI) when working in this repository.

## Quickstart
- `bun install` — install dependencies
- `bun run dev` — start the Next.js dev server (app router)
- `bun run build` / `bun run start` — production build and serve
- `bun run lint` — ESLint
- `bun run ingest` — generate embeddings and ingest procedures into MongoDB

## Stack Snapshot
- Next.js 16 with the App Router in `app/`
- React 19, Tailwind CSS 4, Mapbox GL + Supercluster
- MongoDB Atlas with vector search for semantic procedure lookup
- VoyageAI (voyage-3) for embeddings, Fireworks AI (DeepSeek v3) for chat, Vapi for outbound voice calls

## Key Entry Points
- `app/page.tsx` — marketing/landing page
- `app/query/page.tsx` — procedure search UI (debounced autocomplete)
- `app/results/page.tsx` — results list, map, and chat assistant
- `app/api/procedures/search` — vector search endpoint
- `app/api/pricing` — provider pricing lookup
- `app/api/chat` — streaming chat powered by Fireworks
- `app/api/vapi` — outbound voice call trigger; prompt defined in `docs/voice-assistant-prompt.md`
- `lib/mongodb.ts` — MongoDB singleton connection
- `lib/procedures-db.ts` — vector search helpers
- `lib/pricing-cache.ts` — caching layer for pricing responses

## Environment Variables (`.env.local`)
- `MONGODB_URI`
- `VOYAGE_API_KEY`
- `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`
- `FIREWORKS_API_KEY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

## Implementation Notes
- Favor server components unless client-side interactivity is required; co-locate data fetching in the relevant route handlers.
- Keep API responses consistent with existing JSON shapes and timing headers.
- Reuse the MongoDB connection from `lib/mongodb.ts` to avoid connection storms.
- When modifying voice-calling flows, align system prompts with `docs/voice-assistant-prompt.md` and pass runtime variables through `assistantOverrides`.
- Maintain UI styling via Tailwind 4 tokens defined in `app/globals.css`.
