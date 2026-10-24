import React from 'react';
import type { PaceLane } from './LivePaceChart';
import ModelIdentifier from '../ModelIdentifier';
import { formatModelIdentifier, modelIdentifierText } from '../../utils/modelIdentifier';

export default function PaceLegend({ lanes }: { lanes: PaceLane[] }) {
  return (
    <div className="mt-2 flex max-h-[68px] flex-wrap gap-x-4 gap-y-1 overflow-y-auto scrollbar-none">
      {lanes.map(lane => (
        <span key={lane.id} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: lane.color }} />
          <span>
            <span className="max-w-[160px] truncate" title={`${modelIdentifierText(lane.label)} · ${modelIdentifierText(lane.sublabel)}`}>
              <bdi dir="auto">{lane.label}</bdi>
            </span>
            {formatModelIdentifier(lane.sublabel).needsDetail && <ModelIdentifier className="block" value={lane.sublabel} />}
          </span>
        </span>
      ))}
    </div>
  );
}
