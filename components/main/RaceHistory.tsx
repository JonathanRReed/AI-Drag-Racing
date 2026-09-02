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
  const [shareState, setShareState] = useState<Record<string, 'sharing' | 'copied' | 'error'>>({});
  if (!receipts.length) return null;

  const shareReceipt = async (receipt: RaceReceipt) => {
    setShareState((current) => ({ ...current, [receipt.id]: 'sharing' }));
    try {
      const share = await createRaceShare(receipt);
      const shareUrl = `${window.location.origin}/share/${share.shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareState((current) => ({ ...current, [receipt.id]: 'copied' }));
    } catch {
      setShareState((current) => ({ ...current, [receipt.id]: 'error' }));
    }
  };

  return (
    <section className="race-history" aria-labelledby="history-heading">
      <div className="race-history-heading">
        <div>
          <h2 id="history-heading">Recent local races</h2>
          <p>Stored only in this browser and deleted automatically after 30 days.</p>
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
                          : 'Share 30 days'}
                  </button>
                )}
                <button type="button" onClick={() => onDelete(receipt.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
