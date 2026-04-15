# Database

This directory holds PostgreSQL schema migrations for the backend API service.

## Apply the initial schema

```bash
psql "$DATABASE_URL" -f apps/api/db/migrations/0001_initial.sql
```

## What the initial migration includes

- core catalog tables for relays, models, prices, submissions, and sponsors
- raw probe storage with selective detailed error samples
- incident event storage for relay timelines
- 5-minute and hourly aggregation tables
- snapshot tables used by public pages
- `updated_at` triggers for mutable tables

## Notes

- The migration expects PostgreSQL with the `pgcrypto` extension available.
- Raw probe rows are intended to be deleted after 7 days by a scheduled cleanup job.
- Snapshot tables are designed as current materialized rows. Rebuild jobs should replace
  rows for a given key instead of appending unlimited history.
