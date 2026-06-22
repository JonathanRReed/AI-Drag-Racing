import { describe, it, expect } from 'vitest';
import { createLaneBuffer, pushChunk, recentCharsPerSec, decimate, SAMPLE_MS } from './raceBuffers';

describe('createLaneBuffer', () => {
  it('should create a valid lane buffer with the given id', () => {
    const id = 'test-lane-id';
    const buffer = createLaneBuffer(id);

    expect(buffer).toEqual({
      id: 'test-lane-id',
      samples: [],
      chars: 0,
      firstTokenT: null,
      lastT: 0,
      done: false,
      errored: false,
      finalOutputTokens: null,
    });
  });

  it('should initialize arrays as empty rather than null', () => {
    const buffer = createLaneBuffer('test');
    expect(Array.isArray(buffer.samples)).toBe(true);
    expect(buffer.samples.length).toBe(0);
  });
});

describe('pushChunk', () => {
  it('should handle the first chunk correctly', () => {
    const buffer = createLaneBuffer('test');
    pushChunk(buffer, 'hello', 100);

    expect(buffer.chars).toBe(5);
    expect(buffer.firstTokenT).toBe(100);
    expect(buffer.lastT).toBe(100);
    expect(buffer.samples).toEqual([
      { t: 100, chars: 0 },
      { t: 100, chars: 5 }
    ]);
  });

  it('should add a new sample if enough time has passed', () => {
    const buffer = createLaneBuffer('test');
    pushChunk(buffer, 'hello', 100); // 5 chars
    pushChunk(buffer, ' world', 100 + SAMPLE_MS); // 6 chars

    expect(buffer.chars).toBe(11);
    expect(buffer.lastT).toBe(100 + SAMPLE_MS);
    expect(buffer.samples.length).toBe(3); // origin + first chunk + second chunk
    expect(buffer.samples[2]).toEqual({ t: 100 + SAMPLE_MS, chars: 11 });
  });

  it('should coalesce chunks if not enough time has passed', () => {
    const buffer = createLaneBuffer('test');
    pushChunk(buffer, 'hello', 100); // 5 chars
    pushChunk(buffer, ' ', 100 + 10); // 1 char, too soon
    pushChunk(buffer, 'world', 100 + 20); // 5 chars, too soon

    expect(buffer.chars).toBe(11);
    expect(buffer.lastT).toBe(120);
    expect(buffer.samples.length).toBe(2); // origin + coalesced chunk
    expect(buffer.samples[1]).toEqual({ t: 120, chars: 11 });
  });
});

describe('recentCharsPerSec', () => {
  it('should return 0 if less than 2 samples', () => {
    const buffer = createLaneBuffer('test');
    expect(recentCharsPerSec(buffer)).toBe(0);

    pushChunk(buffer, 'hello', 100);
    // Even though pushChunk adds 2 samples for the first chunk, let's test it
    // Wait, first chunk adds origin and actual sample, so 2 samples exist
    // Let's create an artificial 1-sample case to test the function logic
    buffer.samples = [{ t: 100, chars: 5 }];
    expect(recentCharsPerSec(buffer)).toBe(0);
  });

  it('should calculate correct rate', () => {
    const buffer = createLaneBuffer('test');
    // Manually populate samples for precise testing
    buffer.samples = [
      { t: 0, chars: 0 },
      { t: 500, chars: 5 }, // 5 chars over 0.5s = 10 chars/sec
    ];
    expect(recentCharsPerSec(buffer, 1000)).toBe(10);
  });

  it('should respect the trailing window', () => {
    const buffer = createLaneBuffer('test');
    buffer.samples = [
      { t: 0, chars: 0 },
      { t: 1000, chars: 10 },
      { t: 2000, chars: 20 },
      { t: 2500, chars: 25 },
    ];
    // Window is 1000ms. End is at t=2500.
    // It should look back and find t=1000 (diff 1500 > 1000) -> start = t=1000, chars=10
    // Actually, loop:
    // end = { t: 2500, chars: 25 }
    // i=3: 2500-2500 = 0 < 1000
    // i=2: 2500-2000 = 500 < 1000
    // i=1: 2500-1000 = 1500 >= 1000 -> start = { t: 1000, chars: 10 }, break.
    // dt = (2500 - 1000) / 1000 = 1.5s
    // dChars = 25 - 10 = 15
    // rate = 15 / 1.5 = 10 chars/sec
    expect(recentCharsPerSec(buffer, 1000)).toBe(10);
  });

  it('should return 0 if dt is 0', () => {
    const buffer = createLaneBuffer('test');
    buffer.samples = [
      { t: 100, chars: 0 },
      { t: 100, chars: 10 }, // same t, technically dt=0
    ];
    expect(recentCharsPerSec(buffer, 1000)).toBe(0);
  });
});

describe('decimate', () => {
  it('should return the original array if it has fewer than maxPoints', () => {
    const samples = [
      { t: 0, chars: 0 },
      { t: 100, chars: 10 }
    ];
    expect(decimate(samples, 5)).toBe(samples);
  });

  it('should downsample keeping the first and last elements', () => {
    const samples = [
      { t: 0, chars: 0 },
      { t: 100, chars: 10 },
      { t: 200, chars: 20 },
      { t: 300, chars: 30 },
      { t: 400, chars: 40 },
      { t: 500, chars: 50 }
    ];

    const result = decimate(samples, 3);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ t: 0, chars: 0 }); // First
    expect(result[2]).toEqual({ t: 500, chars: 50 }); // Last

    // For 6 elements, maxPoints=3
    // stride = (6-1)/(3-1) = 5/2 = 2.5
    // i=0: 0
    // i=1: round(2.5) = 3 -> samples[3] = { t: 300, chars: 30 }
    expect(result[1]).toEqual({ t: 300, chars: 30 });
  });
});
