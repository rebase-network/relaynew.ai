FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY apps/api/db ./apps/api/db

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @relaynews/shared build
RUN pnpm --filter @relaynews/api build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app /app
RUN ln -sf "$(find /app/node_modules/.pnpm -path '*/node_modules/tsx/dist/cli.mjs' | head -n 1)" /usr/local/bin/tsx

EXPOSE 8787

CMD ["tsx", "apps/api/src/server.ts"]
