import Head from 'next/head';
import { AUTHOR_REF } from '../lib/author';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy | AI Drag Racing</title>
        <meta
          name="description"
          content="How AI Drag Racing handles your API keys, prompts, local race receipts, and optional 30-day share links."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy | AI Drag Racing" />
        <meta
          property="og:description"
          content="How AI Drag Racing handles your API keys, prompts, local race receipts, and optional 30-day share links."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="How AI Drag Racing handles your API keys, prompts, local race receipts, and optional 30-day share links."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'PrivacyPolicy',
              name: 'AI Drag Racing Privacy Policy',
              description:
                'How AI Drag Racing handles your API keys, prompts, local race receipts, and optional 30-day share links.',
              url: 'https://ai-dragrace.jonathanrreed.com/privacy',
              datePublished: '2026-04-21',
              dateModified: '2026-09-01',
              author: AUTHOR_REF,
            }),
          }}
        />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container doc">
        <article className="doc-article">
          <h1>
            How AI Drag Racing handles your keys and data
          </h1>
          <p className="doc-lead">
            There are no accounts on AI Drag Racing. Your provider API keys stay in browser session storage for the
            current tab only. Closing the tab clears them. Older versions stored keys in local storage, so this build
            deletes any leftover saved key instead of loading it.
          </p>
          <p>
            When you start a race, your key, prompt, selected model, and settings pass through this site&apos;s
            Cloudflare edge route and go straight to the provider API you picked. The app doesn&apos;t save that
            request content in any race record, though Cloudflare&apos;s own platform security, logging, and retention
            rules can still apply while traffic moves through its network. Whatever provider you pick may keep request
            data under its own privacy policy and account terms, which I can&apos;t control. Check the{' '}
            <a href="/subprocessors">
              subprocessor disclosure
            </a>{' '}
            for details on hosting and infrastructure.
          </p>
          <p>
            After a live race, the app saves a stripped-down receipt in your browser for up to 30 days. That receipt
            holds model and provider IDs, settings, timing numbers, token counts, prompt length, a one-way prompt
            fingerprint, and a coarse Cloudflare colo code when available. It never saves prompt text, response text,
            API keys, IP address, or precise location. You can export or delete local receipts anytime on the race page.
          </p>
          <p>
            If you click Share for 30 days, a sanitized copy of that receipt gets uploaded to Supabase so anyone with
            the unlisted link can open it. It includes provider and model IDs, timing, token counts, settings, prompt
            length, coarse environment details, and lane status. It leaves out prompt text, response text, API keys,
            IP addresses, and precise location. The hosted copy expires within 30 days, and right now there&apos;s no
            way on the site to delete or revoke it early, so don&apos;t generate a share link for anything you
            shouldn&apos;t share.
          </p>
          <p>
            Don&apos;t paste API keys on a shared computer. Anyone who uses an open tab could make requests with that
            session. Closing the tab clears your session keys, and clearing site data wipes your local settings and
            race history. Because there are no accounts, there&apos;s no account recovery. If you rotate or revoke a
            key, do it with your provider and paste the new key before your next race.
          </p>
          <p>
            Treat every race as a live request to the provider you chose. Keep confidential client info, medical
            records, financial details, private employer material, and anything regulated out of your prompt unless
            your own provider agreement and internal rules allow it.
          </p>
          <p className="doc-meta">
            Last updated <time dateTime="2026-09-02">September 2, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
