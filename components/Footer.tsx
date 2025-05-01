import React from 'react';
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="footer-card left-footer">
      <Image src="/logo.avif" alt="Company Logo" width={48} height={48} className="footer-card-logo-corner" priority />
      <div className="footer-card-content-left">
        <div className="footer-card-product-block">
          <span className="footer-card-product-main">A product of <span className="footer-card-product-company">Hello.World Consulting</span></span>
          <span className="footer-card-product-author">Made by Jonathan Reed</span>
        </div>
        <div className="footer-card-links-row">
          <Image src="/logo.avif" alt="Company Logo Small" width={32} height={32} className="footer-card-logo-inline" priority />
          <a href="https://helloworldfirm.com/" className="footer-card-link-text" target="_blank" rel="noopener noreferrer">
            helloworldfirm.com
          </a>
        </div>
        <div className="footer-card-links-row">
          <Image src="/jonathan.avif" alt="Jonathan Reed" width={32} height={32} className="footer-card-logo-inline" priority />
          <a href="https://JonathanRReed.com/" className="footer-card-link-text" target="_blank" rel="noopener noreferrer">
            JonathanRReed.com
          </a>
        </div>
        <span className="footer-card-copyright-left">2025 &copy; All Rights Reserved</span>
      </div>
    </footer>
  );
}
