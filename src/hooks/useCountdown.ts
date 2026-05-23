import { useEffect, useState } from "react";

/**
 * Returns remaining seconds until the target ISO timestamp. Updates every second.
 * Returns 0 if the target is in the past or invalid.
 */
export function useCountdown(targetIso: string | null | undefined): number {
  const [remaining, setRemaining] = useState(() => compute(targetIso));

  useEffect(() => {
    setRemaining(compute(targetIso));
    if (!targetIso) return;
    const id = setInterval(() => {
      setRemaining(compute(targetIso));
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}

function compute(target: string | null | undefined): number {
  if (!target) return 0;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - Date.now()) / 1000));
}
