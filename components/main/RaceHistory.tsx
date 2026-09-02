import React, { useState } from 'react';
import type { RaceReceipt } from '../../utils/raceReceipts';
import { serializeSanitizedReceipt } from '../../utils/raceReceipts';
import { createRaceShare, isRaceShareConfigured } from '../../utils/raceShares';

function downloadReceipt(receipt: RaceReceipt) {
  const blob = new Blob([serializeSanitizedReceipt(receipt)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ai-drag-race-${receipt.createdAt.slice(0, 10)}-${receipt.id.slice(0, 8)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fastestLane(receipt: RaceReceipt) {
  return receipt.lanes
    .filter((lane) => lane.status === 'completed')
    .sort((a, b) => (a.browser.totalMs ?? Number.POSITIVE_INFINITY) - (b.browser.totalMs ?? Number.POSITIVE_INFINITY))[0];
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
  if (!receipts.length) return null;

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
        <button type="button" className="race-tool-button" onClick={onClear}>Clear history</button>
      </div>
      <div className="race-history-list">
        {receipts.map((receipt) => {
          const leader = fastestLane(receipt);
          return (
            <article key={receipt.id} className="race-history-row">
              <time dateTime={receipt.createdAt}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.createdAt))}
              </time>
              <div>
                <strong>{leader ? leader.modelId : 'No completed lane'}</strong>
                <span>
                  {receipt.lanes.length} lanes · {receipt.experience === 'lab' ? 'Experiment Lab' : 'Quick Race'}
                </span>
              </div>
              <div className="race-history-actions">
                <button type="button" onClick={() => downloadReceipt(receipt)}>Export JSON</button>
                {isRaceShareConfigured() && (
                  <button
                    type="button"
                    disabled={shareState[receipt.id] === 'sharing'}
                    onClick={() => void shareReceipt(receipt)}
                  >
                    {shareState[receipt.id] === 'sharing'
                      ? 'Creating link…'
                      : shareState[receipt.id] === 'copied'
                        ? 'Link copied'
                        : shareState[receipt.id] === 'error'
                          ? 'Retry share'
                          : shareLinks[receipt.id] ? 'Copy share link' : 'Share for 30 days'}
                  </button>
                )}
                <button type="button" onClick={() => onDelete(receipt.id)}>Delete local record</button>
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
