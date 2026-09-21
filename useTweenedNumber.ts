"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly tweens toward `target` whenever it changes (easeOutExpo).
 * Starts at 0 for a count-up entrance. Respects prefers-reduced-motion.
 */
export function useTweenedNumber(target: number, duration = 650): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const val = from + (target - from) * eased;
      fromRef.current = val;
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}
