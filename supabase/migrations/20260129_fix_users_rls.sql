-- Migration: Fix RLS policies for users and user_profiles tables
-- 
-- Issue: New users cannot INSERT into users/user_profiles tables after signup
-- because RLS policies may be missing or incorrectly configured.
--
-- The key is that INSERT policies need WITH CHECK (user_key = auth.uid()::text)
-- Note: auth.uid() returns UUID, user_key is TEXT, so we must cast with ::text

-- ============================================================================
-- users table
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can delete own data" ON users;

-- SELECT: Users can only see their own row
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (user_key = auth.uid()::text);

-- INSERT: Users can only insert with their own user_key
-- This is critical for signup flow!
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (user_key = auth.uid()::text);

-- UPDATE: Users can only update their own row
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (user_key = auth.uid()::text)
  WITH CHECK (user_key = auth.uid()::text);

-- DELETE: Users can only delete their own row
CREATE POLICY "Users can delete own data" ON users
  FOR DELETE USING (user_key = auth.uid()::text);

-- ============================================================================
-- user_profiles table
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- SELECT: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_key = auth.uid()::text);

-- INSERT: Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_key = auth.uid()::text);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_key = auth.uid()::text)
  WITH CHECK (user_key = auth.uid()::text);

-- DELETE: Users can only delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (user_key = auth.uid()::text);

-- ============================================================================
-- Verify setup
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify:
-- 
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('users', 'user_profiles');
