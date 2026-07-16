"use client";

// ── LEVEL 2 · ELEVATED — floor is live, no recorded vote ────────────────
// Members are speaking on the floor. This mode covers *who's talking* and runs
// conflict chyrons (TV lower-thirds) underneath them: who's at the microphone,
// and who paid for them.
//
// SCAFFOLD STATUS: the frame + the chyron RENDERER are built. Two feeds still
// need wiring (see docs/LEVELS.md):
//   1. "Who's speaking now" — floor-session detection + current-speaker feed.
//      We don't have a reliable free source yet, so this shows a labeled
//      placeholder rather than guessing.
//   2. Chyron data — the ticker can already be driven by the real FEC donor
//      data that powers Today's Conflicts; pass it in via `chyronItems`.

export interface ChyronItem {
  /** e.g. "Sen. Jane Doe (R-TX)" */
  who: string;
  /** e.g. "Top industry PAC money: Defense $51K" */
  money: string;
}

function ConflictChyron({ items }: { items: ChyronItem[] }) {
  if (items.length === 0) {
    return (
      <div className="lc-chyron">
        <span className="lc-chyron-tag">Who bought them</span>
        <div className="lc-chyron-track lc-chyron-empty">
          Conflict chyron — live FEC donor money for whoever holds the floor. Wire real
          data in via <code>chyronItems</code> (already available from Today&apos;s Conflicts).
        </div>
      </div>
    );
  }
  return (
    <div className="lc-chyron">
      <span className="lc-chyron-tag">Who bought them</span>
      <div className="lc-chyron-viewport">
        <div className="lc-chyron-track ticker-track">
          {[0, 1, 2].map((copy) =>
            items.map((it, i) => (
              <span key={`${copy}-${i}`} className="lc-chyron-item">
                <strong>{it.who}</strong> — {it.money}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function FloorSessionMode({
  chyronItems = [],
}: {
  chyronItems?: ChyronItem[];
}) {
  return (
    <section
      className="lc-mode lc-mode-elevated mx-6"
      aria-label="Live floor session"
    >
      <div className="lc-mode-tag" style={{ background: "#B8860B" }}>
        ● Floor In Session
      </div>

      <div className="lc-mode-headline">
        <h2 className="serif leading-tight" style={{ fontSize: "clamp(20px, 3.5vw, 30px)", fontWeight: 900 }}>
          Who&apos;s holding the floor
        </h2>
        <p className="serif italic" style={{ fontSize: 15, color: "var(--muted-dark)" }}>
          Members are speaking. Watch the microphone — and the money behind it.
        </p>
      </div>

      <div className="lc-scaffold-note">
        <span className="lc-scaffold-badge">Scaffold</span>
        <p>
          <strong>Current speaker feed</strong> — the live &ldquo;who&apos;s talking right now&rdquo; card needs a
          floor-session + speaker source we don&apos;t have wired yet (see <code>docs/LEVELS.md</code>). No speaker is
          named until it can be sourced.
        </p>
      </div>

      <ConflictChyron items={chyronItems} />
    </section>
  );
}
