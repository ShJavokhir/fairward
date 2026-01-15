# syntax=docker/dockerfile:1

# Dockerfile for Next.js 16 on EC2 AMD64
# Build: docker build --platform linux/amd64 -t justprice .

# ============================================
# Stage 1: Dependencies
# ============================================
FROM --platform=linux/amd64 node:22-alpine AS deps

WORKDIR /app

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json bun.lock* package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies (prefer npm for Docker compatibility)
RUN \
  if [ -f bun.lock ]; then \
    npm install -g bun && bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  elif [ -f yarn.lock ]; then \
    yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm i --frozen-lockfile; \
  else \
    npm install; \
  fi

# ============================================
# Stage 2: Build
# ============================================
FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bake environment variables at build time
# NEXT_PUBLIC_* vars must be present at build time
ARG MONGODB_URI
ARG VOYAGE_API_KEY
ARG ANTHROPIC_API_KEY
ARG FIREWORKS_API_KEY
ARG NEXT_PUBLIC_VAPI_PUBLIC_KEY
ARG VAPI_API_KEY
ARG VAPI_PHONE_NUMBER_ID
ARG MAPBOX_ACCESS_TOKEN
ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

ENV MONGODB_URI=$MONGODB_URI
ENV VOYAGE_API_KEY=$VOYAGE_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV FIREWORKS_API_KEY=$FIREWORKS_API_KEY
ENV NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY
ENV VAPI_API_KEY=$VAPI_API_KEY
ENV VAPI_PHONE_NUMBER_ID=$VAPI_PHONE_NUMBER_ID
ENV MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM --platform=linux/amd64 node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime environment variables (server-side only)
# These can be overridden at runtime via docker run -e
ARG MONGODB_URI
ARG VOYAGE_API_KEY
ARG ANTHROPIC_API_KEY
ARG FIREWORKS_API_KEY
ARG NEXT_PUBLIC_VAPI_PUBLIC_KEY
ARG VAPI_API_KEY
ARG VAPI_PHONE_NUMBER_ID
ARG MAPBOX_ACCESS_TOKEN
ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

ENV MONGODB_URI=$MONGODB_URI
ENV VOYAGE_API_KEY=$VOYAGE_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV FIREWORKS_API_KEY=$FIREWORKS_API_KEY
ENV NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY
ENV VAPI_API_KEY=$VAPI_API_KEY
ENV VAPI_PHONE_NUMBER_ID=$VAPI_PHONE_NUMBER_ID
ENV MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the server
CMD ["node", "server.js"]
