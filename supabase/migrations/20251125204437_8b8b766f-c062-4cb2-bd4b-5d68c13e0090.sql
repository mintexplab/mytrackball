-- Add royalty split percentage column to artist_invitations
ALTER TABLE artist_invitations
ADD COLUMN royalty_split_percentage numeric CHECK (royalty_split_percentage >= 0 AND royalty_split_percentage <= 100);