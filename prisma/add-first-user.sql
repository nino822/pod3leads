-- First User Setup Script
-- Add your email here to create an initial invite

INSERT INTO Invite (id, email, name, invitedBy, createdAt)
VALUES (
  'initial-invite-1',
  'your-email@example.com',  -- CHANGE THIS TO YOUR EMAIL
  'Initial Admin',            -- CHANGE THIS TO YOUR NAME
  'initial-invite-1',         -- Self-reference for bootstrap
  datetime('now')
);

-- Verify the invite was created
SELECT * FROM Invite;
