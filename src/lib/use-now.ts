"use client";

import { useSyncExternalStore } from "react";

type Clock = { subscribe: (cb: () => void) => () => void; get: () => number };

const clocks = new Map<number, Clock>();

/** One shared ticking store per interval; the timer only runs while something is subscribed. */
function getClock(ms: number): Clock {
  let clock = clocks.get(ms);
  if (clock) return clock;

  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;
  const subs = new Set<() => void>();

  clock = {
    subscribe(cb) {
      subs.add(cb);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          subs.forEach((f) => f());
        }, ms);
      }
      return () => {
        subs.delete(cb);
        if (!subs.size && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
    get: () => now,
  };
  clocks.set(ms, clock);
  return clock;
}

/**
 * Current time in ms, refreshed every `intervalMs`. Returns null during SSR and
 * hydration so server and client markup match; render a placeholder for null.
 */
export function useNow(intervalMs = 1000): number | null {
  const clock = getClock(intervalMs);
  return useSyncExternalStore(clock.subscribe, clock.get, () => null);
}
