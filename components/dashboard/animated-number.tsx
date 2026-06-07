"use client";

import { useEffect, useRef, useState } from "react";

export type NumberFormat = "number" | "currency" | "percent";

// Hook for animating numbers counting up
export function useCountUp(end: number, duration = 1500, delay = 0) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;

      if (progress < delay) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const activeProgress = progress - delay;
      const percent = Math.min(activeProgress / duration, 1);

      const easeOut = 1 - Math.pow(1 - percent, 4);
      const currentVal = end * easeOut;

      if (percent < 1) {
        setCount(currentVal);
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, delay]);

  return count;
}

// Component to format and display animated numbers
export function AnimatedNumber({
  value,
  format = "number",
  delay = 0,
  duration = 1500,
}: {
  value: number;
  format?: NumberFormat;
  delay?: number;
  duration?: number;
}) {
  const count = useCountUp(value, duration, delay);

  if (format === "currency") {
    return <>${Math.floor(count).toLocaleString()}</>;
  }
  if (format === "percent") {
    return <>{Math.floor(count)}%</>;
  }
  return <>{Math.floor(count).toLocaleString()}</>;
}
