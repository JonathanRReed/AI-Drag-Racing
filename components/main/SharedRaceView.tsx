import type { RaceShareRecord } from '../../utils/raceShares';

const ms = (value: number | null): string => {
  if (value == null) return 'Not reported';
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
};

export default function SharedRaceView({ record }: { record: RaceShareRecord }) {
  const lanes = [...record.payload.lanes].sort((a, b) =>
    Number(a.status === 'failed') - Number(b.status === 'failed') ||
    (a.browser.totalMs ?? Number.POSITIVE_INFINITY) - (b.browser.totalMs ?? Number.POSITIVE_INFINITY));

  return (
    <article className="shared-race">
      <header>
        <p>Unlisted timing receipt</p>
        <h1>AI Drag Racing result</h1>
        <span>Expires {new Date(record.expiresAt).toLocaleDateString()}</span>
      </header>
      <div className="shared-race-scope">
        <strong>One observation, not a global ranking.</strong>
        <span>{record.payload.prompt.characters} prompt characters</span>
        <span>{record.payload.environment.edgeRegion ? `Cloudflare ${record.payload.environment.edgeRegion}` : 'Edge region unavailable'}</span>
      </div>
      <div className="finish-table-wrap">
        <table className="finish-table">
          <thead>
            <tr><th>Lane</th><th>Browser TTFT</th><th>Edge TTFT</th><th>Browser total</th><th>Output tokens</th></tr>
          </thead>
          <tbody>
            {lanes.map((lane, index) => (
              <tr key={`${lane.providerId}:${lane.modelId}:${index}`}>
                <th><span>{lane.status === 'failed' ? 'Failed' : index + 1}</span><strong>{lane.modelId}</strong><small>{lane.providerId}</small></th>
                <td>{ms(lane.browser.ttftMs)}</td>
                <td>{ms(lane.edge.ttftMs)}</td>
                <td>{ms(lane.browser.totalMs)}</td>
                <td>{lane.outputTokens ?? 'Not reported'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        <a href="/">Start your own race</a>
        <a href="https://aistats.jonathanrreed.com">Inspect model evidence in AI Stats</a>
      </footer>
    </article>
  );
}
