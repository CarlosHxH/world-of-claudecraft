// Demand gate for the Renown (deeds) board warm loop.
//
// The board is a full-table roll-up of character_deeds joined to characters and
// accounts (deedsBoardRows in db.ts). Refreshing it on every LEADERBOARD_TTL_MS
// tick in every realm process is wasted work when nobody is viewing it: at scale
// that is the whole character_deeds table re-read on a fixed interval for a board
// that may have no audience. So gate the warm refresh on real demand: a board
// request stamps a wall-clock timestamp (the caller keeps it next to the board
// cache), and the warm loop refreshes only while that stamp is inside the demand
// window. A request that arrives with a cold or stale cache still refreshes
// inline on its own read path (main.ts ensureDeedsBoard), so a viewer never waits
// on the loop; the loop only keeps a demanded board fresh and lets an abandoned
// one lapse until the next request revives it.
//
// Wall-clock Date.now is correct here: this is server-only, never deterministic
// sim code.

// Ten minutes. Comfortably longer than the gaps between a viewer's page clicks
// and board re-opens, so an in-use board never lapses under them; yet short
// enough that an abandoned board stops costing the full-table read within one
// window.
export const DEEDS_BOARD_DEMAND_TTL_MS = 10 * 60_000;

/**
 * Whether the warm loop should refresh the deeds board: true only when a board
 * request landed within `ttlMs` of `now`. `lastRequestAt` is 0 before the first
 * request ever, which is far past any real-clock window, so an untouched board
 * never warms.
 */
export function shouldWarmDeedsBoard(
  lastRequestAt: number,
  now: number,
  ttlMs: number = DEEDS_BOARD_DEMAND_TTL_MS,
): boolean {
  return now - lastRequestAt < ttlMs;
}

/**
 * Warm-loop gate: run `refresh` (the full-table board read) only when the board
 * is under demand, and report whether it did. The read path stamps demand via
 * `lastRequestAt`; this keeps a demanded board warm and skips the read entirely
 * for an idle one.
 */
export function warmDeedsBoardIfDemanded(
  refresh: () => void,
  lastRequestAt: number,
  now: number,
  ttlMs: number = DEEDS_BOARD_DEMAND_TTL_MS,
): boolean {
  if (!shouldWarmDeedsBoard(lastRequestAt, now, ttlMs)) return false;
  refresh();
  return true;
}
