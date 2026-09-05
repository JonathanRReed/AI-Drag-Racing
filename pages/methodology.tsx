import Head from 'next/head';
import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '../components/layout/SiteChrome';
import { AUTHOR_PERSON, AUTHOR_REF } from '../lib/author';
import {
  DEFINITIONS,
  HOW_TO_COMPARE,
  INLINE_PATTERN,
  METHODOLOGY_UPDATED,
  SECTIONS,
  plainText,
} from '../lib/methodologyContent';

const SITE = 'https://ai-dragrace.jonathanrreed.com';
const PAGE_URL = `${SITE}/methodology`;
const DESCRIPTION =
  'How AI Drag Racing measures LLM speed: where the timer runs, what request is sent, how time to first token, total time, and tokens per second are calculated, the n=1 sample size, and what the code does not record.';

const LINK_CLASS = 'text-red-400 underline decoration-red-400/40 underline-offset-4 hover:text-red-300';

/** Renders the content module's inline syntax: **bold**, `code`, [label](href). */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    if (token.startsWith('**')) {
      parts.push(<span key={index} className="font-semibold text-white">{token.slice(2, -2)}</span>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={index} className="rounded-sm bg-white/10 px-1.5 py-0.5 text-sm text-zinc-200">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const external = link[2].startsWith('http');
        parts.push(
          <a key={index} href={link[2]} className={LINK_CLASS} rel={external ? 'noopener noreferrer' : undefined}>
            {link[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    }
    last = index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const updatedLabel = new Date(`${METHODOLOGY_UPDATED}T00:00:00Z`).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${PAGE_URL}#article`,
      headline: 'How AI Drag Racing measures model speed',
      name: 'Methodology',
      description: DESCRIPTION,
      url: PAGE_URL,
      inLanguage: 'en-US',
      datePublished: '2026-08-04',
      dateModified: METHODOLOGY_UPDATED,
      author: AUTHOR_REF,
      publisher: AUTHOR_REF,
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${SITE}/#app` },
      hasPart: [{ '@id': `${PAGE_URL}#definitions` }, { '@id': `${PAGE_URL}#howto` }],
    },
    {
      '@type': 'DefinedTermSet',
      '@id': `${PAGE_URL}#definitions`,
      name: 'AI Drag Racing timing terms',
      hasDefinedTerm: DEFINITIONS.map((entry) => ({
        '@type': 'DefinedTerm',
        name: entry.term,
        ...(entry.short ? { alternateName: entry.short } : {}),
        description: entry.definition,
        inDefinedTermSet: { '@id': `${PAGE_URL}#definitions` },
      })),
    },
    {
      '@type': 'HowTo',
      '@id': `${PAGE_URL}#howto`,
      name: 'How to run a model speed comparison worth quoting',
      description:
        'Steps for getting a repeatable, honestly labeled speed comparison out of a browser race. Each race is still one observation from one route.',
      totalTime: 'PT10M',
      tool: [{ '@type': 'HowToTool', name: 'A provider API key that stays in the browser' }],
      step: HOW_TO_COMPARE.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
        url: `${PAGE_URL}#compare-step-${index + 1}`,
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      name: 'AI Drag Racing',
      url: `${SITE}/`,
      author: AUTHOR_REF,
    },
    AUTHOR_PERSON,
  ],
};

export default function Methodology() {
  return (
    <>
      <Head>
        <title>Methodology | AI Drag Racing</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Jonathan R. Reed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#07090D" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Methodology | AI Drag Racing" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:image" content={`${SITE}/social-card.png`} />
        <meta property="article:modified_time" content={METHODOLOGY_UPDATED} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Methodology | AI Drag Racing" />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE}/social-card.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
      </Head>
      <SiteHeader />
      <main id="main-content" className="eco-container py-12 text-[var(--text)]">
        <article className="mx-auto max-w-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <a href="/" className="text-xs font-medium text-red-400 hover:text-red-300">
            AI Drag Racing
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            How AI Drag Racing measures model speed
          </h1>

          <p className="mt-5 text-base leading-8 text-zinc-300">
            Every number on this site comes out of one code path, so it is worth saying exactly what that path does
            before anyone quotes a result. The short version: each Quick Race is a single live request per model with
            one clock in your browser and another at the Cloudflare edge. Token counts are usually estimated rather
            than provider-reported. That is useful evidence about your route today, not a global model ranking.
          </p>

          <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a href="#definitions" className={LINK_CLASS}>Definitions</a>
            <a href="#compare" className={LINK_CLASS}>Fair comparison checklist</a>
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={LINK_CLASS}>
                {section.heading}
              </a>
            ))}
          </nav>

          <section id="definitions" aria-labelledby="definitions-heading" className="mt-10 scroll-mt-20">
            <h2 id="definitions-heading" className="text-2xl font-semibold tracking-tight text-white">
              Definitions
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              The terms every receipt uses. Each one is defined by the code, not by convention.
            </p>
            <dl className="mt-4 grid gap-0 border border-white/10 md:grid-cols-2">
              {DEFINITIONS.map((entry) => (
                <div key={entry.term} className="border-b border-white/10 p-4 md:odd:border-r">
                  <dt className="font-semibold text-white">
                    {entry.term}
                    {entry.short ? <span className="ml-2 font-mono text-xs font-normal text-zinc-400">{entry.short}</span> : null}
                  </dt>
                  <dd className="mt-1 text-sm leading-7 text-zinc-300">{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="compare" aria-labelledby="compare-heading" className="mt-10 scroll-mt-20">
            <h2 id="compare-heading" className="text-2xl font-semibold tracking-tight text-white">
              How to run a comparison worth quoting
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              A race is one observation. This is how to turn a few of them into something you can stand behind.
            </p>
            <ol className="mt-4 space-y-3">
              {HOW_TO_COMPARE.map((step, index) => (
                <li key={step.name} id={`compare-step-${index + 1}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 scroll-mt-20">
                  <span className="font-mono text-sm text-zinc-500" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base leading-8 text-zinc-300">
                    <span className="font-semibold text-white">{step.name}.</span> {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-20">
              <h2 id={`${section.id}-heading`} className="mt-10 text-2xl font-semibold tracking-tight text-white">
                {section.heading}
              </h2>
              {section.blocks.map((block, index) =>
                block.type === 'p' ? (
                  <p key={index} className="mt-4 text-base leading-8 text-zinc-300">
                    <Inline text={block.text} />
                  </p>
                ) : (
                  <ul key={index} className="mt-4 space-y-3 text-base leading-8 text-zinc-300">
                    {block.items.map((item) => (
                      <li key={plainText(item).slice(0, 40)}>
                        <Inline text={item} />
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}

          <p className="mt-8 text-sm text-zinc-500">
            This page describes the code as it stands on <time dateTime={METHODOLOGY_UPDATED}>{updatedLabel}</time>. If
            the measurement path changes, this page changes with it. The same text is available as{' '}
            <a href="/llms-full.txt" className={LINK_CLASS}>plain text</a>.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            <a href="/" className="text-red-400 hover:text-red-300">
              Back to the race
            </a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
