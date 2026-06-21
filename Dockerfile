# Disha API for Cloud Run. Runs the Express API with tsx so the workspace
# TypeScript sources (engine, shared) resolve without a separate build step.
FROM node:20-slim

WORKDIR /app

# Install all workspace deps (root install resolves packages/* and apps/*).
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY india-factors.json ./india-factors.json

RUN npm install --no-audit --no-fund

ENV NODE_ENV=production
# Cloud Run injects PORT; the API reads process.env.PORT (defaults to 8080).
EXPOSE 8080

CMD ["npx", "tsx", "apps/api/src/index.ts"]
