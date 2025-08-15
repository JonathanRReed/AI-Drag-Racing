import React from 'react';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const asideClasses = `
    fixed inset-y-0 left-0 z-50 w-80 lg:w-96 p-4 overflow-hidden pb-4 flex flex-col
    ring-1 ring-white/10 bg-[rgba(255,255,255,0.06)] backdrop-blur-lg
    transform transition-transform duration-200 ease-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:static md:inset-auto md:left-auto md:z-auto md:translate-x-0 md:bg-[rgba(255,255,255,0.06)] md:backdrop-blur-lg md:w-80 md:h-screen md:border-b-0
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
      {/* Subtle header glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(1200px_at_50%_-200px,rgba(34,211,238,0.12),transparent)]"
        aria-hidden="true"
      />
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[rgba(255,255,255,0.06)] backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex items-center justify-between p-3">
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
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
      <main className="relative flex-1 min-w-0 p-4 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
