# Cloudflare Workers Builds Checklist

Use this checklist when wiring `relaynews-web` and `relaynews-admin` to GitHub
through Cloudflare Workers Builds.

This document is intentionally operational and copy-paste friendly. The broader
deployment context still lives in `docs/DEPLOYMENT.md`.

## Expected Worker Inventory

Keep these Workers:

- `relaynews-web`
- `relaynews-admin`
- `relaynews-api-edge`

Do not confuse these two:

- `relaynews-api-edge` is the Cloudflare proxy Worker for `api.relaynew.ai`
- `apps/api` is the real backend service running on the remote server

If the old `relaynews-api` Worker still exists in the Cloudflare dashboard, treat
it as a legacy leftover and remove it only after confirming `api.relaynew.ai` is
attached to `relaynews-api-edge`.

## One-Time Dashboard Setup

Do this once for `relaynews-web`, then repeat for `relaynews-admin`.

### Step 1: Open The Worker

- go to `Workers & Pages`
- open `relaynews-web` or `relaynews-admin`
- open `Settings`
- open `Builds`

### Step 2: Connect The Repository

- click `Connect repository`
- choose `GitHub`
- select the `relaynews` repository
- choose the production branch, usually `main`

### Step 3: Fill The Build Settings

#### `relaynews-web`

Use these values:

```txt
Root directory: apps/web
Build command: pnpm run cf:build
Deploy command: pnpm run cf:deploy
Non-production branch deploy command: pnpm run cf:preview
```

#### `relaynews-admin`

Use these values:

```txt
Root directory: apps/admin
Build command: pnpm run cf:build
Deploy command: pnpm run cf:deploy
Non-production branch deploy command: pnpm run cf:preview
```

These commands work because:

- each app has a local wrapper script in its own `package.json`
- the wrapper script jumps back to the workspace root
- the root scripts install dependencies and run the correct Wrangler command

## Build Variables

Add the same build variables to both Workers:

```txt
SKIP_DEPENDENCY_INSTALL=1
NODE_VERSION=22.16.0
PNPM_VERSION=10.33.0
VITE_API_BASE_URL=https://api.relaynew.ai
VITE_PUBLIC_SITE_URL=https://relaynew.ai
VITE_ADMIN_SITE_URL=https://admin.relaynew.ai
```

Notes:

- `SKIP_DEPENDENCY_INSTALL=1` avoids a default install in the app subdirectory,
  which is not what this pnpm workspace needs
- `VITE_*` values are build-time frontend values, not secrets
- if Cloudflare later changes the default Node or pnpm version, these variables
  keep the build image aligned with the repo

## Build Watch Paths

Set watch paths so each Worker rebuilds only when relevant files change.

### `relaynews-web`

Recommended include paths:

```txt
apps/web/*
packages/shared/*
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
```

### `relaynews-admin`

Recommended include paths:

```txt
apps/admin/*
packages/shared/*
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
```

## Post-Setup Verification

After saving the configuration:

1. trigger a manual build from the Cloudflare dashboard
2. confirm the build succeeds
3. confirm the Worker still owns the expected custom domain
4. push a tiny commit to a non-production branch and verify preview behavior
5. push or merge to `main` and verify production auto-deploy behavior

## Current Script Mapping

These are the scripts Cloudflare will call.

### Root `package.json`

```txt
cf:build:web
cf:deploy:web
cf:preview:web
cf:build:admin
cf:deploy:admin
cf:preview:admin
```

### App-Level Wrappers

```txt
apps/web/package.json -> cf:build / cf:deploy / cf:preview
apps/admin/package.json -> cf:build / cf:deploy / cf:preview
```

## Recommended Operating Model

- `relaynews-web` -> GitHub auto-deploy enabled
- `relaynews-admin` -> GitHub auto-deploy enabled
- `relaynews-api-edge` -> manual deploy for now
- `apps/api` on the remote server -> manual deploy through `./ops/manage.sh deploy`

This keeps the public and admin frontends fast to ship while preserving tighter
control over the API path.
