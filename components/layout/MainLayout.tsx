import React from 'react';

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

  return (
    <div className="app-shell dot-grid-fade">
      {/* Removed global header glow to prevent top-wide gradient leak */}
      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
        <div className="mobile-topbar-inner">
          {/* Branding */}
          <div className="mobile-brand">
            <div className="mobile-brand-icon">
              <svg viewBox="0 0 24 24" className="mobile-brand-svg" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v4M12 16v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4 12h4M16 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="mobile-brand-text">AI Drag Racing</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="btn text-sm"
            aria-label="Open racers providers menu"
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
          className="app-backdrop"
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
        <div className="app-sidebar-close-row">
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
        <main className="app-main">
          {children}
        </main>

        {/* Footer with hub links */}
        <footer className="app-footer noise-overlay">
          {/* Gradient accent line */}
          <div className="app-footer-accent" />

          <div className="app-footer-panel">
            <div className="app-footer-inner">
              {/* Identity line */}
              <p className="app-footer-meta heading-tight">
                Built by <span className="app-footer-name">Jonathan R. Reed</span> AI and cybersecurity developer, red team specialist.
              </p>

              {/* Links row */}
              <nav className="app-footer-links" aria-label="Related sites">
                <a href="/about" className="app-footer-link">
                  About
                </a>
                <span className="app-footer-separator">•</span>
                <a href="/contact" className="app-footer-link">
                  Contact
                </a>
                <span className="app-footer-separator">•</span>
                <a href="/privacy" className="app-footer-link">
                  Privacy
                </a>
                <span className="app-footer-separator">•</span>
                <a href="/subprocessors" className="app-footer-link">
                  Subprocessors
                </a>
                <span className="app-footer-separator">•</span>
                <a
                  href="https://jonathanrreed.com/projects/"
                  rel="noopener noreferrer"
                  className="app-footer-cta press-scale"
                >
                  See more projects →
                </a>
                <span className="app-footer-separator">•</span>
                <a href="https://aistats.jonathanrreed.com" rel="noopener noreferrer" className="app-footer-link">
                  AI Stats
                </a>
                <span className="app-footer-separator">•</span>
                <a href="https://ai-news.helloworldfirm.com/" rel="noopener noreferrer" className="app-footer-link">
                  AI News
                </a>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
