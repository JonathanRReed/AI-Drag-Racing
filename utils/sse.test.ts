import { describe, expect, it } from 'vitest';
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
});
