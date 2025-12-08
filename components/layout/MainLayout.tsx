import React from 'react';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const asideClasses = `
    ${mobileOpen ? 'block' : 'hidden'} md:block
    fixed inset-y-0 left-0 z-50 w-80 lg:w-96 p-4 overflow-hidden pb-4 flex flex-col relative
    ring-1 ring-white/10 bg-[rgba(255,255,255,0.06)] backdrop-blur-lg rounded-[18px]
    transform transition-transform duration-200 ease-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:static md:inset-auto md:left-auto md:z-auto md:translate-x-0 md:bg-[rgba(255,255,255,0.06)] md:backdrop-blur-lg md:w-80 md:h-screen md:border-b-0 md:rounded-none md:rounded-r-[18px]
  `;

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="relative flex min-h-dvh w-full text-gray-200 flex-col md:flex-row isolate">
      {/* Removed global header glow to prevent top-wide gradient leak */}
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[rgba(255,255,255,0.06)] backdrop-blur-xl ring-1 ring-white/10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
        <div className="flex items-center justify-between p-3 pt-2">
          {/* Branding */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">AI Drag Racing</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="btn text-sm"
            aria-label="Open providers menu"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
            Racers
          </button>
        </div>
      </div>

      {/* Drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={asideClasses}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Providers menu' : undefined}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        {/* Close button on mobile */}
        <div className="md:hidden flex justify-end mb-2">
          <button
            onClick={() => setMobileOpen(false)}
            className="px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/20"
            aria-label="Close providers menu"
          >
            Close
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <main className="relative flex-1 min-w-0 min-h-0 p-4 overflow-y-auto">
          {children}
        </main>

        {/* Footer with hub links */}
        <footer className="shrink-0 px-4 py-3 bg-[rgba(255,255,255,0.04)] border-t border-white/5">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/50" aria-label="Related sites">
            <a href="https://jonathanrreed.com" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">
              Jonathan Reed
            </a>
            <a href="https://ai-stats.jonathanrreed.com" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">
              AI Stats - Model Comparisons
            </a>
            <a href="https://ai-news.helloworldfirm.com/" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">
              AI News
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
