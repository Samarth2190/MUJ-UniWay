-- Add latitude and longitude columns for real GPS coordinates
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Update existing buildings with sample GPS coordinates (UC Berkeley area)
UPDATE buildings SET 
  lat = 37.8719 + (y - 225) * 0.0001,
  lng = -122.2585 + (x - 300) * 0.0001
WHERE lat IS NULL OR lng IS NULL;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_buildings_location ON buildings(lat, lng);
