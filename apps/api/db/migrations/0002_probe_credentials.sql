ALTER TABLE submissions
  ADD COLUMN approved_relay_id uuid REFERENCES relays(id) ON DELETE SET NULL;

CREATE TABLE probe_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE,
  relay_id uuid REFERENCES relays(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  test_model text NOT NULL,
  compatibility_mode text NOT NULL DEFAULT 'auto' CHECK (
    compatibility_mode IN ('auto', 'openai-responses', 'openai-chat-completions', 'anthropic-messages')
  ),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'revoked')),
  last_verified_at timestamptz,
  last_probe_ok boolean,
  last_health_status text CHECK (
    last_health_status IS NULL OR
    last_health_status IN ('healthy', 'degraded', 'down', 'paused', 'unknown')
  ),
  last_http_status integer CHECK (last_http_status IS NULL OR (last_http_status >= 100 AND last_http_status <= 599)),
  last_message text,
  last_detection_mode text CHECK (
    last_detection_mode IS NULL OR
    last_detection_mode IN ('auto', 'manual')
  ),
  last_used_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(submission_id, relay_id) = 1)
);

CREATE UNIQUE INDEX probe_credentials_active_submission_idx
  ON probe_credentials (submission_id)
  WHERE submission_id IS NOT NULL AND status = 'active';

CREATE UNIQUE INDEX probe_credentials_active_relay_idx
  ON probe_credentials (relay_id)
  WHERE relay_id IS NOT NULL AND status = 'active';

CREATE INDEX probe_credentials_submission_lookup_idx
  ON probe_credentials (submission_id, created_at DESC)
  WHERE submission_id IS NOT NULL;

CREATE INDEX probe_credentials_relay_lookup_idx
  ON probe_credentials (relay_id, created_at DESC)
  WHERE relay_id IS NOT NULL;

CREATE TRIGGER probe_credentials_set_updated_at
BEFORE UPDATE ON probe_credentials
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
