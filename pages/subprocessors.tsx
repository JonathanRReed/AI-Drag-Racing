import Head from 'next/head';
import { AUTHOR_REF } from '../lib/author';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

export default function Subprocessors() {
  return (
    <>
      <Head>
        <title>Subprocessor Disclosure | AI Drag Racing</title>
        <meta
          name="description"
          content="Hosting, API routing, local key storage, and 30-day share links for AI Drag Racing."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/subprocessors" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          property="og:description"
          content="Hosting, API routing, local key storage, and 30-day share links for AI Drag Racing."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="Hosting, API routing, local key storage, and 30-day share links for AI Drag Racing."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Subprocessor Disclosure | AI Drag Racing',
              description:
                'Hosting, API routing, local key storage, and 30-day share links for AI Drag Racing.',
              url: 'https://ai-dragrace.jonathanrreed.com/subprocessors',
              datePublished: '2026-06-19',
              dateModified: '2026-08-04',
              author: AUTHOR_REF,
            }),
          }}
        />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container doc">
        <article className="doc-article">
          <h1>
            Subprocessors and hosting
          </h1>
          <p className="doc-lead">
            AI Drag Racing runs on Cloudflare Pages. During a live race, Cloudflare receives your provider API key,
            prompt, selected model, and settings at the site&apos;s edge route before forwarding them to the provider
            you picked. Cloudflare may also see your IP address, user agent, request time, and security signals. The
            app doesn&apos;t save prompt text or API keys in race receipts, though Cloudflare&apos;s own platform
            logging and retention rules can still apply to traffic passing through its network.
          </p>
          <p>
            You bring your own API keys here. Keys stay in session storage for the current browser tab, and your
            prompts only go to the providers you pick for that run.
          </p>
          <p>
            All provider and model logos are served directly from this site as static SVG files. Opening the site
            doesn&apos;t make any third-party requests to load them.
          </p>
          <p>
            When you run a race against an external provider, that provider handles the prompt, model settings,
            streamed response, usage data, and billing under your own account terms with them.
          </p>
          <p>
            Optional 30-day share links run on Supabase. When you click Share for 30 days, Supabase stores a sanitized
            receipt with provider and model IDs, timing, token counts, settings, prompt length, coarse environment
            details, and lane status. The share payload leaves out prompt text, response text, API keys, IP addresses,
            and precise location. Anyone with that unlisted link can read it until it expires, and right now there&apos;s
            no way to revoke a hosted copy early. Supabase isn&apos;t used for accounts, shared workspaces, or
            automatic hosted race history.
          </p>
          <p>
            If you have questions about hosting or how data moves through this site, reach out on the{' '}
            <a href="/contact">
              contact page
            </a>.
          </p>
          <p className="doc-meta">
            Last updated <time dateTime="2026-09-07">September 7, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
