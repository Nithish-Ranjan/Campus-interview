import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth/authContext';

export const SessionGuard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F4F7FB]" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-semibold text-[#64748B] tracking-wide uppercase">Bootstrapping Placement Command session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
