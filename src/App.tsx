import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Zap,
  Car,
  Filter,
  Search,
  SlidersHorizontal,
  Compass,
  Sparkles,
  CalendarCheck,
  Shield,
  Layers,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ParkingLocation, ParkingSpot, Booking } from './types.ts';
import { getLocations, getMyBookings } from './lib/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LocationCard } from './components/LocationCard.tsx';
import { InteractiveMap } from './components/InteractiveMap.tsx';
import { SpotSelectorModal } from './components/SpotSelectorModal.tsx';
import { StripeCheckoutModal } from './components/StripeCheckoutModal.tsx';
import { BookingSuccessModal } from './components/BookingSuccessModal.tsx';
import { MyBookingsView } from './components/MyBookingsView.tsx';
import { EmailInboxModal } from './components/EmailInboxModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';

const GPS_PRESETS = [
  { name: 'New Delhi (Connaught Place)', lat: 28.6315, lng: 77.2167 },
  { name: 'Gurugram (DLF Cyber Hub)', lat: 28.4952, lng: 77.0890 },
  { name: 'Mumbai (BKC Bandra Kurla)', lat: 19.0657, lng: 72.8687 },
  { name: 'Bengaluru (Indiranagar / 100ft)', lat: 12.9716, lng: 77.6412 },
  { name: 'Hyderabad (HITEC City Madhapur)', lat: 17.4504, lng: 78.3808 },
  { name: 'Pune (Koregaon Park)', lat: 18.5362, lng: 73.8940 },
];

function MainApp() {
  const { user, isAdmin } = useAuth();

  // Theme State: Default to Light Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';

  // Navigation View
  const [currentView, setCurrentView] = useState<'find' | 'bookings' | 'notifications' | 'admin'>('find');

  // GPS Coordinates & Status (Defaults to Connaught Place, New Delhi)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 28.6315,
    lng: 77.2167,
  });
  const [gpsActive, setGpsActive] = useState<boolean>(true);
  const [gpsLocationName, setGpsLocationName] = useState<string>('New Delhi (Connaught Place)');

  // Locations & Search
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyEv, setOnlyEv] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'proximity' | 'available' | 'price'>('proximity');
  const [mapViewActive, setMapViewActive] = useState<boolean>(true);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [selectedSpotModalLocation, setSelectedSpotModalLocation] = useState<ParkingLocation | null>(null);
  const [checkoutData, setCheckoutData] = useState<any | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Counts for Badges
  const [myBookingsCount, setMyBookingsCount] = useState<number>(0);

  useEffect(() => {
    fetchLocationsList();
  }, [userCoords, onlyEv]);

  useEffect(() => {
    if (user) {
      loadUserCounts();
    } else {
      setMyBookingsCount(0);
    }
  }, [user, currentView]);

  const loadUserCounts = async () => {
    try {
      const bRes = await getMyBookings();
      const active = bRes.bookings.filter((b) => b.status === 'confirmed' || b.status === 'active').length;
      setMyBookingsCount(active);
    } catch (err) {
      // Unauthenticated
    }
  };

  const fetchLocationsList = async () => {
    setLoadingLocations(true);
    try {
      const res = await getLocations(userCoords?.lat, userCoords?.lng, onlyEv);
      setLocations(res.locations);
      setLocationsError(null);
      if (res.locations.length > 0 && !selectedLocation) {
        setSelectedLocation(res.locations[0]);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setLocationsError(err instanceof Error ? err.message : 'Could not load parking locations.');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsActive(true);
        setGpsLocationName('Live GPS Coordinate');
      },
      (err) => {
        console.warn('Geolocation access denied or unavailable, using preset:', err);
        setUserCoords({ lat: 28.6315, lng: 77.2167 });
        setGpsActive(true);
        setGpsLocationName('New Delhi (Connaught Place)');
      },
      { timeout: 8000 }
    );
  };

  const handlePresetSelect = (preset: (typeof GPS_PRESETS)[0]) => {
    setUserCoords({ lat: preset.lat, lng: preset.lng });
    setGpsActive(true);
    setGpsLocationName(preset.name);
  };

  const filteredLocations = locations
    .filter((loc) => {
      const matchSearch =
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'proximity') {
        return (a.distance_miles || 999) - (b.distance_miles || 999);
      }
      if (sortBy === 'available') {
        return b.available_spots - a.available_spots;
      }
      if (sortBy === 'price') {
        return a.hourly_rate - b.hourly_rate;
      }
      return 0;
    });

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenAuth={() => setAuthModalOpen(true)}
        gpsActive={gpsActive}
        gpsLocationName={gpsLocationName}
        onTriggerGps={handleDetectGPS}
        bookingCount={myBookingsCount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {locationsError && (
          <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {locationsError}
            </span>
            <button
              type="button"
              onClick={fetchLocationsList}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {currentView === 'bookings' && (
          <MyBookingsView
            onOpenEmails={() => setEmailModalOpen(true)}
            onExplore={() => setCurrentView('find')}
            theme={theme}
          />
        )}

        {currentView === 'notifications' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className={`flex items-center justify-between pb-6 border-b mb-6 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h1 className="text-2xl font-extrabold">Email Notifications &amp; Invoices</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Automated emails sent to verify your reservations, gate PINs, and Stripe receipts.
                </p>
              </div>
              <button
                onClick={() => setEmailModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
              >
                Open Full Inbox Modal
              </button>
            </div>
            <button
              onClick={() => setEmailModalOpen(true)}
              className={`w-full py-16 rounded-3xl border text-center transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <Sparkles className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
              <p className="text-base font-bold">Launch Interactive Email Inbox</p>
              <p className="text-xs text-slate-500 mt-1">Click to view all dispatched reservation confirmation emails</p>
            </button>
          </div>
        )}

        {currentView === 'admin' && <AdminPortal theme={theme} />}

        {currentView === 'find' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Hero / GPS Bar */}
            <div className={`rounded-3xl border p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all ${
              isDark
                ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-slate-800 text-white'
                : 'bg-gradient-to-r from-sky-50 via-white to-blue-50/50 border-slate-200 text-slate-900'
            }`}>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-xl">
                  <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-3 ${
                    isDark
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                  }`}>
                    <Navigation className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Real-Time GPS Spot Discovery</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Smart Parking &amp; High-Speed EV Charging Slots
                  </h1>
                  <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Reserve guaranteed spots in real time with automated gate barrier PINs, live EV charging telemetry, and secure Stripe payment processing.
                  </p>
                </div>

                {/* GPS Presets Picker */}
                <div className={`flex flex-col space-y-2 p-4 rounded-2xl border backdrop-blur min-w-[280px] ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-white/90 border-slate-200 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                      <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>GPS Simulated Location</span>
                    </span>
                    <button
                      onClick={handleDetectGPS}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Detect GPS</span>
                    </button>
                  </div>

                  <select
                    value={gpsLocationName}
                    onChange={(e) => {
                      const p = GPS_PRESETS.find((preset) => preset.name === e.target.value);
                      if (p) handlePresetSelect(p);
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {GPS_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Lat: {userCoords.lat.toFixed(4)}, Lng: {userCoords.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Search, Filter & View Controls */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl border shadow-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by facility name, address, or city..."
                    className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* EV Only Switch */}
                <button
                  onClick={() => setOnlyEv(!onlyEv)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    onlyEv
                      ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-300'
                      : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${onlyEv ? 'fill-amber-600 dark:fill-amber-300 text-amber-600 dark:text-amber-300' : ''}`} />
                  <span>EV Fast Chargers Only</span>
                </button>
              </div>

              {/* Sorting & Map View Toggle */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-medium focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="proximity" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Nearest Distance</option>
                    <option value="available" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Most Spots Available</option>
                    <option value="price" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Lowest Hourly Rate</option>
                  </select>
                </div>

                <button
                  onClick={() => setMapViewActive(!mapViewActive)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    mapViewActive
                      ? 'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-600/20 dark:border-cyan-500/40 dark:text-cyan-300'
                      : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{mapViewActive ? 'Hide Map' : 'Show Radar Map'}</span>
                </button>
              </div>
            </div>

            {/* Split View: Radar Map & Facility Cards */}
            {mapViewActive && (
              <div>
                <InteractiveMap
                  locations={filteredLocations}
                  selectedLocation={selectedLocation}
                  onSelectLocation={(loc) => {
                    setSelectedLocation(loc);
                    setSelectedSpotModalLocation(loc);
                  }}
                  userCoords={userCoords}
                  onRecenter={handleDetectGPS}
                  theme={theme}
                />
              </div>
            )}

            {/* Facility Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center space-x-2">
                  <span>Available Parking &amp; EV Facilities</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 font-mono font-bold">
                    {filteredLocations.length} Located
                  </span>
                </h2>
                <span className="text-xs text-slate-500">
                  Sorted by <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{sortBy}</strong>
                </span>
              </div>

              {loadingLocations ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Calculating distances and spot availability...</p>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className={`py-16 text-center rounded-3xl border p-8 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <Car className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-base font-bold">No facilities found</p>
                  <p className="text-xs text-slate-500 mt-1">Try widening your search terms or unchecking EV filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLocations.map((loc) => (
                    <LocationCard
                      key={loc.id}
                      location={loc}
                      isSelected={selectedLocation?.id === loc.id}
                      onSelect={(l) => {
                        setSelectedLocation(l);
                        setSelectedSpotModalLocation(l);
                      }}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-16 border-t py-8 text-xs transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className={`font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              MY-<span className="text-cyan-600">SLOT</span>
            </span>
            <span>•</span>
            <span>Real-time Parking &amp; EV Reservation Engine</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span>SQLite SQL Secure Store</span>
            <span>•</span>
            <span>Stripe 256-Bit SSL Payment</span>
            <span>•</span>
            <span>Automated Confirmation Emails</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedSpotModalLocation && (
        <SpotSelectorModal
          location={selectedSpotModalLocation}
          onClose={() => setSelectedSpotModalLocation(null)}
          onProceedToCheckout={(data) => {
            if (!user) {
              setAuthModalOpen(true);
              return;
            }
            setSelectedSpotModalLocation(null);
            setCheckoutData(data);
          }}
          theme={theme}
        />
      )}

      {checkoutData && (
        <StripeCheckoutModal
          bookingData={checkoutData}
          onClose={() => setCheckoutData(null)}
          onSuccess={(booking) => {
            setCheckoutData(null);
            setSuccessBooking(booking);
            fetchLocationsList();
            loadUserCounts();
          }}
          theme={theme}
        />
      )}

      {successBooking && (
        <BookingSuccessModal
          booking={successBooking}
          onClose={() => setSuccessBooking(null)}
          onViewBookings={() => {
            setSuccessBooking(null);
            setCurrentView('bookings');
          }}
          onViewEmails={() => {
            setSuccessBooking(null);
            setEmailModalOpen(true);
          }}
          theme={theme}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        theme={theme}
      />

      <EmailInboxModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
