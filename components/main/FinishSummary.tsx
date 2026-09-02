import React, { useMemo } from 'react';
import type { ResultState } from './ResultsDisplay';

function edgeDuration(result: ResultState): number | null {
  const metrics = result.metrics;
  if (!metrics?.startTime || !metrics.finishTime) return null;
  return Math.max(0, metrics.finishTime - metrics.startTime);
}

function formatMs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not observed';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`;
}

export default function FinishSummary({ results }: { results: ResultState[] }) {
  const completed = useMemo(
    () => results
      .filter((result) => !result.error && (result.browserTiming?.totalMs != null || edgeDuration(result) != null))
      .sort((a, b) => (
        (a.browserTiming?.totalMs ?? edgeDuration(a) ?? Number.POSITIVE_INFINITY)
        - (b.browserTiming?.totalMs ?? edgeDuration(b) ?? Number.POSITIVE_INFINITY)
      )),
    [results],
  );

  if (!completed.length) return null;
  const leader = completed[0];
  const edgeRegion = completed.find((result) => result.edgeRegion)?.edgeRegion ?? null;

  return (
    <section className="finish-board" aria-labelledby="finish-heading">
      <div className="finish-board-lead">
        <div>
          <h2 id="finish-heading">Fastest here, this run</h2>
          <p>
            {leader.modelName}
            <span> via {leader.providerName}</span>
          </p>
        </div>
        <div className="finish-board-time">
          <strong>{formatMs(leader.browserTiming?.totalMs ?? edgeDuration(leader))}</strong>
          <span>browser to final token</span>
        </div>
      </div>

      <div className="finish-board-table-wrap">
        <table className="finish-board-table">
          <thead>
            <tr>
              <th scope="col">Lane</th>
              <th scope="col">Browser first token</th>
              <th scope="col">Edge first token</th>
              <th scope="col">Browser total</th>
              <th scope="col">Output tokens</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((result, index) => {
              const edgeTtft = result.metrics?.firstTokenTime && result.metrics.startTime
                ? result.metrics.firstTokenTime - result.metrics.startTime
                : null;
              return (
                <tr key={result.id} data-leader={index === 0 ? 'true' : 'false'}>
                  <th scope="row">
                    <span>{index + 1}</span>
                    <div>
                      <strong>{result.modelName}</strong>
                      <small>{result.providerName}</small>
                    </div>
                  </th>
                  <td data-label="Browser first token">{formatMs(result.browserTiming?.ttftMs)}</td>
                  <td data-label="Edge first token">{formatMs(edgeTtft)}</td>
                  <td data-label="Browser total">{formatMs(result.browserTiming?.totalMs ?? edgeDuration(result))}</td>
                  <td data-label="Output tokens">{result.metrics?.outputTokens ?? 'Estimate unavailable'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="finish-board-note">
        One observation from this browser{edgeRegion ? ` through Cloudflare ${edgeRegion}` : ''}. Results vary with
        route, provider load, prompt, settings, and output length. They are not a global model ranking.
      </p>
    </section>
  );
}
