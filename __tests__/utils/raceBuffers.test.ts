import { describe, it, expect } from 'vitest';
import { decimate, LaneSample } from '../../utils/raceBuffers';

describe('decimate', () => {
  it('returns original array if length <= maxPoints', () => {
    const samples: LaneSample[] = [
      { t: 0, chars: 0 },
      { t: 10, chars: 5 },
      { t: 20, chars: 10 },
    ];

    expect(decimate(samples, 3)).toEqual(samples);
    expect(decimate(samples, 5)).toEqual(samples);
  });

  it('downsamples array when length > maxPoints', () => {
    // Create an array of 100 elements
    const samples: LaneSample[] = Array.from({ length: 100 }, (_, i) => ({
      t: i * 10,
      chars: i * 5,
    }));

    // Downsample to 10 points
    const result = decimate(samples, 10);

    // Check length is exactly maxPoints
    expect(result.length).toBe(10);

    // Ensure the first and last elements are preserved exactly
    expect(result[0]).toEqual({ t: 0, chars: 0 });
    expect(result[9]).toEqual({ t: 990, chars: 495 });

    // Check other points are somewhat evenly distributed
    expect(result[1].t).toBeGreaterThan(0);
    expect(result[1].t).toBeLessThan(990);
  });

  it('handles edge case: exact downsampling boundaries', () => {
    // Array of 11 elements, downsample to 6 elements
    const samples: LaneSample[] = Array.from({ length: 11 }, (_, i) => ({
      t: i * 100,
      chars: i * 2,
    }));

    const result = decimate(samples, 6);

    expect(result.length).toBe(6);
    expect(result[0].t).toBe(0);
    expect(result[1].t).toBe(200); // i=1, round(1 * (10/5)) = round(2) = 2 -> samples[2] -> t=200
    expect(result[2].t).toBe(400); // i=2, round(2 * 2) = 4 -> samples[4] -> t=400
    expect(result[3].t).toBe(600); // i=3, round(3 * 2) = 6 -> samples[6] -> t=600
    expect(result[4].t).toBe(800); // i=4, round(4 * 2) = 8 -> samples[8] -> t=800
    expect(result[5].t).toBe(1000); // last element
  });
});
