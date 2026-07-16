// Shared logic for the vote-alert scaffolding. A roll-call vote is a
// point-in-time event, so we treat a vote as "live/just happened" if its
// GovTrack created timestamp is within the last 30 minutes.

const LIVE_WINDOW_MS = 30 * 60 * 1000;

export function isVoteLive(createdISO: string | null | undefined): boolean {
  if (!createdISO) return false;
  const t = Date.parse(createdISO);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= LIVE_WINDOW_MS;
}
