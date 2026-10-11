import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  HelpCircle, 
  ChevronDown, 
  UserCheck,
  Menu,
  ChevronRight,
  Database,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/authContext';
import { ConnectionIndicator } from '@/components/domain/ConnectionIndicator';
import { Breadcrumbs } from './Breadcrumbs';
import type { UserRole } from '@/lib/api/types';
import { subscribeDataSourceStatus, type DataSourceStatus } from '@/lib/api/client';
import { formatTimeIST, TIMEZONE_LABEL } from '@/lib/format/date';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  primaryAction?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  onOpenCommandPalette,
  onOpenShortcuts,
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  primaryAction
}) => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceStatus>('postgres');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return subscribeDataSourceStatus((status) => {
      setDataSource(status);
    });
  }, []);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'coordinator', label: 'Placement Coordinator', desc: 'Main operator (Criteria, Schedule, Simulations)' },
    { role: 'officer', label: 'Placement Officer', desc: 'Approver (Approves proposals, Read everything)' },
    { role: 'admin', label: 'Administrator', desc: 'System head (Manage roles, demo resets, all actions)' },
    { role: 'panel_coordinator', label: 'Panel Coordinator', desc: 'Room A operator (Live status only)' },
    { role: 'student', label: 'Student', desc: 'Candidate (Aarav Sharma - Student profile & schedule)' }
  ];

  return (
    <header className="h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-all">
      {/* Left Area: Mobile Menu Trigger + Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapsed Expander button */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Breadcrumbs Navigation */}
        <Breadcrumbs />

        {/* Fallback Title on mobile if breadcrumbs are hidden */}
        {title && (
          <div className="md:hidden flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs">
              {title}
            </h1>
            {subtitle && <p className="text-[11px] text-slate-500 hidden sm:inline truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Realtime Connection Indicator */}
        <ConnectionIndicator />

        {/* Data Source Indicator: PostgreSQL Live vs Mock Fallback */}
        {dataSource === 'postgres' ? (
          <span 
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
            title="Active Data Source: Live PostgreSQL Database (Port 4000)"
          >
            <Database className="w-3 h-3 text-emerald-600" />
            <span>PostgreSQL Live</span>
          </span>
        ) : (
          <span 
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs"
            title="Active Data Source: Mock Engine Fallback (Backend disconnected)"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Mock Fallback</span>
          </span>
        )}

        {/* Demo environment pill */}
        <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
          <Sparkles className="w-3 h-3 text-blue-600" />
          <span>Demo Environment</span>
        </span>

        {/* IST Clock */}
        <div className="hidden lg:flex items-center text-xs font-mono text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200 tabular-nums">
          <span>{formatTimeIST(currentTime)} {TIMEZONE_LABEL}</span>
        </div>

        {/* Quick Role Switcher (Essential for 5-minute repeatable demo) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 border border-slate-200 transition-colors shadow-2xs"
            title="Switch demo user role"
            aria-expanded={roleMenuOpen}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize font-semibold hidden sm:inline">{user?.role.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div 
              className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              role="menu"
            >
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Demo Role Switcher
              </div>
              {roles.map(r => (
                <button
                  key={r.role}
                  type="button"
                  onClick={async () => {
                    await switchRole(r.role);
                    setRoleMenuOpen(false);
                    if (r.role === 'student') {
                      navigate('/my-schedule');
                    } else if (r.role === 'officer') {
                      navigate('/approvals');
                    } else if (r.role === 'panel_coordinator') {
                      navigate('/live');
                    } else {
                      navigate('/overview');
                    }
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs transition-colors flex flex-col',
                    user?.role === r.role ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  )}
                  role="menuitem"
                >
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{r.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search button */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 bg-slate-50/80 transition-colors shadow-2xs flex items-center justify-center"
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* Shortcuts button (?) */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* Primary Action Slot (Rightmost) */}
        {primaryAction && (
          <div className="ml-1">
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
};
