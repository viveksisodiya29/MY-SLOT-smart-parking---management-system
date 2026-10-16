import {
  User,
  ParkingLocation,
  ParkingSpot,
  Booking,
  EmailNotification,
  AdminStats,
  NavigationRoute,
} from '../types.ts';

const TOKEN_KEY = 'my-slot_auth_token';
const LEGACY_TOKEN_KEY = 'my-slot_auth_token';
const LOCAL_DB_KEY = 'myslot_local_persistent_db_v2';

export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return token;
  }

  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return legacyToken;
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

// -----------------------------------------------------------------------------
// Indian Parking Hubs & EV Superchargers (Client-side Seed Data)
// -----------------------------------------------------------------------------
const INITIAL_INDIAN_LOCATIONS: ParkingLocation[] = [
  {
    id: 1,
    name: 'Connaught Place Central Park & EV Hub',
    address: 'Radial Road 2, Inner Circle, Connaught Place',
    city: 'New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    total_spots: 80,
    ev_spots: 30,
    hourly_rate: 80,
    ev_rate_kwh: 14,
    amenities: ['24/7 Security', '150kW DC Fast Charging', 'CCTV Surveillance', 'Covered Basement', 'Valet Service', 'Restrooms'],
    image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    available_spots: 54,
    available_ev_spots: 22,
  },
  {
    id: 2,
    name: 'Cyber Hub Smart Mobility Garage',
    address: 'DLF Cyber City, Phase 2, Sector 24',
    city: 'Gurugram, Haryana',
    latitude: 28.4952,
    longitude: 77.0890,
    total_spots: 120,
    ev_spots: 50,
    hourly_rate: 100,
    ev_rate_kwh: 16,
    amenities: ['CCS2 250kW Ultra Fast', 'Tesla Compatible', 'Solar Canopy', 'Free High-Speed WiFi', 'Food Court Access', 'EV Battery Swap'],
    image_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
    available_spots: 88,
    available_ev_spots: 36,
  },
  {
    id: 3,
    name: 'Bandra Kurla Complex (BKC) EV Superhub',
    address: 'G Block, Bandra Kurla Complex, Bandra East',
    city: 'Mumbai, Maharashtra',
    latitude: 19.0657,
    longitude: 72.8687,
    total_spots: 90,
    ev_spots: 40,
    hourly_rate: 120,
    ev_rate_kwh: 18,
    amenities: ['Underground Climate-Controlled', 'Automated Boom Barrier', '350kW Hypercharger', 'Valet Option', 'Executive Lounge'],
    image_url: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80',
    available_spots: 62,
    available_ev_spots: 29,
  },
  {
    id: 4,
    name: 'Indiranagar 100ft Road Eco Park',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru, Karnataka',
    latitude: 12.9716,
    longitude: 77.6412,
    total_spots: 75,
    ev_spots: 30,
    hourly_rate: 90,
    ev_rate_kwh: 15,
    amenities: ['Type 2 AC & DC Fast', 'App-Based Gate Entry', '24/7 Security Patrol', 'Café Nearby', 'Two-Wheeler EV Bays'],
    image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    available_spots: 48,
    available_ev_spots: 18,
  },
  {
    id: 5,
    name: 'HITEC City Cyber Towers Park & Charge',
    address: 'Cyber Towers Roundabout, Madhapur',
    city: 'Hyderabad, Telangana',
    latitude: 17.4504,
    longitude: 78.3808,
    total_spots: 100,
    ev_spots: 45,
    hourly_rate: 85,
    ev_rate_kwh: 14,
    amenities: ['Multi-Level Automated Parking', 'Fast Exit Lanes', 'CCTV Monitoring', 'EV Fast Charging Deck', 'Restrooms'],
    image_url: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80',
    available_spots: 71,
    available_ev_spots: 33,
  },
  {
    id: 6,
    name: 'Koregaon Park Gateway Mobility Deck',
    address: 'North Main Road, Koregaon Park',
    city: 'Pune, Maharashtra',
    latitude: 18.5362,
    longitude: 73.8940,
    total_spots: 65,
    ev_spots: 24,
    hourly_rate: 75,
    ev_rate_kwh: 13,
    amenities: ['Shaded Parking', 'Type 2 Fast Charging', 'Wheelchair Accessible', 'Security Guards', 'LED Floor Guidance'],
    image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    available_spots: 44,
    available_ev_spots: 16,
  },
];

function generateDefaultSpots(locId: number, baseRate: number): ParkingSpot[] {
  const spots: ParkingSpot[] = [];
  let idCounter = locId * 100;
  const floors = ['Level 1', 'Level 2'];

  for (const f of floors) {
    for (let i = 1; i <= 8; i++) {
      spots.push({
        id: ++idCounter,
        location_id: locId,
        spot_number: `${f[6]}-R${String(i).padStart(2, '0')}`,
        floor_level: f,
        spot_type: 'regular',
        ev_power_kw: 0,
        status: 'available',
        price_per_hour: baseRate,
      });
    }
  }

  for (const f of floors) {
    for (let i = 1; i <= 4; i++) {
      spots.push({
        id: ++idCounter,
        location_id: locId,
        spot_number: `${f[6]}-EV${String(i).padStart(2, '0')}`,
        floor_level: f,
        spot_type: 'ev_charger',
        ev_charger_type: i % 2 === 0 ? 'CCS2 DC Fast' : 'Tesla Supercharger',
        ev_power_kw: i % 2 === 0 ? 150 : 250,
        status: 'available',
        price_per_hour: baseRate + 20,
      });
    }
  }

  for (let i = 1; i <= 2; i++) {
    spots.push({
      id: ++idCounter,
      location_id: locId,
      spot_number: `1-ACC${String(i).padStart(2, '0')}`,
      floor_level: 'Level 1',
      spot_type: 'accessible',
      ev_charger_type: 'Type 2 AC',
      ev_power_kw: 22,
      status: 'available',
      price_per_hour: baseRate,
    });
  }

  return spots;
}

interface LocalDatabase {
  users: Array<User & { password_hash?: string }>;
  locations: ParkingLocation[];
  spots: ParkingSpot[];
  bookings: Booking[];
  notifications: EmailNotification[];
}

function getLocalDatabase(): LocalDatabase {
  const saved = localStorage.getItem(LOCAL_DB_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migrate if old US locations exist
      const hasUs = parsed.locations?.some((l: ParkingLocation) =>
        l.city?.includes('San Francisco') || l.city?.includes('Palo Alto')
      );
      if (!hasUs && parsed.locations?.length > 0) {
        return parsed;
      }
    } catch {
      // parse failed, regenerate
    }
  }

  const initialSpots: ParkingSpot[] = [];
  for (const loc of INITIAL_INDIAN_LOCATIONS) {
    initialSpots.push(...generateDefaultSpots(loc.id, loc.hourly_rate));
  }

  const freshDb: LocalDatabase = {
    users: [
      {
        id: 1,
        email: 'admin@my-slot.app',
        full_name: 'System Admin',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
    ],
    locations: INITIAL_INDIAN_LOCATIONS,
    spots: initialSpots,
    bookings: [],
    notifications: [],
  };

  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(freshDb));
  return freshDb;
}

function saveLocalDatabase(db: LocalDatabase) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): { km: number; miles: number } {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = Math.round(R * c * 100) / 100;
  return { km, miles: Math.round(km * 0.621371 * 100) / 100 };
}

// -----------------------------------------------------------------------------
// Resilient Client-Side Storage Engine (Fallback for static Vercel hosts)
// -----------------------------------------------------------------------------
function handleClientSideFallback<T>(endpoint: string, method: string, body?: any): T {
  const db = getLocalDatabase();
  const token = getStoredToken();
  const currentUser = token ? db.users.find((u) => u.email === token || `mock_${u.id}` === token) : null;

  // 1. Check admin status
  if (endpoint === '/auth/admin-status') {
    const hasAdmin = db.users.some((u) => u.role === 'admin');
    return { hasAdmin } as T;
  }

  // 2. Auth: Register
  if (endpoint === '/auth/register' && method === 'POST') {
    const { email, password, full_name, phone } = body || {};
    if (!email || !password || !full_name) {
      throw new Error('Email, password, and full name are required');
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const role: User['role'] = 'user';

    const newUser: User = {
      id: Date.now(),
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      phone: phone?.trim(),
      role,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveLocalDatabase(db);

    const generatedToken = `mock_${newUser.id}`;
    return {
      message: 'Registration successful',
      user: newUser,
      token: generatedToken,
    } as T;
  }

  // 3. Auth: Login
  if (endpoint === '/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Auto-create for seamless demo on Vercel if signing in with demo admin or guest
      const role = email.includes('admin') ? 'admin' : 'user';
      user = {
        id: Date.now(),
        email: email.trim().toLowerCase(),
        full_name: email.split('@')[0],
        role,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      saveLocalDatabase(db);
    }

    const generatedToken = `mock_${user.id}`;
    return {
      message: 'Login successful',
      user,
      token: generatedToken,
    } as T;
  }

  // 4. Auth: Me
  if (endpoint === '/auth/me') {
    if (!currentUser) {
      throw new Error('Unauthorized');
    }
    return { user: currentUser } as T;
  }

  // 5. Locations list
  if (endpoint.startsWith('/locations') && !endpoint.includes('/spots')) {
    const url = new URL(`http://dummy${endpoint}`);
    const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : null;
    const lng = url.searchParams.get('lng') ? parseFloat(url.searchParams.get('lng')!) : null;
    const onlyEv = url.searchParams.get('ev') === 'true';

    let locs = db.locations.map((loc) => {
      const locSpots = db.spots.filter((s) => s.location_id === loc.id);
      const available = locSpots.filter((s) => s.status === 'available').length;
      const availableEv = locSpots.filter((s) => s.status === 'available' && s.spot_type === 'ev_charger').length;

      let distance_km: number | null = null;
      let distance_miles: number | null = null;
      if (lat && lng && lat !== 0) {
        const d = calculateDistance(lat, lng, loc.latitude, loc.longitude);
        distance_km = d.km;
        distance_miles = d.miles;
      }

      return {
        ...loc,
        available_spots: available,
        available_ev_spots: availableEv,
        distance_km,
        distance_miles,
      };
    });

    if (onlyEv) {
      locs = locs.filter((l) => l.available_ev_spots > 0);
    }

    if (lat && lng && lat !== 0) {
      locs.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
    }

    return { locations: locs } as T;
  }

  // 6. Location spots
  if (endpoint.includes('/locations/') && endpoint.endsWith('/spots')) {
    const locId = parseInt(endpoint.split('/')[2], 10);
    let spots = db.spots.filter((s) => s.location_id === locId);
    if (spots.length === 0) {
      const loc = db.locations.find((l) => l.id === locId);
      spots = generateDefaultSpots(locId, loc?.hourly_rate || 80);
      db.spots.push(...spots);
      saveLocalDatabase(db);
    }
    return { spots } as T;
  }

  // 7. Create booking
  if (endpoint === '/bookings' && method === 'POST') {
    if (!currentUser) {
      throw new Error('Please log in to make a reservation');
    }

    const { spot_id, location_id, hours, vehicle_plate, vehicle_model, is_ev, payment_method, upi_id, card_last4 } = body || {};
    const spot = db.spots.find((s) => s.id === spot_id);
    const loc = db.locations.find((l) => l.id === location_id);

    if (!spot || !loc) {
      throw new Error('Selected spot or location not found');
    }

    spot.status = 'reserved';
    const bookingCode = `VP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const gatePin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = Math.round((spot.price_per_hour * (hours || 2) + (is_ev ? loc.ev_rate_kwh * 20 : 0)) * 100) / 100;

    const newBooking: Booking = {
      id: Date.now(),
      booking_code: bookingCode,
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      spot_id,
      location_id,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + (hours || 2) * 3600000).toISOString(),
      total_hours: hours || 2,
      vehicle_plate: vehicle_plate || 'MH-02-EE-1000',
      vehicle_model: vehicle_model || 'Vehicle',
      is_ev: is_ev ? 1 : 0,
      total_amount: totalAmount,
      payment_status: 'paid',
      stripe_payment_id: `ch_local_${Date.now()}`,
      status: 'confirmed',
      gate_pin: gatePin,
      created_at: new Date().toISOString(),
      location_name: loc.name,
      location_address: `${loc.address}, ${loc.city}`,
      spot_number: spot.spot_number,
      floor_level: spot.floor_level,
      spot_type: spot.spot_type,
      ev_charger_type: spot.ev_charger_type,
      ev_power_kw: spot.ev_power_kw,
    };

    db.bookings.unshift(newBooking);

    // Add confirmation notification
    db.notifications.unshift({
      id: Date.now(),
      booking_id: newBooking.id,
      recipient_email: currentUser.email,
      recipient_name: currentUser.full_name,
      subject: `Booking Confirmed: Spot ${spot.spot_number} at ${loc.name} (${bookingCode})`,
      body_html: `<div>Reservation PIN: <strong>${gatePin}</strong>. Gate code ready for entry at ${loc.name}. Total Paid: ₹${totalAmount}</div>`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      booking_code: bookingCode,
      vehicle_plate,
    });

    saveLocalDatabase(db);
    return { message: 'Reservation confirmed', booking: newBooking } as T;
  }

  // 8. My Bookings
  if (endpoint === '/bookings/my') {
    if (!currentUser) return { bookings: [] } as T;
    const userBookings = db.bookings.filter((b) => b.user_id === currentUser.id || b.user_email === currentUser.email);
    return { bookings: userBookings } as T;
  }

  // 9. Cancel booking
  if (endpoint.includes('/bookings/') && endpoint.endsWith('/cancel')) {
    const bookingId = parseInt(endpoint.split('/')[2], 10);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (booking) {
      booking.status = 'cancelled';
      const spot = db.spots.find((s) => s.id === booking.spot_id);
      if (spot) spot.status = 'available';
      saveLocalDatabase(db);
    }
    return { message: 'Booking cancelled' } as T;
  }

  // 10. My Notifications
  if (endpoint === '/notifications/my') {
    if (!currentUser) return { notifications: [] } as T;
    const userNotes = db.notifications.filter((n) => n.recipient_email === currentUser.email);
    return { notifications: userNotes } as T;
  }

  // 11. Admin My Garage
  if (endpoint === '/admin/my-garage') {
    if (!currentUser) throw new Error('Unauthorized');
    const myGarage = db.locations.find((l) => l.owner_id === currentUser.id);
    if (!myGarage) return { garage: null } as T;
    const spots = db.spots.filter((s) => s.location_id === myGarage.id);
    const available = spots.filter((s) => s.status === 'available').length;
    const occupied = spots.filter((s) => s.status === 'occupied').length;
    const reserved = spots.filter((s) => s.status === 'reserved').length;
    const availableEv = spots.filter((s) => s.status === 'available' && s.spot_type === 'ev_charger').length;
    return {
      garage: {
        ...myGarage,
        total_spots: spots.length,
        available_spots: available,
        occupied_spots: occupied,
        reserved_spots: reserved,
        available_ev_spots: availableEv,
      },
    } as T;
  }

  // 11b. Admin Claim Garage
  if (endpoint === '/admin/locations/claim' && method === 'POST') {
    if (!currentUser) throw new Error('Unauthorized');
    const existing = db.locations.find((l) => l.owner_id === currentUser.id);
    if (existing) {
      throw new Error(`Security Constraint: You already manage garage '${existing.name}'. Each admin can only manage one garage.`);
    }
    const loc = db.locations.find((l) => l.id === body.location_id);
    if (!loc) throw new Error('Garage not found');
    loc.owner_id = currentUser.id;
    saveLocalDatabase(db);
    return { message: `Garage '${loc.name}' claimed successfully`, garage: loc } as T;
  }

  // 11c. Admin Dashboard (Scoped to Admin's Owned Garage)
  if (endpoint === '/admin/dashboard') {
    const myGarage = currentUser ? db.locations.find((l) => l.owner_id === currentUser.id) : null;
    const mySpots = myGarage ? db.spots.filter((s) => s.location_id === myGarage.id) : [];
    const myBookings = myGarage ? db.bookings.filter((b) => b.location_id === myGarage.id) : [];
    const availableSpots = mySpots.filter((s) => s.status === 'available').length;
    const occupiedSpots = mySpots.filter((s) => s.status === 'occupied').length;
    const reservedSpots = mySpots.filter((s) => s.status === 'reserved').length;
    const totalRevenue = myBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const evBookings = myBookings.filter((b) => b.is_ev === 1).length;

    const stats: AdminStats = {
      total_users: db.users.length,
      total_spots: mySpots.length,
      available_spots: availableSpots,
      occupied_spots: occupiedSpots,
      reserved_spots: reservedSpots,
      total_bookings: myBookings.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      ev_bookings: evBookings,
      total_notifications: db.notifications.length,
      has_garage: myGarage !== null && myGarage !== undefined,
      garage_id: myGarage ? myGarage.id : null,
      garage_name: myGarage ? myGarage.name : null,
    };
    return { stats } as T;
  }

  // 12. Admin Bookings (Scoped to Admin's Garage)
  if (endpoint === '/admin/bookings') {
    const myGarage = currentUser ? db.locations.find((l) => l.owner_id === currentUser.id) : null;
    const myBookings = myGarage ? db.bookings.filter((b) => b.location_id === myGarage.id) : [];
    return { bookings: myBookings } as T;
  }

  // 13. Admin Spots (Scoped to Admin's Garage)
  if (endpoint === '/admin/spots' && method === 'GET') {
    const myGarage = currentUser ? db.locations.find((l) => l.owner_id === currentUser.id) : null;
    const mySpots = myGarage ? db.spots.filter((s) => s.location_id === myGarage.id) : [];
    const spotsWithLoc = mySpots.map((s) => {
      return { ...s, location_name: myGarage?.name || 'Parking Facility' };
    });
    return { spots: spotsWithLoc } as T;
  }

  // 14. Admin Update Spot Status / Price
  if (endpoint.startsWith('/admin/spots/') && endpoint.endsWith('/status')) {
    const spotId = parseInt(endpoint.split('/')[3], 10);
    const spot = db.spots.find((s) => s.id === spotId);
    if (spot && body) {
      if (body.status) spot.status = body.status;
      if (body.price_per_hour !== undefined) spot.price_per_hour = body.price_per_hour;
      if (body.ev_power_kw !== undefined) spot.ev_power_kw = body.ev_power_kw;
      saveLocalDatabase(db);
    }
    return { message: 'Spot updated successfully' } as T;
  }

  // 15. Admin Create Spot
  if (endpoint === '/admin/spots' && method === 'POST') {
    const myGarage = currentUser ? db.locations.find((l) => l.owner_id === currentUser.id) : null;
    const locId = myGarage ? myGarage.id : body.location_id;
    const newSpot: ParkingSpot = {
      id: Date.now(),
      location_id: locId,
      spot_number: body.spot_number,
      floor_level: body.floor_level,
      spot_type: body.spot_type,
      ev_charger_type: body.ev_charger_type,
      ev_power_kw: body.ev_power_kw || 0,
      status: 'available',
      price_per_hour: body.price_per_hour || 80,
    };
    db.spots.push(newSpot);
    saveLocalDatabase(db);
    return { message: 'Spot created', id: newSpot.id } as T;
  }

  // 16. Admin Garages / Locations: Create (Strictly 1 Garage Per Admin)
  if (endpoint === '/admin/locations' && method === 'POST') {
    if (currentUser) {
      const existing = db.locations.find((l) => l.owner_id === currentUser.id);
      if (existing) {
        throw new Error(`Security Policy: Each admin is authorized to manage only ONE garage. You already manage garage #${existing.id} ('${existing.name}').`);
      }
    }

    const newLoc: ParkingLocation = {
      id: Date.now(),
      name: body.name,
      address: body.address,
      city: body.city,
      latitude: parseFloat(body.latitude) || 28.6315,
      longitude: parseFloat(body.longitude) || 77.2167,
      total_spots: parseInt(body.total_spots, 10) || 60,
      ev_spots: parseInt(body.ev_spots, 10) || 20,
      hourly_rate: parseFloat(body.hourly_rate) || 80,
      ev_rate_kwh: parseFloat(body.ev_rate_kwh) || 14,
      amenities: Array.isArray(body.amenities) ? body.amenities : [body.amenities].filter(Boolean),
      image_url: body.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
      available_spots: parseInt(body.total_spots, 10) || 60,
      available_ev_spots: parseInt(body.ev_spots, 10) || 20,
      owner_id: currentUser ? currentUser.id : null,
    };

    db.locations.push(newLoc);
    const newSpots = generateDefaultSpots(newLoc.id, newLoc.hourly_rate);
    db.spots.push(...newSpots);
    saveLocalDatabase(db);

    return { message: 'Garage created successfully', id: newLoc.id, location: newLoc } as T;
  }

  // 17. Admin Garages / Locations: Update
  if (endpoint.startsWith('/admin/locations/') && !endpoint.endsWith('/delete') && (method === 'PUT' || method === 'POST')) {
    const locId = parseInt(endpoint.split('/')[3], 10);
    const loc = db.locations.find((l) => l.id === locId);
    if (!loc) throw new Error('Garage not found');
    if (currentUser && loc.owner_id && loc.owner_id !== currentUser.id) {
      throw new Error('Security Forbidden: You can only modify your own garage.');
    }

    if (body.name !== undefined) loc.name = body.name;
    if (body.address !== undefined) loc.address = body.address;
    if (body.city !== undefined) loc.city = body.city;
    if (body.latitude !== undefined) loc.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) loc.longitude = parseFloat(body.longitude);
    if (body.total_spots !== undefined) loc.total_spots = parseInt(body.total_spots, 10);
    if (body.ev_spots !== undefined) loc.ev_spots = parseInt(body.ev_spots, 10);
    if (body.hourly_rate !== undefined) loc.hourly_rate = parseFloat(body.hourly_rate);
    if (body.ev_rate_kwh !== undefined) loc.ev_rate_kwh = parseFloat(body.ev_rate_kwh);
    if (body.amenities !== undefined) {
      loc.amenities = Array.isArray(body.amenities) ? body.amenities : [body.amenities].filter(Boolean);
    }
    if (body.image_url !== undefined) loc.image_url = body.image_url;

    saveLocalDatabase(db);
    return { message: 'Garage updated successfully', location: loc } as T;
  }

  // 18. Admin Garages / Locations: Delete
  if (endpoint.startsWith('/admin/locations/') && (endpoint.endsWith('/delete') || method === 'DELETE')) {
    const locId = parseInt(endpoint.split('/')[3], 10);
    const loc = db.locations.find((l) => l.id === locId);
    if (currentUser && loc?.owner_id && loc.owner_id !== currentUser.id) {
      throw new Error('Security Forbidden: You can only delete your own garage.');
    }
    db.locations = db.locations.filter((l) => l.id !== locId);
    db.spots = db.spots.filter((s) => s.location_id !== locId);
    saveLocalDatabase(db);
    return { message: 'Garage deleted successfully' } as T;
  }

  // 19. Admin Users
  if (endpoint === '/admin/users') {
    return { users: db.users } as T;
  }

  if (endpoint.startsWith('/admin/users/') && endpoint.endsWith('/role')) {
    const userId = parseInt(endpoint.split('/')[3], 10);
    const targetUser = db.users.find((u) => u.id === userId);
    if (targetUser && body.role) {
      targetUser.role = body.role;
      saveLocalDatabase(db);
    }
    return { message: 'User role updated' } as T;
  }

  // 20. Admin Notifications
  if (endpoint === '/admin/notifications') {
    return { notifications: db.notifications } as T;
  }

  throw new Error(`Endpoint not found: ${endpoint}`);
}

// -----------------------------------------------------------------------------
// All application data is managed by the shared backend API.
// -----------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL && !import.meta.env.DEV) {
    throw new ApiError(
      'The API server URL is not configured. Set VITE_API_BASE_URL in the frontend deployment and redeploy.'
    );
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Cannot reach the MY-SLOT API. Start the full application server or deploy the frontend and backend together.'
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new ApiError(
      'The server returned the frontend instead of the API. Deploy the full MY-SLOT server; a static frontend alone cannot save shared accounts or bookings.',
      response.status
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('The MY-SLOT API returned an invalid response.', response.status);
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `The MY-SLOT API request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Public Client API Exports
// -----------------------------------------------------------------------------

// Auth APIs
export async function getAdminStatus(): Promise<{ hasAdmin: boolean }> {
  return request<{ hasAdmin: boolean }>('/auth/admin-status');
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  requested_role?: string;
  admin_code?: string;
}): Promise<{ user: User; token: string; message: string }> {
  return request<{ user: User; token: string; message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}): Promise<{ user: User; token: string; message: string }> {
  return request<{ user: User; token: string; message: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Locations & Spots API
export async function getLocations(
  lat?: number,
  lng?: number,
  onlyEv?: boolean
): Promise<{ locations: ParkingLocation[] }> {
  const params = new URLSearchParams();
  if (lat !== undefined && lng !== undefined) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  if (onlyEv) {
    params.set('ev', 'true');
  }
  const queryStr = params.toString();
  return request<{ locations: ParkingLocation[] }>(`/locations${queryStr ? '?' + queryStr : ''}`);
}

export async function getLocationSpots(locationId: number): Promise<{ spots: ParkingSpot[] }> {
  return request<{ spots: ParkingSpot[] }>(`/locations/${locationId}/spots`);
}

// User Bookings API
export async function createBooking(payload: {
  spot_id: number;
  location_id: number;
  start_time: string;
  hours: number;
  vehicle_plate: string;
  vehicle_model: string;
  is_ev: boolean;
  stripe_token?: string;
  card_last4?: string;
  payment_method?: string; // 'card' | 'upi_phonepe' | 'upi_gpay'
  upi_id?: string;
}): Promise<{ message: string; booking: any }> {
  return request<{ message: string; booking: any }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyBookings(): Promise<{ bookings: Booking[] }> {
  return request<{ bookings: Booking[] }>('/bookings/my');
}

export async function cancelMyBooking(bookingId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export async function getMyNotifications(): Promise<{ notifications: EmailNotification[] }> {
  return request<{ notifications: EmailNotification[] }>('/notifications/my');
}

// Admin APIs (Protected by RBAC)
export async function getAdminDashboard(): Promise<{ stats: AdminStats }> {
  return request<{ stats: AdminStats }>('/admin/dashboard');
}

export async function getAdminBookings(): Promise<{ bookings: Booking[] }> {
  return request<{ bookings: Booking[] }>('/admin/bookings');
}

export async function updateAdminBookingStatus(
  bookingId: number,
  status: 'active' | 'completed' | 'cancelled'
): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/bookings/${bookingId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function getAdminSpots(): Promise<{ spots: ParkingSpot[] }> {
  return request<{ spots: ParkingSpot[] }>('/admin/spots');
}

export async function updateAdminSpot(
  spotId: number,
  updates: { status?: string; price_per_hour?: number; ev_power_kw?: number }
): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/spots/${spotId}/status`, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function createAdminSpot(payload: {
  location_id: number;
  spot_number: string;
  floor_level: string;
  spot_type: string;
  ev_charger_type: string;
  ev_power_kw: number;
  price_per_hour: number;
}): Promise<{ message: string; id: number }> {
  return request<{ message: string; id: number }>('/admin/spots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Admin Garages / Locations Management
export async function createAdminLocation(payload: {
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
}): Promise<{ message: string; id: number; location: ParkingLocation }> {
  return request<{ message: string; id: number; location: ParkingLocation }>('/admin/locations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminLocation(
  locationId: number,
  payload: Partial<ParkingLocation>
): Promise<{ message: string; location: ParkingLocation }> {
  return request<{ message: string; location: ParkingLocation }>(`/admin/locations/${locationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminLocation(locationId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/locations/${locationId}/delete`, {
    method: 'POST',
  });
}

export async function getAdminLocations(): Promise<{ locations: ParkingLocation[] }> {
  return request<{ locations: ParkingLocation[] }>('/admin/locations');
}

export async function getAdminUsers(): Promise<{ users: User[] }> {
  return request<{ users: User[] }>('/admin/users');
}

export async function updateAdminUserRole(
  userId: number,
  role: 'user' | 'admin',
  garageId?: number
): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role, garage_id: garageId }),
  });
}

export async function setAdminUserActive(
  userId: number,
  isActive: boolean
): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}/status`, {
    method: 'POST',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteAdminUser(userId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function getAdminNotifications(): Promise<{ notifications: EmailNotification[] }> {
  return request<{ notifications: EmailNotification[] }>('/admin/notifications');
}

export async function getMyAdminGarage(): Promise<{ garage: ParkingLocation | null }> {
  return request<{ garage: ParkingLocation | null }>('/admin/my-garage');
}

export async function claimAdminGarage(locationId: number): Promise<{ message: string; garage: ParkingLocation }> {
  return request<{ message: string; garage: ParkingLocation }>('/admin/locations/claim', {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId }),
  });
}

// -----------------------------------------------------------------------------
// Real-Time Route Navigation Engine (OSRM API with Geographic Fallback)
// -----------------------------------------------------------------------------
export async function fetchEasyRoute(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): Promise<NavigationRoute> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = Math.round((route.distance / 1000) * 10) / 10;
        const distMiles = Math.round(distKm * 0.621371 * 10) / 10;
        const durationMin = Math.max(1, Math.round(route.duration / 60));
        const coords: Array<[number, number]> = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // OSRM gives [lng, lat], map paths use [lat, lng]
        );
        const steps: Array<{ instruction: string; distanceMeters: number }> = [];
        if (route.legs && route.legs[0]?.steps) {
          for (const s of route.legs[0].steps) {
            const maneuverType = s.maneuver?.type || 'turn';
            const modifier = s.maneuver?.modifier ? ` (${s.maneuver.modifier})` : '';
            const street = s.name ? ` onto ${s.name}` : '';
            let text = `${maneuverType.charAt(0).toUpperCase() + maneuverType.slice(1)}${modifier}${street}`;
            if (maneuverType === 'arrive') text = 'Arrived at parking garage barrier';
            if (maneuverType === 'depart') text = `Depart towards ${s.name || 'parking facility'}`;
            steps.push({
              instruction: text,
              distanceMeters: Math.round(s.distance || 0),
            });
          }
        }
        return {
          distanceKm: distKm,
          distanceMiles: distMiles,
          durationMinutes: durationMin,
          steps,
          coordinates: coords,
        };
      }
    }
  } catch (err) {
    console.warn('[Route Fetch] Notice: OSRM route fetch fallback:', err);
  }

  // Fallback direct driving route calculation
  const R = 6371;
  const dLat = ((destLat - userLat) * Math.PI) / 180;
  const dLon = ((destLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = Math.round(R * c * 10) / 10;
  const miles = Math.round(km * 0.621371 * 10) / 10;
  const estMins = Math.max(2, Math.round((km / 35) * 60)); // 35 km/h urban speed

  return {
    distanceKm: km,
    distanceMiles: miles,
    durationMinutes: estMins,
    steps: [
      { instruction: `Follow main arterial route towards destination (${km} km)`, distanceMeters: Math.round(km * 1000) },
      { instruction: 'Enter parking barrier gate and follow LED signs to your bay', distanceMeters: 50 },
    ],
    coordinates: [
      [userLat, userLng],
      [userLat + (destLat - userLat) * 0.35, userLng + (destLng - userLng) * 0.25],
      [userLat + (destLat - userLat) * 0.7, userLng + (destLng - userLng) * 0.75],
      [destLat, destLng],
    ],
  };
}
