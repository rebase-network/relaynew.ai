ALTER TABLE relays
  ADD COLUMN contact_info text;

ALTER TABLE submissions
  ADD COLUMN contact_info text;

CREATE TABLE submission_model_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  model_key text NOT NULL,
  input_price_per_1m numeric(18,6),
  output_price_per_1m numeric(18,6),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (input_price_per_1m IS NULL OR input_price_per_1m >= 0),
  CHECK (output_price_per_1m IS NULL OR output_price_per_1m >= 0),
  CHECK (input_price_per_1m IS NOT NULL OR output_price_per_1m IS NOT NULL)
);

CREATE INDEX submission_model_prices_submission_idx
  ON submission_model_prices (submission_id, position, created_at);

CREATE TRIGGER submission_model_prices_set_updated_at
BEFORE UPDATE ON submission_model_prices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
