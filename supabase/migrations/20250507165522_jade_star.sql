/*
  # Fix cascade delete for characters and transactions

  1. Changes
    - Drop existing foreign key constraints
    - Recreate foreign key constraints with CASCADE DELETE
  
  2. Security
    - Maintain existing security policies
    - Ensure proper cascade deletion of related transactions
*/

-- Drop existing foreign key constraints
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_from_character_id_fkey,
DROP CONSTRAINT IF EXISTS transactions_to_character_id_fkey;

-- Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE transactions
ADD CONSTRAINT transactions_from_character_id_fkey
  FOREIGN KEY (from_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE,
ADD CONSTRAINT transactions_to_character_id_fkey
  FOREIGN KEY (to_character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;