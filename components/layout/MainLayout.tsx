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
          <button
            onClick={() => setMobileOpen(true)}
            className="btn"
            aria-label="Open providers menu"
          >
            Providers
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

      {/* Main content */}
      <main className="relative flex-1 min-w-0 min-h-0 p-4 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
