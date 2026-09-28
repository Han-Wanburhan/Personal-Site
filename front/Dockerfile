# ---- Stage 1: build the React app ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached until package*.json change)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build   # -> /app/dist

# ---- Stage 2: serve with Caddy ----
# Caddy serves the static files, proxies /api to the Go API,
# and gets HTTPS certificates automatically when SITE_ADDRESS is a domain.
FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
