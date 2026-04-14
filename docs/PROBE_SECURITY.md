# Probe Security

This document defines the security model for the public self-check probe flow.

## Scope

The public probe flow lets a user supply a relay URL, API key, and model so the site can
run a tightly controlled connectivity and protocol check.

Because this feature causes server-side outbound requests to user-supplied destinations,
it must be treated as a high-risk surface.

## Dedicated Endpoint

The public probe flow must use a dedicated endpoint:

```txt
POST /public/probe/check
```

This endpoint is separate from all internal probe runners and internal write APIs.
It must not share a generic `/internal` surface or a scheduler ingestion path.

## Security Goals

- allow legitimate relay self-check requests
- prevent SSRF into private or cloud-internal networks
- prevent the endpoint from becoming a generic open proxy or scanner
- prevent accidental persistence of user-supplied secrets
- keep resource consumption bounded per request and per actor

## Request Boundary

The endpoint should accept only the minimum fields needed for a bounded probe.

Suggested request shape:
```json
{
  "baseUrl": "https://relay.example.ai/v1",
  "apiKey": "sk-...",
  "model": "openai-gpt-4.1"
}
```

Rules:
- accept only `https` targets in MVP
- normalize and validate the base URL before any DNS lookup
- do not allow arbitrary request methods, arbitrary paths, arbitrary headers, or
  arbitrary payload forwarding from the client
- use a fixed probe plan controlled by the server

## Allowed Probe Behavior

The public endpoint should run a fixed sequence only:
- optional lightweight model discovery check
- one non-stream chat completion check
- one stream check only if explicitly enabled later

The public endpoint must not:
- fetch arbitrary user-selected URLs beyond the normalized relay base
- proxy arbitrary request headers
- replay arbitrary request bodies
- follow arbitrary redirect chains without validation

## Network Controls

Before making any outbound request:
- resolve DNS on the server
- inspect every resolved IP
- block loopback, private RFC1918, link-local, multicast, unspecified, reserved,
  documentation, CGNAT, ULA, and cloud metadata ranges
- reject targets that resolve to localhost-equivalent addresses over IPv4 or IPv6

At minimum, deny these network classes:
- `127.0.0.0/8`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `169.254.0.0/16`
- `100.64.0.0/10`
- `0.0.0.0/8`
- `::1/128`
- `fc00::/7`
- `fe80::/10`
- metadata targets such as `169.254.169.254`

## Redirect Handling

- validate the initial URL before connecting
- if redirects are allowed at all, validate every redirect hop as a fresh target
- keep redirect depth very small, or disable redirects completely in MVP
- never allow a validated public hostname to redirect into a blocked IP range

## Resource Limits

Apply strict limits for the public probe endpoint.

Suggested MVP defaults:
- request timeout: 8 seconds hard cap
- connect timeout: 3 seconds
- response body cap: 256 KB
- max redirects: 0 or 1
- concurrent probe work per request: 1
- no background fan-out
- no retries for the public endpoint

Rate limits should exist at multiple layers:
- Cloudflare rate limiting by IP and zone policy
- application-side per-IP and per-user budget if identity exists
- optional Turnstile gating for anonymous usage

## Secret Handling

- never persist user-supplied API keys by default
- never write raw API keys into logs, traces, metrics, or error storage
- redact authorization headers before any structured logging
- if request debugging is needed, log only presence and length metadata, not values
- do not store full probe payloads for successful public probe requests

## Response Design

The public response should be diagnostic, but not leak secrets.

Suggested response shape:
```json
{
  "ok": true,
  "targetHost": "relay.example.ai",
  "model": "openai-gpt-4.1",
  "connectivity": {
    "ok": true,
    "latencyMs": 420
  },
  "protocol": {
    "ok": true,
    "healthStatus": "healthy"
  },
  "measuredAt": "2026-04-15T10:00:00Z"
}
```

Rules:
- do not echo the API key back to the client
- do not include raw upstream authorization headers in responses
- keep upstream error bodies truncated and sanitized

## Storage Policy

For the public endpoint:
- default behavior is no persistence of user-supplied API keys or raw request bodies
- aggregate anonymous abuse metrics may be stored
- failure reason categories may be stored without secrets
- if product requirements later call for saving a probe result, it must be explicit,
  opt-in, and pass secret redaction before storage

## Operational Guidance

- keep the public probe implementation isolated from internal scheduler code paths
- use separate route handlers, rate limits, and logging rules from platform-run probes
- add targeted tests for URL validation, DNS/IP classification, redirect handling,
  and log redaction
- review this document before exposing the route publicly

## Relationship To Other Docs

- route placement: `docs/ROUTES.md`
- system architecture: `docs/ARCHITECTURE.md`
- public content APIs: `docs/API_CONTRACT_V1.md`
- database schema: `docs/DATABASE_SCHEMA.md`
