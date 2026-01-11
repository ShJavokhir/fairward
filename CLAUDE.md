# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JustPrice is a healthcare price transparency platform built with Next.js. It helps users compare hospital costs using federally-mandated pricing data, search procedures semantically, and contact providers via AI voice calling.

## Commands

```bash
bun install      # Install dependencies
bun run dev      # Start dev server (localhost:3000)
bun run build    # Production build
bun run lint     # ESLint
bun run ingest   # Ingest procedures with embeddings into MongoDB
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router and Turbopack
- **MongoDB Atlas** with vector search (1024-dim embeddings)
- **VoyageAI** (voyage-3) for semantic embeddings
- **Vapi AI** for outbound voice calling
- **Mapbox GL** + Supercluster for map visualization
- **Fireworks AI** (DeepSeek v3) for chat assistant

### Key Directories
```
app/
├── api/
│   ├── procedures/search/   # Semantic vector search
│   ├── pricing/             # Provider pricing data
│   ├── chat/                # AI chat (streaming)
│   ├── geocode/             # Address → lat/lng
│   └── vapi/call/           # Voice calling trigger
├── page.tsx                 # Landing page
├── query/page.tsx           # Search interface
└── results/page.tsx         # Results + map + chat

lib/
├── mongodb.ts               # DB connection singleton
├── voyage.ts                # Embedding generation
├── procedures-db.ts         # Vector search queries
└── pricing-cache.ts         # Caching layer

components/
├── ProvidersMap.tsx         # Mapbox with clustering
├── ChatPanel.tsx            # AI assistant UI
├── OutreachModal.tsx        # Voice call interface
└── PopularProcedures.tsx    # Featured procedures
```

### Data Flow
1. **Procedure Search**: Query → VoyageAI embedding → MongoDB vector search → ranked results with metro availability
2. **Pricing Lookup**: Procedure + metro → API → provider list with cost breakdowns
3. **Voice Outreach**: Provider selection → Vapi API → outbound call with dynamic system prompt

### Design System
- **Primary**: `#0A4D4D` (deep teal)
- **Accent**: `#2DD4BF` (seafoam)
- **Background**: `#FDFCFA` (off-white)
- **Text**: `#0F2E2E` (dark), `#5F7A7A` (muted)
- Tailwind CSS 4 with custom CSS variables in `globals.css`

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` - MongoDB Atlas connection string
- `VOYAGE_API_KEY` - VoyageAI for embeddings
- `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` - Voice calling
- `FIREWORKS_API_KEY` - Chat model (DeepSeek v3)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` - Map rendering

## Patterns

- **Semantic search**: 300ms debounce, dropdown with keyboard nav
- **Map clustering**: Supercluster with zoom-responsive markers
- **Streaming chat**: AI SDK with Fireworks, real-time token display
- **Voice AI**: System prompts in `docs/voice-assistant-prompt.md`
- **API routes**: Consistent JSON responses with timing headers
