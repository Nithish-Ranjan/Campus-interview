import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ShieldCheck, 
  Boxes, 
  Calendar, 
  Activity, 
  RotateCcw, 
  CheckSquare, 
  FileText, 
  Settings, 
  LogOut,
  GraduationCap,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import type { UserRole } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  badgeCount?: number;
}

interface NavGroup {
  groupName?: string;
  items: NavItem[];
}

interface SideNavProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  pendingProposalsCount?: number;
}

export const SideNav: React.FC<SideNavProps> = ({ 
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  pendingProposalsCount = 1 
}) => {
  const { user, signOut, isAllowed } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navGroups: NavGroup[] = [
    {
      items: [
        {
          name: 'Overview',
          path: '/overview',
          icon: LayoutDashboard,
          allowedRoles: ['admin', 'officer', 'coordinator', 'panel_coordinator']
        }
      ]
    },
    {
      groupName: 'PREPARE',
      items: [
        {
          name: 'Candidates',
          path: '/candidates',
          icon: Users,
          allowedRoles: ['officer', 'coordinator']
        },
        {
          name: 'Companies',
          path: '/companies',
          icon: Building2,
          allowedRoles: ['admin', 'officer', 'coordinator']
        },
        {
          name: 'Eligibility',
          path: '/eligibility',
          icon: ShieldCheck,
          allowedRoles: ['officer', 'coordinator']
        },
        {
          name: 'Capacity & Waitlist',
          path: '/capacity',
          icon: Boxes,
          allowedRoles: ['officer', 'coordinator']
        }
      ]
    },
    {
      groupName: 'RUN',
      items: [
        {
          name: 'Schedule Board',
          path: '/schedule',
          icon: Calendar,
          allowedRoles: ['officer', 'coordinator']
        },
        {
          name: 'Live Operations',
          path: '/live',
          icon: Activity,
          allowedRoles: ['officer', 'coordinator', 'panel_coordinator']
        }
      ]
    },
    {
      groupName: 'RECOVER',
      items: [
        {
          name: 'Recovery Workspace',
          path: '/recovery',
          icon: RotateCcw,
          allowedRoles: ['officer', 'coordinator']
        },
        {
          name: 'Approvals',
          path: '/approvals',
          icon: CheckSquare,
          allowedRoles: ['officer', 'coordinator'],
          badgeCount: user.role === 'officer' ? pendingProposalsCount : undefined
        }
      ]
    },
    {
      groupName: 'GOVERN',
      items: [
        {
          name: 'Audit Log',
          path: '/audit',
          icon: FileText,
          allowedRoles: ['admin', 'officer', 'coordinator']
        }
      ]
    }
  ];

  const content = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className={cn(
        'h-14 px-4 flex items-center border-b border-slate-200/90 bg-white transition-all',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#142C4E] text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="font-bold text-sm tracking-tight text-slate-900 leading-none truncate">
                Placement Command
              </div>
              <div className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1 truncate">
                Operations Console
              </div>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse toggle button */}
        {!isCollapsed && onToggleCollapse && !onCloseMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter(item => isAllowed(item.allowedRoles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && group.groupName && (
                <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.groupName}
                </div>
              )}
              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      'flex items-center rounded-lg text-xs font-medium my-[3px] transition-all duration-150 ease-in-out group relative',
                      'focus-visible:outline-2 focus-visible:outline-[rgba(37,99,235,0.6)] focus-visible:outline-offset-2 focus:outline-hidden',
                      'motion-reduce:transition-none motion-reduce:hover:transform-none',
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2',
                      isActive
                        ? 'bg-[rgba(37,99,235,0.12)] border border-[rgba(37,99,235,0.45)] text-blue-700 font-semibold'
                        : 'bg-[rgba(13,148,136,0.10)] border border-[rgba(13,148,136,0.30)] text-slate-600 hover:bg-[rgba(13,148,136,0.16)] hover:border-[rgba(13,148,136,0.45)] hover:text-slate-900 hover:translate-x-[2px]'
                    )}
                  >
                    <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-2.5')}>
                      <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700')} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white tabular-nums shadow-2xs">
                        {item.badgeCount}
                      </span>
                    )}

                    {isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom Footer with Settings and User Profile */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/70 space-y-2">
        <NavLink
          to="/settings/users"
          onClick={() => { if (onCloseMobile) onCloseMobile(); }}
          title={isCollapsed ? 'Settings & Demo' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-lg text-xs font-medium my-[3px] transition-all duration-150 ease-in-out group relative',
              'focus-visible:outline-2 focus-visible:outline-[rgba(37,99,235,0.6)] focus-visible:outline-offset-2 focus:outline-hidden',
              'motion-reduce:transition-none motion-reduce:hover:transform-none',
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
              isActive
                ? 'bg-[rgba(37,99,235,0.12)] border border-[rgba(37,99,235,0.45)] text-blue-700 font-semibold'
                : 'bg-[rgba(13,148,136,0.10)] border border-[rgba(13,148,136,0.30)] text-slate-600 hover:bg-[rgba(13,148,136,0.16)] hover:border-[rgba(13,148,136,0.45)] hover:text-slate-900 hover:translate-x-[2px]'
            )
          }
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span>Settings & Demo</span>}
        </NavLink>

        {!isCollapsed ? (
          <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
              <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="p-1 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Sign out of Placement Command"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={signOut}
              className="p-2 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
              title={`Sign out (${user.name})`}
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          'hidden lg:flex flex-col shrink-0 min-h-screen border-r border-slate-200/90 transition-all duration-200 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60'
        )}
        aria-label="Main Navigation"
      >
        {content}
      </aside>

      {/* Mobile Drawer (Backdrop + Slide-in Sheet) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl bg-white z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
