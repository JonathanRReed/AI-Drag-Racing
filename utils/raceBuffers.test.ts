import { describe, it, expect, beforeEach } from 'vitest';
import { createLaneBuffer, pushChunk, SAMPLE_MS, type LaneBuffer } from './raceBuffers';

describe('raceBuffers', () => {
  describe('pushChunk', () => {
    let buf: LaneBuffer;

    beforeEach(() => {
      buf = createLaneBuffer('test-lane');
    });

    it('initial chunk adds anchor and first sample', () => {
      const content = 'hello';
      const tNow = 100;

      pushChunk(buf, content, tNow);

      expect(buf.chars).toBe(5);
      expect(buf.firstTokenT).toBe(100);
      expect(buf.lastT).toBe(100);

      expect(buf.samples).toHaveLength(2);
      expect(buf.samples[0]).toEqual({ t: 100, chars: 0 }); // Anchor
      expect(buf.samples[1]).toEqual({ t: 100, chars: 5 }); // First chunk
    });

    it('subsequent chunks within SAMPLE_MS are coalesced', () => {
      pushChunk(buf, 'hello', 100);

      // Add another chunk within SAMPLE_MS (60ms)
      pushChunk(buf, ' world', 120);

      expect(buf.chars).toBe(11); // 5 + 6
      expect(buf.lastT).toBe(120);

      // Should still be 2 samples (anchor + coalesced chunk)
      expect(buf.samples).toHaveLength(2);
      expect(buf.samples[0]).toEqual({ t: 100, chars: 0 });
      expect(buf.samples[1]).toEqual({ t: 120, chars: 11 }); // Coalesced into most recent
    });

    it('subsequent chunks beyond SAMPLE_MS create new samples', () => {
      pushChunk(buf, 'hello', 100);

      // Add another chunk beyond SAMPLE_MS (60ms)
      pushChunk(buf, ' world', 100 + SAMPLE_MS);

      expect(buf.chars).toBe(11); // 5 + 6
      expect(buf.lastT).toBe(160);

      // Should now be 3 samples (anchor + first chunk + new chunk)
      expect(buf.samples).toHaveLength(3);
      expect(buf.samples[0]).toEqual({ t: 100, chars: 0 });
      expect(buf.samples[1]).toEqual({ t: 100, chars: 5 });
      expect(buf.samples[2]).toEqual({ t: 160, chars: 11 }); // New sample added
    });

    it('multiple sequential chunks update the state correctly', () => {
      // 1st chunk
      pushChunk(buf, 'a', 100);
      expect(buf.samples).toHaveLength(2);

      // 2nd chunk (within SAMPLE_MS of 1st chunk) -> coalesced
      pushChunk(buf, 'b', 120);
      expect(buf.samples).toHaveLength(2);
      expect(buf.samples[1]).toEqual({ t: 120, chars: 2 });

      // 3rd chunk (beyond SAMPLE_MS of 2nd chunk) -> new sample
      pushChunk(buf, 'c', 180);
      expect(buf.samples).toHaveLength(3);
      expect(buf.samples[2]).toEqual({ t: 180, chars: 3 });

      // 4th chunk (within SAMPLE_MS of 3rd chunk) -> coalesced
      pushChunk(buf, 'd', 200);
      expect(buf.samples).toHaveLength(3);
      expect(buf.samples[2]).toEqual({ t: 200, chars: 4 });

      expect(buf.chars).toBe(4);
      expect(buf.firstTokenT).toBe(100);
      expect(buf.lastT).toBe(200);
    });
  });
});
