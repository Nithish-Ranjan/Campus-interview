import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  'overview': 'Overview',
  'candidates': 'Candidates',
  'companies': 'Companies & Criteria',
  'eligibility': 'Eligibility Matrix',
  'capacity': 'Capacity & Waitlist',
  'schedule': 'Schedule Board',
  'live': 'Live Operations',
  'recovery': 'Recovery Workspace',
  'approvals': 'Approvals Queue',
  'audit': 'Audit Log',
  'settings': 'Settings & Demo'
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'overview')) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-800 font-semibold">Operations Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
      <Link to="/overview" className="hover:text-blue-600 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Home</span>
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNames[segment] || (segment.startsWith('DEMO-') ? segment : segment.startsWith('comp-') ? segment.replace('comp-', '').toUpperCase() : segment);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {isLast ? (
              <span className="text-slate-800 font-semibold truncate max-w-xs">{name}</span>
            ) : (
              <Link to={routeTo} className="hover:text-blue-600 transition-colors truncate max-w-xs">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
