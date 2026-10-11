import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import type { UserRole } from '@/lib/api/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const LoginScreen: React.FC = () => {
  const { user, signIn, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('coordinator@placement.example');
  const [password, setPassword] = useState('Demo@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already signed in, redirect to role landing
  React.useEffect(() => {
    if (user) {
      if (user.role === 'student') navigate('/my-schedule');
      else if (user.role === 'officer') navigate('/approvals');
      else if (user.role === 'panel_coordinator') navigate('/live');
      else navigate('/overview');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid account email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await switchRole(role);
    } catch (err: any) {
      setError(err.message || 'Failed to switch to demo role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-[#E2E8F0] shadow-lg overflow-hidden bg-white">
          {/* Brand Header */}
          <div className="p-8 pb-6 border-b border-[#E2E8F0] bg-slate-50/50 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#142C4E] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <GraduationCap className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h1 className="text-xl font-bold text-[#142C4E] tracking-tight">Placement Command</h1>
            <p className="text-xs text-[#2563EB] mt-1 font-semibold tracking-wide">
              See the risk. Test the change. Recover the schedule.
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">
              Campus Placement Interview Scheduling & Operations Console
            </p>
          </div>

          {/* Form Body */}
          <div className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5" htmlFor="email-input">
                  Account Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  placeholder="coordinator@placement.example"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] text-[#172033]"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#172033]" htmlFor="password-input">
                    Password
                  </label>
                  <span className="text-[10px] text-[#64748B] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#2563EB]" /> Demo pwd: <code>Demo@2026!</code>
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] pr-10 text-[#172033]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172033] p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full py-2.5 text-xs font-bold gap-2"
              >
                <span>Sign In to Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <span>Judge Demo Role Access</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('coordinator')}
                  className="p-2.5 text-left bg-[#F8FAFC] hover:bg-[#2563EB]/5 hover:border-[#2563EB] border border-[#E2E8F0] rounded-lg transition-all group"
                >
                  <div className="font-bold text-[#142C4E] group-hover:text-[#2563EB]">Coordinator</div>
                  <div className="text-[10px] text-[#64748B]">Schedule & proposals</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('officer')}
                  className="p-2.5 text-left bg-[#F8FAFC] hover:bg-[#2563EB]/5 hover:border-[#2563EB] border border-[#E2E8F0] rounded-lg transition-all group"
                >
                  <div className="font-bold text-[#142C4E] group-hover:text-[#2563EB]">Officer</div>
                  <div className="text-[10px] text-[#64748B]">Verify & 2-key approval</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin')}
                  className="p-2.5 text-left bg-[#F8FAFC] hover:bg-[#2563EB]/5 hover:border-[#2563EB] border border-[#E2E8F0] rounded-lg transition-all group"
                >
                  <div className="font-bold text-[#142C4E] group-hover:text-[#2563EB]">Administrator</div>
                  <div className="text-[10px] text-[#64748B]">System administration</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('panel_coordinator')}
                  className="p-2.5 text-left bg-[#F8FAFC] hover:bg-[#2563EB]/5 hover:border-[#2563EB] border border-[#E2E8F0] rounded-lg transition-all group"
                >
                  <div className="font-bold text-[#142C4E] group-hover:text-[#2563EB]">Panel Coord</div>
                  <div className="text-[10px] text-[#64748B]">Assigned room ops</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('student')}
                  className="col-span-2 p-2.5 text-left bg-[#F8FAFC] hover:bg-[#2563EB]/5 hover:border-[#2563EB] border border-[#E2E8F0] rounded-lg transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#142C4E] group-hover:text-[#2563EB]">Student (Aarav Sharma)</div>
                    <div className="text-[10px] text-[#64748B]">Private portal, resume & schedule</div>
                  </div>
                  <GraduationCap className="w-4 h-4 text-[#2563EB]/70 group-hover:text-[#2563EB]" />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
