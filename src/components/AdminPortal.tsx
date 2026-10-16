import React, { useState, useEffect } from 'react';
import {
  Shield,
  BarChart3,
  Car,
  Zap,
  CalendarCheck,
  Users,
  Mail,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Edit2,
  Lock,
  Building2,
  MapPin,
  Trash2,
  X,
  ExternalLink,
  Compass,
} from 'lucide-react';
import {
  AdminStats,
  ParkingSpot,
  Booking,
  User,
  EmailNotification,
  ParkingLocation,
} from '../types.ts';
import {
  getAdminDashboard,
  getAdminSpots,
  updateAdminSpot,
  createAdminSpot,
  getAdminBookings,
  updateAdminBookingStatus,
  getAdminUsers,
  updateAdminUserRole,
  getAdminNotifications,
  getAdminLocations,
  setAdminUserActive,
  deleteAdminUser,
  createAdminLocation,
  updateAdminLocation,
  deleteAdminLocation,
} from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminPortalProps {
  theme?: 'light' | 'dark';
  defaultTab?: 'overview' | 'garages' | 'spots' | 'bookings' | 'users' | 'emails';
  initialOpenAddGarage?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  theme = 'light',
  defaultTab = 'overview',
  initialOpenAddGarage = false,
}) => {
  const { user, isAdmin } = useAuth();
  const isOwner = user?.role === 'owner';
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'overview' | 'garages' | 'spots' | 'bookings' | 'users' | 'emails'>(defaultTab);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [garageSearch, setGarageSearch] = useState<string>('');
  const [showGarageModal, setShowGarageModal] = useState<boolean>(false);
  const [editingGarage, setEditingGarage] = useState<ParkingLocation | null>(null);

  // Garage Modal Form States
  const [gName, setGName] = useState<string>('');
  const [gAddress, setGAddress] = useState<string>('');
  const [gCity, setGCity] = useState<string>('');
  const [gLatitude, setGLatitude] = useState<number>(28.6315);
  const [gLongitude, setGLongitude] = useState<number>(77.2167);
  const [gTotalSpots, setGTotalSpots] = useState<number>(80);
  const [gEvSpots, setGEvSpots] = useState<number>(30);
  const [gHourlyRate, setGHourlyRate] = useState<number>(80);
  const [gEvRateKwh, setGEvRateKwh] = useState<number>(14);
  const [gAmenities, setGAmenities] = useState<string>('');
  const [gImageUrl, setGImageUrl] = useState<string>('');

  const [spotFilterLocation, setSpotFilterLocation] = useState<string>('all');
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  const [showAddSpotModal, setShowAddSpotModal] = useState(false);
  const [newSpotLocationId, setNewSpotLocationId] = useState<number>(0);
  const [selectedGarageByUser, setSelectedGarageByUser] = useState<Record<number, number>>({});
  const [newSpotNumber, setNewSpotNumber] = useState<string>('');
  const [newSpotFloor, setNewSpotFloor] = useState<string>('Level 1');
  const [newSpotType, setNewSpotType] = useState<string>('regular');
  const [newSpotChargerType, setNewSpotChargerType] = useState<string>('CCS2 DC Fast');
  const [newSpotPowerKw, setNewSpotPowerKw] = useState<number>(150);
  const [newSpotPrice, setNewSpotPrice] = useState<number>(80);
  const [savingGarage, setSavingGarage] = useState<boolean>(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab === 'users' && user?.role !== 'owner' ? 'overview' : defaultTab);
    }
  }, [defaultTab, user?.role]);

  useEffect(() => {
    if (initialOpenAddGarage) {
      openAddGarageModal();
    }
  }, [initialOpenAddGarage]);

  useEffect(() => {
    if (isAdmin) {
      loadInitialData();
    }
  }, [isAdmin, activeTab, isOwner]);

  const loadInitialData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (activeTab === 'overview' || activeTab === 'garages') {
        const [dashRes, locRes] = await Promise.all([getAdminDashboard(), getAdminLocations()]);
        setStats(dashRes.stats);
        setLocations(locRes.locations);
      } else if (activeTab === 'spots') {
        const [spotsRes, locRes] = await Promise.all([getAdminSpots(), getAdminLocations()]);
        setSpots(spotsRes.spots);
        setLocations(locRes.locations);
      } else if (activeTab === 'bookings') {
        const bRes = await getAdminBookings();
        setBookings(bRes.bookings);
      } else if (activeTab === 'users') {
        if (!isOwner) {
          setActiveTab('overview');
          return;
        }
        const [uRes, locRes] = await Promise.all([getAdminUsers(), getAdminLocations()]);
        setUsersList(uRes.users);
        setLocations(locRes.locations);
        setSelectedGarageByUser(Object.fromEntries(
          uRes.users.filter((u) => u.garage_id).map((u) => [u.id, u.garage_id as number])
        ));
      } else if (activeTab === 'emails') {
        const nRes = await getAdminNotifications();
        setEmailLogs(nRes.notifications);
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const notifyAction = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const openAddGarageModal = () => {
    setEditingGarage(null);
    setGName('');
    setGAddress('');
    setGCity('New Delhi');
    setGLatitude(28.6315);
    setGLongitude(77.2167);
    setGTotalSpots(80);
    setGEvSpots(30);
    setGHourlyRate(80);
    setGEvRateKwh(14);
    setGAmenities('24/7 Security, 150kW DC Fast Charging, CCTV, Covered Parking, Valet');
    setGImageUrl('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80');
    setShowGarageModal(true);
  };

  const openEditGarageModal = (loc: ParkingLocation) => {
    setEditingGarage(loc);
    setGName(loc.name);
    setGAddress(loc.address);
    setGCity(loc.city);
    setGLatitude(loc.latitude);
    setGLongitude(loc.longitude);
    setGTotalSpots(loc.total_spots);
    setGEvSpots(loc.ev_spots);
    setGHourlyRate(loc.hourly_rate);
    setGEvRateKwh(loc.ev_rate_kwh);
    setGAmenities(Array.isArray(loc.amenities) ? loc.amenities.join(', ') : (loc.amenities as any) || '');
    setGImageUrl(loc.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80');
    setShowGarageModal(true);
  };

  const handleSaveGarage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim() || !gAddress.trim() || !gCity.trim()) {
      alert('Please fill out Garage Name, Address, and City.');
      return;
    }

    const amenitiesList = gAmenities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: gName.trim(),
      address: gAddress.trim(),
      city: gCity.trim(),
      latitude: Number(gLatitude),
      longitude: Number(gLongitude),
      total_spots: Number(gTotalSpots),
      ev_spots: Number(gEvSpots),
      hourly_rate: Number(gHourlyRate),
      ev_rate_kwh: Number(gEvRateKwh),
      amenities: amenitiesList,
      image_url: gImageUrl.trim() || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    };

    setSavingGarage(true);
    try {
      if (editingGarage) {
        await updateAdminLocation(editingGarage.id, payload);
        notifyAction(`Garage "${payload.name}" updated successfully!`);
      } else {
        await createAdminLocation(payload);
        notifyAction(`New garage "${payload.name}" created successfully!`);
      }
      setShowGarageModal(false);
      const [dashRes, locRes] = await Promise.all([getAdminDashboard(), getAdminLocations()]);
      setStats(dashRes.stats);
      setLocations(locRes.locations);
    } catch (err: any) {
      alert(err?.message || 'Failed to save garage details');
    } finally {
      setSavingGarage(false);
    }
  };

  const handleDeleteGarage = async (locId: number, locName: string) => {
    if (!window.confirm(`Are you sure you want to delete garage "${locName}" and all associated parking spots?`)) {
      return;
    }
    try {
      await deleteAdminLocation(locId);
      notifyAction(`Garage "${locName}" deleted successfully`);
      const locRes = await getAdminLocations();
      setLocations(locRes.locations);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete garage');
    }
  };

  const handleSpotStatusChange = async (spotId: number, newStatus: string) => {
    try {
      await updateAdminSpot(spotId, { status: newStatus });
      setSpots((prev) =>
        prev.map((s) => (s.id === spotId ? { ...s, status: newStatus as any } : s))
      );
      notifyAction(`Spot #${spotId} status updated to ${newStatus}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update spot');
    }
  };

  const handleSpotPriceChange = async (spotId: number, currentPrice: number) => {
    const val = prompt('Enter new hourly price (₹):', currentPrice.toFixed(2));
    if (!val || isNaN(Number(val))) return;
    const price = Number(val);
    try {
      await updateAdminSpot(spotId, { price_per_hour: price });
      setSpots((prev) =>
        prev.map((s) => (s.id === spotId ? { ...s, price_per_hour: price } : s))
      );
      notifyAction(`Spot #${spotId} hourly price updated to ₹${price}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update price');
    }
  };

  const handleBookingStatusChange = async (
    bookingId: number,
    newStatus: 'active' | 'completed' | 'cancelled'
  ) => {
    try {
      await updateAdminBookingStatus(bookingId, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      notifyAction(`Booking #${bookingId} updated to ${newStatus}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update booking status');
    }
  };

  const handleUserRoleToggle = async (targetUser: User, requestedRole?: 'user' | 'admin') => {
    const nextRole = requestedRole || (targetUser.role === 'admin' ? 'user' : 'admin');
    const garageId = selectedGarageByUser[targetUser.id];
    if (nextRole === 'admin' && !garageId) {
      alert('Select a garage before assigning this user as an admin.');
      return;
    }
    if (!confirm(`Assign ${targetUser.email} as ${nextRole.toUpperCase()}${nextRole === 'admin' ? ` for garage #${garageId}` : ''}?`)) return;
    try {
      await updateAdminUserRole(targetUser.id, nextRole, garageId);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? {
          ...u,
          role: nextRole,
          garage_id: nextRole === 'admin' ? garageId : null,
          garage_name: nextRole === 'admin' ? locations.find((l) => l.id === garageId)?.name ?? null : null,
        } : u))
      );
      notifyAction(nextRole === 'admin'
        ? `Assigned ${targetUser.email} to ${locations.find((l) => l.id === garageId)?.name || 'the selected garage'}`
        : `Removed admin access from ${targetUser.email}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update user role');
    }
  };

  const handleUserActiveChange = async (targetUser: User) => {
    const isActive = targetUser.is_active === false;
    try {
      await setAdminUserActive(targetUser.id, isActive);
      setUsersList((prev) => prev.map((u) => u.id === targetUser.id ? {
        ...u,
        is_active: isActive,
        ...(isActive ? {} : { garage_id: null, garage_name: null }),
      } : u));
      if (!isActive && targetUser.role === 'admin') {
        const response = await getAdminLocations();
        setLocations(response.locations);
      }
      notifyAction(isActive ? `Unblocked ${targetUser.email}` : `Blocked ${targetUser.email}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update account status');
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    const confirmed = window.confirm(
      `Delete ${targetUser.email}? Access will be permanently removed and customer details will be anonymized in retained bookings and notifications. Payment and audit history will remain.`
    );
    if (!confirmed) return;
    try {
      await deleteAdminUser(targetUser.id);
      setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
      if (targetUser.role === 'admin') {
        const response = await getAdminLocations();
        setLocations(response.locations);
      }
      notifyAction(`Deleted ${targetUser.email}; related history was anonymized`);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete account');
    }
  };

  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpotNumber.trim()) {
      alert('Please enter a spot number (e.g. 1-EV05 or 2-R12)');
      return;
    }
    try {
      await createAdminSpot({
        location_id: newSpotLocationId,
        spot_number: newSpotNumber.trim().toUpperCase(),
        floor_level: newSpotFloor,
        spot_type: newSpotType,
        ev_charger_type: newSpotType === 'ev_charger' ? newSpotChargerType : 'None',
        ev_power_kw: newSpotType === 'ev_charger' ? Number(newSpotPowerKw) : 0,
        price_per_hour: Number(newSpotPrice),
      });
      setShowAddSpotModal(false);
      setNewSpotNumber('');
      notifyAction('New parking spot created successfully in SQL database');
      loadInitialData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create spot');
    }
  };

  if (!isAdmin) {
    return (
      <div className={`max-w-xl mx-auto my-16 p-8 rounded-3xl border text-center shadow-lg ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">Administrator Access Required</h2>
        <p className="text-xs text-slate-500 mt-2">
          Your current account ({user?.email || 'Guest'}) does not have owner or garage-admin access.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          The owner must assign your account to a garage before you can manage it.
        </p>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    const matchSearch =
      b.booking_code.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.vehicle_plate.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.user_email.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredSpots = spots.filter((s) => {
    if (spotFilterLocation === 'all') return true;
    return String(s.location_id) === spotFilterLocation;
  });

  const filteredGarages = locations.filter((loc) => {
    if (!garageSearch.trim()) return true;
    const q = garageSearch.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Top Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold">MY-SLOT Admin Console</h1>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  Role: {isOwner ? 'OWNER' : 'GARAGE ADMIN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isOwner
                  ? 'Manage all garages, assign garage admins, reservations, pricing & SQL logs'
                  : 'Manage operations for your assigned garage only'}
              </p>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {actionMessage && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div className={`flex flex-wrap gap-2 my-6 p-1 rounded-2xl border w-fit ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        {[
          { key: 'overview', label: 'Overview & Stats', icon: BarChart3 },
          { key: 'garages', label: 'Garages & Locations', icon: Building2 },
          { key: 'spots', label: 'Parking & EV Spots', icon: Car },
          { key: 'bookings', label: 'User Bookings', icon: CalendarCheck },
          ...(isOwner ? [{ key: 'users', label: 'Users & RBAC', icon: Users }] : []),
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-3xl border shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-500 flex items-center justify-between">
                <span>Total Revenue (INR)</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                ₹{stats.total_revenue.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">From paid reservations</span>
            </div>

            <div className={`p-5 rounded-3xl border shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-500 flex items-center justify-between">
                <span>Active Bookings</span>
                <CalendarCheck className="w-4 h-4 text-cyan-600" />
              </span>
              <p className="text-2xl font-extrabold mt-2">
                {stats.total_bookings}
              </p>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">{stats.ev_bookings} EV sessions</span>
            </div>

            <div className={`p-5 rounded-3xl border shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-500 flex items-center justify-between">
                <span>Total Parking Bays</span>
                <Car className="w-4 h-4 text-amber-600" />
              </span>
              <p className="text-2xl font-extrabold mt-2">
                {stats.total_spots}
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{stats.available_spots} currently free</span>
            </div>

            <div className={`p-5 rounded-3xl border shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-500 flex items-center justify-between">
                <span>Dispatched Emails</span>
                <Mail className="w-4 h-4 text-purple-600" />
              </span>
              <p className="text-2xl font-extrabold mt-2">
                {stats.total_notifications}
              </p>
              <span className="text-[11px] text-slate-400">Automated SQL logs</span>
            </div>
          </div>

          {/* Real-time Occupancy Breakdown */}
          <div className={`p-6 rounded-3xl border shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold mb-3">Live Bay Utilization</h3>
            <div className={`h-4 w-full rounded-full overflow-hidden flex ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
              <div
                style={{ width: `${(stats.available_spots / (stats.total_spots || 1)) * 100}%` }}
                className="bg-emerald-500"
                title={`Available: ${stats.available_spots}`}
              />
              <div
                style={{ width: `${(stats.reserved_spots / (stats.total_spots || 1)) * 100}%` }}
                className="bg-amber-500"
                title={`Reserved: ${stats.reserved_spots}`}
              />
              <div
                style={{ width: `${(stats.occupied_spots / (stats.total_spots || 1)) * 100}%` }}
                className="bg-rose-500"
                title={`Occupied: ${stats.occupied_spots}`}
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Available: <strong>{stats.available_spots}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Reserved: <strong>{stats.reserved_spots}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Occupied: <strong>{stats.occupied_spots}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GARAGES & LOCATIONS MANAGEMENT */}
      {activeTab === 'garages' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={garageSearch}
                onChange={(e) => setGarageSearch(e.target.value)}
                placeholder="Search garages by name, address, or city..."
                className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {locations.length} Facilities Configured
              </span>
              {isOwner && (
                <button
                  onClick={openAddGarageModal}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Garage / Facility</span>
                </button>
              )}
            </div>
          </div>

          {filteredGarages.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold">No Garages Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {garageSearch ? `No locations match "${garageSearch}".` : 'No garages have been added yet.'}
              </p>
              {isOwner && (
                <button
                  onClick={openAddGarageModal}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Garage</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGarages.map((loc) => {
                const amenitiesList = Array.isArray(loc.amenities)
                  ? loc.amenities
                  : typeof loc.amenities === 'string'
                  ? (function () {
                      try {
                        return JSON.parse(loc.amenities || '[]');
                      } catch {
                        return [];
                      }
                    })()
                  : [];

                return (
                  <div
                    key={loc.id}
                    className={`rounded-3xl border overflow-hidden transition-all hover:shadow-md flex flex-col ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Image Header */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                      <img
                        src={loc.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'}
                        alt={loc.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/90 text-white backdrop-blur border border-white/10">
                          ID #{loc.id}
                        </span>
                        {loc.ev_spots > 0 && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/90 text-slate-950 backdrop-blur border border-amber-400/40 flex items-center space-x-1">
                            <Zap className="w-3 h-3 fill-slate-950" />
                            <span>{loc.ev_spots} EV Bays</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h4 className="font-extrabold text-base leading-snug line-clamp-1">{loc.name}</h4>
                        <p className="text-[11px] text-slate-300 flex items-center space-x-1 mt-0.5 line-clamp-1">
                          <MapPin className="w-3 h-3 shrink-0 text-cyan-400" />
                          <span>{loc.address}, {loc.city}</span>
                        </p>
                      </div>
                    </div>

                    {/* Body Specs */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Metric Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2.5 rounded-2xl border ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Capacity</span>
                          <span className="font-extrabold text-sm">{loc.total_spots} Spots</span>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-medium">({loc.ev_spots} EV Bays)</span>
                        </div>

                        <div className={`p-2.5 rounded-2xl border ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Rates</span>
                          <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">₹{loc.hourly_rate}/hr</span>
                          <span className="text-[10px] text-slate-400 block">₹{loc.ev_rate_kwh}/kWh</span>
                        </div>
                      </div>

                      {/* GPS Pill */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center space-x-1">
                          <span>GPS:</span>
                          <span>{Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Maps</span>
                        </a>
                      </div>

                      {/* Amenities Tags */}
                      {amenitiesList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {amenitiesList.slice(0, 4).map((a: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                                isDark
                                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {a}
                            </span>
                          ))}
                          {amenitiesList.length > 4 && (
                            <span className="text-[10px] text-slate-400 self-center font-bold">
                              +{amenitiesList.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSpotFilterLocation(String(loc.id));
                            setActiveTab('spots');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center space-x-1.5 ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                          }`}
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Spots</span>
                        </button>

                        <button
                          onClick={() => openEditGarageModal(loc)}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {isOwner && (
                          <button
                            onClick={() => handleDeleteGarage(loc.id, loc.name)}
                            title="Delete garage"
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPOTS & AVAILABILITY MANAGEMENT */}
      {activeTab === 'spots' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Facility:</span>
              <select
                value={spotFilterLocation}
                onChange={(e) => setSpotFilterLocation(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Locations ({spots.length} spots)</option>
                {locations.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (locations.length) {
                  setNewSpotLocationId(locations[0].id);
                  setShowAddSpotModal(true);
                }
              }}
              disabled={locations.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parking / EV Spot</span>
            </button>
          </div>

          <div className={`rounded-3xl border overflow-x-auto shadow-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4 font-semibold">Spot Number</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Floor</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Rate ($/hr)</th>
                  <th className="py-3 px-4 font-semibold">EV Specs</th>
                  <th className="py-3 px-4 font-semibold">Live Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredSpots.map((spot) => (
                  <tr key={spot.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono">
                      {spot.spot_number}
                    </td>
                    <td className="py-3 px-4 truncate max-w-[160px]">
                      {spot.location_name || 'Hub'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{spot.floor_level}</td>
                    <td className="py-3 px-4 capitalize font-medium">
                      {spot.spot_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      ${spot.price_per_hour.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {spot.spot_type === 'ev_charger' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                          {spot.ev_power_kw} kW ({spot.ev_charger_type})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={spot.status}
                        onChange={(e) => handleSpotStatusChange(spot.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          spot.status === 'available'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : spot.status === 'reserved'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : spot.status === 'occupied'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSpotPriceChange(spot.id, spot.price_per_hour)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                      >
                        Edit Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER BOOKINGS MANAGEMENT */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search by Booking Ref, License Plate, or Email..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className={`px-3 py-2 text-xs rounded-xl border focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active (Checked In)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={`rounded-3xl border overflow-x-auto shadow-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4 font-semibold">Ref Code</th>
                  <th className="py-3 px-4 font-semibold">User Email</th>
                  <th className="py-3 px-4 font-semibold">Vehicle</th>
                  <th className="py-3 px-4 font-semibold">Spot &amp; Location</th>
                  <th className="py-3 px-4 font-semibold">Gate PIN</th>
                  <th className="py-3 px-4 font-semibold">Stripe Paid</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-cyan-700 dark:text-cyan-400">
                      {b.booking_code}
                    </td>
                    <td className="py-3 px-4">{b.user_email}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {b.vehicle_plate}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">({b.vehicle_model})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold">{b.spot_number}</span>
                      <span className="text-slate-400 text-[11px] block">{b.location_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {b.gate_pin}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(b.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : b.status === 'active'
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                            : b.status === 'completed'
                            ? 'bg-slate-100 border-slate-200 text-slate-600'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleBookingStatusChange(b.id, 'active')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                        >
                          Check In
                        </button>
                      )}
                      {b.status === 'active' && (
                        <button
                          onClick={() => handleBookingStatusChange(b.id, 'completed')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          Check Out
                        </button>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button
                          onClick={() => handleBookingStatusChange(b.id, 'cancelled')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
            <Shield className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Assign users to one garage as admins, suspend access immediately, or delete accounts while retaining anonymized booking/payment history.
            </span>
          </div>

          <div className={`rounded-3xl border overflow-x-auto shadow-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4 font-semibold">User ID</th>
                  <th className="py-3 px-4 font-semibold">Full Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Phone</th>
                  <th className="py-3 px-4 font-semibold">Created At</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Account</th>
                  <th className="py-3 px-4 font-semibold text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">#{u.id}</td>
                    <td className="py-3 px-4 font-bold">{u.full_name}</td>
                    <td className="py-3 px-4 text-cyan-700 dark:text-cyan-300">{u.email}</td>
                    <td className="py-3 px-4 text-slate-400">{u.phone || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          u.role !== 'user'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'owner' && (
                        <div className="flex justify-end items-center gap-2 min-w-max">
                          <select
                            aria-label={`Garage for ${u.email}`}
                            value={selectedGarageByUser[u.id] || ''}
                            onChange={(e) => setSelectedGarageByUser((prev) => ({
                              ...prev,
                              [u.id]: Number(e.target.value),
                            }))}
                            className={`max-w-40 px-2 py-1 rounded-lg border ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                            }`}
                          >
                            <option value="">Select garage</option>
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUserRoleToggle(u, 'admin')}
                            disabled={u.is_active === false || !selectedGarageByUser[u.id]}
                            className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {u.role === 'admin' ? 'Save Garage' : 'Assign Admin'}
                          </button>
                          {u.role === 'admin' && (
                            <button
                              onClick={() => handleUserRoleToggle(u, 'user')}
                              className="px-3 py-1 rounded-lg text-xs font-semibold border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                            >
                              Demote
                            </button>
                          )}
                          <button
                            onClick={() => handleUserActiveChange(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                              u.is_active
                                ? 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {u.is_active ? 'Block' : 'Unblock'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: EMAIL DISPATCH LOGS */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Audit history of all confirmation emails generated and dispatched for real reservations.
          </p>

          <div className={`rounded-3xl border overflow-x-auto shadow-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4 font-semibold">Sent At</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Ref Code</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-cyan-700 dark:text-cyan-300 font-medium">
                      {log.recipient_email}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {log.subject}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {log.booking_code || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        Delivered
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD SPOT MODAL */}
      {showAddSpotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className="text-base font-bold mb-4">Add New Parking / EV Spot</h3>
            <form onSubmit={handleCreateSpot} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Facility Location</label>
                <select
                  value={newSpotLocationId}
                  onChange={(e) => setNewSpotLocationId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Spot Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-EV05 or 2-R14"
                  value={newSpotNumber}
                  onChange={(e) => setNewSpotNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Floor Level</label>
                  <select
                    value={newSpotFloor}
                    onChange={(e) => setNewSpotFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Rooftop">Rooftop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Spot Type</label>
                  <select
                    value={newSpotType}
                    onChange={(e) => setNewSpotType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="regular">Regular</option>
                    <option value="ev_charger">EV Fast Charger</option>
                    <option value="accessible">Accessible / Handicap</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              </div>

              {newSpotType === 'ev_charger' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">Charger Type</label>
                    <select
                      value={newSpotChargerType}
                      onChange={(e) => setNewSpotChargerType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="CCS2 DC Fast">CCS2 DC Fast</option>
                      <option value="Tesla Supercharger">Tesla Supercharger</option>
                      <option value="Type 2 AC">Type 2 AC</option>
                      <option value="CHAdeMO Fast">CHAdeMO Fast</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Power Output (kW)</label>
                    <input
                      type="number"
                      value={newSpotPowerKw}
                      onChange={(e) => setNewSpotPowerKw(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-500 mb-1">Hourly Parking Price (₹)</label>
                <input
                  type="number"
                  step="0.50"
                  value={newSpotPrice}
                  onChange={(e) => setNewSpotPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSpotModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Spot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT GARAGE MODAL */}
      {showGarageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className={`relative w-full max-w-2xl my-8 rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <button
              onClick={() => setShowGarageModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {editingGarage ? 'Edit Garage Facility' : 'Add New Parking Garage & EV Hub'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingGarage
                    ? 'Update facility information, pricing rates, and capacity.'
                    : 'Creates facility in SQL database and automatically generates parking bays and EV charging spots.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGarage} className="space-y-4 text-xs">
              {/* Garage Name */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Garage / Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DLF Cyber Hub Smart Garage or CP Central Park EV Hub"
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none text-xs ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Address & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DLF Phase 2, Sector 24"
                    value={gAddress}
                    onChange={(e) => setGAddress(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none text-xs ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City &amp; State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gurugram, Haryana"
                    value={gCity}
                    onChange={(e) => setGCity(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none text-xs ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    GPS Coordinates (Latitude &amp; Longitude) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setGLatitude(Number(pos.coords.latitude.toFixed(4)));
                            setGLongitude(Number(pos.coords.longitude.toFixed(4)));
                          },
                          () => {
                            alert('Could not retrieve current location.');
                          }
                        );
                      }
                    }}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Detect My GPS</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Latitude (e.g. 28.4952)"
                      value={gLatitude}
                      onChange={(e) => setGLatitude(Number(e.target.value))}
                      className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none font-mono text-xs ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Longitude (e.g. 77.0890)"
                      value={gLongitude}
                      onChange={(e) => setGLongitude(Number(e.target.value))}
                      className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none font-mono text-xs ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">Presets:</span>
                  {[
                    { name: 'Delhi', lat: 28.6315, lng: 77.2167, city: 'New Delhi' },
                    { name: 'Gurugram', lat: 28.4952, lng: 77.0890, city: 'Gurugram, Haryana' },
                    { name: 'Mumbai', lat: 19.0657, lng: 72.8687, city: 'Mumbai, Maharashtra' },
                    { name: 'Bengaluru', lat: 12.9716, lng: 77.6412, city: 'Bengaluru, Karnataka' },
                    { name: 'Hyderabad', lat: 17.4504, lng: 78.3808, city: 'Hyderabad, Telangana' },
                    { name: 'Pune', lat: 18.5362, lng: 73.8940, city: 'Pune, Maharashtra' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setGLatitude(preset.lat);
                        setGLongitude(preset.lng);
                        if (!gCity || gCity === 'New Delhi') setGCity(preset.city);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity & Rates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Spots
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    required
                    value={gTotalSpots}
                    onChange={(e) => setGTotalSpots(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-xs ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    EV Bays
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={gTotalSpots}
                    required
                    value={gEvSpots}
                    onChange={(e) => setGEvSpots(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-xs ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rate (₹/hr)
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    required
                    value={gHourlyRate}
                    onChange={(e) => setGHourlyRate(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-xs font-bold text-emerald-600 dark:text-emerald-400 ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    EV Rate (₹/kWh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={gEvRateKwh}
                    onChange={(e) => setGEvRateKwh(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-xs font-bold text-cyan-600 dark:text-cyan-400 ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amenities &amp; Features (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 24/7 Security, 150kW DC Fast Charging, CCTV Surveillance, Valet Service"
                  value={gAmenities}
                  onChange={(e) => setGAmenities(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none text-xs ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">Click to add:</span>
                  {[
                    '24/7 Security',
                    '150kW DC Fast Charging',
                    'CCS2 & Tesla Compatible',
                    'CCTV Surveillance',
                    'Valet Service',
                    'Covered Parking',
                    'Restrooms',
                    'Free WiFi',
                  ].map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => {
                        const current = gAmenities
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (!current.includes(amenity)) {
                          setGAmenities(current.concat(amenity).join(', '));
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[10px] border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      + {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL & Preset Thumbnails */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cover Photo Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={gImageUrl}
                  onChange={(e) => setGImageUrl(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none text-xs font-mono ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />

                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-[10px] text-slate-400">Sample Photos:</span>
                  {[
                    { label: 'Basement', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80' },
                    { label: 'EV Hub', url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80' },
                    { label: 'Modern Deck', url: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80' },
                    { label: 'Eco Park', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setGImageUrl(p.url)}
                      className="text-[10px] underline text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold"
                    >
                      {p.label}
                    </button>
                  ))}
                  {gImageUrl && (
                    <div className="ml-auto w-12 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                      <img src={gImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex items-center space-x-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGarageModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGarage}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center space-x-2"
                >
                  {savingGarage ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingGarage ? 'Update Garage Details' : 'Create Garage & Generate Spots'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
