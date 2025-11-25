-- Add plan/designation fields to artist_invitations table
ALTER TABLE artist_invitations
ADD COLUMN assigned_plan_type TEXT CHECK (assigned_plan_type IN ('artist_plan', 'label_designation')),
ADD COLUMN assigned_plan_name TEXT,
ADD COLUMN plan_features JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the fields
COMMENT ON COLUMN artist_invitations.assigned_plan_type IS 'Type of assignment: artist_plan or label_designation';
COMMENT ON COLUMN artist_invitations.assigned_plan_name IS 'Name of the plan/designation being assigned';
COMMENT ON COLUMN artist_invitations.plan_features IS 'Array of features/services included in the plan';