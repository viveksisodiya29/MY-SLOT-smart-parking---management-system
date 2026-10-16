import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'register';
  theme?: 'light' | 'dark';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'signin',
  theme = 'light',
}) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register'>(defaultTab);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'user' | 'owner'>('user');
  const [adminCode, setAdminCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'signin') {
        await login(email, password);
        onClose();
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }

        await register({
          email,
          password,
          full_name: fullName,
          phone,
          requested_role: role,
          admin_code: role === 'owner' ? adminCode : undefined,
        });

        setSuccessMsg(
          role === 'owner'
            ? 'Owner account created successfully!'
            : 'Account registered successfully!'
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header decoration */}
        <div className={`p-6 border-b relative ${
          isDark
            ? 'bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 border-slate-800'
            : 'bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {tab === 'signin' ? 'Sign In to MY-SLOT' : 'Create Real Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tab === 'signin'
                  ? 'Access real-time parking & EV charging reservations'
                  : 'Role-based access control with real database authentication'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className={`flex mt-5 p-1 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === 'signin'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === 'register'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'register' && (
            <>
              {/* Account Type Selector (RBAC) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Role (RBAC)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      role === 'user'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-bold dark:bg-cyan-500/15 dark:border-cyan-500 dark:text-cyan-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Driver / User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      role === 'owner'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold dark:bg-amber-500/15 dark:border-amber-500 dark:text-amber-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Owner</span>
                  </button>
                </div>
              </div>

              {role === 'owner' && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2 dark:bg-amber-500/10 dark:border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900 dark:text-amber-300">Owner Secret Key</span>
                  </div>
                  <input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter the owner key from server configuration"
                    autoComplete="off"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl text-amber-950 font-mono focus:outline-none dark:bg-slate-900 dark:border-amber-500/40 dark:text-amber-200"
                  />
                  <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                    Owner access to all garages and account management. Garage admins are assigned by the owner and do not use this key.
                  </p>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Phone Number (Required)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
              {tab === 'signin' ? 'Email or Phone Number' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={tab === 'signin' ? 'text' : 'email'}
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tab === 'signin' ? 'name@example.com or +91 98765 43210' : 'name@example.com'}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark
                      ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{tab === 'signin' ? 'Sign In Securely' : 'Complete Registration'}</span>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            {tab === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
