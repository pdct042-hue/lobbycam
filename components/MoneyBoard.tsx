"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, partyLabel, slugifyName } from "@/lib/data";

// "The Money Board" backed by REAL data where it exists: real senators from
// the roster + real donor-by-industry from FEC PAC filings. Figures are
// CYCLE-TO-DATE totals (FEC data lands on filing deadlines and our fetch is
// cached 24h) — the UI says so and never implies same-day money. Conflict
// scores and stock holdings are NOT shown here — those are red-tier data we
// don't have yet, so we label them "in progress" rather than fabricate them.
//
// If live data isn't available (e.g. FEC_API_KEY missing, or upstream down),
// it shows an honest "in progress" state — never fabricated senators.

interface RealDonor {
  industry: string;
  amount: number;
}
interface RealSenator {
  bioguide: string;
  name: string;
  party: string;
  state: string;
  donors: RealDonor[];
}

function totalClassified(s: RealSenator): number {
  return s.donors.reduce((sum, d) => sum + d.amount, 0);
}

function RealCard({ s }: { s: RealSenator }) {
  const top = [...s.donors].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const max = top[0]?.amount ?? 0;
  return (
    <Link
      href={`/member/${slugifyName(s.name)}`}
      className="block p-3 member-card"
      style={{ background: "var(--white-warm)", border: "1px solid var(--rule-border)", textDecoration: "none", color: "inherit" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold leading-snug">{s.name}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{partyLabel(s.party)} — {s.state}</p>
        </div>
        <span className="text-xs font-semibold uppercase px-1.5 py-0.5" style={{ fontSize: 8, color: "#2E5D34", background: "rgba(46,93,52,0.1)" }}>
          Live FEC
        </span>
      </div>
      {top.length > 0 ? (
        <div className="mb-2">
          <span className="uppercase tracking-wider font-semibold block mb-1" style={{ fontSize: 9, color: "var(--muted)" }}>
            Industry PAC money (FEC)
          </span>
          {top.map((d, i) => (
            <div key={i} className="mb-1">
              <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                <span className="font-medium">{d.industry}</span>
                <span className="font-bold">{formatMoney(d.amount)}</span>
              </div>
              <div className="w-full" style={{ height: 5, background: "var(--rule-light)" }}>
                <div style={{ height: "100%", width: `${max > 0 ? (d.amount / max) * 100 : 0}%`, background: i === 0 ? "var(--red)" : "var(--blue)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs mb-2" style={{ color: "var(--muted)", fontSize: 11, fontStyle: "italic" }}>
          No classified industry PAC money found in current cycle.
        </p>
      )}
      <p className="text-xs" style={{ color: "var(--muted)", fontSize: 11, fontStyle: "italic" }}>
        Conflict score & stock holdings: analysis in progress
      </p>
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--rule-light)" }}>
        <span className="caption">Source: FEC PAC filings — cycle to date</span>
        <span className="text-xs font-semibold blue" style={{ fontSize: 11 }}>Full profile →</span>
      </div>
    </Link>
  );
}

export default function MoneyBoard() {
  const [real, setReal] = useState<RealSenator[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pull a wider slice of the Senate so we can surface the members who
        // actually have classified PAC money, rather than whichever happen to
        // be first in roster order. Each /api/donors result is cached 24h, so
        // this fans out only on a cold cache.
        const rosterRes = await fetch("/api/members?chamber=senate&limit=25");
        const roster = await rosterRes.json();
        const senators: Array<{ bioguide: string; nameFull: string; party: string; state: string }> =
          roster.members ?? [];
        if (senators.length === 0) throw new Error("no roster");

        const withDonors: RealSenator[] = await Promise.all(
          senators.map(async (s) => {
            try {
              const dRes = await fetch(`/api/donors?bioguide=${s.bioguide}`);
              const d = await dRes.json();
              const donors: RealDonor[] = d.source === "fec" ? d.donors ?? [] : [];
              return { bioguide: s.bioguide, name: s.nameFull, party: s.party, state: s.state, donors };
            } catch {
              return { bioguide: s.bioguide, name: s.nameFull, party: s.party, state: s.state, donors: [] };
            }
          })
        );

        // Show only senators with real classified money, ranked by total, so
        // the column reads as live conflicts rather than a wall of empties.
        const ranked = withDonors
          .filter((s) => s.donors.length > 0)
          .sort((a, b) => totalClassified(b) - totalClassified(a))
          .slice(0, 8);
        if (ranked.length === 0) throw new Error("no live donor data");
        if (!cancelled) setReal(ranked);
      } catch {
        if (!cancelled) setReal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="caption" style={{ padding: "8px 0" }}>Loading live Senate data…</p>;
  }

  if (!real) {
    return (
      <div className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
        <p className="text-xs mb-2 px-2 py-1" style={{ color: "#8A6D1E", background: "rgba(138,109,30,0.12)", fontSize: 10, fontWeight: 600 }}>
          ⚠ Live conflict analysis in progress
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-body)", fontSize: 13 }}>
          Real senators ranked by industry PAC money load here from FEC filings. They&apos;ll appear once <code style={{ fontSize: 11 }}>FEC_API_KEY</code> is set and this deployment can reach the FEC API. No placeholder senators are shown.
        </p>
        <p className="caption mt-2">Source: FEC PAC filings</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {real.map((s) => (
        <RealCard key={s.bioguide} s={s} />
      ))}
    </div>
  );
}
