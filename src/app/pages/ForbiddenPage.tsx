import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/button';

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth();

  const getLandingPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'student': return '/my-schedule';
      case 'officer': return '/approvals';
      case 'panel_coordinator': return '/live';
      default: return '/overview';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center mb-4 border border-red-200">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-[#142C4E] mb-2">403 — Access Restricted</h1>
      <p className="text-sm text-[#64748B] max-w-md mb-6 leading-relaxed">
        Your current role (<strong className="font-semibold text-[#142C4E] capitalize">{user?.role?.replace('_', ' ') || 'Guest'}</strong>) does not have permission to view this section of Placement Command.
      </p>

      <div className="flex items-center gap-3">
        <Link to={getLandingPath()}>
          <Button variant="default" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your Landing Page</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
