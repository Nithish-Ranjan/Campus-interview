import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['/'], description: 'Focus candidate / list search input', scope: 'Lists' },
    { keys: ['?'], description: 'Open this keyboard shortcuts guide', scope: 'Global' },
    { keys: ['Ctrl', 'K'], description: 'Open command palette (Navigation only)', scope: 'Global' },
    { keys: ['['], description: 'Toggle left sidebar collapse', scope: 'Global' },
    { keys: ['g', 'o'], description: 'Jump to Overview Dashboard', scope: 'Global' },
    { keys: ['g', 'c'], description: 'Jump to Candidates List', scope: 'Global' },
    { keys: ['g', 's'], description: 'Jump to Schedule Board', scope: 'Global' },
    { keys: ['g', 'l'], description: 'Jump to Live Operations', scope: 'Global' },
    { keys: ['g', 'a'], description: 'Jump to Approvals Queue', scope: 'Global' },
    { keys: ['M'], description: 'Open Move Interview Dialog for focused card', scope: 'Schedule (Draft)' },
    { keys: ['Esc'], description: 'Close any open drawer, dialog, or cancel move', scope: 'Global' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#142C4E]">
            <Keyboard className="w-4 h-4 text-[#2563EB]" />
            <span>Placement Command Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#64748B] hover:text-[#172033] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-96 overflow-y-auto space-y-3">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[#E2E8F0] last:border-0">
              <span className="text-[#172033] font-medium">{sc.description}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                <span className="text-[10px] text-[#64748B] mr-1">({sc.scope})</span>
                {sc.keys.map((k, ki) => (
                  <kbd key={ki} className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-[#F8FAFC] text-[#142C4E] border border-[#E2E8F0] rounded shadow-2xs">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
