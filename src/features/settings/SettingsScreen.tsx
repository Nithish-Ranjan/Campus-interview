import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings as SettingsIcon, 
  Sparkles, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  Play,
  Key,
  Sliders,
  Database
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { User, UserRole } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const SettingsScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();

  // Determine initial tab from URL path or fallback to role-appropriate default
  const getDefaultTab = (): 'users' | 'preferences' | 'demo' => {
    const path = window.location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/demo')) return 'demo';
    if (path.includes('/preferences')) return 'preferences';
    // Non-admins cannot see users tab — default to preferences
    return 'preferences';
  };
  const [activeTab, setActiveTab] = useState<'users' | 'preferences' | 'demo'>(getDefaultTab);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    apiClient.getUsers().then(res => setUsersList(res));
  }, []);

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    const updated = await apiClient.updateUserRole(targetUserId, newRole);
    setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (user?.id === targetUserId) {
      switchRole(newRole);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo data back to the clean 5-minute walkthrough baseline?')) {
      return;
    }
    setIsResetting(true);
    try {
      await apiClient.resetDemo();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
      alert('Demo data has been reset to baseline in under 1 second!');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Header Card */}
      <Card className="border-[#E2E8F0] shadow-xs">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#2563EB]" />
              <h1 className="text-lg font-bold text-[#142C4E]">Console Settings & Demo Operations</h1>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Configure system operators, UI density preferences, and synthetic demo environments.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#E2E8F0] text-xs font-bold text-[#64748B]">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent hover:text-[#172033]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Role Assignments</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'preferences' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent hover:text-[#172033]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Console Preferences</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'demo' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent hover:text-[#172033]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Demo Controls & Reset</span>
          </button>
        )}
      </div>

      {/* Tab 1: Users & Roles */}
      {activeTab === 'users' && isAdmin && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#142C4E]">Authorized Operators ({usersList.length})</h2>
                <p className="text-xs text-[#64748B]">Assign roles to test different permission levels and approval limits</p>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {usersList.map(u => (
                <div key={u.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-[#142C4E] flex items-center gap-2">
                      <span>{u.name}</span>
                      {user?.id === u.id && (
                        <Badge variant="info" className="text-[10px]">
                          Active Session
                        </Badge>
                      )}
                    </div>
                    <div className="text-[#64748B] font-mono text-[11px] mt-0.5">{u.email}</div>
                    {u.assignedPanels && (
                      <div className="text-[10px] text-[#2563EB] mt-0.5 font-medium">Assigned Panels: {u.assignedPanels.join(', ')}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#172033] focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="admin">Administrator</option>
                      <option value="officer">Placement Officer</option>
                      <option value="coordinator">Placement Coordinator</option>
                      <option value="panel_coordinator">Panel Coordinator</option>
                      <option value="observer">Observer (Read-only)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Preferences */}
      {activeTab === 'preferences' && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 space-y-6 text-xs">
            <div>
              <h2 className="text-sm font-bold text-[#142C4E] mb-1">Display & Density Preferences</h2>
              <p className="text-[#64748B]">Personalize table layout density for your device viewport.</p>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#142C4E] block">Table Row Density</span>
                <span className="text-[#64748B] text-[11px]">Choose between compact 36px expert rows and 44px comfortable rows</span>
              </div>

              <div className="flex bg-white border border-[#E2E8F0] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    density === 'compact' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B]'
                  }`}
                >
                  Compact (36px)
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    density === 'comfortable' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B]'
                  }`}
                >
                  Comfortable (44px)
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Demo Controls & Scenario Loader */}
      {activeTab === 'demo' && isAdmin && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-sm font-bold text-[#142C4E]">Five-Minute Demo Scenario Controller</h2>
                </div>
                <p className="text-[#64748B] mt-0.5">
                  Deterministic synthetic data loader (Asteria 40 applicants/10 slots, Harbor clash, delay simulation).
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                disabled={isResetting}
                onClick={handleResetDemo}
                isLoading={isResetting}
                className="gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResetting ? 'Resetting (<1s)...' : 'Reset Scenario to Baseline'}</span>
              </Button>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[#16845B] font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Demo dataset successfully reset to baseline in under 1 second!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="font-bold text-[#142C4E] flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Pre-Configured Demo Datasets:</span>
                </div>
                <ul className="space-y-1 text-[#64748B] text-[11px] list-disc list-inside">
                  <li>Asteria Systems: 40 Eligible, 10 Selected, 30 Waitlisted, 0 Ineligible</li>
                  <li>Harbor Analytics: 9 Eligible, 2 Ineligible, 1 Pending verification</li>
                  <li>Draft Schedule: Prepared Dr. Rao clash at 10:30 AM in Room B (409)</li>
                  <li>Disruption Simulation: 30-min Room A delay with valid & invalid recovery options</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-[#142C4E] space-y-2">
                <div className="font-bold text-[#2563EB]">Five-Minute Rehearsal Script:</div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Window 1 (Coordinator) opens Overview &rarr; Capacity &rarr; Schedule Draft clash move &rarr; Live delay.
                  Window 2 (Officer) receives realtime signal &rarr; reviews proposal &rarr; approves & publishes as v2.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
