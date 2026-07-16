"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import GlobalStyles from "./GlobalStyles";
import VoteAlertButton, { readAlertOptIn } from "./VoteAlertButton";
import TodaysConflicts from "./TodaysConflicts";
import { isVoteLive } from "@/lib/voteAlert";
import {
  CSPAN_CHANNELS,
  INDUSTRY_COLORS,
  formatMoney,
  type Voter,
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

interface RecipientTotal {
  recipient: string;
  totalAmount: number;
  awardCount: number;
}

interface ContractsTopResponse {
  source: "usaspending" | "mock";
  fiscalYear: string;
  recipients: RecipientTotal[];
}

interface RecentVote {
  id: number;
  chamber: string;
  question: string;
  result: string;
  billNumber: string | null;
  billTitle: string | null;
  created: string;
  totalPlus: number | null;
  totalMinus: number | null;
}

interface RecentVotesResponse {
  source: "govtrack" | "mock";
  votes: RecentVote[];
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

interface ScheduleItem {
  eventId: string;
  chamber: string;
  type: string | null;
  title: string | null;
  date: string | null;
  status: string | null;
  committee: string | null;
  billRef: string | null;
}

interface ScheduleResponse {
  source: "congress.gov" | "demo";
  meetings: ScheduleItem[];
}

function formatMeetingDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function formatVoteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTED COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Reusable horizontal bar for all charts */
function Bar({ value, max, color, height = 5 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full" style={{ height, background: "var(--rule-light)" }}>
      <div className="h-full bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Vote tally column — renders real GovTrack positions */
function VoteColumn({ label, votes, flashVote, emptyLabel }: { label: string; votes: Voter[]; flashVote: string | null; emptyLabel: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2 pb-1" style={{ borderBottom: "2px solid var(--ink)" }}>
        <span className="text-sm font-bold tracking-wider">{label}</span>
        <span className="serif text-2xl font-bold" aria-live="polite" aria-atomic="true">{votes.length}</span>
      </div>
      <div className="space-y-0.5" style={{ maxHeight: 260, overflowY: "auto" }} role="list" aria-label={`${label} votes`}>
        {votes.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: "var(--muted)" }}>{emptyLabel}</p>
        )}
        {votes.map((v, i) => (
          <div
            key={i}
            role="listitem"
            className={`flex items-center gap-1 py-0.5 px-1 text-xs ${v.name === flashVote ? "animate-flash" : "animate-fade"}`}
            style={{ fontSize: 12 }}
          >
            <span className="w-3 inline-block" aria-hidden="true" />
            <span>{v.name}</span>
            <span style={{ color: "var(--muted)" }}>({v.party}-{v.state})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Live floor feed embed — visibility toggled between free gov feeds */
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
            title={`${ch.label} Live Feed`}
            className="absolute inset-0 w-full h-full"
            style={{ border: "none", display: activeChannel === ch.id ? "block" : "none" }}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ))}
        {/* Fallback layer behind the iframe: if framing is blocked the iframe is
            empty and this shows through; if the video loads it covers this. */}
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

/** One real federal-contract card for the Defense Contract Wire */
function ContractCard({ item, max }: { item: RecipientTotal; max: number }) {
  const color = INDUSTRY_COLORS.DEFENSE;
  return (
    <article className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule-border)", borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug" style={{ fontSize: 13 }}>{item.recipient}</p>
        <span className="inline-block px-1.5 py-0.5 text-xs font-semibold uppercase" style={{ fontSize: 9, background: color + "12", color, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          Defense
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="serif text-lg font-bold" style={{ color: "var(--ink)" }}>{formatMoney(item.totalAmount)}</span>
        <span className="text-xs" style={{ color: "var(--muted)", fontSize: 11 }}>in FY2026 federal contracts</span>
      </div>
      <div className="mt-1.5">
        <Bar value={item.totalAmount} max={max} color={color} height={6} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="caption">{item.awardCount} award{item.awardCount === 1 ? "" : "s"} this fiscal year</span>
      </div>
      <p className="caption mt-1">Source: USASpending.gov</p>
    </article>
  );
}

/** "This Week" — upcoming scheduled committee hearings/markups (Congress.gov).
 *  Shown in place of the floor video when no roll-call vote is live. This is the
 *  natural hook for future vote/hearing alerts. */
function SchedulePanel() {
  const [meetings, setMeetings] = useState<ScheduleItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/schedule");
        const json = (await res.json()) as ScheduleResponse;
        if (cancelled) return;
        setMeetings(json.source === "congress.gov" ? json.meetings : []);
      } catch {
        if (!cancelled) setMeetings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)", minHeight: 240 }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--rule)" }}>
        <span className="section-header">This Week in Congress</span>
        <span className="caption">Scheduled hearings &amp; markups</span>
      </div>
      <div className="p-2 space-y-1.5" style={{ maxHeight: 320, overflowY: "auto" }}>
        {loading && <p className="caption" style={{ padding: 8 }}>Loading the congressional schedule…</p>}
        {!loading && meetings && meetings.length > 0 && meetings.map((m) => (
          <div key={m.eventId} className="p-2" style={{ borderLeft: "3px solid var(--blue)", background: "var(--cream)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ fontSize: 11, color: "var(--blue)" }}>{formatMeetingDate(m.date)} ET</span>
              <span className="uppercase font-semibold" style={{ fontSize: 8, color: "var(--muted-dark)", letterSpacing: "0.05em" }}>
                {m.chamber}{m.type ? ` · ${m.type}` : ""}
              </span>
            </div>
            {m.committee && <p className="text-xs font-semibold mt-0.5" style={{ fontSize: 12 }}>{m.committee}</p>}
            {m.title && <p className="text-xs mt-0.5" style={{ fontSize: 11, color: "var(--muted-body)" }}>{m.title}</p>}
            {m.billRef && <span className="inline-block mt-1 text-xs font-bold" style={{ fontSize: 10, color: "var(--blue)" }}>{m.billRef}</span>}
          </div>
        ))}
        {!loading && meetings && meetings.length === 0 && (
          <div className="p-3">
            <p className="text-sm font-semibold" style={{ fontSize: 13 }}>No hearings on the calendar right now</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: 11 }}>
              Upcoming Senate &amp; House committee hearings and markups load here from Congress.gov. When Congress is in recess this is often empty — it repopulates as the next work period is scheduled.
            </p>
            <p className="caption mt-2">Source: Congress.gov committee meetings</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Floor media area: live video when a vote is underway, the congressional
 *  schedule when it isn't. Defaults to the schedule and auto-switches to video
 *  when a live vote appears; the user can toggle either way. */
function FloorMedia({ hasLiveVote, activeChannel, onChannelChange }: { hasLiveVote: boolean; activeChannel: string; onChannelChange: (id: string) => void }) {
  const [tab, setTab] = useState<"live" | "schedule">("schedule");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-focus the live feed only when a vote actually starts
    if (hasLiveVote) setTab("live");
  }, [hasLiveVote]);

  return (
    <div className="mb-5">
      <div className="flex" role="tablist" aria-label="Floor media" style={{ marginBottom: 8 }}>
        {(["live", "schedule"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              fontSize: 10, cursor: "pointer",
              border: "1px solid var(--rule)",
              borderRight: t === "live" ? "none" : "1px solid var(--rule)",
              background: tab === t ? "var(--ink)" : "var(--white-warm)",
              color: tab === t ? "var(--cream)" : "var(--muted-dark)",
              letterSpacing: "0.06em",
            }}
          >
            {t === "live" ? "Live Feed" : "This Week"}
          </button>
        ))}
      </div>
      {tab === "live"
        ? <CSpanEmbed activeChannel={activeChannel} onChannelChange={onChannelChange} />
        : <SchedulePanel />}
    </div>
  );
}

/** ZIP → congressional district lookup, footer widget */
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
  const [tickerPaused, setTickerPaused] = useState(false);
  const [flashVote, setFlashVote] = useState<string | null>(null);
  const [cspanChannel, setCspanChannel] = useState("house");
  const [voteDataSource, setVoteDataSource] = useState<"loading" | "govtrack" | "none">("loading");
  const [liveVoteMeta, setLiveVoteMeta] = useState<LiveVoteMeta | null>(null);

  const [contracts, setContracts] = useState<RecipientTotal[] | null>(null);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [recentVotes, setRecentVotes] = useState<RecentVote[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);

  const votersRef = useRef<{ yes: Voter[]; no: Voter[] }>({ yes: [], no: [] });
  const voteIdx = useRef({ y: 0, n: 0 });
  const voteTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const notifiedVoteId = useRef<number | null>(null);

  // Bootstrap live vote data. When GovTrack has a real Senate vote, reveal its
  // positions one at a time for the "watching it happen" feel. When there's no
  // live vote, show an honest empty state — no simulated reveal.
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
          voteIdx.current.y++;
        } else {
          const voter = no[n];
          setNoVotes((p) => [...p, voter]);
          voteIdx.current.n++;
        }
      }, 2200);
    }

    (async () => {
      try {
        const res = await fetch("/api/votes/live");
        const json = (await res.json()) as LiveVotesResponse;
        if (cancelled) return;
        if (json.source === "govtrack" && json.yes.length + json.no.length > 0) {
          votersRef.current = { yes: json.yes, no: json.no };
          setLiveVoteMeta(json.vote);
          setVoteDataSource("govtrack");
          startReveal();
        } else {
          setVoteDataSource("none");
        }
      } catch {
        if (!cancelled) setVoteDataSource("none");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(voteTimer.current);
    };
  }, []);

  // Real defense-contractor totals (USASpending) for the Contract Wire.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/contracts/top");
        const json = (await res.json()) as ContractsTopResponse;
        if (cancelled) return;
        setContracts(json.source === "usaspending" ? json.recipients : []);
      } catch {
        if (!cancelled) setContracts([]);
      } finally {
        if (!cancelled) setContractsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Real recent Senate votes (GovTrack) for the archive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/votes/recent");
        const json = (await res.json()) as RecentVotesResponse;
        if (cancelled) return;
        setRecentVotes(json.source === "govtrack" ? json.votes : []);
      } catch {
        if (!cancelled) setRecentVotes([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Clear flash highlight
  useEffect(() => {
    if (!flashVote) return;
    const t = setTimeout(() => setFlashVote(null), 1500);
    return () => clearTimeout(t);
  }, [flashVote]);

  // Vote-alert poller: every 60s, if a REAL GovTrack vote is live and the user
  // opted in, fire one local browser notification per vote. Only fires for real
  // votes, so a quiet floor never spams.
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

  // Ticker is generated ONLY from real fetched data. If nothing real is
  // available, it isn't rendered at all — no fabricated headlines.
  const tickerItems = useMemo(() => {
    const items: { text: string; severity: "high" | "medium" }[] = [];
    if (liveVoteMeta) {
      const label = liveVoteMeta.billNumber ?? liveVoteMeta.question;
      items.push({ text: `● SENATE VOTE: ${label} — ${liveVoteMeta.result}`, severity: "high" });
    }
    (contracts ?? []).slice(0, 5).forEach((c) => {
      items.push({
        text: `● ${c.recipient.toUpperCase()}: ${formatMoney(c.totalAmount)} IN FY2026 FEDERAL CONTRACTS`,
        severity: "medium",
      });
    });
    return items;
  }, [liveVoteMeta, contracts]);

  const contractMax = useMemo(
    () => (contracts && contracts.length ? Math.max(...contracts.map((c) => c.totalAmount)) : 0),
    [contracts]
  );

  // Client-only clock (avoids server/client hydration mismatch)
  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: client-only clock value
    setTimeStr(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }));
  }, []);

  const hasLiveVote = voteDataSource === "govtrack" && liveVoteMeta != null;
  const billNumber = liveVoteMeta?.billNumber ?? null;
  const billTitle = liveVoteMeta?.billTitle ?? liveVoteMeta?.question ?? null;

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
            <div className="flex items-center gap-2 pl-3" aria-live="polite">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: hasLiveVote ? "var(--red)" : "var(--muted)", animation: hasLiveVote ? "pulse-dot 1.5s ease-in-out infinite" : "none" }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: hasLiveVote ? "var(--red)" : "var(--muted)", fontSize: 11 }}>
                {voteDataSource === "loading" ? "Connecting…" : hasLiveVote ? "Live Senate Vote" : "No Active Floor Vote"}
              </span>
            </div>
            {hasLiveVote && (
              <span
                className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5"
                style={{ fontSize: 9, color: "#fff", background: "var(--blue)" }}
                title="Vote positions from GovTrack"
              >
                Live GovTrack Data
              </span>
            )}
            <VoteAlertButton />
          </div>
        </div>

        <div className="mx-6" style={{ borderTop: "1px solid var(--rule)" }} />

        {tickerItems.length > 0 && (
          <>
            <div
              className={`relative overflow-hidden mx-6 my-2 ${tickerPaused ? "ticker-paused" : ""}`}
              style={{ height: 28 }}
              onMouseEnter={() => setTickerPaused(true)}
              onMouseLeave={() => setTickerPaused(false)}
              role="marquee"
              aria-label="Live data headlines"
            >
              <div className="flex items-center h-full whitespace-nowrap">
                <div className="ticker-track flex items-center gap-10">
                  {[0, 1, 2].map((copy) =>
                    tickerItems.map((item, i) => (
                      <span
                        key={`${copy}-${i}`}
                        className="text-xs font-medium tracking-wide"
                        style={{
                          color: item.severity === "high" ? "var(--red)" : "var(--ink)",
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
          </>
        )}
        {tickerItems.length === 0 && <div className="mx-6 mt-2" style={{ borderTop: "2px solid var(--ink)" }} />}
      </header>

      {/* ═══ MAIN GRID ═══ */}
      <main id="main-content" className="px-6 py-4 gap-6" style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 3.5fr) minmax(0, 3.5fr)" }}>

        <section className="pr-5" style={{ borderRight: "1px solid var(--rule)" }} aria-label="Floor activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">On the Floor</h2>
            <span className="caption">{timeStr}{timeStr ? " — " : ""}Live feed</span>
          </div>

          {hasLiveVote ? (
            <div className="mb-5">
              {billNumber && (
                <p className="text-xs font-semibold tracking-wider mb-1" style={{ color: "var(--muted)" }}>{billNumber}</p>
              )}
              <h3 className="serif leading-tight mb-1" style={{ fontSize: 26, fontWeight: 900 }}>{billTitle}</h3>
              <p className="serif italic mb-2" style={{ fontSize: 15, color: "var(--muted-dark)" }}>{liveVoteMeta!.question}</p>
              <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--red)", color: "#fff", fontSize: 10 }}>
                {liveVoteMeta!.result}
              </span>
              <p className="caption mt-2">Source: GovTrack roll-call — {formatVoteDate(liveVoteMeta!.created)}</p>
            </div>
          ) : (
            <div className="mb-5 p-4" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
              <h3 className="serif leading-tight mb-1" style={{ fontSize: 22, fontWeight: 900 }}>No roll-call vote in progress</h3>
              <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--muted-body)", fontSize: 13 }}>
                {voteDataSource === "loading"
                  ? "Checking the Senate floor for a live roll-call vote…"
                  : "The Senate isn't holding a recorded floor vote right now. This zone lights up automatically the moment GovTrack reports one. Recent votes are shown below."}
              </p>
              <p className="caption mt-2">Source: GovTrack Senate roll-call feed</p>
            </div>
          )}

          <FloorMedia hasLiveVote={hasLiveVote} activeChannel={cspanChannel} onChannelChange={setCspanChannel} />

          <div className="grid grid-cols-2 gap-4 mb-5">
            <VoteColumn label="YEA" votes={yesVotes} flashVote={flashVote} emptyLabel={hasLiveVote ? "Awaiting votes…" : "No live vote"} />
            <VoteColumn label="NAY" votes={noVotes} flashVote={flashVote} emptyLabel={hasLiveVote ? "Awaiting votes…" : "No live vote"} />
          </div>

          <div className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
            <h4 className="section-header mb-2">Per-Voter Conflict Analysis</h4>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted-body)", fontSize: 13 }}>
              Flagging individual senators&apos; votes against their donors and holdings requires the financial-disclosure pipeline (red tier), which isn&apos;t live yet. Until it is, no conflict is asserted against any named member here — see the FEC-backed donor breakdown under Today&apos;s Conflicts.
            </p>
          </div>
        </section>

        <section className="px-4" style={{ borderRight: "1px solid var(--rule)" }} aria-label="Defense contract wire">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">Defense Contract Wire</h2>
            {contracts && contracts.length > 0 && (
              <span className="inline-block px-2 py-0.5 text-xs font-bold" style={{ background: "var(--blue)", color: "#fff", fontSize: 10 }}>
                FY2026
              </span>
            )}
          </div>
          <div className="space-y-2 scrollbar-hide" style={{ maxHeight: 620, overflowY: "auto" }} role="feed">
            {contractsLoading && (
              <p className="caption" style={{ padding: "8px 0" }}>Loading live federal contract data…</p>
            )}
            {!contractsLoading && contracts && contracts.length > 0 && contracts.map((c) => (
              <ContractCard key={c.recipient} item={c} max={contractMax} />
            ))}
            {!contractsLoading && contracts && contracts.length === 0 && (
              <div className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
                <p className="text-sm font-semibold" style={{ fontSize: 13 }}>Live contract feed unavailable</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: 11 }}>
                  Real FY2026 federal contract totals for major defense primes load here from USASpending.gov. They&apos;ll appear once this deployment can reach the API.
                </p>
                <p className="caption mt-2">Source: USASpending.gov</p>
              </div>
            )}
          </div>
        </section>

        <section className="pl-4" aria-label="Today's conflicts">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">Today&apos;s Conflicts</h2>
            <span className="caption">FEC PAC money</span>
          </div>
          <TodaysConflicts />
        </section>
      </main>

      {/* ═══ ARCHIVE BAR — real recent votes ═══ */}
      <section className="mt-4 px-6 pb-8" style={{ maxWidth: 1400, margin: "0 auto" }} aria-label="Recent Senate votes">
        <div style={{ borderTop: "3px solid var(--ink)" }} />
        <div className="flex items-center justify-between mt-4 mb-3">
          <h2 className="section-header">Recent Senate Votes</h2>
          <span className="caption">Source: GovTrack roll-call record</span>
        </div>
        {recentLoading && <p className="caption">Loading recent Senate votes…</p>}
        {!recentLoading && recentVotes && recentVotes.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" role="list">
            {recentVotes.map((pv) => (
              <article key={pv.id} role="listitem" className="flex-shrink-0 p-4" style={{ width: 280, background: "var(--white-warm)", border: "1px solid var(--rule-border)" }}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-bold tracking-wider" style={{ color: "var(--blue)" }}>{pv.billNumber ?? "Senate Vote"}</span>
                  <span className="caption">{formatVoteDate(pv.created)}</span>
                </div>
                <p className="serif text-sm font-bold leading-snug mb-2">{pv.billTitle ?? pv.question}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="serif text-lg font-bold" style={{ color: "var(--ink)" }}>{pv.result}</span>
                </div>
                {pv.totalPlus != null && pv.totalMinus != null && (
                  <p className="text-xs leading-snug" style={{ color: "var(--muted-body)", fontSize: 12 }}>
                    {pv.totalPlus}–{pv.totalMinus} roll call
                  </p>
                )}
                <p className="caption mt-2">Source: GovTrack / U.S. Senate</p>
              </article>
            ))}
          </div>
        )}
        {!recentLoading && recentVotes && recentVotes.length === 0 && (
          <div className="p-4" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)", maxWidth: 520 }}>
            <p className="text-sm font-semibold" style={{ fontSize: 13 }}>Recent vote feed unavailable</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: 11 }}>
              The last several Senate roll-call votes load here from GovTrack once this deployment can reach the API.
            </p>
          </div>
        )}
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-6 py-4 text-center" style={{ borderTop: "1px solid var(--rule)", maxWidth: 1400, margin: "0 auto" }}>
        <p className="caption">
          LOBBY CAM is a public-interest project. Data comes from official public records: GovTrack roll-call votes, USASpending.gov federal contracts, and FEC campaign-finance filings. Financial and lobbying data is shown for transparency and does not, by itself, imply any wrongdoing.
        </p>
        <p className="caption mt-1" style={{ fontSize: 9 }}>
          Not affiliated with any government agency. Zones marked &quot;analysis in progress&quot; are awaiting data pipelines that are not yet live; no conflict figures are shown until they can be sourced.
        </p>
        <div className="mt-3">
          <p className="section-header mb-1" style={{ fontSize: 10 }}>Get Alerts For Your Representatives</p>
          <DistrictLookup />
        </div>
      </footer>
    </div>
  );
}
