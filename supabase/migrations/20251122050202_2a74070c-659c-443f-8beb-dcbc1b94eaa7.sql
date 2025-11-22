-- Add maintenance_type column to maintenance_settings
ALTER TABLE maintenance_settings 
ADD COLUMN maintenance_type text NOT NULL DEFAULT 'regular';

-- Add check constraint for maintenance types
ALTER TABLE maintenance_settings 
ADD CONSTRAINT maintenance_type_check 
CHECK (maintenance_type IN ('regular', 'security'));