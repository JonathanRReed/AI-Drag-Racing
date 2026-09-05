import React from 'react';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/', label: 'Race' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const RELATED = [
  { href: 'https://ai-news.helloworldfirm.com/', name: 'AI News', purpose: 'What changed in AI, from the original announcements.' },
  { href: 'https://aistats.jonathanrreed.com/', name: 'AI Stats', purpose: 'How models compare on price, speed, context, and named benchmarks.' },
  { href: 'https://prompt-info.helloworldfirm.com/', name: 'Prompt Info', purpose: 'What a prompt or recurring workload costs.' },
  { href: 'https://polibench.jonathanrreed.com/', name: 'PoliBench', purpose: 'Where models land on political questions, and how stable that is.' },
];

function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

function ThemeToggle() {
  const toggle = () => {
    const eco = (window as unknown as { __ecoTheme?: { toggle: () => void } }).__ecoTheme;
    eco?.toggle();
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="eco-icon-btn eco-theme-toggle"
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <svg className="eco-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg className="eco-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}

export function SiteHeader({ onOpenRacers }: { onOpenRacers?: () => void }) {
  const router = useRouter();
  const current = normalize(router.pathname || '/');
  return (
    <>
      <a href="#main-content" className="eco-skip">Skip to content</a>
      <header className="eco-header site-header">
        <div className="eco-container eco-header-inner">
          <a href="/" className="eco-lockup" aria-label="AI Drag Racing home">
            <svg className="eco-mark" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="4" width="20" height="2" fill="var(--ink-1)" />
              <rect x="2" y="11" width="20" height="2" fill="var(--ink-1)" />
              <rect x="2" y="18" width="20" height="2" fill="var(--ink-1)" />
              <rect x="13" y="8.5" width="9" height="7" fill="var(--signal)" />
              <rect x="4" y="9.5" width="5" height="5" fill="var(--ink-0)" />
            </svg>
            <span className="eco-wordmark">AI Drag Racing</span>
          </a>
          <nav className="eco-nav site-nav" aria-label="Primary">
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="eco-nav-link"
                aria-current={current === normalize(item.href) ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="site-header-actions">
            <ThemeToggle />
            {onOpenRacers ? (
              <button
                type="button"
                onClick={onOpenRacers}
                className="eco-btn eco-btn-secondary eco-btn-sm site-racers-button"
                aria-label="Open racers providers menu"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
                Racers
              </button>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="eco-footer site-footer">
      <div className="eco-container">
        <section className="eco-related" aria-labelledby="related-tools-heading">
          <h2 id="related-tools-heading" className="eco-related-heading">Related tools by the same author</h2>
          <div className="eco-related-grid">
            <div className="eco-related-link" aria-current="true">
              <strong>AI Drag Racing</strong>
              <span>How fast a model responds from your own connection.</span>
            </div>
            {RELATED.map(site => (
              <a key={site.href} href={site.href} className="eco-related-link" rel="noopener">
                <strong>{site.name}</strong>
                <span>{site.purpose}</span>
              </a>
            ))}
          </div>
        </section>
        <div className="eco-footer-groups">
          <nav className="eco-footer-group" aria-labelledby="footer-race-heading">
            <h2 id="footer-race-heading">Racing</h2>
            <ul>
              <li><a href="/">Run a race</a></li>
              <li><a href="/methodology">Methodology and clocks</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <nav className="eco-footer-group" aria-labelledby="footer-privacy-heading">
            <h2 id="footer-privacy-heading">Privacy</h2>
            <ul>
              <li><a href="/privacy">Privacy policy</a></li>
              <li><a href="/subprocessors">Subprocessors</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
          <nav className="eco-footer-group" aria-labelledby="footer-source-heading">
            <h2 id="footer-source-heading">Source</h2>
            <ul>
              <li><a href="https://github.com/JonathanRReed/AI-Drag-Racing" target="_blank" rel="noopener noreferrer">Source on GitHub</a></li>
              <li><a href="https://jonathanrreed.com/projects/" rel="noopener noreferrer">More projects</a></li>
            </ul>
          </nav>
        </div>
        <div className="eco-footer-meta">
          <p>By <a href="https://jonathanrreed.com/" rel="author">Jonathan R. Reed</a>. Keys stay in your browser. Every result is one observation from your route, not a ranking.</p>
          <p>ai-dragrace.jonathanrreed.com &middot; {year}</p>
        </div>
      </div>
    </footer>
  );
}
