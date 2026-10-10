import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Users, Building2, Calendar, Activity, CheckSquare, RotateCcw, FileText, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { label: 'Overview Dashboard', path: '/overview', category: 'Navigation', icon: LayoutDashboard },
    { label: 'Candidates & Student Profiles', path: '/candidates', category: 'Navigation', icon: Users },
    { label: 'Companies & Criteria Editor', path: '/companies', category: 'Navigation', icon: Building2 },
    { label: 'Eligibility Results & Explanation', path: '/eligibility', category: 'Navigation', icon: CheckSquare },
    { label: 'Capacity & Waitlist Allocation', path: '/capacity', category: 'Navigation', icon: Building2 },
    { label: 'Interview Schedule Board', path: '/schedule', category: 'Navigation', icon: Calendar },
    { label: 'Live Operations & Delay Timeline', path: '/live', category: 'Navigation', icon: Activity },
    { label: 'Recovery & Disruption Workspace', path: '/recovery', category: 'Navigation', icon: RotateCcw },
    { label: 'Approvals Queue', path: '/approvals', category: 'Navigation', icon: CheckSquare },
    { label: 'Audit Log & History', path: '/audit', category: 'Navigation', icon: FileText },
    // Shortcuts to Asteria & Harbor
    { label: 'Asteria Systems (40 Applicants, 10 Slots)', path: '/overview?company=comp-asteria', category: 'Companies', icon: Building2 },
    { label: 'Harbor Analytics (12 Applicants, 6 Slots)', path: '/overview?company=comp-harbor', category: 'Companies', icon: Building2 },
    // Direct student shortcuts
    { label: 'DEMO-0001: Aarav Sharma (Eligible & Selected)', path: '/candidates/std-1', category: 'Recent Candidates', icon: Users },
    { label: 'DEMO-0011: Rahul Chatterjee (Eligible & Waitlisted #1)', path: '/candidates/std-11', category: 'Recent Candidates', icon: Users }
  ];

  const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-3.5 border-b border-[#E2E8F0] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Type a screen, company, or candidate name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#172033] placeholder-[#64748B] outline-hidden"
            autoFocus
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] rounded">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#64748B]">No results found for &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-[#2563EB]/5 hover:text-[#2563EB] group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB]" />
                    <div>
                      <div className="font-semibold text-[#142C4E] group-hover:text-[#2563EB]">{item.label}</div>
                      <div className="text-[10px] text-[#64748B]">{item.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
