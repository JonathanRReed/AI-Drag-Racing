import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSseJson } from './sse';

function responseFromChunks(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }));
}

describe('parseSseJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves JSON split across network chunks and CRLF event boundaries', async () => {
    const response = responseFromChunks([
      'data: {"type":"chunk","cont',
      'ent":"hel',
      'lo"}\r\n\r',
      '\ndata: {"type":"metrics","data":{"tokenCount":2}}\r\n\r\n',
    ]);

    const events = [];
    for await (const event of parseSseJson(response, 'test')) events.push(event);

    expect(events).toEqual([
      { type: 'chunk', content: 'hello' },
      { type: 'metrics', data: { tokenCount: 2 } },
    ]);
  });

  it('stops at the done sentinel without yielding later events', async () => {
    const response = responseFromChunks([
      'data: {"value":1}\n\ndata: [DONE]\n\ndata: {"value":2}\n\n',
    ]);
    const events = [];
    for await (const event of parseSseJson(response, 'test')) events.push(event);
    expect(events).toEqual([{ value: 1 }]);
  });

  it('redacts sensitive credentials when logging JSON parse errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = responseFromChunks([
      'data: sk-secret123\n\n',
    ]);
    const events = [];
    for await (const event of parseSseJson(response, 'test-stream')) events.push(event);

    expect(events).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error parsing test-stream stream data:',
      expect.any(SyntaxError),
    );
    const loggedError = consoleSpy.mock.calls[0][1] as Error;
    expect(loggedError.message).toContain('[REDACTED]');
    expect(loggedError.message).not.toContain('sk-secret123');
  });
});
