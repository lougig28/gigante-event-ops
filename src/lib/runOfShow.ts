import type { RosCue } from "@/data/whiteParty";

/** Pick the current + next run-of-show cue relative to `now`.
 *  Pre-event, current is the first cue and next is the second (never equal). */
export function pickNowNext(cues: RosCue[], now: Date) {
  if (!cues.length) return { current: null as RosCue | null, next: null as RosCue | null, preEvent: true };
  const ms = now.getTime();
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (new Date(cues[i].time).getTime() <= ms) idx = i;
  }
  const preEvent = idx < 0;
  const current = preEvent ? cues[0] : cues[idx];
  const next = preEvent ? (cues[1] ?? null) : (cues[idx + 1] ?? null);
  return { current, next, preEvent };
}
