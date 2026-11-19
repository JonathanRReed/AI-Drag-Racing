// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DragStrip from '../components/main/DragStrip';
import RaceClock from '../components/main/RaceClock';
import ResultsDisplay from '../components/main/ResultsDisplay';
import { createLaneBuffer, pushChunk, type LaneBuffer } from '../utils/raceBuffers';
import { playRaceTone, primeRaceAudio } from '../utils/raceAudio';
import { mount } from './reactDom';

let view: ReturnType<typeof mount>;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const lanes = [
  { id: 'fast', label: 'Groq', sublabel: 'fast-model', color: '#FF6F5E' },
  { id: 'slow', label: 'OpenAI', sublabel: 'slow-model', color: '#12D7C6' },
  { id: 'dead', label: 'Cohere', sublabel: 'failed-model', color: '#EC74C9' },
];

function finished(id: string, totalMs: number, errored = false): LaneBuffer {
  const buffer = createLaneBuffer(id);
  pushChunk(buffer, 'synthetic-output', 100);
  buffer.done = true;
  buffer.lastT = totalMs;
  buffer.errored = errored;
  return buffer;
}

const laneState = () => [...view.container.querySelectorAll<HTMLElement>('.strip-lane')].map((lane) => ({
  win: lane.dataset.win, state: lane.dataset.state, sub: lane.querySelector('.strip-sub')!.textContent,
}));

describe('drag strip scoreboard', () => {
  it('lights the win light for the first clean finish and says so in words', () => {
    const buffers = { fast: finished('fast', 1200), slow: finished('slow', 3400), dead: finished('dead', 400, true) };
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: buffers }} goTimeRef={{ current: 0 }} running={false} reducedMotion mode="drag" />);
    expect(laneState()).toEqual([
      { win: 'true', state: 'fin', sub: 'first finish' },
      { win: 'false', state: 'fin', sub: 'finished' },
      // A failed lane that stopped earliest is never the winner.
      { win: 'false', state: 'out', sub: 'DNF' },
    ]);
    expect(view.container.textContent).toContain('1.20s');
  });

  it('lights no win light in a Time Trial, which ranks by output and not by who stopped first', () => {
    const buffers = { fast: finished('fast', 1200), slow: finished('slow', 3400), dead: finished('dead', 400, true) };
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: buffers }} goTimeRef={{ current: 0 }} running={false} reducedMotion mode="time_limit" />);
    expect(laneState().map((lane) => lane.win)).toEqual(['false', 'false', 'false']);
    expect(laneState().map((lane) => lane.sub)).toEqual(['finished', 'finished', 'DNF']);
  });

  it('shows staged lanes that have no buffer yet as ready, with a lane label for assistive technology', () => {
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: {} }} goTimeRef={{ current: 0 }} running={false} reducedMotion />);
    expect(laneState().map((lane) => lane.sub)).toEqual(['Ready', 'Ready', 'Ready']);
    expect(view.container.querySelector('.strip-head')!.textContent).toContain('Lane 1:');
    // Digits are scoreboard glyphs only: no letters are ever sent to the seven-segment face.
    for (const digits of view.container.querySelectorAll<HTMLElement>('.strip-digits')) {
      expect(digits.querySelector('.strip-digits-lit')!.textContent).toMatch(/^[0-9.-]+$/);
      // Unlit segments mirror the lit readout and are drawn by CSS, not as page text.
      expect(digits.dataset.ghost).toMatch(/^[8.]+$/);
    }
  });
});

describe('race clock', () => {
  it('reads zero before a race and freezes on the last lane to finish', () => {
    const buffersRef = { current: { fast: finished('fast', 1200), slow: finished('slow', 3456) } };
    view = mount(<RaceClock goTimeRef={{ current: 0 }} buffersRef={buffersRef} raceState="idle" reducedMotion />);
    const lit = () => view.container.querySelector('.strip-digits-lit')!.textContent;
    expect(lit()).toBe('0.00');
    view.rerender(<RaceClock goTimeRef={{ current: 0 }} buffersRef={buffersRef} raceState="finished" reducedMotion />);
    expect(lit()).toBe('3.46');
    expect(view.container.querySelector('[role="timer"]')!.getAttribute('aria-label')).toBe('Seconds since Go');
  });

  it('ticks from the shared Go while racing and cancels its frame on unmount', () => {
    let now = 5000;
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    view = mount(<RaceClock goTimeRef={{ current: 4000 }} buffersRef={{ current: {} }} raceState="racing" />);
    now = 6250;
    const [id, callback] = frames.entries().next().value!;
    frames.delete(id);
    act(() => callback(now));
    expect(view.container.querySelector('.strip-digits-lit')!.textContent).toBe('2.25');
    expect(frames.size).toBe(1);
    view.unmount();
    expect(frames.size).toBe(0);
  });
});

describe('results empty states', () => {
  it('replaces the setup steps with a ready note once lanes are staged', () => {
    view = mount(<ResultsDisplay results={[]} stagedCount={2} />);
    expect(view.container.textContent).toContain('2 lanes are staged.');
    expect(view.container.textContent).not.toContain('Line up your racers');
    view.rerender(<ResultsDisplay results={[]} stagedCount={1} />);
    expect(view.container.textContent).toContain('1 lane is staged.');
  });
});

describe('starting tree sound', () => {
  it('stays silent and does not throw where the browser has no audio support', () => {
    expect(() => { primeRaceAudio(); playRaceTone('amber'); playRaceTone('green'); playRaceTone('finish'); }).not.toThrow();
  });
});
