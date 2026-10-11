import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../api/types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password?: string) => Promise<void>;
  isAllowed: (allowedRoles: UserRole[]) => boolean;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: true,
  switchRole: async () => {},
  signOut: async () => {},
  signIn: async () => {},
  isAllowed: () => false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Bootstrap user session from server
    apiClient.getMe()
      .then(u => {
        if (u && u.id) setUser(u);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const updated = await apiClient.switchRole(role);
      setUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string = 'Demo@2026!') => {
    setIsLoading(true);
    try {
      const res = await apiClient.login(email, password);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
    }
  };

  const isAllowed = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, switchRole, signOut, signIn, isAllowed }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
};
