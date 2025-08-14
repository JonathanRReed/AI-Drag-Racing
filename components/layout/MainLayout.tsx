import React from 'react';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const asideClasses = `
    fixed inset-y-0 left-0 z-50 w-72 lg:w-80 p-4 overflow-y-auto pb-24
    border-r border-white/10 bg-black/80 backdrop-blur-lg
    transform transition-transform duration-200 ease-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:static md:inset-auto md:left-auto md:z-auto md:translate-x-0 md:bg-transparent md:backdrop-blur-0 md:w-72 md:h-screen md:border-b-0
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
    <div className="flex min-h-dvh w-full bg-black text-gray-200 flex-col md:flex-row isolate">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20"
            aria-label="Open providers menu"
          >
            Providers
          </button>
        </div>
      </div>

      {/* Drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
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
