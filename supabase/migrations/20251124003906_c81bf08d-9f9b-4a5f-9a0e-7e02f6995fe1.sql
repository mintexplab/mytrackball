-- Drop the old check constraint first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_label_type_check;

-- Update existing records to use new naming format
UPDATE profiles SET label_type = 'Label Partner' WHERE label_type = 'partner_label';
UPDATE profiles SET label_type = 'Label Signature' WHERE label_type = 'signature_label';
UPDATE profiles SET label_type = 'Label Prestige' WHERE label_type = 'prestige_label';
UPDATE profiles SET label_type = 'Label Free' WHERE label_type = 'label_free';
UPDATE profiles SET label_type = 'Label Lite' WHERE label_type = 'label_lite';

-- Add new check constraint with updated label type values (including NULL for no designation)
ALTER TABLE profiles ADD CONSTRAINT profiles_label_type_check 
CHECK (label_type IS NULL OR label_type IN ('Label Partner', 'Label Signature', 'Label Prestige', 'Label Free', 'Label Lite'));