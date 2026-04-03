-- Migration 017: Rename quote status values
-- accepted → approved, declined → rejected
-- Matches user-facing terminology in the UI

-- Step 1: Drop the old CHECK constraint on quotes.status
alter table quotes drop constraint if exists quotes_status_check;

-- Step 2: Migrate existing data
update quotes set status = 'approved' where status = 'accepted';
update quotes set status = 'rejected' where status = 'declined';

-- Step 3: Add updated CHECK constraint
alter table quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'approved', 'rejected', 'expired'));

-- Update comment
comment on column quotes.status is 'draft → sent → approved/rejected, expired when valid_until passes';
