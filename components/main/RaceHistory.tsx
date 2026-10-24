import ModelIdentifier from '../ModelIdentifier';
import React, { useEffect, useRef, useState } from 'react';
import type { RaceReceipt } from '../../utils/raceReceipts';
import { serializeSanitizedReceipt } from '../../utils/raceReceipts';
import { selectRaceLeader } from '../../utils/raceRanking';
import { createRaceShare, isRaceShareConfigured } from '../../utils/raceShares';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function downloadReceipt(receipt: RaceReceipt) {
  const blob = new Blob([serializeSanitizedReceipt(receipt)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ai-drag-race-${receipt.createdAt.slice(0, 10)}-${receipt.id.slice(0, 8)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function RaceHistory({
  receipts,
  onDelete,
  onClear,
}: {
  receipts: RaceReceipt[];
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [shareState, setShareState] = useState<Record<string, 'sharing' | 'copied' | 'ready' | 'error'>>({});
  const [shareLinks, setShareLinks] = useState<Record<string, { url: string; expiresAt: string }>>({});
  const [exportedState, setExportedState] = useState<Record<string, boolean>>({});
  const exportTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = exportTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (!receipts.length) return null;

  // Share one formatter across rows without freezing locale/timezone defaults.
  const raceDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const handleExport = (receipt: RaceReceipt) => {
    downloadReceipt(receipt);
    const previousTimer = exportTimers.current.get(receipt.id);
    if (previousTimer !== undefined) clearTimeout(previousTimer);
    setExportedState((current) => ({ ...current, [receipt.id]: true }));
    exportTimers.current.set(receipt.id, setTimeout(() => {
      setExportedState((current) => ({ ...current, [receipt.id]: false }));
      exportTimers.current.delete(receipt.id);
    }, 2000));
  };

  const shareReceipt = async (receipt: RaceReceipt) => {
    setShareState((current) => ({ ...current, [receipt.id]: 'sharing' }));
    try {
      let link = shareLinks[receipt.id];
      if (!link || Date.parse(link.expiresAt) <= Date.now()) {
        const share = await createRaceShare(receipt);
        link = { url: `${window.location.origin}/share/${share.shareId}`, expiresAt: share.expiresAt };
        setShareLinks((current) => ({ ...current, [receipt.id]: link }));
      }
      try {
        await navigator.clipboard.writeText(link.url);
        setShareState((current) => ({ ...current, [receipt.id]: 'copied' }));
      } catch {
        setShareState((current) => ({ ...current, [receipt.id]: 'ready' }));
      }
    } catch {
      setShareState((current) => ({ ...current, [receipt.id]: 'error' }));
    }
  };

  return (
    <section className="race-history" aria-labelledby="history-heading">
      <div className="race-history-heading">
        <div>
          <h2 id="history-heading">Recent local races</h2>
          <p>Local records expire after 30 days. Sharing uploads only timing metrics and settings.</p>
        </div>
        {/* Clearing wipes every local receipt, so it asks first. */}
        <AlertDialog>
          <AlertDialogTrigger className="race-tool-button">Clear history</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear every local race record?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all {receipts.length} {receipts.length === 1 ? 'record' : 'records'} stored in this
                browser. Records are only here, so they cannot be recovered. Export anything you want to keep first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep them</AlertDialogCancel>
              <AlertDialogAction onClick={onClear}>Clear history</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="race-history-list">
        {receipts.map((receipt) => {
          const ranking = selectRaceLeader(receipt.mode, receipt.lanes.filter(lane => lane.status === 'completed'),
            lane => ({ outputCharacters: lane.outputCharacters, totalMs: lane.browser.totalMs }));
          const leader = ranking.leader;
          const formattedDate = raceDateFormatter.format(new Date(receipt.createdAt));
          const exportLabel = exportedState[receipt.id] ? 'Exported ✓' : 'Export JSON';
          const shareLabel = shareState[receipt.id] === 'sharing'
            ? 'Creating link…'
            : shareState[receipt.id] === 'copied'
              ? 'Link copied'
              : shareState[receipt.id] === 'error'
                ? 'Retry share'
                : shareLinks[receipt.id] ? 'Copy share link' : 'Share for 30 days';
          return (
            <article key={receipt.id} className="race-history-row">
              <time dateTime={receipt.createdAt}>
                {formattedDate}
              </time>
              <div>
                <strong>{leader ? <ModelIdentifier value={leader.modelId} /> : ranking.unavailable ? 'Time Trial ranking unavailable' : 'No completed lane'}</strong>
                <span>
                  {receipt.lanes.length} lanes · {receipt.experience === 'lab' ? 'Experiment Lab' : 'Quick Race'}
                </span>
                {receipt.mode === 'time_limit' && (ranking.unavailable || leader) && (
                  <p className="mt-1 max-w-full whitespace-normal break-words text-zinc-500">
                    {ranking.unavailable
                      ? 'Output length was not recorded for every completed lane.'
                      : `Most output: ${leader!.outputCharacters} UTF-16 code units. Ties keep lane order.`}
                  </p>
                )}
              </div>
              <div className="race-history-actions">
                <button
                  type="button"
                  onClick={() => handleExport(receipt)}
                  aria-label={`${exportLabel} receipt for race on ${formattedDate}`}
                >
                  {exportLabel}
                </button>
                <span className="sr-only" role="status">
                  {exportedState[receipt.id] ? `Exported JSON receipt for race on ${formattedDate}.` : ''}
                </span>
                {isRaceShareConfigured() && (
                  <button
                    type="button"
                    disabled={shareState[receipt.id] === 'sharing'}
                    onClick={() => void shareReceipt(receipt)}
                    aria-label={`${shareLabel} for race on ${formattedDate}`}
                  >
                    {shareLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(receipt.id)}
                  aria-label={`Delete local record for race on ${formattedDate}`}
                >
                  Delete local record
                </button>
              </div>
              {shareLinks[receipt.id] && (
                <div className="race-share-result">
                  <label htmlFor={`share-${receipt.id}`}>Unlisted share link</label>
                  <input id={`share-${receipt.id}`} readOnly value={shareLinks[receipt.id].url} onFocus={(event) => event.currentTarget.select()} />
                  <p role="status">
                    {shareState[receipt.id] === 'copied' ? 'Link copied. ' : 'Copy the link above. '}
                    Anyone with this link can view it until {new Date(shareLinks[receipt.id].expiresAt).toLocaleDateString()}.
                    {' '}Deleting local history does not remove the shared copy.
                  </p>
                  <a href={shareLinks[receipt.id].url}>Open shared receipt</a>
                </div>
              )}
              {shareState[receipt.id] === 'error' && <p className="race-share-result" role="alert">The share service is unavailable or at capacity. Try later, or export the JSON receipt.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
