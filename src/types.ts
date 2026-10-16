export type UserRole = 'user' | 'admin' | 'owner';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  is_active?: boolean;
  garage_id?: number | null;
  garage_name?: string | null;
}

export interface ParkingLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  ev_spots: number;
  hourly_rate: number;
  ev_rate_kwh: number;
  amenities: string[];
  image_url: string;
  available_spots: number;
  available_ev_spots: number;
  distance_km?: number | null;
  distance_miles?: number | null;
  owner_id?: number | null;
}

export interface NavigationRoute {
  distanceKm: number;
  distanceMiles: number;
  durationMinutes: number;
  steps: Array<{
    instruction: string;
    distanceMeters: number;
  }>;
  coordinates: Array<[number, number]>; // [lat, lng]
}

export type SpotType = 'regular' | 'compact' | 'accessible' | 'ev_charger';
export type SpotStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export interface ParkingSpot {
  id: number;
  location_id: number;
  spot_number: string;
  floor_level: string;
  spot_type: SpotType;
  ev_charger_type?: string;
  ev_power_kw: number;
  status: SpotStatus;
  price_per_hour: number;
  location_name?: string;
}

export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  booking_code: string;
  user_id: number;
  user_email: string;
  user_name: string;
  spot_id: number;
  location_id: number;
  start_time: string;
  end_time: string;
  total_hours: number;
  vehicle_plate: string;
  vehicle_model: string;
  is_ev: number;
  charger_type?: string;
  total_amount: number;
  payment_status: string;
  stripe_payment_id?: string;
  stripe_receipt_url?: string;
  status: BookingStatus;
  gate_pin: string;
  created_at: string;
  // Joined fields
  location_name?: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  spot_number?: string;
  floor_level?: string;
  spot_type?: SpotType;
  ev_charger_type?: string;
  ev_power_kw?: number;
}

export interface EmailNotification {
  id: number;
  booking_id: number;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body_html: string;
  status: string;
  sent_at: string;
  booking_code?: string;
  vehicle_plate?: string;
}

export interface AdminStats {
  total_users: number;
  total_spots: number;
  available_spots: number;
  occupied_spots: number;
  reserved_spots: number;
  total_bookings: number;
  total_revenue: number;
  ev_bookings: number;
  total_notifications: number;
  has_garage?: boolean;
  garage_id?: number | null;
  garage_name?: string | null;
}
