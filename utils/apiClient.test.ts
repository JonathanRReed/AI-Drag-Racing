import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamCompletion } from './apiClient';
import { CompletionResult } from './providerService';

// Mock global fetch
const originalFetch = global.fetch;

describe('streamCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should stream data correctly', async () => {
    const mockResponses: CompletionResult[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'chunk', content: ' World' },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockResponses[0])}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockResponses[1])}\n\n`));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const generator = streamCompletion('test-provider', 'test prompt', 'test-model', 'test-api-key');
    const results: CompletionResult[] = [];

    for await (const result of generator) {
      results.push(result);
    }

    expect(results).toEqual(mockResponses);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/providers/test-provider/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test prompt', model: 'test-model', apiKey: 'test-api-key' }),
      })
    );
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Bad Request'),
    });

    const generator = streamCompletion('test-provider', 'test prompt', 'test-model', 'test-api-key');

    await expect((async () => {
      for await (const _ of generator) {}
    })()).rejects.toThrow('API Error (400): Bad Request');
  });

  it('should handle API errors with no error text', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(''),
    });

    const generator = streamCompletion('test-provider', 'test prompt', 'test-model', 'test-api-key');

    await expect((async () => {
      for await (const _ of generator) {}
    })()).rejects.toThrow('API Error (500): Failed to connect');
  });

  it('should handle JSON parse errors gracefully and continue', async () => {
      const validResponse1: CompletionResult = { type: 'chunk', content: 'Valid 1' };
      const validResponse2: CompletionResult = { type: 'chunk', content: 'Valid 2' };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(validResponse1)}\n\n`));
          controller.enqueue(encoder.encode(`data: INVALID JSON\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(validResponse2)}\n\n`));
          controller.close();
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      // spy on console error to suppress it in test output and verify it was called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const generator = streamCompletion('test-provider', 'test prompt', 'test-model', 'test-api-key');
      const results: CompletionResult[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(results).toEqual([validResponse1, validResponse2]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing JSON from stream:', 'INVALID JSON');

      consoleErrorSpy.mockRestore();
  });

  it('should parse chunks that are split across reader boundary', async () => {
      const mockResponse: CompletionResult = { type: 'chunk', content: 'Split JSON' };
      const fullString = `data: ${JSON.stringify(mockResponse)}\n\n`;
      const part1 = fullString.substring(0, 15);
      const part2 = fullString.substring(15);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(part1));
          controller.enqueue(encoder.encode(part2));
          controller.close();
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const generator = streamCompletion('test-provider', 'test prompt', 'test-model', 'test-api-key');
      const results: CompletionResult[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(results).toEqual([mockResponse]);
  });
});
