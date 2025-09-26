-- Blood Donation Platform Database Schema
-- This script creates all the necessary tables for the platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
  user_type TEXT CHECK (user_type IN ('donor', 'recipient', 'both')) NOT NULL,
  location_city TEXT,
  location_state TEXT,
  location_country TEXT DEFAULT 'India',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  last_donation_date DATE,
  medical_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rotaract clubs table
CREATE TABLE IF NOT EXISTS public.rotaract_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  district TEXT NOT NULL, -- RID 3233 or 3234
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  president_name TEXT,
  president_email TEXT,
  president_phone TEXT,
  meeting_day TEXT,
  meeting_time TIME,
  meeting_location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Club members table
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.rotaract_clubs(id) ON DELETE CASCADE,
  position TEXT DEFAULT 'member', -- member, secretary, president, etc.
  joined_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  service_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

-- Blood requests table
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
  units_needed INTEGER NOT NULL DEFAULT 1,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  hospital_name TEXT NOT NULL,
  hospital_address TEXT NOT NULL,
  hospital_phone TEXT,
  required_by_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  is_fulfilled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donation responses table
CREATE TABLE IF NOT EXISTS public.donation_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')) DEFAULT 'pending',
  response_message TEXT,
  donation_date TIMESTAMP WITH TIME ZONE,
  otp_code TEXT,
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, donor_id)
);

-- Messages table for real-time communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'system', 'otp')) DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood drive events table
CREATE TABLE IF NOT EXISTS public.blood_drive_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES public.rotaract_clubs(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  target_donors INTEGER DEFAULT 50,
  registered_donors INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.blood_drive_events(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attendance_status TEXT CHECK (attendance_status IN ('registered', 'attended', 'no_show')) DEFAULT 'registered',
  donation_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(event_id, donor_id)
);

-- Donation history table
CREATE TABLE IF NOT EXISTS public.donation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id),
  request_id UUID REFERENCES public.blood_requests(id),
  event_id UUID REFERENCES public.blood_drive_events(id),
  donation_date DATE NOT NULL,
  blood_type TEXT NOT NULL,
  units_donated INTEGER DEFAULT 1,
  hospital_name TEXT,
  donation_type TEXT CHECK (donation_type IN ('emergency', 'scheduled', 'event')) DEFAULT 'emergency',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotaract_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_drive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view other verified profiles" ON public.profiles
  FOR SELECT USING (is_verified = true);

-- RLS Policies for blood_requests
CREATE POLICY "Users can view active blood requests" ON public.blood_requests
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own requests" ON public.blood_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests" ON public.blood_requests
  FOR UPDATE USING (auth.uid() = requester_id);

-- RLS Policies for donation_responses
CREATE POLICY "Users can view responses to their requests" ON public.donation_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blood_requests 
      WHERE id = request_id AND requester_id = auth.uid()
    )
  );

CREATE POLICY "Donors can view their own responses" ON public.donation_responses
  FOR SELECT USING (auth.uid() = donor_id);

CREATE POLICY "Donors can create responses" ON public.donation_responses
  FOR INSERT WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Donors can update their own responses" ON public.donation_responses
  FOR UPDATE USING (auth.uid() = donor_id);

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for rotaract_clubs
CREATE POLICY "Anyone can view active clubs" ON public.rotaract_clubs
  FOR SELECT USING (is_active = true);

-- RLS Policies for club_members
CREATE POLICY "Users can view their own memberships" ON public.club_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join clubs" ON public.club_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for blood_drive_events
CREATE POLICY "Anyone can view active events" ON public.blood_drive_events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Club members can create events" ON public.blood_drive_events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

-- RLS Policies for event_registrations
CREATE POLICY "Users can view their own registrations" ON public.event_registrations
  FOR SELECT USING (auth.uid() = donor_id);

CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT WITH CHECK (auth.uid() = donor_id);

-- RLS Policies for donation_history
CREATE POLICY "Users can view their own donation history" ON public.donation_history
  FOR SELECT USING (auth.uid() = donor_id OR auth.uid() = recipient_id);

CREATE POLICY "System can insert donation records" ON public.donation_history
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_blood_type ON public.profiles(blood_type);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_type ON public.blood_requests(blood_type);
CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency ON public.blood_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_blood_requests_active ON public.blood_requests(is_active);
CREATE INDEX IF NOT EXISTS idx_donation_responses_request ON public.donation_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON public.messages(request_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_donor ON public.donation_history(donor_id);
