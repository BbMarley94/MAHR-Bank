/*
  # Add user ownership and update RLS policies

  1. Changes
    - Add `user_id` column to `characters` table to track ownership
    - Update RLS policies to enforce user ownership
  
  2. Security
    - Characters can only be created by authenticated users
    - Users can only read their own characters
    - Each character is linked to the user who created it
*/

-- Add user_id column
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all users to insert characters" ON characters;
DROP POLICY IF EXISTS "Allow all users to read characters" ON characters;

-- Create new policies that enforce user ownership
CREATE POLICY "Users can create their own characters"
ON characters
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own characters"
ON characters
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);