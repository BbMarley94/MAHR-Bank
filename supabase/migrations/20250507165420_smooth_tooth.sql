/*
  # Add delete functionality for characters

  1. Changes
    - Add policy to allow deleting characters
    - Add cascade delete for related transactions
  
  2. Security
    - Allow public deletion of characters
    - Automatically delete related transactions
*/

-- Add cascade delete to transactions table
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_from_character_id_fkey,
DROP CONSTRAINT IF EXISTS transactions_to_character_id_fkey,
ADD CONSTRAINT transactions_from_character_id_fkey
  FOREIGN KEY (from_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE,
ADD CONSTRAINT transactions_to_character_id_fkey
  FOREIGN KEY (to_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;

-- Add delete policy for characters
CREATE POLICY "Allow public to delete characters"
ON characters
FOR DELETE
TO public
USING (true);