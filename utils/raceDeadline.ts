// One monotonic cutoff shared by every lane. The parent signal is reserved for
// Reset/unmount/replacement; deadline expiry is a distinct successful race stop.
export function createRaceDeadline(startedAt: number, durationMs: number, parent: AbortSignal) {
  const controller = new AbortController();
  const reason = new DOMException('Time limit reached', 'TimeoutError');
  const deadline = startedAt + durationMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const cancel = () => {
    clearTimer();
    controller.abort(parent.reason);
  };
  const reached = (observedAt = performance.now()) => {
    if (!controller.signal.aborted && observedAt >= deadline) {
      expired = true;
      clearTimer();
      controller.abort(reason);
    }
    return expired;
  };
  const check = () => {
    if (!reached() && !controller.signal.aborted) {
      timer = setTimeout(check, Math.max(0, deadline - performance.now()));
    }
  };
  parent.addEventListener('abort', cancel, { once: true });
  if (parent.aborted) cancel();
  else check();

  return {
    signal: controller.signal,
    reached,
    isLimitError(error: unknown) {
      return expired && (error === reason || (error instanceof Error && error.name === 'AbortError'));
    },
    dispose() {
      clearTimer();
      parent.removeEventListener('abort', cancel);
    },
  };
}

// Countdown waits must not resume a race after its owner leaves or resets it.
export function waitForRaceDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
    else timer = setTimeout(finish, ms);
  });
}
