import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SessionGuard } from './guards/SessionGuard';
import { RoleGuard } from './guards/RoleGuard';
import { AppShell } from '@/components/layout/AppShell';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage';

import { LoginScreen } from '@/features/auth/LoginScreen';
import { StudentPortalScreen } from '@/features/student/StudentPortalScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { CandidatesScreen } from '@/features/candidates/CandidatesScreen';
import { StudentProfileScreen } from '@/features/candidates/StudentProfileScreen';
import { CompaniesScreen } from '@/features/companies/CompaniesScreen';
import { EligibilityScreen } from '@/features/eligibility/EligibilityScreen';
import { CapacityScreen } from '@/features/capacity/CapacityScreen';
import { ScheduleScreen } from '@/features/schedule/ScheduleScreen';
import { LiveOpsScreen } from '@/features/live-ops/LiveOpsScreen';
import { RecoveryScreen } from '@/features/recovery/RecoveryScreen';
import { ApprovalsScreen } from '@/features/approvals/ApprovalsScreen';
import { ProposalComparisonScreen } from '@/features/approvals/ProposalComparisonScreen';
import { AuditScreen } from '@/features/audit/AuditScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { useAuth } from '@/lib/auth/authContext';

// Helper component for root "/" landing page redirect
const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'student':
      return <Navigate to="/my-schedule" replace />;
    case 'officer':
      return <Navigate to="/approvals" replace />;
    case 'panel_coordinator':
      return <Navigate to="/live" replace />;
    default:
      return <Navigate to="/overview" replace />;
  }
};

export const router = createBrowserRouter([
  // Public route
  {
    path: '/login',
    element: <LoginScreen />,
    errorElement: <ErrorPage />
  },
  {
    path: '/403',
    element: <ForbiddenPage />
  },
  {
    path: '/404',
    element: <NotFoundPage />
  },

  // Protected Routes behind SessionGuard
  {
    element: <SessionGuard />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <RootRedirect />
      },
      // Student Dedicated Portal (Isolated Layout without staff sidebar)
      {
        path: '/my-schedule',
        element: (
          <RoleGuard allowedRoles={['student']} />
        ),
        children: [
          {
            path: '',
            element: <StudentPortalScreen />
          }
        ]
      },
      // Student portal aliases
      {
        path: '/student',
        element: <Navigate to="/my-schedule" replace />
      },
      {
        path: '/students',
        element: <Navigate to="/candidates" replace />
      },
      // Staff Operations Console (AppShell)
      {
        element: <AppShell />,
        errorElement: <ErrorPage />,
        children: [
          // Operational Overview: Admin, Officer, Coordinator, Panel Coordinator
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator', 'panel_coordinator']} />,
            children: [
              {
                path: '/overview',
                element: <OverviewScreen />
              }
            ]
          },

          // Student Directory & Detailed Profiles: Admin, Placement Officer & Placement Coordinator
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator']} />,
            children: [
              {
                path: '/candidates',
                element: <CandidatesScreen />
              },
              {
                path: '/candidates/:studentId',
                element: <StudentProfileScreen />
              }
            ]
          },

          // Companies: Admin, Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator']} />,
            children: [
              {
                path: '/companies',
                element: <CompaniesScreen />
              }
            ]
          },

          // Schedule: Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['officer', 'coordinator']} />,
            children: [
              {
                path: '/schedule',
                element: <ScheduleScreen />
              }
            ]
          },

          // Live Operations: Officer, Coordinator, Panel Coordinator
          {
            element: <RoleGuard allowedRoles={['officer', 'coordinator', 'panel_coordinator']} />,
            children: [
              {
                path: '/live',
                element: <LiveOpsScreen />
              }
            ]
          },

          // Eligibility & Capacity: Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['officer', 'coordinator']} />,
            children: [
              {
                path: '/eligibility',
                element: <EligibilityScreen />
              },
              {
                path: '/capacity',
                element: <CapacityScreen />
              }
            ]
          },

          // Recovery & Approvals: Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['officer', 'coordinator']} />,
            children: [
              {
                path: '/recovery',
                element: <RecoveryScreen />
              },
              {
                path: '/recovery/:simulationId',
                element: <RecoveryScreen />
              },
              {
                path: '/approvals',
                element: <ApprovalsScreen />
              },
              {
                path: '/approvals/:proposalId',
                element: <ProposalComparisonScreen />
              }
            ]
          },

          // Audit Log: Admin, Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator']} />,
            children: [
              {
                path: '/audit',
                element: <AuditScreen />
              }
            ]
          },

          // Settings routes (Admin only)
          {
            element: <RoleGuard allowedRoles={['admin']} />,
            children: [
              {
                path: '/settings',
                element: <Navigate to="/settings/preferences" replace />
              },
              {
                path: '/settings/users',
                element: <SettingsScreen />
              },
              {
                path: '/settings/preferences',
                element: <SettingsScreen />
              },
              {
                path: '/settings/demo',
                element: <SettingsScreen />
              }
            ]
          }
        ]
      }
    ]
  },

  // Catch-all 404
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
