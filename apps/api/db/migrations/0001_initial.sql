BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  base_url text NOT NULL,
  provider_name text,
  description text,
  website_url text,
  docs_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'retired', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  is_sponsored boolean NOT NULL DEFAULT false,
  region_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relays_status_idx ON relays (status);
CREATE INDEX relays_featured_idx ON relays (is_featured);

CREATE TABLE models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  vendor text NOT NULL,
  name text NOT NULL,
  family text NOT NULL,
  input_price_unit text,
  output_price_unit text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX models_vendor_idx ON models (vendor);
CREATE INDEX models_family_idx ON models (family);
CREATE INDEX models_active_idx ON models (is_active);

CREATE TABLE relay_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  remote_model_name text,
  supports_stream boolean NOT NULL DEFAULT true,
  supports_tools boolean NOT NULL DEFAULT false,
  supports_vision boolean NOT NULL DEFAULT false,
  supports_reasoning boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'unsupported', 'pending')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relay_id, model_id)
);

CREATE INDEX relay_models_model_idx ON relay_models (model_id);
CREATE INDEX relay_models_status_idx ON relay_models (status);

CREATE TABLE relay_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  input_price_per_1m numeric(18,6),
  output_price_per_1m numeric(18,6),
  cache_read_price_per_1m numeric(18,6),
  cache_write_price_per_1m numeric(18,6),
  effective_from timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scraped', 'detected', 'api')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (input_price_per_1m IS NULL OR input_price_per_1m >= 0),
  CHECK (output_price_per_1m IS NULL OR output_price_per_1m >= 0),
  CHECK (cache_read_price_per_1m IS NULL OR cache_read_price_per_1m >= 0),
  CHECK (cache_write_price_per_1m IS NULL OR cache_write_price_per_1m >= 0),
  CHECK (
    input_price_per_1m IS NOT NULL OR
    output_price_per_1m IS NOT NULL OR
    cache_read_price_per_1m IS NOT NULL OR
    cache_write_price_per_1m IS NOT NULL
  )
);

CREATE INDEX relay_prices_lookup_idx ON relay_prices (relay_id, model_id, effective_from DESC);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name text,
  submitter_email text,
  relay_name text NOT NULL,
  base_url text NOT NULL,
  website_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX submissions_status_idx ON submissions (status);
CREATE INDEX submissions_created_at_idx ON submissions (created_at DESC);

CREATE TABLE sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_id uuid REFERENCES relays(id) ON DELETE SET NULL,
  name text NOT NULL,
  placement text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX sponsors_status_idx ON sponsors (placement, status);
CREATE INDEX sponsors_window_idx ON sponsors (start_at, end_at);

CREATE TABLE probe_results_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probed_at timestamptz NOT NULL,
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_kind text NOT NULL,
  probe_region text NOT NULL DEFAULT 'global',
  target_host text NOT NULL,
  success boolean NOT NULL,
  http_status integer CHECK (http_status IS NULL OR (http_status >= 100 AND http_status <= 599)),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  ttfb_ms integer CHECK (ttfb_ms IS NULL OR ttfb_ms >= 0),
  dns_ms integer CHECK (dns_ms IS NULL OR dns_ms >= 0),
  tls_ms integer CHECK (tls_ms IS NULL OR tls_ms >= 0),
  request_tokens integer CHECK (request_tokens IS NULL OR request_tokens >= 0),
  response_tokens integer CHECK (response_tokens IS NULL OR response_tokens >= 0),
  error_code text,
  error_message text,
  protocol_consistency_score integer CHECK (
    protocol_consistency_score IS NULL OR
    (protocol_consistency_score >= 0 AND protocol_consistency_score <= 100)
  ),
  response_model_name text,
  sample_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX probe_results_raw_probed_at_idx ON probe_results_raw (probed_at DESC);
CREATE INDEX probe_results_raw_relay_idx ON probe_results_raw (relay_id, probed_at DESC);
CREATE INDEX probe_results_raw_relay_model_idx ON probe_results_raw (relay_id, model_id, probed_at DESC);
CREATE INDEX probe_results_raw_failures_idx ON probe_results_raw (probed_at DESC) WHERE success = false;

CREATE TABLE probe_error_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_result_id uuid NOT NULL UNIQUE REFERENCES probe_results_raw(id) ON DELETE CASCADE,
  sample_type text NOT NULL,
  request_headers_json jsonb,
  response_headers_json jsonb,
  response_body_json jsonb,
  stream_excerpt_text text,
  analysis_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX probe_error_samples_type_idx ON probe_error_samples (sample_type);

CREATE TABLE incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_region text NOT NULL DEFAULT 'global',
  severity text NOT NULL CHECK (severity IN ('degraded', 'down', 'paused', 'unknown')),
  title text NOT NULL,
  summary text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  detected_from_bucket timestamptz,
  resolved_from_bucket timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX incident_events_relay_idx ON incident_events (relay_id, started_at DESC);
CREATE INDEX incident_events_region_idx ON incident_events (probe_region, started_at DESC);

CREATE TABLE relay_status_5m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_start timestamptz NOT NULL,
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_region text NOT NULL DEFAULT 'global',
  sample_count integer NOT NULL CHECK (sample_count >= 0),
  success_count integer NOT NULL CHECK (success_count >= 0),
  failure_count integer NOT NULL CHECK (failure_count >= 0),
  availability_ratio numeric(8,5) NOT NULL CHECK (availability_ratio >= 0 AND availability_ratio <= 1),
  error_rate_ratio numeric(8,5) NOT NULL CHECK (error_rate_ratio >= 0 AND error_rate_ratio <= 1),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  CHECK (success_count + failure_count = sample_count)
);

CREATE UNIQUE INDEX relay_status_5m_bucket_uq
  ON relay_status_5m (
    bucket_start,
    relay_id,
    COALESCE(model_id, '00000000-0000-0000-0000-000000000000'::uuid),
    probe_region
  );
CREATE INDEX relay_status_5m_relay_idx ON relay_status_5m (relay_id, bucket_start DESC);
CREATE INDEX relay_status_5m_model_idx ON relay_status_5m (model_id, bucket_start DESC);

CREATE TABLE relay_latency_5m (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_start timestamptz NOT NULL,
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_region text NOT NULL DEFAULT 'global',
  sample_count integer NOT NULL CHECK (sample_count >= 0),
  latency_p50_ms integer CHECK (latency_p50_ms IS NULL OR latency_p50_ms >= 0),
  latency_p95_ms integer CHECK (latency_p95_ms IS NULL OR latency_p95_ms >= 0),
  latency_p99_ms integer CHECK (latency_p99_ms IS NULL OR latency_p99_ms >= 0),
  ttfb_p50_ms integer CHECK (ttfb_p50_ms IS NULL OR ttfb_p50_ms >= 0),
  ttfb_p95_ms integer CHECK (ttfb_p95_ms IS NULL OR ttfb_p95_ms >= 0)
);

CREATE UNIQUE INDEX relay_latency_5m_bucket_uq
  ON relay_latency_5m (
    bucket_start,
    relay_id,
    COALESCE(model_id, '00000000-0000-0000-0000-000000000000'::uuid),
    probe_region
  );
CREATE INDEX relay_latency_5m_relay_idx ON relay_latency_5m (relay_id, bucket_start DESC);
CREATE INDEX relay_latency_5m_model_idx ON relay_latency_5m (model_id, bucket_start DESC);

CREATE TABLE relay_score_hourly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_start timestamptz NOT NULL,
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_region text NOT NULL DEFAULT 'global',
  availability_score numeric(8,4) NOT NULL CHECK (availability_score >= 0 AND availability_score <= 100),
  latency_score numeric(8,4) NOT NULL CHECK (latency_score >= 0 AND latency_score <= 100),
  consistency_score numeric(8,4) NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 100),
  value_score numeric(8,4) NOT NULL CHECK (value_score >= 0 AND value_score <= 100),
  stability_score numeric(8,4) NOT NULL CHECK (stability_score >= 0 AND stability_score <= 100),
  total_score numeric(8,4) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  sample_count integer NOT NULL CHECK (sample_count >= 0),
  status_label text NOT NULL
);

CREATE UNIQUE INDEX relay_score_hourly_bucket_uq
  ON relay_score_hourly (
    bucket_start,
    relay_id,
    COALESCE(model_id, '00000000-0000-0000-0000-000000000000'::uuid),
    probe_region
  );
CREATE INDEX relay_score_hourly_model_score_idx ON relay_score_hourly (model_id, bucket_start DESC, total_score DESC);
CREATE INDEX relay_score_hourly_relay_idx ON relay_score_hourly (relay_id, bucket_start DESC);

CREATE TABLE leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key text NOT NULL,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  probe_region text NOT NULL DEFAULT 'global',
  relay_id uuid NOT NULL REFERENCES relays(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank > 0),
  total_score numeric(8,4) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  availability_24h numeric(8,5) NOT NULL CHECK (availability_24h >= 0 AND availability_24h <= 1),
  latency_p50_ms integer CHECK (latency_p50_ms IS NULL OR latency_p50_ms >= 0),
  latency_p95_ms integer CHECK (latency_p95_ms IS NULL OR latency_p95_ms >= 0),
  input_price_per_1m numeric(18,6) CHECK (input_price_per_1m IS NULL OR input_price_per_1m >= 0),
  output_price_per_1m numeric(18,6) CHECK (output_price_per_1m IS NULL OR output_price_per_1m >= 0),
  sample_count_24h integer NOT NULL CHECK (sample_count_24h >= 0),
  status_label text NOT NULL,
  badges_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  measured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_key, rank),
  UNIQUE (snapshot_key, relay_id)
);

CREATE INDEX leaderboard_snapshots_lookup_idx ON leaderboard_snapshots (snapshot_key, rank);
CREATE INDEX leaderboard_snapshots_model_idx ON leaderboard_snapshots (model_id, probe_region, measured_at DESC);

CREATE TABLE relay_overview_snapshots (
  relay_id uuid PRIMARY KEY REFERENCES relays(id) ON DELETE CASCADE,
  status_label text NOT NULL,
  availability_24h numeric(8,5) NOT NULL CHECK (availability_24h >= 0 AND availability_24h <= 1),
  latency_p50_ms integer CHECK (latency_p50_ms IS NULL OR latency_p50_ms >= 0),
  latency_p95_ms integer CHECK (latency_p95_ms IS NULL OR latency_p95_ms >= 0),
  incidents_7d integer NOT NULL DEFAULT 0 CHECK (incidents_7d >= 0),
  supported_models_count integer NOT NULL DEFAULT 0 CHECK (supported_models_count >= 0),
  starting_input_price_per_1m numeric(18,6) CHECK (starting_input_price_per_1m IS NULL OR starting_input_price_per_1m >= 0),
  starting_output_price_per_1m numeric(18,6) CHECK (starting_output_price_per_1m IS NULL OR starting_output_price_per_1m >= 0),
  score_summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  badges_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  measured_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relay_overview_snapshots_measured_idx ON relay_overview_snapshots (measured_at DESC);

CREATE TABLE home_summary_snapshots (
  summary_key text PRIMARY KEY,
  payload_json jsonb NOT NULL,
  measured_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX home_summary_snapshots_measured_idx ON home_summary_snapshots (measured_at DESC);

CREATE TRIGGER relays_set_updated_at
BEFORE UPDATE ON relays
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER models_set_updated_at
BEFORE UPDATE ON models
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER relay_models_set_updated_at
BEFORE UPDATE ON relay_models
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER submissions_set_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sponsors_set_updated_at
BEFORE UPDATE ON sponsors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER incident_events_set_updated_at
BEFORE UPDATE ON incident_events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER relay_overview_snapshots_set_updated_at
BEFORE UPDATE ON relay_overview_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER home_summary_snapshots_set_updated_at
BEFORE UPDATE ON home_summary_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
