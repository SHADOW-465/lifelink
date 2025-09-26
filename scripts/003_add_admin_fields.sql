-- Add admin and flagging fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_flagged ON profiles(is_flagged);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- Update RLS policies to allow admins to manage users
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update user status" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = TRUE
    )
  );
