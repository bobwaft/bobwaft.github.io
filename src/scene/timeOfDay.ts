// Time of day follows the visitor's local clock (D-18); the window is inert.
// t is the setTimeOfDay cycle: 0 = noon, 0.5 = midnight, 1 = noon again.
const wrap = (x: number) => x - Math.floor(x);

/** Local hours and minutes -> t (12:00 -> 0, 00:00 -> 0.5), in [0, 1). */
export function timeFromClock(date: Date): number {
  const dayFraction = (date.getHours() * 60 + date.getMinutes()) / 1440;
  return wrap(dayFraction + 0.5);
}
