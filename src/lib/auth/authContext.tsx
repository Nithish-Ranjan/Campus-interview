import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../api/types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  signOut: () => void;
  signIn: (email: string) => Promise<void>;
  isAllowed: (allowedRoles: UserRole[]) => boolean;
}

const defaultAuthContext: AuthContextType = {
  user: {
    id: 'usr-coord',
    name: 'Priya Sharma',
    email: 'priya.s@campus.edu',
    role: 'coordinator',
    environment: 'demo'
  },
  isLoading: false,
  switchRole: async () => {},
  signOut: () => {},
  signIn: async () => {},
  isAllowed: () => true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Bootstrap user session
    apiClient.getMe()
      .then(u => setUser(u))
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

  const signIn = async (_email: string) => {
    setIsLoading(true);
    try {
      const u = await apiClient.getMe();
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
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
