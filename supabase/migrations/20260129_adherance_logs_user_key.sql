-- Migration: Rename device_id to user_key in adherance_logs for consistent ownership model
-- Date: 2026-01-29
-- Status: OPTIONAL - Code currently works with device_id
-- 
-- Current State:
--   - adherance_logs uses device_id column (stores auth.uid()::text)
--   - All other tables use user_key for ownership
--   - RLS policy should use: device_id = auth.uid()::text
--
-- Problem: 
--   - Inconsistent naming: device_id sounds like hardware ID but stores user ID
--   - Confusing for developers
--   - device_id is nullable in schema which could break RLS
--
-- Options:
--   A) Keep device_id - code already updated to use it (CURRENT STATE)
--   B) Rename to user_key for consistency (THIS MIGRATION)
--
-- If you choose Option B, run this migration:

-- Step 1: Add user_key column (nullable initially for migration)
ALTER TABLE adherance_logs 
ADD COLUMN IF NOT EXISTS user_key TEXT;

-- Step 2: Backfill user_key from device_id
UPDATE adherance_logs 
SET user_key = device_id 
WHERE user_key IS NULL 
  AND device_id IS NOT NULL;

-- Step 3: Set default for new inserts
ALTER TABLE adherance_logs 
ALTER COLUMN user_key SET DEFAULT auth.uid()::text;

-- Step 4: Make NOT NULL after backfill (verify first: SELECT COUNT(*) FROM adherance_logs WHERE user_key IS NULL)
-- ALTER TABLE adherance_logs ALTER COLUMN user_key SET NOT NULL;

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own adherance_logs" ON adherance_logs;
DROP POLICY IF EXISTS "Users can insert own adherance_logs" ON adherance_logs;
DROP POLICY IF EXISTS "Users can update own adherance_logs" ON adherance_logs;
DROP POLICY IF EXISTS "Users can delete own adherance_logs" ON adherance_logs;

-- Step 6: Create new RLS policies using user_key
CREATE POLICY "Users can view own adherance_logs" ON adherance_logs
  FOR SELECT USING (user_key = auth.uid()::text);

CREATE POLICY "Users can insert own adherance_logs" ON adherance_logs
  FOR INSERT WITH CHECK (user_key = auth.uid()::text);

CREATE POLICY "Users can update own adherance_logs" ON adherance_logs
  FOR UPDATE USING (user_key = auth.uid()::text) 
  WITH CHECK (user_key = auth.uid()::text);

CREATE POLICY "Users can delete own adherance_logs" ON adherance_logs
  FOR DELETE USING (user_key = auth.uid()::text);

-- Step 7: Ensure RLS is enabled
ALTER TABLE adherance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherance_logs FORCE ROW LEVEL SECURITY;

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_adherance_logs_user_key ON adherance_logs(user_key);

-- Step 9: After verifying everything works, drop device_id:
-- ALTER TABLE adherance_logs DROP COLUMN device_id;

-- AFTER RUNNING THIS MIGRATION:
-- Update AccountDeletionService.ts to use user_key instead of device_id
-- Search for: .eq('device_id', userKey)
-- Replace with: .eq('user_key', userKey)
