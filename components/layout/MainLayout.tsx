import React from 'react';
import { SiteFooter, SiteHeader } from './SiteChrome';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const asideRef = React.useRef<HTMLElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const asideClasses = `app-sidebar ${mobileOpen ? 'is-open' : 'is-closed'}`;

  // Move focus into the drawer when it opens and hand it back to the control
  // that opened it (the Racers button) when it closes.
  React.useEffect(() => {
    if (!mobileOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && target.isConnected) {
        target.focus();
      }
    };
  }, [mobileOpen]);

  // Close on Escape, and keep Tab inside the panel while it is open.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = asideRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((node) => node.offsetParent !== null || node === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }
      if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
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
          ref={asideRef}
          className={asideClasses}
          role={mobileOpen ? 'dialog' : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label={mobileOpen ? 'Providers menu' : undefined}
        >
          <div className="app-sidebar-close-row">
            <span className="app-sidebar-title">Racers</span>
            <button
              ref={closeButtonRef}
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
