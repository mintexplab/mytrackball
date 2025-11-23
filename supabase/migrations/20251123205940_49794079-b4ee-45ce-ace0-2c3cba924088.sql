-- Add category field to support_tickets table
ALTER TABLE support_tickets ADD COLUMN category text DEFAULT 'general';

-- Add a comment explaining the category field
COMMENT ON COLUMN support_tickets.category IS 'Category of the support ticket (general, technical, billing, account, content)';
