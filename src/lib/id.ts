// Monotonic counter ensures uniqueness even when Date.now() returns the same
// millisecond across rapid back-to-back calls in a synchronous loop (e.g.
// when batch-inserting dose logs for two medicines at the same time).
let _idCounter = 0;

export function newId(prefix: string): string {
  _idCounter = (_idCounter + 1) & 0xffff; // wraps at 65 535; fine for a session
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
