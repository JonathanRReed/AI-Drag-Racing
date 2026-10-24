// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DragStrip from '../components/main/DragStrip';
import LivePaceChart from '../components/main/LivePaceChart';
import { createLaneBuffer, pushChunk } from '../utils/raceBuffers';
import { mount } from './reactDom';

let view: ReturnType<typeof mount>;
let now: number;
let frameId: number;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const lanes = [{ id: 'one', label: 'OpenAI', sublabel: 'synthetic-model', color: '#F2A35E' }];
function frame(time: number) {
  now = time;
  const [id, callback] = frames.entries().next().value!;
  frames.delete(id);
  act(() => callback(time));
}

// Happy DOM does not parse modern calc() multiplication, so capture authored
// position writes separately; the browser renderer still owns this property.
function interceptStyleProperty(style: CSSStyleDeclaration, property: string, read: () => string, write: (value: string) => void) {
  // Happy DOM 21 implements CSS properties through a Proxy rather than own
  // accessors. Intercept its CSSOM methods while forwarding unrelated styles.
  const getPropertyValue = style.getPropertyValue.bind(style);
  const setProperty = style.setProperty.bind(style);
  vi.spyOn(style, 'getPropertyValue').mockImplementation((name) => name === property ? read() : getPropertyValue(name));
  vi.spyOn(style, 'setProperty').mockImplementation((name, value, priority) => {
    if (name === property) write(String(value));
    else setProperty(name, value, priority);
  });
}

function trackPosition(car: HTMLDivElement) {
  let left = car.style.left;
  interceptStyleProperty(car.style, 'left', () => left, (value) => { left = value; });
}

function watch() {
  const observer = new MutationObserver(() => {});
  observer.observe(view.container, { attributes: true, childList: true, characterData: true, subtree: true });
  return observer;
}

describe('race animation DOM writes', () => {
  it('does not mutate unchanged DragStrip output on consecutive frames', () => {
    const buffer = createLaneBuffer('one');
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: { one: buffer } }} goTimeRef={{ current: 0 }} running reducedMotion />);
    frame(200);
    const observer = watch();
    frame(400);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('does not repeat authored calc and opacity writes after CSSOM normalization', () => {
    const buffer = createLaneBuffer('one');
    pushChunk(buffer, 'synthetic-output', 100);
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: { one: buffer } }} goTimeRef={{ current: 0 }} running reducedMotion />);
    const car = view.container.querySelector<HTMLDivElement>('.dragster')!;
    const streak = view.container.querySelector<HTMLDivElement>('.speed-streak')!;
    const writes: string[] = [];
    for (const [style, property, serialized] of [[car.style, 'left', 'calc(82% - 49.2px)'], [streak.style, 'opacity', '0.516667']] as const) {
      interceptStyleProperty(style, property, () => serialized, (value) => writes.push(`${property}:${value}`));
    }
    frame(200);
    const initial = writes.length;
    expect(initial).toBe(2);
    frame(400);
    expect(writes).toHaveLength(initial);
  });

  it('updates running, finished, and failed lane states rather than caching stale data', () => {
    const buffer = createLaneBuffer('one');
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: { one: buffer } }} goTimeRef={{ current: 0 }} running reducedMotion />);
    frame(200);
    const lane = view.container.querySelector<HTMLDivElement>('[data-state]')!;
    const car = view.container.querySelector<HTMLDivElement>('.dragster')!;
    expect(lane.dataset.state).toBe('stage');
    pushChunk(buffer, 'synthetic-output', 100);
    frame(400);
    expect(lane.dataset.state).toBe('go');
    expect(car.dataset.running).toBe('true');
    buffer.done = true; buffer.lastT = 1200;
    frame(600);
    expect(lane.dataset.state).toBe('fin');
    expect(car.dataset.running).toBe('false');
    expect(view.container.textContent).toContain('1.20s');
    buffer.errored = true;
    frame(800);
    expect(lane.dataset.state).toBe('out');
    expect(car.style.opacity).toBe('0.35');
    expect(view.container.textContent).toContain('DNF');
  });

  it('does not mutate pace-chart labels, empty state, or cursor on unchanged frames', () => {
    view = mount(<LivePaceChart lanes={lanes} buffersRef={{ current: { one: createLaneBuffer('one') } }} goTimeRef={{ current: 0 }} running reducedMotion />);
    frame(200);
    const observer = watch();
    frame(400);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('resets finished and failed DOM state for a new race using the same lane IDs', () => {
    const buffer = createLaneBuffer('one');
    pushChunk(buffer, 'synthetic-output', 100);
    const buffersRef = { current: { one: buffer } };
    const goTimeRef = { current: 0 };
    view = mount(<DragStrip lanes={lanes} buffersRef={buffersRef} goTimeRef={goTimeRef} running reducedMotion />);
    const car = view.container.querySelector<HTMLDivElement>('.dragster')!;
    trackPosition(car);
    buffer.done = true; buffer.lastT = 1200;
    frame(200);
    const finishedLeft = car.style.left;
    buffer.errored = true;
    frame(400);
    expect(car.style.opacity).toBe('0.35');
    buffersRef.current.one = createLaneBuffer('one');
    frame(600);
    expect(view.container.querySelector<HTMLElement>('[data-state]')!.dataset.state).toBe('stage');
    expect(car.style.left).not.toBe(finishedLeft);
    expect(car.style.opacity).toBe('1');
    expect(car.dataset.running).toBe('false');
    expect(car.dataset.leader).toBe('false');
    expect(view.container.textContent).toContain('Ready');
    expect(view.container.textContent).not.toContain('DNF');
    expect(view.container.querySelector<HTMLDivElement>('.speed-streak')!.style.opacity).toBe('0');
  });

  it('preserves cached position and streak styles while React updates a lane color', () => {
    const buffer = createLaneBuffer('one');
    pushChunk(buffer, 'synthetic-output', 100);
    const buffersRef = { current: { one: buffer } };
    const goTimeRef = { current: 0 };
    view = mount(<DragStrip lanes={lanes} buffersRef={buffersRef} goTimeRef={goTimeRef} running reducedMotion />);
    const car = view.container.querySelector<HTMLDivElement>('.dragster')!;
    trackPosition(car);
    frame(200);
    const streak = view.container.querySelector<HTMLDivElement>('.speed-streak')!;
    const before = { left: car.style.left, opacity: streak.style.opacity, width: streak.style.width, color: streak.style.color };
    view.rerender(<DragStrip lanes={[{ ...lanes[0], color: '#12D7C6' }]} buffersRef={buffersRef} goTimeRef={goTimeRef} running reducedMotion />);
    expect(streak.style.color).not.toBe(before.color);
    expect(car.style.left).toBe(before.left);
    expect(streak.style.opacity).toBe(before.opacity);
    expect(streak.style.width).toBe(before.width);
    const observer = watch();
    frame(400);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('cancels queued frames when the renderer unmounts', () => {
    view = mount(<DragStrip lanes={lanes} buffersRef={{ current: { one: createLaneBuffer('one') } }} goTimeRef={{ current: 0 }} running />);
    expect(frames.size).toBe(1);
    view.unmount();
    expect(frames.size).toBe(0);
  });
});
