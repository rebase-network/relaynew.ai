ALTER TABLE relay_models
  ADD COLUMN monitoring_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN monitoring_priority integer NOT NULL DEFAULT 100 CHECK (monitoring_priority >= 0),
  ADD COLUMN compatibility_mode_override text CHECK (
    compatibility_mode_override IS NULL OR
    compatibility_mode_override IN (
      'auto',
      'openai-responses',
      'openai-chat-completions',
      'anthropic-messages',
      'google-gemini-generate-content'
    )
  ),
  ADD COLUMN last_compatibility_mode text CHECK (
    last_compatibility_mode IS NULL OR
    last_compatibility_mode IN (
      'openai-responses',
      'openai-chat-completions',
      'anthropic-messages',
      'google-gemini-generate-content'
    )
  ),
  ADD COLUMN last_probe_ok boolean,
  ADD COLUMN last_health_status text CHECK (
    last_health_status IS NULL OR
    last_health_status IN ('healthy', 'degraded', 'down', 'paused', 'unknown')
  ),
  ADD COLUMN last_http_status integer CHECK (
    last_http_status IS NULL OR
    (last_http_status >= 100 AND last_http_status <= 599)
  ),
  ADD COLUMN last_message text,
  ADD COLUMN last_detection_mode text CHECK (
    last_detection_mode IS NULL OR
    last_detection_mode IN ('auto', 'manual')
  ),
  ADD COLUMN last_used_url text,
  ADD COLUMN consecutive_failure_count integer NOT NULL DEFAULT 0 CHECK (consecutive_failure_count >= 0);

CREATE INDEX relay_models_monitoring_idx
  ON relay_models (relay_id, monitoring_enabled, monitoring_priority, status);
