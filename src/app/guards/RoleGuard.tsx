import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth/authContext';
import type { UserRole } from '@/lib/api/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, isAllowed } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAllowed(allowedRoles)) {
    if (user.role === 'student') {
      return <Navigate to="/my-schedule" replace />;
    }
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};
