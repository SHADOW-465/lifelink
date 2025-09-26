-- Create Rotaract clubs table
CREATE TABLE IF NOT EXISTS rotaract_clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  president_name VARCHAR(255) NOT NULL,
  president_contact VARCHAR(50) NOT NULL,
  president_email VARCHAR(255) NOT NULL,
  member_count INTEGER DEFAULT 0,
  total_donations INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  website_url VARCHAR(500),
  meeting_schedule VARCHAR(255),
  logo_url VARCHAR(500),
  registered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create club members table
CREATE TABLE IF NOT EXISTS club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES rotaract_clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(club_id, user_id)
);

-- Create donation campaigns table
CREATE TABLE IF NOT EXISTS donation_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES rotaract_clubs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_donations INTEGER DEFAULT 0,
  current_donations INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rotaract_clubs_district ON rotaract_clubs(district);
CREATE INDEX IF NOT EXISTS idx_rotaract_clubs_location ON rotaract_clubs(location);
CREATE INDEX IF NOT EXISTS idx_rotaract_clubs_verified ON rotaract_clubs(is_verified);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_donation_campaigns_club_id ON donation_campaigns(club_id);
CREATE INDEX IF NOT EXISTS idx_donation_campaigns_status ON donation_campaigns(status);

-- Enable RLS
ALTER TABLE rotaract_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rotaract_clubs
CREATE POLICY "Anyone can view clubs" ON rotaract_clubs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create clubs" ON rotaract_clubs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Club registrants and admins can update clubs" ON rotaract_clubs
  FOR UPDATE USING (
    auth.uid() = registered_by OR 
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- RLS Policies for club_members
CREATE POLICY "Anyone can view active club members" ON club_members
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can manage their own membership" ON club_members
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Club presidents can manage members" ON club_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT registered_by FROM rotaract_clubs WHERE id = club_id
    )
  );

-- RLS Policies for donation_campaigns
CREATE POLICY "Anyone can view campaigns" ON donation_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Club members can create campaigns" ON donation_campaigns
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM club_members 
      WHERE club_id = donation_campaigns.club_id AND is_active = TRUE
    )
  );

CREATE POLICY "Campaign creators and club presidents can update campaigns" ON donation_campaigns
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT registered_by FROM rotaract_clubs WHERE id = club_id
    )
  );

-- Function to update club member count
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
    UPDATE rotaract_clubs 
    SET member_count = member_count + 1 
    WHERE id = NEW.club_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
      UPDATE rotaract_clubs 
      SET member_count = member_count + 1 
      WHERE id = NEW.club_id;
    ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
      UPDATE rotaract_clubs 
      SET member_count = member_count - 1 
      WHERE id = NEW.club_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = TRUE THEN
    UPDATE rotaract_clubs 
    SET member_count = member_count - 1 
    WHERE id = OLD.club_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member count updates
DROP TRIGGER IF EXISTS trigger_update_club_member_count ON club_members;
CREATE TRIGGER trigger_update_club_member_count
  AFTER INSERT OR UPDATE OR DELETE ON club_members
  FOR EACH ROW EXECUTE FUNCTION update_club_member_count();
