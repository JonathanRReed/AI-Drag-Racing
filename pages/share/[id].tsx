import Head from 'next/head';
import { SiteFooter, SiteHeader } from '../../components/layout/SiteChrome';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SharedRaceView from '../../components/main/SharedRaceView';
import { getRaceShare, type RaceShareRecord } from '../../utils/raceShares';

export default function SharedRacePage() {
  const router = useRouter();
  const [record, setRecord] = useState<RaceShareRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!router.isReady || typeof router.query.id !== 'string') return;
    getRaceShare(router.query.id)
      .then((result) => {
        setRecord(result);
        setState(result ? 'ready' : 'missing');
      })
      .catch(() => setState('error'));
  }, [router.isReady, router.query.id]);

  return (
    <>
      <Head>
        <title>Shared race receipt | AI Drag Racing</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>
      <SiteHeader />
      <main id="main-content" className="shared-race-page">
        {state === 'ready' && record ? <SharedRaceView record={record} /> : (
          <section className="shared-race-message" aria-live="polite">
            <h1>{state === 'loading' ? 'Loading race receipt' : 'Race receipt unavailable'}</h1>
            <p>{state === 'missing' ? 'This unlisted link is invalid or has expired.' : state === 'error' ? 'The receipt could not be loaded. Try again shortly.' : 'Checking the 30-day share store.'}</p>
            {state !== 'loading' && <a href="/">Start a new race</a>}
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
