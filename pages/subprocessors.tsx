import Head from 'next/head';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

export default function Subprocessors() {
  return (
    <>
      <Head>
        <title>Subprocessor Disclosure | AI Drag Racing</title>
        <meta
          name="description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/subprocessors" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          property="og:description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Subprocessor Disclosure | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/Favicon/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Subprocessor Disclosure | AI Drag Racing',
              description:
                'Subprocessor disclosure for AI Drag Racing, including hosting, provider API routing, and browser-local credential handling.',
              url: 'https://ai-dragrace.jonathanrreed.com/subprocessors',
              datePublished: '2026-06-19',
              dateModified: '2026-08-04',
              author: {
                '@type': 'Person',
                name: 'Jonathan R. Reed',
                url: 'https://jonathanrreed.com',
                sameAs: [
                  'https://jonathanrreed.com/',
                  'https://github.com/JonathanRReed',
                ],
              },
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
            Subprocessor disclosure for AI Drag Racing.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            AI Drag Racing is hosted on Cloudflare Pages. For live races, Cloudflare receives the provider API key,
            prompt, selected model, and settings as request content at the app&apos;s edge route before forwarding them to
            the chosen provider. Cloudflare may also process IP address, user agent, request time, and security signals.
            The app does not intentionally store prompt text or provider keys in race receipts, but Cloudflare&apos;s own
            platform logging and retention controls may apply to traffic crossing its infrastructure.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            The app uses a bring-your-own-key workflow. Provider API keys are stored in session storage for the current
            browser tab. Race prompts are forwarded only to the providers you choose for that run.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            When you select an external provider, that provider may process the prompt, model settings, streamed output,
            usage metadata, and account-level billing information according to your own provider account terms.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Optional 30-day result links use Supabase. When you choose Share 30 days, Supabase stores a sanitized receipt
            containing provider and model IDs, timing, token counts, settings, prompt length, coarse environment details,
            and lane status. It does not receive prompt text, response text, API keys, IP addresses, or precise location
            from the share payload. Anyone with the unlisted link can read it until it expires, and the current site cannot
            revoke the hosted copy early. Supabase is not used for accounts, shared workspaces, or automatic hosted race history.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            For subprocessor or data-handling questions, use the{' '}
            <a href="/contact" className="text-red-300 underline underline-offset-4">
              AI Drag Racing contact page
            </a>.
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
