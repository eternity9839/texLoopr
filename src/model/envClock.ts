/** Stable clock fields for merge templates (`env.today`, `env.now`, `env.timestamp`). */

export type EnvClock = {
  timestamp: number;
  /** Local calendar date as YYYY-MM-DD */
  today: string;
  /** ISO-8601 datetime */
  now: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local YYYY-MM-DD (not UTC — matches author expectation for “today”). */
export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function envClock(at = new Date()): EnvClock {
  return {
    timestamp: at.getTime(),
    today: localIsoDate(at),
    now: at.toISOString(),
  };
}
