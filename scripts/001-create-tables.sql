-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  hours VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  services JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_buildings_category ON buildings(category);

-- Create index on name for faster searching
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
