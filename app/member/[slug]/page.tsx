import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GlobalStyles from "@/components/GlobalStyles";
import ShareButton from "@/components/ShareButton";
import {
  MEMBERS,
  memberSlug,
  getMemberBySlug,
  formatMoney,
  partyLabel,
  type Member,
} from "@/lib/data";

// Pre-build a static page for every member at deploy time (battle plan Task 33).
export function generateStaticParams() {
  return MEMBERS.map((m) => ({ slug: memberSlug(m) }));
}

// Regenerate at most hourly once the data is live.
export const revalidate = 3600;

type Params = { slug: string };

// Dynamic Open Graph / Twitter card tags so a pasted link shows the conflict
// data, not a generic site preview (battle plan Task 27).
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const member = getMemberBySlug(slug);
  if (!member) return { title: "Member not found — LOBBY CAM" };

  const title = `${member.name} (${member.party}-${member.state}) — Conflict Score: ${member.conflictScore}/100 | LOBBY CAM`;
  const description = member.correlation;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Bar({ value, max, color, height = 12 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full" style={{ height, background: "var(--rule-light)" }}>
      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const member: Member | undefined = getMemberBySlug(slug);
  if (!member) notFound();

  const maxDonor = Math.max(...member.donors.map((d) => d.amount));

  return (
    <div className="sans ink min-h-screen" style={{ background: "var(--cream)" }}>
      <GlobalStyles />

      {/* Masthead */}
      <header className="w-full" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="px-6 pt-5 pb-3 flex items-end justify-between">
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 className="serif leading-none tracking-tight" style={{ fontSize: 30, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              LOBBY CAM
            </h1>
          </Link>
          <Link href="/" className="text-xs font-semibold blue" style={{ fontSize: 12 }}>
            {"←"} Back to live floor
          </Link>
        </div>
        <div className="mx-6" style={{ borderTop: "2px solid var(--ink)" }} />
      </header>

      <main className="px-6 py-6" style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Name + score */}
        <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <div>
            <h2 className="serif font-bold leading-tight" style={{ fontSize: 34 }}>{member.name}</h2>
            <p className="text-sm" style={{ color: "var(--muted-dark)" }}>{partyLabel(member.party)} — {member.state}</p>
          </div>
          <div className="text-right">
            <span className="serif font-bold red" style={{ fontSize: 46, lineHeight: 1 }}>{member.conflictScore}</span>
            <p className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: "var(--muted)" }}>Conflict Index / 100</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Donors */}
          <section>
            <h3 className="section-header mb-3">Career Donor Breakdown by Industry</h3>
            {member.donors.map((d, i) => (
              <div key={i} className="mb-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold">{d.industry}</span>
                  <span className="text-sm font-bold">{formatMoney(d.amount)}</span>
                </div>
                <Bar value={d.amount} max={maxDonor} color={i === 0 ? "var(--red)" : "var(--blue)"} />
              </div>
            ))}
            <p className="caption mt-1">Source: FEC Donor Database, 2010–2026</p>
          </section>

          {/* Holdings */}
          <section>
            <h3 className="section-header mb-3">Stock Holdings Relevant to Committee Assignments</h3>
            <div style={{ borderTop: "1px solid var(--rule)" }}>
              {member.stockHoldings.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--rule-light)", fontSize: 14 }}>
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

          {/* Revolving door */}
          {member.revolvingDoor.length > 0 && (
            <section>
              <h3 className="section-header mb-2">Revolving Door History</h3>
              {member.revolvingDoor.map((r, i) => (
                <p key={i} className="mb-1" style={{ fontSize: 14, color: "var(--muted-body)" }}>{"•"} {r}</p>
              ))}
              <p className="caption mt-1">Source: OpenSecrets Revolving Door Database</p>
            </section>
          )}

          {/* Votes */}
          <section>
            <h3 className="section-header mb-3">Recent Votes with Conflict Flags</h3>
            <div style={{ borderTop: "1px solid var(--rule)" }}>
              {member.voteHistory.map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--rule-light)", fontSize: 14 }}>
                  <div className="flex items-center gap-2">
                    {v.conflict && <span className="red font-bold" aria-label="Conflict">{"⚠"}</span>}
                    <span className={v.conflict ? "font-semibold" : ""}>{v.bill}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 font-bold" style={{ background: v.vote === "YES" ? "var(--blue)" : "var(--rule-light)", color: v.vote === "YES" ? "#fff" : "var(--muted-dark)", fontSize: 10 }}>
                      {v.vote}
                    </span>
                    <span className="caption">{v.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="caption mt-1">Source: Congressional Record / clerk.house.gov</p>
          </section>

          {/* Correlation */}
          <div className="p-4" style={{ background: "rgba(200,16,46,0.05)", border: "1px solid rgba(200,16,46,0.15)" }}>
            <p className="font-semibold red" style={{ fontSize: 14 }}>{member.correlation}</p>
            <p className="caption mt-1">Source: VoteSmart.org voting record analysis</p>
          </div>

          <ShareButton shareText={member.shareText} />
        </div>
      </main>

      <footer className="px-6 py-6 text-center" style={{ borderTop: "1px solid var(--rule)", maxWidth: 820, margin: "0 auto" }}>
        <p className="caption">
          Simulated data for demonstration purposes. Not affiliated with any government agency. The presence of financial ties does not imply wrongdoing.
        </p>
      </footer>
    </div>
  );
}
