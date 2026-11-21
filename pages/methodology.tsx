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
  'How AI Drag Racing measures LLM speed: where the timer runs, what request gets sent, how time to first token, total time, and tokens per second work, the n=1 sample size, and what the code leaves out.';

/** Renders the content module's inline syntax: **bold**, `code`, [label](href). */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    if (token.startsWith('**')) {
      parts.push(<strong key={index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={index}>
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const external = link[2].startsWith('http');
        parts.push(
          <a key={index} href={link[2]} rel={external ? 'noopener noreferrer' : undefined}>
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
      name: 'How to run a comparison worth quoting',
      description:
        'How to get a repeatable, clearly labeled speed check out of a browser race. Every race is still one run from one route.',
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
      <main id="main-content" className="eco-container doc">
        <article className="doc-article">
          <h1>
            How AI Drag Racing measures model speed
          </h1>

          <p className="doc-lead">
            Every timing number on this site comes out of the same code path, so I want to spell out what that path
            actually does before anyone quotes a result. In short: each Quick Race sends one live request per model,
            with one clock in your browser and another at the Cloudflare edge. Most token counts are estimated rather
            than reported by the provider. That gives you real data about your route right now, though it&apos;s never
            a global ranking.
          </p>

          <nav aria-label="On this page" className="doc-toc">
            <a href="#definitions">Definitions</a>
            <a href="#compare">Fair comparison checklist</a>
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.heading}
              </a>
            ))}
          </nav>

          <section id="definitions" aria-labelledby="definitions-heading" className="doc-section">
            <h2 id="definitions-heading">
              Definitions
            </h2>
            <p className="doc-note">
              The terms you&apos;ll see on every timeslip, defined by what the code actually does.
            </p>
            <dl className="doc-defs">
              {DEFINITIONS.map((entry) => (
                <div key={entry.term}>
                  <dt>
                    {entry.term}
                    {entry.short ? <span className="doc-short">{entry.short}</span> : null}
                  </dt>
                  <dd>{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="compare" aria-labelledby="compare-heading" className="doc-section">
            <h2 id="compare-heading">
              How to run a comparison worth quoting
            </h2>
            <p className="doc-note">
              One race only tells you so much. Here&apos;s how I&apos;d run a few of them if you actually plan to share
              the numbers.
            </p>
            <ol className="doc-steps">
              {HOW_TO_COMPARE.map((step, index) => (
                <li key={step.name} id={`compare-step-${index + 1}`}>
                  <span aria-hidden="true">
                    {index + 1}
                  </span>
                  <p>
                    <strong>{step.name}.</strong> {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="doc-section">
              <h2 id={`${section.id}-heading`}>
                {section.heading}
              </h2>
              {section.blocks.map((block, index) =>
                block.type === 'p' ? (
                  <p key={index}>
                    <Inline text={block.text} />
                  </p>
                ) : (
                  <ul key={index}>
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

          <p className="doc-meta">
            This matches how the code works as of <time dateTime={METHODOLOGY_UPDATED}>{updatedLabel}</time>. When the
            timing code changes, I update this page too. You can also grab the whole thing as{' '}
            <a href="/llms-full.txt">plain text</a>.
          </p>
          <p className="doc-meta">
            <a href="/">
              Back to the race
            </a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
