import React from 'react';
import {
  Car,
  Zap,
  MapPin,
  CalendarCheck,
  Shield,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Navigation,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentView: 'find' | 'bookings' | 'notifications' | 'admin';
  setCurrentView: (view: 'find' | 'bookings' | 'notifications' | 'admin') => void;
  onOpenAuth: () => void;
  gpsActive: boolean;
  gpsLocationName: string;
  onTriggerGps: () => void;
  bookingCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenAuth,
  gpsActive,
  gpsLocationName,
  onTriggerGps,
  bookingCount,
  theme,
  onToggleTheme,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur border-b transition-colors ${
      isDark
        ? 'bg-slate-900/95 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-xs'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('find')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-md shadow-cyan-600/20">
              <Car className="w-5 h-5 text-white" />
              <Zap className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 fill-amber-300 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`font-extrabold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  MY-<span className="text-cyan-600">SLOT</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30">
                  EV Ready
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Smart Parking & Fast EV Charging
              </p>
            </div>
          </div>

          {/* GPS Quick Location Pill */}
          <button
            onClick={onTriggerGps}
            title="Click to detect your current GPS location"
            className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              gpsActive
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-300'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsActive ? (isDark ? 'text-emerald-400 animate-pulse' : 'text-emerald-600 animate-pulse') : 'text-slate-400'}`} />
            <span className="truncate max-w-[180px]">
              {gpsActive ? gpsLocationName : 'Detect GPS Location'}
            </span>
          </button>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setCurrentView('find')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'find'
                  ? isDark
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                    : 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Find & Reserve</span>
            </button>

            {user && (
              <>
                <button
                  onClick={() => setCurrentView('bookings')}
                  className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'bookings'
                      ? isDark
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">My Bookings</span>
                  {bookingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-600 text-white">
                      {bookingCount}
                    </span>
                  )}
                </button>

              </>
            )}

            {/* Admin Console Tab (Visible if Admin) */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentView === 'admin'
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                    : isDark
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Console</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile / Auth Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white">
                    {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className={`text-xs font-semibold truncate max-w-[100px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {user.full_name}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${user.role !== 'user' ? 'text-amber-600 font-extrabold' : 'text-cyan-600'}`}>
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-200 text-slate-800 shadow-lg'
                    }`}
                    onClick={() => setProfileOpen(false)}
                  >
                    <div className={`px-4 py-2.5 border-b ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
                      <p className="text-sm font-semibold">{user.full_name}</p>
                      <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                      <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className={user.role !== 'user' ? 'text-amber-600 font-extrabold' : 'text-cyan-600'}>
                          Role: {user.role.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {user.role !== 'user' && (
                      <button
                        onClick={() => setCurrentView('admin')}
                        className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-slate-700/60 flex items-center space-x-2 font-medium"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>Manage Parking & Bookings</span>
                      </button>
                    )}

                    <button
                      onClick={() => setCurrentView('bookings')}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center space-x-2 ${
                        isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Reservations</span>
                    </button>

                    <div className={`my-1 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`} />

                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2 font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
