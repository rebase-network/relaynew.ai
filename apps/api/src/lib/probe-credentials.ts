import type { PublicProbeResponse, SubmissionProbeSummary } from "@relaynews/shared";

export function maskApiKey(apiKey: string) {
  const trimmed = apiKey.trim();

  if (trimmed.length <= 8) {
    return "••••••";
  }

  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function toSubmissionProbeSummary(result: PublicProbeResponse): SubmissionProbeSummary {
  return {
    ok: result.ok,
    healthStatus: result.protocol.healthStatus,
    httpStatus: result.protocol.httpStatus ?? null,
    message: result.message ?? null,
    verifiedAt: result.measuredAt,
    compatibilityMode: result.compatibilityMode ?? null,
    detectionMode: result.detectionMode,
  };
}

export function toProbeCredentialVerification(result: PublicProbeResponse) {
  return {
    last_verified_at: result.measuredAt,
    last_probe_ok: result.ok,
    last_health_status: result.protocol.healthStatus,
    last_http_status: result.protocol.httpStatus ?? null,
    last_message: result.message ?? null,
    last_detection_mode: result.detectionMode ?? null,
    last_used_url: result.usedUrl ?? null,
  };
}
