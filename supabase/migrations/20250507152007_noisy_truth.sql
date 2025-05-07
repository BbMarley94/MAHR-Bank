/*
  # Update characters table RLS policies

  1. Changes
    - Update the INSERT policy to ensure user_id is set correctly
    - Keep existing SELECT policy unchanged

  2. Security
    - Maintains RLS enabled on characters table
    - Ensures users can only create characters linked to their own user_id
    - Preserves existing read access control
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can create their own characters" ON characters;

-- Create new insert policy that ensures user_id is set to the authenticated user's ID
CREATE POLICY "Users can create their own characters"
ON characters
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure the user_id matches the authenticated user's ID
  user_id = auth.uid()
);