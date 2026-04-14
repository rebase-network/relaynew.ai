# Ops Guide

This directory contains the first deployment management tools for the remote origin
service.

## Default Remote Target

- SSH target: `rebase@rebase.network`
- Default app root: `/home/rebase/apps/relaynews-origin`
- Default systemd service: `relaynews-origin`

## Files

- `ops/manage.sh` - deployment and remote operations helper
- `ops/origin.env.example` - production environment template for origin
- `ops/systemd/relaynews-origin.service.example` - example systemd unit

## Typical Flow

1. Copy `ops/origin.env.example` to the remote server as the real environment file.
2. Run `./ops/manage.sh bootstrap` once to create directories and install the
   systemd unit.
3. Run `./ops/manage.sh deploy` to sync the repo, install dependencies, build,
   migrate, and restart the service.
4. Use `./ops/manage.sh status`, `./ops/manage.sh logs`, and
   `./ops/manage.sh health` for ongoing operations.

## Notes

- `deploy` is focused on `apps/origin` only. It does not publish `web` or `admin`
  to Cloudflare.
- The remote host should already have Node.js, `pnpm`, PostgreSQL access, `sudo`,
  and `rsync` available.
