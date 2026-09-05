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
          content="AI Drag Racing keeps provider keys only for the current browser tab and sends prompts to the provider routes you choose for a race."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy | AI Drag Racing" />
        <meta
          property="og:description"
          content="AI Drag Racing keeps provider keys only for the current browser tab and sends prompts to the provider routes you choose for a race."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="AI Drag Racing keeps provider keys only for the current browser tab and sends prompts to the provider routes you choose for a race."
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
                'AI Drag Racing keeps provider keys only for the current browser tab and sends prompts to the provider routes you choose for a race.',
              url: 'https://ai-dragrace.jonathanrreed.com/privacy',
              datePublished: '2026-04-21',
              dateModified: '2026-09-01',
              author: AUTHOR_REF,
            }),
          }}
        />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container py-12 text-[var(--text)]">
        <article className="mx-auto max-w-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <a href="/" className="text-xs font-medium text-red-400 hover:text-red-300">
            AI Drag Racing
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Privacy for a bring-your-own-key comparison.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing does not create accounts. Provider API keys are kept only in browser session storage for
            the current tab. Closing the tab clears them. Older builds stored keys locally, so this version removes
            any legacy saved key instead of loading it.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you start a race, your key, prompt, selected model, and settings are received in transit by the site&apos;s
            Cloudflare edge route, then sent to the provider API you choose. The app does not write that request content
            to a race record, but Cloudflare&apos;s platform-level security, logging, and retention controls may apply while
            the request crosses its infrastructure. The selected provider may retain request data under its own policy
            and account terms, which this site cannot control. See the{' '}
            <a href="/subprocessors" className="text-red-300 underline underline-offset-4">
              subprocessor disclosure
            </a>{' '}
            for the current hosting and infrastructure context.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            After a live race, the app saves a sanitized receipt in this browser for up to 30 days. It contains model
            and provider IDs, settings, timing, token counts, prompt length, a one-way prompt fingerprint, and a coarse
            Cloudflare colo code when available. It does not save prompt text, response text, API keys, IP address, or
            precise location in the receipt. You can export or delete local receipts from the race page.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            If you choose Share 30 days, a sanitized copy of that receipt is sent to Supabase and can be opened by anyone
            who has the unlisted link. It includes provider and model IDs, timing, token counts, settings, prompt length,
            coarse environment details, and lane status. It excludes prompt text, response text, API keys, IP addresses,
            and precise location. The hosted copy expires within 30 days. The current site cannot revoke that hosted copy
            early, so do not create a link for a result you should not share.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Do not paste keys on a shared computer. Another person with access to an open tab may be able to use its
            session. Closing the tab clears session keys; clearing site data removes local settings and race history.
            There is no account recovery because there are no accounts. If you rotate or revoke a key, do it with the
            provider and enter the new value before the next race.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Treat each race as a request to the selected provider. Keep confidential client data, medical records,
            financial details, private employer material, and anything regulated out of the prompt unless your own
            provider agreement and internal rules allow that use.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Last updated <time dateTime="2026-09-02">September 2, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
