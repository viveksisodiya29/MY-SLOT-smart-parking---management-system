import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  MapPin,
  Clock,
  Car,
  Zap,
  QrCode,
  ExternalLink,
  Ban,
  CheckCircle,
  AlertCircle,
  Mail,
  Navigation,
} from 'lucide-react';
import { Booking } from '../types.ts';
import { getMyBookings, cancelMyBooking } from '../lib/api.ts';

interface MyBookingsViewProps {
  onOpenEmails: () => void;
  onExplore: () => void;
  theme?: 'light' | 'dark';
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  onOpenEmails,
  onExplore,
  theme = 'light',
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [qrModalBooking, setQrModalBooking] = useState<Booking | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyBookings();
      setBookings(res.bookings);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The spot will be released.')) {
      return;
    }
    setCancellingId(bookingId);
    try {
      await cancelMyBooking(bookingId);
      await loadBookings();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'confirmed':
          return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
        case 'active':
          return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
        case 'completed':
          return 'bg-slate-800 border-slate-700 text-slate-400';
        case 'cancelled':
          return 'bg-red-500/15 border-red-500/30 text-red-400';
        default:
          return 'bg-slate-800 text-slate-300';
      }
    } else {
      switch (status) {
        case 'confirmed':
          return 'bg-emerald-50 border-emerald-300 text-emerald-800';
        case 'active':
          return 'bg-cyan-50 border-cyan-300 text-cyan-800';
        case 'completed':
          return 'bg-slate-100 border-slate-200 text-slate-600';
        case 'cancelled':
          return 'bg-rose-50 border-rose-200 text-rose-800';
        default:
          return 'bg-slate-100 text-slate-600';
      }
    }
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold">My Spot Reservations</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-200 dark:border-cyan-500/30">
              {bookings.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time access passes, gate barrier PINs, and automated Stripe billing receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenEmails}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Sent Confirmation Emails</span>
          </button>
          <button
            onClick={onExplore}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
          >
            <span>Book New Spot</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex space-x-2 my-6 p-1 rounded-2xl border w-fit ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === t
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading your reservations from SQL database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`py-16 text-center rounded-3xl border p-8 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className={`w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center mb-3 ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold">No reservations found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            You don't have any bookings under this filter. Explore available parking and EV slots on the live map.
          </p>
          <button
            onClick={onExplore}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all"
          >
            Find Nearest Parking Spot
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            const isEv = b.is_ev === 1;

            return (
              <div
                key={b.id}
                className={`rounded-3xl border p-5 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${getStatusBadge(b.status)}`}>
                      {b.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Ref: <span className={isDark ? 'text-white' : 'text-slate-900'}>{b.booking_code}</span>
                    </span>
                    {isEv && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                        <Zap className="w-3 h-3 fill-amber-500" />
                        <span>EV Fast Charged</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold flex items-center space-x-2">
                    <span>{b.location_name}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono">Spot #{b.spot_number}</span>
                  </h3>

                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.location_address}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-300">{b.vehicle_plate}</span>
                      <span>({b.vehicle_model})</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duration: {b.total_hours} hrs</span>
                    </span>
                  </div>
                </div>

                {/* Right Access Pass & Actions */}
                <div className={`flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  {/* Gate PIN box */}
                  <div className={`px-3.5 py-2 rounded-2xl border text-center ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gate PIN</span>
                    <span className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 font-mono tracking-wider">
                      {b.gate_pin}
                    </span>
                  </div>

                  {/* QR Pass Button */}
                  <button
                    onClick={() => setQrModalBooking(b)}
                    className={`p-2.5 rounded-2xl border transition-colors ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                    }`}
                    title="View Gate QR Pass"
                  >
                    <QrCode className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </button>

                  {/* Directions */}
                  {b.latitude && b.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${b.latitude},${b.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-2xl border transition-colors ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                      }`}
                      title="Open GPS Directions"
                    >
                      <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </a>
                  )}

                  {/* Cancel Button */}
                  {isConfirmed && (
                    <button
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancel(b.id)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 transition-colors flex items-center space-x-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{cancellingId === b.id ? 'Releasing...' : 'Cancel'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <button
              onClick={() => setQrModalBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-base font-bold">Gate Barrier Pass</h3>
            <p className="text-xs text-slate-500">
              Scan barcode or type PIN <strong className="text-cyan-600 dark:text-cyan-400 font-mono text-sm">{qrModalBooking.gate_pin}</strong> at the barrier.
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-md mx-auto border border-slate-200">
              <svg width="140" height="140" viewBox="0 0 100 100" fill="black">
                <rect x="5" y="5" width="28" height="28" fill="black" />
                <rect x="9" y="9" width="20" height="20" fill="white" />
                <rect x="13" y="13" width="12" height="12" fill="black" />

                <rect x="67" y="5" width="28" height="28" fill="black" />
                <rect x="71" y="9" width="20" height="20" fill="white" />
                <rect x="75" y="13" width="12" height="12" fill="black" />

                <rect x="5" y="67" width="28" height="28" fill="black" />
                <rect x="9" y="71" width="20" height="20" fill="white" />
                <rect x="13" y="75" width="12" height="12" fill="black" />

                <rect x="38" y="12" width="10" height="10" fill="black" />
                <rect x="44" y="38" width="12" height="12" fill="black" />
                <rect x="42" y="68" width="14" height="14" fill="black" />
                <rect x="74" y="44" width="12" height="12" fill="black" />
              </svg>
            </div>

            <div className={`p-3 rounded-2xl border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold">{qrModalBooking.location_name}</p>
              <p className="text-slate-500">Spot #{qrModalBooking.spot_number} ({qrModalBooking.floor_level})</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-1">Vehicle: {qrModalBooking.vehicle_plate}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
