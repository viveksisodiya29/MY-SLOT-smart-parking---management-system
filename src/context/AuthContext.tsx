import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import {
  ApiError,
  getCurrentUser,
  loginUser,
  registerUser,
  setStoredToken,
  getStoredToken,
} from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    requested_role?: string;
    admin_code?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await getCurrentUser();
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      } else {
        console.error('Failed to refresh user profile:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();

    const refreshOnFocus = () => {
      void refreshUser();
    };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [refreshUser]);

  const login = async (identifier: string, pass: string) => {
    const res = await loginUser({ identifier, password: pass });
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    requested_role?: string;
    admin_code?: string;
  }) => {
    const res = await registerUser(payload);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin: user?.role === 'admin' || user?.role === 'owner',
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
