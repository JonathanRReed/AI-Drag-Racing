import React from 'react';

export default function Footer() {
  return (
    <footer className="footer-card left-footer">
      <img src="/logo.avif" alt="Company Logo" className="footer-card-logo-corner" />
      <div className="footer-card-content-left">
        <div className="footer-card-product-block">
          <span className="footer-card-product-main">A product of <span className="footer-card-product-company">Hello.World Consulting</span></span>
          <span className="footer-card-product-author">Made by Jonathan Reed</span>
        </div>
        <div className="footer-card-photo-link-inline">
          <img src="/jonathan.avif" alt="Jonathan Reed" className="footer-card-photo" />
          <a href="https://www.linkedin.com/in/jonathanrreed0/" className="footer-card-link-text linkedin-link" target="_blank" rel="noopener noreferrer">
            <svg width="22" height="22" fill="none" viewBox="0 0 32 32" style={{verticalAlign:'middle',marginRight:'0.3em'}}><rect width="32" height="32" rx="8" fill="#0077B5"/><path d="M10.667 13.333h2.666v1.333h.04c.373-.707 1.285-1.453 2.646-1.453 2.827 0 3.347 1.867 3.347 4.293v4.16h-2.666v-3.68c0-.88-.016-2.013-1.227-2.013-1.227 0-1.413.96-1.413 1.953v3.74h-2.666v-8.333zm-1.333-2.667a1.333 1.333 0 112.666 0 1.333 1.333 0 01-2.666 0zm1.333 2.667v8.333h-2.666v-8.333h2.666z" fill="#fff"/></svg>
            LinkedIn
          </a>
        </div>
        <div className="footer-card-links-row">
          <img src="/logo.avif" alt="Company Logo Small" className="footer-card-logo-inline" />
          <a href="https://helloworldfirm.com/" className="footer-card-link-text" target="_blank" rel="noopener noreferrer">
            helloworldfirm.com
          </a>
        </div>
        <span className="footer-card-copyright-left">2025 &copy; All Rights Reserved</span>
      </div>
    </footer>
  );
}
