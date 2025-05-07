/*
  # Add admin user and authentication

  1. Changes
    - Create admin user in auth.users
    - Set up admin credentials
  
  2. Security
    - Create admin user with hashed password
    - Maintain existing security policies
*/

-- Create admin user if it doesn't exist
DO $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin',
    crypt('admin', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;
END $$;