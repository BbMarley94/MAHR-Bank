/*
  # Fix character deletion and RLS policies

  1. Changes
    - Drop public delete policy
    - Add authenticated user delete policy
    - Ensure cascade delete for transactions
  
  2. Security
    - Only allow authenticated users to delete their own characters
    - Maintain cascade deletion for related transactions
*/

-- Drop the public delete policy
DROP POLICY IF EXISTS "Allow public to delete characters" ON characters;

-- Add authenticated user delete policy
CREATE POLICY "Users can delete own characters"
ON characters
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure cascade delete constraints are properly set
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_from_character_id_fkey,
DROP CONSTRAINT IF EXISTS transactions_to_character_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_from_character_id_fkey
  FOREIGN KEY (from_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE,
ADD CONSTRAINT transactions_to_character_id_fkey
  FOREIGN KEY (to_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;