/*
  # Create characters and transactions tables

  1. New Tables
    - `characters`
      - `id` (uuid, primary key)
      - `name` (text)
      - `balance` (numeric)
      - `created_at` (timestamp)
    - `transactions`
      - `id` (uuid, primary key)
      - `from_character_id` (uuid, foreign key)
      - `to_character_id` (uuid, foreign key)
      - `amount` (numeric)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read and write
*/

-- Create characters table
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_character_id uuid REFERENCES characters(id),
  to_character_id uuid REFERENCES characters(id),
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all users to read characters"
  ON characters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all users to insert characters"
  ON characters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all users to read transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all users to insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);