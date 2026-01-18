-- Create location_pricing table for dynamic pricing based on weeks
CREATE TABLE IF NOT EXISTS location_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  week_from INTEGER NOT NULL,
  week_to INTEGER NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  model_type VARCHAR(50), -- NULL for all models, or 'Small', 'Medium', 'Large', 'XLarge'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_week_range CHECK (week_to >= week_from),
  CONSTRAINT unique_location_week_model UNIQUE (location_id, week_from, week_to, model_type)
);

CREATE INDEX idx_location_pricing_location ON location_pricing(location_id);
CREATE INDEX idx_location_pricing_weeks ON location_pricing(week_from, week_to);
