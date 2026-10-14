import { useMemo, useSyncExternalStore } from "react";

const TICK_MS = 30_000;
const listeners = new Set<() => void>();
let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  current = Date.now();
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(tick, TICK_MS);
  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function snapshot() {
  if (Date.now() - current >= TICK_MS) current = Date.now();
  return current;
}

export function useClock(): Date {
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(() => new Date(value), [value]);
}
