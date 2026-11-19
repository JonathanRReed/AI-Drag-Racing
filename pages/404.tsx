import Head from 'next/head';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

// A red light is drag racing's foul: the car left before the tree went green.
export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page not found | AI Drag Racing</title>
        <meta name="robots" content="noindex" />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container redlight">
        <div className="tree redlight-tree" aria-hidden="true">
          <div className="tree-row tree-row-small">
            <span className="tree-lamp" data-color="amber" data-on="false" />
            <span className="tree-lamp" data-color="amber" data-on="false" />
          </div>
          <div className="tree-row">
            <span className="tree-lamp" data-color="amber" data-on="false" />
            <span className="tree-lamp" data-color="amber" data-on="false" />
          </div>
          <div className="tree-row">
            <span className="tree-lamp" data-color="green" data-on="false" />
            <span className="tree-lamp" data-color="green" data-on="false" />
          </div>
          <div className="tree-row">
            <span className="tree-lamp" data-color="red" data-on="true" />
            <span className="tree-lamp" data-color="red" data-on="true" />
          </div>
        </div>
        <div className="redlight-copy">
          <h1>Red light.</h1>
          <p>
            Nothing is staged at this address. The page may have moved, or the link left the line before it
            was ready. Error 404.
          </p>
          <p className="redlight-actions">
            <a href="/" className="race-hero-action-primary">Back to the strip</a>
            <a href="/methodology" className="race-hero-action-secondary">Read the methodology</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
