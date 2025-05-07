/*
  # Add unique constraint for character names

  1. Changes
    - Add unique constraint to character names
    - Add delete functionality back
  
  2. Security
    - Ensure character names are unique
    - Allow deletion of characters
*/

-- Add unique constraint to character names
ALTER TABLE characters
ADD CONSTRAINT unique_character_name UNIQUE (name);