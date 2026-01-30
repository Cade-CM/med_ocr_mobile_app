-- Migration: Make device_id NOT NULL in adherance_logs
-- Date: 2026-01-29
-- 
-- RATIONALE:
-- 1. device_id is used as the ownership column for RLS policies
-- 2. NULL values can cause RLS to behave unexpectedly (NULL != auth.uid()::text)
-- 3. Rows with NULL device_id may be orphaned or inaccessible
--
-- STEPS:
-- 1. Backfill any NULL device_id values (if any exist)
-- 2. Add NOT NULL constraint
-- 3. Add index for faster queries
-- 4. Verify RLS policies are correct
--
-- ============================================================================

BEGIN;

-- Step 1: Check for NULL device_id values and log count
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM adherance_logs WHERE device_id IS NULL;
  RAISE NOTICE 'Found % rows with NULL device_id', null_count;
END $$;

-- Step 2: Backfill NULL device_id values
-- Option A: Delete orphaned rows (if they have no owner, they're inaccessible anyway)
-- DELETE FROM adherance_logs WHERE device_id IS NULL;

-- Option B: Set to a sentinel value (not recommended - creates fake ownership)
-- UPDATE adherance_logs SET device_id = 'ORPHANED_' || id::text WHERE device_id IS NULL;

-- For safety, we'll delete orphaned rows since they're inaccessible via RLS anyway
DELETE FROM adherance_logs WHERE device_id IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE adherance_logs ALTER COLUMN device_id SET NOT NULL;

-- Step 4: Add index for device_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_adherance_logs_device_id ON adherance_logs(device_id);

-- Step 5: Verify RLS policy exists and is correct
-- Expected policy: device_id = auth.uid()::text
-- Run this manually to check:
-- SELECT * FROM pg_policies WHERE tablename = 'adherance_logs';

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed):
-- ALTER TABLE adherance_logs ALTER COLUMN device_id DROP NOT NULL;
-- ============================================================================

-- ============================================================================
-- FUTURE CONSIDERATION:
-- Rename device_id → user_key for consistency with other tables
-- This is a separate migration (see 20260129_adherance_logs_user_key.sql)
-- ============================================================================
