"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatMoney, partyLabel } from "@/lib/data";

// "Today's Conflicts" backed by REAL data where it exists: real senators from
// the roster + real donor-by-industry from FEC PAC filings. Conflict scores
// and stock holdings are NOT shown here — those are red-tier data we don't
// have yet, so we label them "in progress" rather than fabricate them.
//
// If live data isn't available (e.g. FEC_API_KEY missing, or upstream down),
// it falls back to the demo cards passed in as `demoFallback`, so the page
// always renders something.

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

function defenseAmount(s: RealSenator): number {
  return s.donors.find((d) => d.industry === "Defense")?.amount ?? 0;
}

function RealCard({ s }: { s: RealSenator }) {
  const top = [...s.donors].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const max = top[0]?.amount ?? 0;
  return (
    <article className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule-border)" }}>
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
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--rule-light)" }}>
        <span className="caption">Source: FEC PAC filings (live)</span>
      </div>
    </article>
  );
}

export default function TodaysConflicts({ demoFallback }: { demoFallback: ReactNode }) {
  const [real, setReal] = useState<RealSenator[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rosterRes = await fetch("/api/members?chamber=senate&limit=6");
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

        // Only treat as "real" if live donor data actually came back for at
        // least one senator; otherwise fall back to demo.
        if (!withDonors.some((s) => s.donors.length > 0)) throw new Error("no live donor data");
        withDonors.sort((a, b) => defenseAmount(b) - defenseAmount(a));
        if (!cancelled) setReal(withDonors);
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
      <div>
        <p className="text-xs mb-3 px-2 py-1" style={{ color: "#8A6D1E", background: "rgba(138,109,30,0.12)", fontSize: 10, fontWeight: 600 }}>
          ⚠ Sample data — live conflict analysis in progress
        </p>
        {demoFallback}
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
