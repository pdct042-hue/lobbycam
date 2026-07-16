"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import GlobalStyles from "./GlobalStyles";
import VoteAlertButton, { readAlertOptIn } from "./VoteAlertButton";
import TodaysConflicts from "./TodaysConflicts";
import { isVoteLive } from "@/lib/voteAlert";
import {
  CURRENT_SESSION,
  ALL_VOTERS,
  MEMBERS,
  LOBBY_FILINGS_DATA,
  EXTRA_FILINGS,
  TICKER_ITEMS,
  PAST_VOTES,
  CSPAN_CHANNELS,
  INDUSTRY_COLORS,
  formatMoney,
  partyLabel,
  memberSlug,
  type Voter,
  type Member,
  type Filing,
} from "@/lib/data";

// ═══════════════════════════════════════════════════════════════
// LIVE DATA TYPES
// ═══════════════════════════════════════════════════════════════

interface LiveVoteMeta {
  id: number;
  chamber: string;
  question: string;
  result: string;
  billNumber: string | null;
  billTitle: string | null;
  created: string;
}

interface LiveVotesResponse {
  source: "govtrack" | "mock";
  vote: LiveVoteMeta | null;
  yes: Voter[];
  no: Voter[];
  error?: string;
}

interface ContractsResponse {
  source: "usaspending" | "mock";
  recipient: string;
  totalAmount: number | null;
  awardCount: number;
  fiscalYear?: string;
}

interface GeocodeResponse {
  source: "census" | "mock";
  zip: string;
  resolved: boolean;
  state?: string | null;
  district?: string | null;
  label?: string | null;
  error?: string;
}

// Module-level cache so repeated FilingCard clients (e.g. two Lockheed
// filings) don't each trigger their own USASpending fetch.
const contractCache = new Map<string, Promise<ContractsResponse>>();
function fetchContracts(client: string): Promise<ContractsResponse> {
  const cached = contractCache.get(client);
  if (cached) return cached;
  const promise = fetch(`/api/contracts?recipient=${encodeURIComponent(client)}`)
    .then((r) => r.json() as Promise<ContractsResponse>)
    .catch(() => ({ source: "mock" as const, recipient: client, totalAmount: null, awardCount: 0 }));
  contractCache.set(client, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTED COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Conflict tooltip — relative positioning, works in scroll contexts */
function ConflictFlag({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label="View conflict details"
      aria-expanded={show}
    >
      <span className="red font-bold" aria-hidden="true">{"⚠"}</span>
      {show && (
        <span
          className="absolute left-0 top-full mt-1 z-50 px-3 py-2 text-xs leading-snug border shadow-lg"
          style={{ width: 260, background: "var(--white-warm)", borderColor: "var(--red)", color: "var(--ink)", fontFamily: "var(--font-sans)" }}
          role="tooltip"
        >
          {text}
          <span className="block mt-1 opacity-50" style={{ fontSize: 9 }}>Source: Member Financial Disclosure / FEC</span>
        </span>
      )}
    </span>
  );
}

/** Reusable horizontal bar for all charts */
function Bar({ value, max, color, height = 5 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full" style={{ height, background: "var(--rule-light)" }}>
      <div className="h-full bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Vote tally column */
function VoteColumn({ label, votes, flashVote }: { label: string; votes: Voter[]; flashVote: string | null }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2 pb-1" style={{ borderBottom: "2px solid var(--ink)" }}>
        <span className="text-sm font-bold tracking-wider">{label}</span>
        <span className="serif text-2xl font-bold" aria-live="polite" aria-atomic="true">{votes.length}</span>
      </div>
      <div className="space-y-0.5" style={{ maxHeight: 260, overflowY: "auto" }} role="list" aria-label={`${label} votes`}>
        {votes.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: "var(--muted)" }}>Awaiting votes…</p>
        )}
        {votes.map((v, i) => (
          <div
            key={i}
            role="listitem"
            className={`flex items-center gap-1 py-0.5 px-1 text-xs ${v.name === flashVote ? "animate-flash" : "animate-fade"}`}
            style={{ fontSize: 12 }}
          >
            {v.conflicted && v.conflict ? <ConflictFlag text={v.conflict} /> : <span className="w-3 inline-block" aria-hidden="true" />}
            <span className={v.conflicted ? "red font-semibold" : ""}>{v.name}</span>
            <span style={{ color: "var(--muted)" }}>({v.party}-{v.state})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** C-SPAN embed — all 3 iframes rendered, visibility toggled (no remount flash) */
function CSpanEmbed({ activeChannel, onChannelChange }: { activeChannel: string; onChannelChange: (id: string) => void }) {
  const activeCspan = CSPAN_CHANNELS.find((c) => c.id === activeChannel) ?? CSPAN_CHANNELS[0];
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--red)", animation: "pulse-dot 1.5s ease-in-out infinite" }} aria-hidden="true" />
          <h4 className="section-header">Live Floor Feed</h4>
        </div>
        <div className="flex" role="tablist" aria-label="Floor feed source selector">
          {CSPAN_CHANNELS.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => onChannelChange(ch.id)}
              role="tab"
              aria-selected={activeChannel === ch.id}
              className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
              style={{
                fontSize: 9, cursor: "pointer",
                border: "1px solid var(--rule)",
                borderRight: i < CSPAN_CHANNELS.length - 1 ? "none" : "1px solid var(--rule)",
                background: activeChannel === ch.id ? "var(--ink)" : "var(--white-warm)",
                color: activeChannel === ch.id ? "var(--cream)" : "var(--muted-dark)",
                letterSpacing: "0.06em",
              }}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9", background: "var(--ink)", border: "1px solid var(--rule)" }}>
        {CSPAN_CHANNELS.map((ch) => (
          <iframe
            key={ch.id}
            src={ch.embedUrl}
            title={`C-SPAN ${ch.label} Live Feed`}
            className="absolute inset-0 w-full h-full"
            style={{ border: "none", display: activeChannel === ch.id ? "block" : "none" }}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ))}
        {/* Fallback layer: sits BEHIND the iframe. If C-SPAN blocks framing the
            iframe is transparent/empty and this shows through; if the video
            loads it covers this. Either way the user gets a working path. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4"
          style={{ zIndex: -1, color: "var(--cream)" }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--red)", animation: "pulse-dot 1.5s ease-in-out infinite" }} aria-hidden="true" />
          <p className="text-sm" style={{ opacity: 0.85 }}>Live {activeCspan?.label} floor feed</p>
          <a
            href={activeCspan?.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5"
            style={{ background: "var(--cream)", color: "var(--ink)", textDecoration: "none", letterSpacing: "0.08em" }}
          >
            ▶ Watch {activeCspan?.label} ↗
          </a>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="caption">Source: U.S. House Clerk / U.S. Senate — free public floor proceedings</p>
        <a
          href={activeCspan?.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="caption"
          style={{ color: "var(--blue)", fontWeight: 600 }}
        >
          Video not loading? Open live feed ↗
        </a>
      </div>
    </div>
  );
}

/** Single lobby filing card, with a live USASpending contract badge */
function FilingCard({ filing, isNew }: { filing: Filing; isNew: boolean }) {
  const color = INDUSTRY_COLORS[filing.industry] || "#666";
  const [contracts, setContracts] = useState<ContractsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContracts(filing.client).then((data) => {
      if (!cancelled) setContracts(data);
    });
    return () => {
      cancelled = true;
    };
  }, [filing.client]);

  return (
    <article
      className={`p-3 ${isNew ? "animate-fade" : ""}`}
      style={{
        background: "var(--white-warm)",
        borderLeft: `3px solid ${filing.activeConflict ? "var(--red)" : "var(--rule)"}`,
        borderTop: filing.activeConflict ? undefined : "1px solid var(--rule-border)",
        borderRight: filing.activeConflict ? undefined : "1px solid var(--rule-border)",
        borderBottom: filing.activeConflict ? undefined : "1px solid var(--rule-border)",
      }}
    >
      {filing.activeConflict && (
        <span className="inline-block mb-1 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--red)", background: "rgba(200,16,46,0.08)", fontSize: 9 }}>
          {"⚠"} Active Conflict
        </span>
      )}
      <p className="text-sm font-semibold leading-snug" style={{ fontSize: 13 }}>{filing.lobbyist}</p>
      <p className="text-xs" style={{ color: "var(--muted-dark)", fontSize: 11 }}>{filing.firm}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-xs font-bold" style={{ fontSize: 12 }}>{"→"} {filing.client}</span>
        <span className="inline-block px-1.5 py-0.5 text-xs font-semibold uppercase" style={{ fontSize: 9, background: color + "12", color, letterSpacing: "0.05em" }}>
          {filing.industry}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: 11 }}>
        Met with <span className="font-medium ink">{filing.memberMet}</span>
      </p>
      {contracts?.totalAmount != null && contracts.totalAmount > 0 && (
        <p className="text-xs mt-1 font-medium blue" style={{ fontSize: 11 }}>
          {formatMoney(contracts.totalAmount)} in {contracts.fiscalYear ?? "current FY"} federal contracts
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="caption">{filing.committee}</span>
        <span className="caption">{filing.timestamp}</span>
      </div>
      <p className="caption mt-1">Source: Senate LDA Filing{contracts?.totalAmount != null && contracts.totalAmount > 0 ? " / USASpending.gov" : ""}</p>
    </article>
  );
}

/** Member conflict card */
function MemberCard({ member, onClick }: { member: Member; onClick: () => void }) {
  return (
    <article
      className="p-3 cursor-pointer"
      style={{ background: "var(--white-warm)", border: "1px solid var(--rule-border)", transition: "border-color 0.15s" }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--red)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule-border)")}
      tabIndex={0}
      role="button"
      aria-label={`View profile for ${member.name}, conflict score ${member.conflictScore}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold leading-snug">{member.name}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{partyLabel(member.party)} — {member.state}</p>
        </div>
        <div className="text-right">
          <span className="serif text-xl font-bold red">{member.conflictScore}</span>
          <span className="text-xs block" style={{ color: "var(--muted)", fontSize: 9 }}>/100</span>
        </div>
      </div>
      <div className="mb-2">
        <span className="uppercase tracking-wider font-semibold block mb-0.5" style={{ fontSize: 9, color: "var(--muted)" }}>Today&apos;s Conflict Index</span>
        <Bar value={member.conflictScore} max={100} color="var(--red)" height={8} />
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {member.donors.slice(0, 3).map((d, i) => (
          <span key={i} className="inline-block px-1.5 py-0.5 text-xs font-medium uppercase" style={{ fontSize: 9, background: "var(--rule-light)", color: "var(--muted-dark)", letterSpacing: "0.04em" }}>
            {d.industry} {formatMoney(d.amount)}
          </span>
        ))}
      </div>
      {/* Stock holdings hidden until the real disclosure-scraping pipeline
          lands (red tier) — don't show fabricated holdings. */}
      <p className="text-xs mb-1" style={{ color: "var(--muted)", fontSize: 11, fontStyle: "italic" }}>
        Stock holdings: analysis in progress
      </p>
      <p className="text-xs font-medium" style={{ color: "var(--red)", fontSize: 11 }}>{member.correlation}</p>
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--rule-light)" }}>
        <span className="caption">Source: FEC / Financial Disclosures</span>
        <Link
          href={`/member/${memberSlug(member)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold blue"
          style={{ fontSize: 11 }}
        >
          Full Profile {"→"}
        </Link>
      </div>
    </article>
  );
}

/** Full member profile modal — focus trap, ESC close, body scroll lock */
function ProfileModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const els = modalRef.current.querySelectorAll<HTMLElement>('button, [tabindex="0"], a[href], input');
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const maxDonor = Math.max(...member.donors.map((d) => d.amount));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,26,26,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Conflict profile for ${member.name}`}
    >
      <div ref={modalRef} className="relative w-full overflow-y-auto" style={{ maxWidth: 640, maxHeight: "90vh", background: "var(--cream)", border: "2px solid var(--ink)" }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between" style={{ background: "var(--cream)", borderBottom: "2px solid var(--ink)" }}>
          <div>
            <h3 className="serif text-2xl font-bold leading-tight">{member.name}</h3>
            <p className="text-sm" style={{ color: "var(--muted-dark)" }}>{partyLabel(member.party)} — {member.state}</p>
          </div>
          <div className="text-right">
            <span className="serif text-3xl font-bold red">{member.conflictScore}</span>
            <p className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: "var(--muted)" }}>Conflict Index</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section>
            <h4 className="section-header mb-3">Career Donor Breakdown by Industry</h4>
            {member.donors.map((d, i) => (
              <div key={i} className="mb-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">{d.industry}</span>
                  <span className="text-xs font-bold">{formatMoney(d.amount)}</span>
                </div>
                <Bar value={d.amount} max={maxDonor} color={i === 0 ? "var(--red)" : "var(--blue)"} height={12} />
              </div>
            ))}
            <p className="caption mt-1">Source: FEC Donor Database, 2010–2026</p>
          </section>

          <section>
            <h4 className="section-header mb-3">Stock Holdings Relevant to Committee Assignments</h4>
            <div style={{ borderTop: "1px solid var(--rule)" }}>
              {member.stockHoldings.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--rule-light)", fontSize: 13 }}>
                  <div>
                    <span className="font-semibold">{s.company}</span>
                    <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>{s.committee}</span>
                  </div>
                  <span className="font-bold red">{s.value}</span>
                </div>
              ))}
            </div>
            <p className="caption mt-1">Source: Annual Member Financial Disclosure, U.S. Senate</p>
          </section>

          {member.revolvingDoor.length > 0 && (
            <section>
              <h4 className="section-header mb-2">Revolving Door History</h4>
              {member.revolvingDoor.map((r, i) => (
                <p key={i} className="text-sm mb-1" style={{ fontSize: 13, color: "var(--muted-body)" }}>{"•"} {r}</p>
              ))}
              <p className="caption mt-1">Source: OpenSecrets Revolving Door Database</p>
            </section>
          )}

          <section>
            <h4 className="section-header mb-3">Recent Votes with Conflict Flags</h4>
            <div style={{ borderTop: "1px solid var(--rule)" }}>
              {member.voteHistory.map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--rule-light)", fontSize: 13 }}>
                  <div className="flex items-center gap-2">
                    {v.conflict && <span className="red font-bold" aria-label="Conflict">{"⚠"}</span>}
                    <span className={v.conflict ? "font-semibold" : ""}>{v.bill}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-bold" style={{ background: v.vote === "YES" ? "var(--blue)" : "var(--rule-light)", color: v.vote === "YES" ? "#fff" : "var(--muted-dark)", fontSize: 10 }}>
                      {v.vote}
                    </span>
                    <span className="caption">{v.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="caption mt-1">Source: Congressional Record / clerk.house.gov</p>
          </section>

          <div className="p-3" style={{ background: "rgba(200,16,46,0.05)", border: "1px solid rgba(200,16,46,0.15)" }}>
            <p className="text-sm font-semibold red" style={{ fontSize: 13 }}>{member.correlation}</p>
            <p className="caption mt-1">Source: VoteSmart.org voting record analysis</p>
          </div>

          <button
            className="w-full py-3 text-sm font-bold uppercase tracking-wider"
            style={{ background: "var(--ink)", color: "var(--cream)", cursor: "pointer", border: "none", letterSpacing: "0.1em", fontSize: 12 }}
            onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(member.shareText); }}
          >
            Share This Profile — Copy to Clipboard
          </button>
        </div>

        <button
          ref={closeRef}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-lg font-bold"
          style={{ color: "var(--muted)", cursor: "pointer", background: "transparent", border: "none", zIndex: 20 }}
          onClick={onClose}
          aria-label="Close profile"
        >
          {"✕"}
        </button>
      </div>
    </div>
  );
}

/** ZIP → congressional district lookup, footer widget (groundwork for Task 28 alerts) */
function DistrictLookup() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<GeocodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/geocode?zip=${zip}`);
      const json = (await res.json()) as GeocodeResponse;
      setResult(json);
    } catch {
      setResult({ source: "mock", zip, resolved: false });
    } finally {
      setLoading(false);
    }
  }, [zip]);

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="zip-lookup" className="sr-only">Enter your ZIP code</label>
        <input
          id="zip-lookup"
          type="text"
          inputMode="numeric"
          placeholder="Your ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="sans border px-2 py-1 text-xs outline-none"
          style={{ width: 110, borderColor: "var(--rule)", background: "var(--white-warm)" }}
        />
        <button
          type="submit"
          disabled={loading || zip.length !== 5}
          className="px-2 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{ background: "var(--ink)", color: "var(--cream)", border: "none", cursor: "pointer", opacity: loading || zip.length !== 5 ? 0.5 : 1 }}
        >
          Find My District
        </button>
      </form>
      {result && (
        <p className="caption" style={{ maxWidth: 320, textAlign: "center" }}>
          {result.resolved
            ? `District: ${result.label ?? `${result.state}-${result.district}`}`
            : "Couldn't resolve that ZIP right now — this feature needs live internet access to the Census Geocoder."}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function LobbyCam() {
  const [yesVotes, setYesVotes] = useState<Voter[]>([]);
  const [noVotes, setNoVotes] = useState<Voter[]>([]);
  const [filings, setFilings] = useState<Filing[]>(LOBBY_FILINGS_DATA);
  const [newFilingId, setNewFilingId] = useState<number | null>(null);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [flashVote, setFlashVote] = useState<string | null>(null);
  const [cspanChannel, setCspanChannel] = useState("house");
  const [voteDataSource, setVoteDataSource] = useState<"loading" | "govtrack" | "mock">("loading");
  const [liveVoteMeta, setLiveVoteMeta] = useState<LiveVoteMeta | null>(null);

  const votersRef = useRef(ALL_VOTERS);
  const voteIdx = useRef({ y: 0, n: 0 });
  const extraIdx = useRef(0);
  const voteTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const filingTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const notifiedVoteId = useRef<number | null>(null);

  // Bootstrap: try live GovTrack data first, fall back to the mock simulation.
  // Either way, votes reveal one at a time via the same interval so the
  // "watching it happen live" feel is identical in both modes.
  useEffect(() => {
    let cancelled = false;

    function startReveal() {
      voteTimer.current = setInterval(() => {
        const { y, n } = voteIdx.current;
        const { yes, no } = votersRef.current;
        const yDone = y >= yes.length;
        const nDone = n >= no.length;
        if (yDone && nDone) {
          clearInterval(voteTimer.current);
          return;
        }

        let doYes = Math.random() > 0.35;
        if (yDone) doYes = false;
        if (nDone) doYes = true;

        if (doYes) {
          const voter = yes[y];
          setYesVotes((p) => [...p, voter]);
          if (voter.conflicted) setFlashVote(voter.name);
          voteIdx.current.y++;
        } else {
          const voter = no[n];
          setNoVotes((p) => [...p, voter]);
          if (voter.conflicted) setFlashVote(voter.name);
          voteIdx.current.n++;
        }
      }, 2200);
    }

    async function bootstrap() {
      try {
        const res = await fetch("/api/votes/live");
        const json = (await res.json()) as LiveVotesResponse;
        if (cancelled) return;
        if (json.source === "govtrack" && json.yes.length + json.no.length > 0) {
          votersRef.current = { yes: json.yes, no: json.no };
          setVoteDataSource("govtrack");
          setLiveVoteMeta(json.vote);
        } else {
          setVoteDataSource("mock");
        }
      } catch {
        if (!cancelled) setVoteDataSource("mock");
      } finally {
        if (!cancelled) startReveal();
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      clearInterval(voteTimer.current);
    };
  }, []);

  // Clear flash
  useEffect(() => {
    if (!flashVote) return;
    const t = setTimeout(() => setFlashVote(null), 1500);
    return () => clearTimeout(t);
  }, [flashVote]);

  // Filing simulation
  useEffect(() => {
    filingTimer.current = setInterval(() => {
      const idx = extraIdx.current;
      if (idx >= EXTRA_FILINGS.length) { clearInterval(filingTimer.current); return; }
      const f = { ...EXTRA_FILINGS[idx], timestamp: "Just now" };
      setFilings((prev) => [f, ...prev]);
      setNewFilingId(f.id);
      extraIdx.current++;
      setTimeout(() => setNewFilingId(null), 600);
    }, 9000);
    return () => clearInterval(filingTimer.current);
  }, []);

  // Vote-alert poller (scaffolding). Every 60s, if a REAL GovTrack vote is
  // live (created in the last 30 min) and the user opted into alerts, fire one
  // local browser notification per vote. Only fires for real votes, so demo
  // mode never spams. The full when-the-tab-is-closed system is deferred
  // (PROGRESS.md, Tasks 15/28/29/32).
  useEffect(() => {
    async function checkForLiveVote() {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (!readAlertOptIn()) return;
      try {
        const res = await fetch("/api/votes/live");
        const json = (await res.json()) as LiveVotesResponse;
        const v = json.vote;
        if (json.source !== "govtrack" || !v || !isVoteLive(v.created)) return;
        if (notifiedVoteId.current === v.id) return;
        notifiedVoteId.current = v.id;
        new Notification("🔴 Floor vote underway", {
          body: `${v.billNumber ?? "A vote"} — ${v.question ?? "Senate floor vote"}. Open LOBBY CAM to watch it live.`,
        });
      } catch {
        /* ignore transient poll failures */
      }
    }
    checkForLiveVote();
    const timer = setInterval(checkForLiveVote, 60_000);
    return () => clearInterval(timer);
  }, []);

  const filteredMembers = useMemo(
    () => MEMBERS.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );
  const moneyMax = useMemo(() => Math.max(CURRENT_SESSION.industryMoneyYes, CURRENT_SESSION.industryMoneyNo), []);
  // Set only after mount (not during the initial render) so the
  // server-rendered markup and the client's first render match; the ET
  // clock string is otherwise unavoidably different between server and
  // client render times.
  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: client-only clock value, see comment above
    setTimeStr(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }));
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.replace(/<[^>]*>/g, "").slice(0, 100));
  }, []);

  const billNumber = liveVoteMeta?.billNumber ?? CURRENT_SESSION.billNumber;
  const billTitle = liveVoteMeta?.billTitle ?? CURRENT_SESSION.billTitle;

  return (
    <div className="sans ink min-h-screen" style={{ background: "var(--cream)" }}>
      <GlobalStyles />
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ═══ MASTHEAD ═══ */}
      <header className="w-full" style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div className="flex items-end justify-between px-6 pt-5 pb-3">
          <div>
            <h1 className="serif leading-none tracking-tight" style={{ fontSize: 42, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              LOBBY CAM
            </h1>
            <p className="small-caps mt-1" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.14em" }}>
              Real-Time Congressional Conflict Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <label htmlFor="member-search" className="sr-only">Search members</label>
              <input
                id="member-search"
                type="text"
                placeholder="Search members…"
                value={searchQuery}
                onChange={handleSearch}
                className="sans border px-3 py-1.5 text-sm outline-none"
                style={{ width: 200, borderColor: "var(--rule)", background: "var(--white-warm)", fontSize: 13 }}
                autoComplete="off"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer" }} aria-label="Clear search">
                  {"✕"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "var(--rule)" }} aria-live="polite">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--red)", animation: "pulse-dot 1.5s ease-in-out infinite" }} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--red)", fontSize: 11 }}>Senate in Session</span>
            </div>
            {voteDataSource !== "loading" && (
              <span
                className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5"
                style={{
                  fontSize: 9,
                  color: voteDataSource === "govtrack" ? "#fff" : "var(--muted-dark)",
                  background: voteDataSource === "govtrack" ? "var(--blue)" : "var(--rule-light)",
                }}
                title={voteDataSource === "govtrack" ? "Vote positions from GovTrack" : "No live vote available — showing simulated demo data"}
              >
                {voteDataSource === "govtrack" ? "Live GovTrack Data" : "Demo Data"}
              </span>
            )}
            <VoteAlertButton />
          </div>
        </div>

        <div className="mx-6" style={{ borderTop: "1px solid var(--rule)" }} />

        <div
          className={`relative overflow-hidden mx-6 my-2 ${tickerPaused ? "ticker-paused" : ""}`}
          style={{ height: 28 }}
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
          role="marquee"
          aria-label="Breaking conflict alerts"
        >
          <div className="flex items-center h-full whitespace-nowrap">
            <div className="ticker-track flex items-center gap-10">
              {[0, 1, 2].map((copy) =>
                TICKER_ITEMS.map((item, i) => (
                  <span
                    key={`${copy}-${i}`}
                    className="text-xs font-medium tracking-wide"
                    style={{
                      color: item.severity === "high" ? "var(--red)" : item.severity === "medium" ? "var(--ink)" : "var(--muted)",
                      fontSize: 12,
                      fontWeight: item.severity === "high" ? 600 : 500,
                    }}
                  >
                    {item.text}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mx-6" style={{ borderTop: "2px solid var(--ink)" }} />
      </header>

      {/* ═══ MAIN GRID ═══ */}
      <main id="main-content" className="px-6 py-4 gap-6" style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 3.5fr) minmax(0, 3.5fr)" }}>

        <section className="pr-5" style={{ borderRight: "1px solid var(--rule)" }} aria-label="Floor activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">On the Floor</h2>
            <span className="caption">{timeStr} — Live</span>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold tracking-wider mb-1" style={{ color: "var(--muted)" }}>{billNumber}</p>
            <h3 className="serif leading-tight mb-1" style={{ fontSize: 28, fontWeight: 900 }}>{billTitle}</h3>
            <p className="serif italic mb-2" style={{ fontSize: 16, color: "var(--muted-dark)" }}>{CURRENT_SESSION.billSubtitle}</p>
            <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--red)", color: "#fff", fontSize: 10 }}>
              {CURRENT_SESSION.status}
            </span>
          </div>

          <CSpanEmbed activeChannel={cspanChannel} onChannelChange={setCspanChannel} />

          <div className="grid grid-cols-2 gap-4 mb-5">
            <VoteColumn label="YEA" votes={yesVotes} flashVote={flashVote} />
            <VoteColumn label="NAY" votes={noVotes} flashVote={flashVote} />
          </div>

          <div className="mb-5 p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
            <h4 className="section-header mb-2">Why This Bill Matters</h4>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted-body)", fontSize: 13 }}>{CURRENT_SESSION.explanation}</p>
            <p className="caption mt-2">Source: Congressional Research Service / CBO Score</p>
          </div>

          <div>
            <h4 className="section-header mb-3">Industry Money — Yea Voters vs Nay Voters</h4>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">YEA VOTERS</span>
                  <span className="text-xs font-bold">{formatMoney(CURRENT_SESSION.industryMoneyYes)}</span>
                </div>
                <Bar value={CURRENT_SESSION.industryMoneyYes} max={moneyMax} color="var(--red)" height={20} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">NAY VOTERS</span>
                  <span className="text-xs font-bold">{formatMoney(CURRENT_SESSION.industryMoneyNo)}</span>
                </div>
                <Bar value={CURRENT_SESSION.industryMoneyNo} max={moneyMax} color="var(--blue)" height={20} />
              </div>
            </div>
            <p className="caption mt-2">Source: FEC Donor Database, Center for Responsive Politics — Defense sector PAC + individual contributions, 2023–2026 cycle</p>
          </div>
        </section>

        <section className="px-4" style={{ borderRight: "1px solid var(--rule)" }} aria-label="Lobby wire feed">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">Lobby Wire</h2>
            <span className="inline-block px-2 py-0.5 text-xs font-bold" style={{ background: "var(--blue)", color: "#fff", fontSize: 10 }}>
              {filings.length} FILINGS TODAY
            </span>
          </div>
          <div className="space-y-2 scrollbar-hide" style={{ maxHeight: 620, overflowY: "auto" }} role="feed">
            {filings.map((f) => (
              <FilingCard key={f.id} filing={f} isNew={f.id === newFilingId} />
            ))}
          </div>
        </section>

        <section className="pl-4" aria-label="Today's conflicts">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">Today&apos;s Conflicts</h2>
            <span className="caption">{billNumber}</span>
          </div>
          <TodaysConflicts
            demoFallback={
              <div className="space-y-3">
                {filteredMembers.map((m) => (
                  <MemberCard key={m.id} member={m} onClick={() => setSelectedMember(m)} />
                ))}
                {filteredMembers.length === 0 && (
                  <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>No members match &quot;{searchQuery}&quot;</p>
                )}
              </div>
            }
          />
        </section>
      </main>

      {/* ═══ ARCHIVE BAR ═══ */}
      <section className="mt-4 px-6 pb-8" style={{ maxWidth: 1400, margin: "0 auto" }} aria-label="Recent vote analysis">
        <div style={{ borderTop: "3px solid var(--ink)" }} />
        <div className="flex items-center justify-between mt-4 mb-3">
          <h2 className="section-header">Recent Votes — Conflict Analysis</h2>
          <span className="caption">119th Congress, 1st Session</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" role="list">
          {PAST_VOTES.map((pv, i) => (
            <article key={i} role="listitem" className="flex-shrink-0 p-4" style={{ width: 280, background: "var(--white-warm)", border: "1px solid var(--rule-border)" }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-bold tracking-wider" style={{ color: "var(--blue)" }}>{pv.bill}</span>
                <span className="caption">{pv.date}</span>
              </div>
              <p className="serif text-sm font-bold leading-snug mb-2">{pv.title}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="serif text-lg font-bold" style={{ color: "var(--red)" }}>{pv.conflictedVotes}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>of {pv.totalVotes} voters flagged</span>
              </div>
              <p className="text-xs leading-snug" style={{ color: "var(--muted-body)", fontSize: 12 }}>{pv.finding}</p>
              <p className="caption mt-2">Source: FEC / Member Financial Disclosures</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-6 py-4 text-center" style={{ borderTop: "1px solid var(--rule)", maxWidth: 1400, margin: "0 auto" }}>
        <p className="caption">
          LOBBY CAM is a public interest project. All data sourced from official government filings: FEC Donor Database, Senate Lobbying Disclosure Act filings, Congressional Financial Disclosures, and Congressional Record. No proprietary or classified sources.
        </p>
        <p className="caption mt-1" style={{ fontSize: 9 }}>
          Simulated data for demonstration purposes. Not affiliated with any government agency. The presence of financial ties does not imply wrongdoing.
        </p>
        <div className="mt-3">
          <p className="section-header mb-1" style={{ fontSize: 10 }}>Get Alerts For Your Representatives</p>
          <DistrictLookup />
        </div>
      </footer>

      {/* ═══ MODAL ═══ */}
      {selectedMember && <ProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
    </div>
  );
}
