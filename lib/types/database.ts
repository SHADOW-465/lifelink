export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  date_of_birth?: string
  gender?: "male" | "female" | "other"
  blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
  user_type: "donor" | "recipient" | "both"
  location_city?: string
  location_state?: string
  location_country?: string
  latitude?: number
  longitude?: number
  is_verified: boolean
  is_available: boolean
  last_donation_date?: string
  medical_conditions?: string[]
  emergency_contact_name?: string
  emergency_contact_phone?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

export interface BloodRequest {
  id: string
  requester_id: string
  patient_name: string
  blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
  units_needed: number
  urgency_level: "low" | "medium" | "high" | "critical"
  hospital_name: string
  hospital_address: string
  hospital_phone?: string
  required_by_date: string
  description?: string
  is_fulfilled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DonationResponse {
  id: string
  request_id: string
  donor_id: string
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled"
  response_message?: string
  donation_date?: string
  otp_code?: string
  otp_verified: boolean
  otp_expires_at?: string
  created_at: string
  updated_at: string
}

export interface RotaractClub {
  id: string
  name: string
  district: string
  city: string
  state: string
  president_name?: string
  president_email?: string
  president_phone?: string
  meeting_day?: string
  meeting_time?: string
  meeting_location?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BloodDriveEvent {
  id: string
  club_id: string
  organizer_id: string
  title: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  venue_name: string
  venue_address: string
  target_donors: number
  registered_donors: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DonationHistory {
  id: string
  donor_id: string
  recipient_id?: string
  request_id?: string
  event_id?: string
  donation_date: string
  blood_type: string
  units_donated: number
  hospital_name?: string
  donation_type: "emergency" | "scheduled" | "event"
  notes?: string
  created_at: string
}
