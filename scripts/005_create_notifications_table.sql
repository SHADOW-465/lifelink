-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'system',
  p_action_url VARCHAR(500) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification when blood request is created
CREATE OR REPLACE FUNCTION notify_blood_request_created()
RETURNS TRIGGER AS $$
DECLARE
  donor_record RECORD;
BEGIN
  -- Notify compatible donors
  FOR donor_record IN 
    SELECT p.id, p.full_name
    FROM profiles p
    WHERE p.user_type = 'donor' 
    AND p.is_available = TRUE
    AND p.blood_type IN (
      CASE NEW.blood_type
        WHEN 'A+' THEN ARRAY['A+', 'A-', 'O+', 'O-']
        WHEN 'A-' THEN ARRAY['A-', 'O-']
        WHEN 'B+' THEN ARRAY['B+', 'B-', 'O+', 'O-']
        WHEN 'B-' THEN ARRAY['B-', 'O-']
        WHEN 'AB+' THEN ARRAY['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        WHEN 'AB-' THEN ARRAY['A-', 'B-', 'AB-', 'O-']
        WHEN 'O+' THEN ARRAY['O+', 'O-']
        WHEN 'O-' THEN ARRAY['O-']
        ELSE ARRAY[]::VARCHAR[]
      END
    )
  LOOP
    PERFORM create_notification(
      donor_record.id,
      'New Blood Request Match',
      'A new ' || NEW.blood_type || ' blood request has been posted in your area.',
      'donation',
      '/requests/' || NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for blood request notifications
DROP TRIGGER IF EXISTS trigger_notify_blood_request_created ON blood_requests;
CREATE TRIGGER trigger_notify_blood_request_created
  AFTER INSERT ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION notify_blood_request_created();

-- Function to send notification when donation is confirmed
CREATE OR REPLACE FUNCTION notify_donation_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Notify recipient
    PERFORM create_notification(
      NEW.recipient_id,
      'Donation Confirmed',
      'A donor has confirmed your blood donation request.',
      'donation',
      '/donations/' || NEW.id
    );
    
    -- Notify donor
    PERFORM create_notification(
      NEW.donor_id,
      'Donation Confirmed',
      'Your blood donation has been confirmed.',
      'donation',
      '/donations/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for donation confirmation notifications
DROP TRIGGER IF EXISTS trigger_notify_donation_confirmed ON donations;
CREATE TRIGGER trigger_notify_donation_confirmed
  AFTER UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION notify_donation_confirmed();

-- Function to send notification for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.recipient_id,
    'New Message',
    'You have received a new message from ' || (
      SELECT full_name FROM profiles WHERE id = NEW.sender_id
    ),
    'message',
    '/messages/' || NEW.request_id || '/' || NEW.sender_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();
