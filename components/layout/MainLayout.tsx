import React from 'react';
import { SiteFooter, SiteHeader } from './SiteChrome';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const asideClasses = `app-sidebar ${mobileOpen ? 'is-open' : 'is-closed'}`;

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  React.useEffect(() => {
    const openRacers = () => setMobileOpen(true);
    window.addEventListener('ai-drag-racing:open-racers', openRacers);
    return () => window.removeEventListener('ai-drag-racing:open-racers', openRacers);
  }, []);

  return (
    <div className="app-page">
      <SiteHeader onOpenRacers={() => setMobileOpen(true)} />
      <div className="app-shell">
        {/* Drawer backdrop */}
        {mobileOpen && (
          <div
            className="app-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar: provider rail on desktop, setup drawer on phones */}
        <aside
          className={asideClasses}
          role={mobileOpen ? 'dialog' : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label={mobileOpen ? 'Providers menu' : undefined}
        >
          <div className="app-sidebar-close-row">
            <span className="app-sidebar-title">Racers</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="app-sidebar-close"
              aria-label="Close providers menu"
            >
              Close
            </button>
          </div>
          {sidebar}
        </aside>

        {/* Main content wrapper */}
        <div className="app-content">
          <main id="main-content" className="app-main">
            {children}
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default MainLayout;
