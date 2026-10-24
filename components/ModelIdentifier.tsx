import React, { useState } from 'react';
import { formatModelIdentifier, modelIdentifierText } from '../utils/modelIdentifier';

function IdentifierPages({ value, className }: { value: string; className?: string }) {
  const [offsets, setOffsets] = useState([0]);
  const label = formatModelIdentifier(value, offsets[offsets.length - 1]);
  const paged = label.offset > 0 || label.hasMore;
  return (
    <span className={['model-identifier', className, label.needsDetail ? 'model-identifier--detailed' : ''].filter(Boolean).join(' ')} title={modelIdentifierText(value, label.offset)} style={label.needsDetail ? {
      whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', overflowWrap: 'anywhere', minWidth: 0,
    } : undefined}>
      {!label.authoritative && <bdi dir="auto">{label.primary}</bdi>}
      {label.needsDetail && (
        <span className="model-identifier-detail" style={{ display: 'block', fontSize: '0.75rem', lineHeight: 1.5, fontWeight: 400 }}>
          <span>Escaped representation: </span><bdi dir="ltr" style={{ fontFamily: 'monospace' }}>{label.escaped}</bdi>
          <span style={{ display: 'block' }}>Requests keep the original ID.</span>
          {paged && (
            <span style={{ display: 'block' }}>
              <span aria-live="polite">UTF-16 units {label.offset + 1}–{label.end} of {label.total}. </span>
              <button type="button" className="btn-ghost" aria-label="Previous identifier page" disabled={offsets.length === 1}
                onClick={() => setOffsets(previous => previous.slice(0, -1))}>Previous</button>{' '}
              <button type="button" className="btn-ghost" aria-label="Next identifier page" disabled={!label.hasMore}
                onClick={() => setOffsets(previous => [...previous, label.end])}>Next</button>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default function ModelIdentifier(props: { value: string; className?: string }) {
  // A new identifier starts at its first page, without an effect or stale render.
  return <IdentifierPages key={props.value} {...props} />;
}
