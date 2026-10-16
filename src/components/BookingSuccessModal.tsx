import React from 'react';
import {
  X,
  CheckCircle,
  QrCode,
  MapPin,
  Calendar,
  Clock,
  Car,
  Mail,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface BookingSuccessModalProps {
  booking: any;
  onClose: () => void;
  onViewBookings: () => void;
  onViewEmails: () => void;
  theme?: 'light' | 'dark';
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  booking,
  onClose,
  onViewBookings,
  onViewEmails,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-black/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center mb-3">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">Reservation Confirmed!</h3>
          <p className="text-xs text-emerald-100 mt-1">
            Payment authorized • Spot #{booking.spot_number} locked
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Gate Access Pass Ticket */}
          <div className={`p-4 rounded-2xl border text-center relative overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
          }`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-blue-500" />

            <div className="flex items-center justify-center space-x-6 py-2">
              {/* Dynamic SVG QR Code */}
              <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                <svg width="88" height="88" viewBox="0 0 100 100" fill="black">
                  <rect x="5" y="5" width="28" height="28" fill="black" />
                  <rect x="9" y="9" width="20" height="20" fill="white" />
                  <rect x="13" y="13" width="12" height="12" fill="black" />

                  <rect x="67" y="5" width="28" height="28" fill="black" />
                  <rect x="71" y="9" width="20" height="20" fill="white" />
                  <rect x="75" y="13" width="12" height="12" fill="black" />

                  <rect x="5" y="67" width="28" height="28" fill="black" />
                  <rect x="9" y="71" width="20" height="20" fill="white" />
                  <rect x="13" y="75" width="12" height="12" fill="black" />

                  <rect x="38" y="10" width="8" height="8" fill="black" />
                  <rect x="50" y="18" width="8" height="8" fill="black" />
                  <rect x="10" y="38" width="8" height="8" fill="black" />
                  <rect x="24" y="44" width="8" height="8" fill="black" />
                  <rect x="40" y="40" width="20" height="20" fill="black" />
                  <rect x="44" y="44" width="12" height="12" fill="white" />
                  <rect x="68" y="44" width="8" height="8" fill="black" />
                  <rect x="80" y="52" width="10" height="8" fill="black" />
                  <rect x="42" y="68" width="10" height="12" fill="black" />
                  <rect x="60" y="76" width="12" height="8" fill="black" />
                  <rect x="78" y="74" width="12" height="14" fill="black" />
                </svg>
              </div>

              {/* PIN Code Display */}
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Gate Entry PIN
                </span>
                <div className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono tracking-widest my-0.5">
                  {booking.gate_pin}
                </div>
                <span className="text-xs text-slate-500">
                  Ref: <strong className={isDark ? 'text-white' : 'text-slate-900 font-mono'}>{booking.booking_code}</strong>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Scan QR or punch PIN at the entrance barrier keypad to open gate.
            </p>
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs">
            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold">{booking.location_name}</span>
            </div>
            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-slate-500">Reserved Spot:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{booking.spot_number} ({booking.floor_level})</span>
            </div>
            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-slate-500">Total Paid:</span>
              <span className="font-bold">₹{Number(booking.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Email notice badge */}
          <div className={`p-3 rounded-2xl border flex items-start space-x-2 text-xs ${
            isDark ? 'bg-blue-950/40 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Confirmation Email Dispatched</p>
              <p className="text-[11px] opacity-85">
                Official booking confirmation &amp; Stripe receipt sent to{' '}
                <strong className={isDark ? 'text-white' : 'text-blue-950'}>{booking.email_sent_to}</strong>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onViewEmails();
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>View Sent Email</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onViewBookings();
              }}
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-cyan-600/20"
            >
              <span>My Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
