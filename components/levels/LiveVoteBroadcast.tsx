"use client";

// ── LEVEL 1 · CRITICAL — the "Super Bowl" scaffold ──────────────────────
// A recorded roll-call vote is underway. This full-width takeover is where the
// corruption spectacle lives: a live play-by-play of positions as they land,
// each flagged against the member's donors and holdings.
//
// SCAFFOLD STATUS: the frame, the live-vote header, and the play-by-play SHELL
// are built. The per-position conflict flags ("voted YEA — took $X from the
// industry that wins if this passes") need the red-tier donor+holdings pipeline
// and are shown as a labeled placeholder, not faked. The actual YEA/NAY tallies
// continue to render live in the routine grid below. See docs/LEVELS.md.

export interface LiveVoteBroadcastMeta {
  billNumber: string | null;
  billTitle: string | null;
  question: string;
  result: string;
  created: string;
}

export default function LiveVoteBroadcast({
  vote,
}: {
  vote: LiveVoteBroadcastMeta | null;
}) {
  return (
    <section
      className="lc-mode lc-mode-critical mx-6"
      aria-label="Live vote broadcast"
    >
      <div className="lc-mode-tag" style={{ background: "var(--red)" }}>
        ● Live Vote — Play-by-Play
      </div>

      {vote ? (
        <div className="lc-mode-headline">
          {vote.billNumber && (
            <p className="text-xs font-semibold tracking-wider" style={{ color: "var(--muted)" }}>
              {vote.billNumber}
            </p>
          )}
          <h2 className="serif leading-tight" style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900 }}>
            {vote.billTitle ?? vote.question}
          </h2>
          <p className="serif italic" style={{ fontSize: 15, color: "var(--muted-dark)" }}>{vote.question}</p>
        </div>
      ) : (
        <div className="lc-mode-headline">
          <h2 className="serif leading-tight" style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900 }}>
            Live vote broadcast
          </h2>
          <p className="serif italic" style={{ fontSize: 15, color: "var(--muted-dark)" }}>
            When the Senate opens a recorded vote, it takes over the page here.
          </p>
        </div>
      )}

      {/* Play-by-play shell — the streaming positions render in the routine
          grid's YEA/NAY columns today; the conflict-flag overlay below is the
          red-tier feature still to be built. */}
      <div className="lc-scaffold-note">
        <span className="lc-scaffold-badge">Scaffold</span>
        <p>
          <strong>Play-by-play conflict flags</strong> — as each senator&apos;s position lands, this strip will call the
          money: &ldquo;voted YEA · took $X from the industry that wins if this passes.&rdquo; That needs the red-tier
          donor + stock-holdings pipeline (see <code>docs/LEVELS.md</code>). Until it&apos;s live, no conflict is asserted
          against any named member — the real YEA/NAY tally streams below.
        </p>
      </div>
    </section>
  );
}
