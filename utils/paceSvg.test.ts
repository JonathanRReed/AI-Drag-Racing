import { describe, expect, it } from 'vitest';
import { applyPaceFilter } from './paceSvg';

function cssomPath() {
  let stored = '';
  const writes: string[] = [];
  const style = {
    get filter() { return stored; },
    set filter(value: string) {
      writes.push(value);
      stored = value === 'none' ? value : 'drop-shadow(rgba(242, 163, 94, 0.667) 0px 0px 6px)';
    },
  };
  return { path: { style } as Pick<SVGPathElement, 'style'>, writes };
}

describe('pace chart filter writes', () => {
  it('does not repeat a filter write when CSSOM serializes the same value differently', () => {
    const { path, writes } = cssomPath();
    applyPaceFilter(path, 'drop-shadow(0 0 6px #F2A35Eaa)');
    applyPaceFilter(path, 'drop-shadow(0 0 6px #F2A35Eaa)');
    expect(writes).toEqual(['drop-shadow(0 0 6px #F2A35Eaa)']);
  });

  it('updates when the leader loses its glow or its color changes', () => {
    const { path, writes } = cssomPath();
    const gold = 'drop-shadow(0 0 6px #F2A35Eaa)';
    const teal = 'drop-shadow(0 0 6px #12D7C6aa)';
    for (const filter of [gold, 'none', 'none', teal, teal]) applyPaceFilter(path, filter);
    expect(writes).toEqual([gold, 'none', teal]);
  });

  it('applies the same filter to a new path after a remount', () => {
    const first = cssomPath();
    const second = cssomPath();
    applyPaceFilter(first.path, 'none');
    applyPaceFilter(second.path, 'none');
    expect(first.writes).toEqual(['none']);
    expect(second.writes).toEqual(['none']);
  });
});
