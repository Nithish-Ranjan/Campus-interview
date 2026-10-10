import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface AppShellProps {
  title?: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title = 'Placement Command',
  subtitle,
  primaryAction
}) => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  // Listen for global keyboard chords: Ctrl+K, ?, [, and 'g' chords
  useEffect(() => {
    let lastKey = '';
    let keyTimer: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // Sidebar collapse toggle shortcut '['
      if (e.key === '[') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      if (e.key === 'g') {
        lastKey = 'g';
        clearTimeout(keyTimer);
        keyTimer = setTimeout(() => { lastKey = ''; }, 1500);
        return;
      }

      if (lastKey === 'g') {
        lastKey = '';
        clearTimeout(keyTimer);
        switch (e.key.toLowerCase()) {
          case 'o': navigate('/overview'); break;
          case 'c': navigate('/candidates'); break;
          case 's': navigate('/schedule'); break;
          case 'l': navigate('/live'); break;
          case 'a': navigate('/approvals'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(keyTimer);
    };
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F7FB]">
      {/* Skip to main content (A11Y-2) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-hidden"
      >
        Skip to main content
      </a>

      {/* Side Navigation (Desktop and Mobile) */}
      <SideNav 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={title}
          subtitle={subtitle}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleMobileMenu={() => setIsMobileNavOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(false)}
          primaryAction={primaryAction}
        />

        <main 
          id="main-content" 
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 focus:outline-hidden"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modals */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};
