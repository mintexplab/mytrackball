-- Remove the old check constraint on plan_name
ALTER TABLE user_plans DROP CONSTRAINT IF EXISTS user_plans_plan_name_check;

-- Add updated check constraint with correct plan names
ALTER TABLE user_plans ADD CONSTRAINT user_plans_plan_name_check 
CHECK (plan_name IN ('Trackball Free', 'Trackball Lite', 'Trackball Signature', 'Trackball Prestige'));