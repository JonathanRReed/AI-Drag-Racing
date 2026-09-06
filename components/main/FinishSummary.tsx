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
  const finished = useMemo(
    () => results
      .filter((result) => !result.error && (result.browserTiming?.totalMs != null || edgeDuration(result) != null))
      .sort((a, b) => (
        (a.browserTiming?.totalMs ?? edgeDuration(a) ?? Number.POSITIVE_INFINITY)
        - (b.browserTiming?.totalMs ?? edgeDuration(b) ?? Number.POSITIVE_INFINITY)
      )),
    [results],
  );
  // A lane that failed is evidence about this route too, so it stays on the
  // board instead of disappearing and making the race look cleaner than it was.
  const unfinished = useMemo(() => results.filter((result) => !finished.includes(result)), [results, finished]);

  if (!results.length) return null;

  const isDemo = results.some((result) => result.metrics?.timingSource === 'demo');
  const leader = finished[0] ?? null;
  const edgeRegion = finished.find((result) => result.edgeRegion)?.edgeRegion ?? null;

  return (
    <section className="finish-board" aria-labelledby="finish-heading">
      <div className="finish-board-lead">
        <div>
          <h2 id="finish-heading">
            {isDemo ? 'Simulated demo, not a measurement' : leader ? 'Fastest here, this run' : 'No lane finished'}
          </h2>
          <p>
            {leader ? (
              <>
                {leader.modelName}
                <span> via {leader.providerName}</span>
              </>
            ) : (
              <span>Every lane in this race ended before it returned a timing.</span>
            )}
          </p>
        </div>
        {leader && (
          <div className="finish-board-time">
            <strong>{formatMs(leader.browserTiming?.totalMs ?? edgeDuration(leader))}</strong>
            <span>browser to final token</span>
          </div>
        )}
      </div>

      <div className="finish-board-table-wrap" role="region" aria-labelledby="finish-heading" tabIndex={0}>
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
            {finished.map((result, index) => {
              const edgeTtft = result.metrics?.firstTokenTime && result.metrics.startTime
                ? result.metrics.firstTokenTime - result.metrics.startTime
                : null;
              return (
                <tr key={result.id} data-leader={index === 0 ? 'true' : 'false'}>
                  <th scope="row">
                    <div>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{result.modelName}</strong>
                        <small>{result.providerName}</small>
                      </div>
                    </div>
                  </th>
                  <td data-label="Browser first token">{formatMs(result.browserTiming?.ttftMs)}</td>
                  <td data-label="Edge first token">{formatMs(edgeTtft)}</td>
                  <td data-label="Browser total">{formatMs(result.browserTiming?.totalMs ?? edgeDuration(result))}</td>
                  <td data-label="Output tokens">{result.metrics?.outputTokens ?? 'Estimate unavailable'}</td>
                </tr>
              );
            })}
            {unfinished.map((result) => (
              <tr key={result.id} data-unfinished="true">
                <th scope="row">
                  <div>
                    <span aria-hidden="true">·</span>
                    <div>
                      <strong>{result.modelName}</strong>
                      <small>{result.providerName}</small>
                    </div>
                  </div>
                </th>
                <td colSpan={4} data-label="Outcome">
                  Did not finish{result.error ? `: ${result.error}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="finish-board-note">
        {finished.length} of {results.length} {results.length === 1 ? 'lane' : 'lanes'} finished.{' '}
        {isDemo
          ? 'These timings are simulated. No provider was contacted and nothing was saved.'
          : `One observation from this browser${edgeRegion ? ` through Cloudflare ${edgeRegion}` : ''}. Results vary with route, provider load, prompt, settings, and output length. They are not a global model ranking.`}
      </p>
    </section>
  );
}
