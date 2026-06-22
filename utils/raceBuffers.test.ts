import { describe, it, expect, beforeEach } from 'vitest';
import { createLaneBuffer, pushChunk, recentCharsPerSec, LaneBuffer } from './raceBuffers';

describe('recentCharsPerSec', () => {
  let buffer: LaneBuffer;

  beforeEach(() => {
    buffer = createLaneBuffer('lane-1');
  });

  it('returns 0 if there are less than 2 samples', () => {
    expect(recentCharsPerSec(buffer)).toBe(0);

    // 1 sample
    pushChunk(buffer, 'hello', 100);
    // pushChunk will add two samples if it's the first token (origin anchor and the actual chunk)
    // We can explicitly construct samples to test < 2 samples case thoroughly
    buffer.samples = [{ t: 100, chars: 5 }];
    expect(recentCharsPerSec(buffer)).toBe(0);
  });

  it('handles samples entirely within the windowMs (calculates rate from the first sample)', () => {
    buffer.samples = [
      { t: 100, chars: 10 },
      { t: 200, chars: 20 },
      { t: 300, chars: 40 }
    ];
    // window is 1000ms. 300 - 100 = 200ms < 1000ms.
    // So start is sample[0] (t: 100, chars: 10)
    // end is sample[2] (t: 300, chars: 40)
    // dt = (300 - 100) / 1000 = 0.2
    // rate = (40 - 10) / 0.2 = 30 / 0.2 = 150
    expect(recentCharsPerSec(buffer, 1000)).toBeCloseTo(150);
  });

  it('handles exact window boundaries (picks the sample exactly windowMs ago)', () => {
    buffer.samples = [
      { t: 100, chars: 10 },
      { t: 500, chars: 50 },
      { t: 1100, chars: 110 },
      { t: 1500, chars: 150 }
    ];
    // window is 1000ms. 1500 - 1000 = 500.
    // sample[1] is exactly at t=500. 1500 - 500 = 1000 >= 1000.
    // start is sample[1] (t: 500, chars: 50)
    // end is sample[3] (t: 1500, chars: 150)
    // dt = (1500 - 500) / 1000 = 1.0
    // rate = (1500 - 50) / 1.0 = 100? No, (150 - 50) = 100.
    expect(recentCharsPerSec(buffer, 1000)).toBeCloseTo(100);
  });

  it('handles exceeded window boundaries (picks the most recent sample that is >= windowMs ago)', () => {
    buffer.samples = [
      { t: 100, chars: 10 },
      { t: 400, chars: 40 }, // 1500 - 400 = 1100 >= 1000
      { t: 600, chars: 60 }, // 1500 - 600 = 900 < 1000
      { t: 1500, chars: 150 }
    ];
    // window is 1000ms.
    // 1500 - 600 = 900 < 1000 -> keep going backward
    // 1500 - 400 = 1100 >= 1000 -> this is the sample.
    // start is sample[1] (t: 400, chars: 40)
    // end is sample[3] (t: 1500, chars: 150)
    // dt = (1500 - 400) / 1000 = 1.1
    // rate = (150 - 40) / 1.1 = 110 / 1.1 = 100
    expect(recentCharsPerSec(buffer, 1000)).toBeCloseTo(100);
  });

  it('returns 0 if dt <= 0 (e.g., multiple samples at the exact same timestamp)', () => {
    buffer.samples = [
      { t: 1000, chars: 10 },
      { t: 1000, chars: 20 },
    ];
    // start = sample[0] (t: 1000), end = sample[1] (t: 1000)
    // dt = 0
    expect(recentCharsPerSec(buffer, 1000)).toBe(0);
  });
});
