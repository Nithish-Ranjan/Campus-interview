import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SessionGuard } from './guards/SessionGuard';
import { RoleGuard } from './guards/RoleGuard';
import { AppShell } from '@/components/layout/AppShell';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage';

import { LoginScreen } from '@/features/auth/LoginScreen';
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

// Helper component for root "/" landing page redirect (Section 4.3)
const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
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
      {
        element: <AppShell />,
        errorElement: <ErrorPage />,
        children: [
          // All roles routes
          {
            path: '/overview',
            element: <OverviewScreen />
          },
          {
            path: '/candidates',
            element: <CandidatesScreen />
          },
          {
            path: '/candidates/:studentId',
            element: <StudentProfileScreen />
          },
          {
            path: '/companies',
            element: <CompaniesScreen />
          },
          {
            path: '/schedule',
            element: <ScheduleScreen />
          },
          {
            path: '/live',
            element: <LiveOpsScreen />
          },

          // Eligibility & Capacity: Admin, Officer, Coordinator, Observer
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator', 'observer']} />,
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

          // Recovery, Approvals, Audit: Admin, Officer, Coordinator
          {
            element: <RoleGuard allowedRoles={['admin', 'officer', 'coordinator']} />,
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
              },
              {
                path: '/audit',
                element: <AuditScreen />
              }
            ]
          },

          // Settings routes
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
  },

  // Catch-all 404
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
