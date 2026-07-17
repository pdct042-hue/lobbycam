"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { slugifyName } from "@/lib/data";

// "Investigate a Member" — the front door to the research mode. Loads the live
// roster (all current members, both chambers) and lets a visitor pull up any
// member's file by name or two-letter state code. Every result links to the
// member's profile page, which resolves against the same live roster.

interface RosterEntry {
  bioguide: string;
  nameFull: string;
  party: string;
  state: string;
  chamber: "senate" | "house";
  district: number | null;
}

export default function MemberSearch() {
  const [members, setMembers] = useState<RosterEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members");
        const json = await res.json();
        if (cancelled) return;
        if (json.source === "congress-legislators" && Array.isArray(json.members) && json.members.length > 0) {
          setMembers(json.members as RosterEntry[]);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!members || q.length < 2) return [];
    const byState = q.length === 2 ? members.filter((m) => m.state.toLowerCase() === q) : [];
    const byName = members.filter((m) => m.nameFull.toLowerCase().includes(q));
    const seen = new Set<string>();
    return [...byState, ...byName]
      .filter((m) => (seen.has(m.bioguide) ? false : (seen.add(m.bioguide), true)))
      .slice(0, 10);
  }, [members, q]);

  if (failed) {
    return (
      <div className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
        <p className="text-sm font-semibold" style={{ fontSize: 13 }}>Member roster unavailable</p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)", fontSize: 11 }}>
          The live roster of current members loads here from the congress-legislators project. Search will work once this deployment can reach it.
        </p>
        <p className="caption mt-2">Source: @unitedstates/congress-legislators</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="member-search" className="sr-only">Search members of Congress</label>
      <input
        id="member-search"
        type="search"
        placeholder={members ? `Search ${members.length} members — name or state (e.g. TX)` : "Loading the roster…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={!members}
        autoComplete="off"
        className="sans w-full px-3 py-2 text-sm outline-none"
        style={{ border: "1px solid var(--rule)", background: "var(--white-warm)", fontSize: 13 }}
      />
      {q.length >= 2 && results.length === 0 && members && (
        <p className="caption mt-2">No current member matches &ldquo;{query.trim()}&rdquo;.</p>
      )}
      {results.length > 0 && (
        <div className="mt-2 space-y-0.5" role="list" aria-label="Matching members">
          {results.map((m) => (
            <Link
              key={m.bioguide}
              role="listitem"
              href={`/member/${slugifyName(m.nameFull)}`}
              className="flex items-baseline justify-between gap-2 px-2 py-1.5 member-card"
              style={{ background: "var(--white-warm)", border: "1px solid var(--rule-border)", textDecoration: "none", color: "inherit" }}
            >
              <span className="text-sm font-semibold" style={{ fontSize: 13 }}>
                {m.chamber === "senate" ? "Sen." : "Rep."} {m.nameFull}
              </span>
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--muted)", fontSize: 11 }}>
                {m.party}-{m.state}
                {m.district != null ? `-${m.district === 0 ? "AL" : m.district}` : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
      {q.length < 2 && (
        <p className="caption mt-2">
          Every current senator and representative, from the live public roster. Open a member&apos;s file for their FEC records, votes, and official IDs.
        </p>
      )}
    </div>
  );
}
