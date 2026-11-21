import Head from 'next/head';
import { AUTHOR_REF } from '../lib/author';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact | AI Drag Racing</title>
        <meta
          name="description"
          content="Get in touch with Jonathan R. Reed about AI Drag Racing bugs, provider issues, or feedback."
        />
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact | AI Drag Racing" />
        <meta
          property="og:description"
          content="Get in touch with Jonathan R. Reed about AI Drag Racing bugs, provider issues, or feedback."
        />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact | AI Drag Racing" />
        <meta
          name="twitter:description"
          content="Get in touch with Jonathan R. Reed about AI Drag Racing bugs, provider issues, or feedback."
        />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ContactPage',
              name: 'Contact AI Drag Racing',
              description:
                'Get in touch with Jonathan R. Reed about AI Drag Racing bugs, provider issues, or feedback.',
              url: 'https://ai-dragrace.jonathanrreed.com/contact',
              datePublished: '2026-04-21',
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
            Get in touch about AI Drag Racing
          </h1>
          <p className="doc-lead">
            If you find a bug, run into an accessibility issue, want to request a provider, or have feedback on the
            site, send me a note through my main contact page.
          </p>
          <p>
            For bug reports, it helps a lot if you include your browser, the provider and model you picked, roughly how
            long your prompt was, and your race settings. Let me know when it broke too, like if it failed right away,
            froze mid-stream, errored at the end, or broke when drawing the charts. That usually tells me right away
            whether the bug is in provider routing or in the UI. If a provider changed its API and threw an error,
            paste the error message without any keys in it.
          </p>
          <p>
            If you have a feature idea, tell me what comparison you were trying to run and what information you needed
            that wasn&apos;t there. I want to keep this site focused on live speed and output checks, so hearing about
            a real case you hit helps a lot more than a general wishlist.
          </p>
          <p>
            Please don&apos;t send API keys, private prompts, client data, or screenshots that show secrets. A short
            dummy prompt, the providers you picked, and the error message you saw are plenty for debugging.
          </p>
          <a
            href="https://jonathanrreed.com/contact/"
            className="btn-secondary doc-action"
          >
            Go to my contact page
          </a>
          <p className="doc-meta">
            Last updated <time dateTime="2026-06-19">June 19, 2026</time>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
