import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GlobalStyles from "@/components/GlobalStyles";
import ShareButton from "@/components/ShareButton";
import { fetchRoster, type RosterMember } from "@/lib/congressLegislators";
import { slugifyName, partyLabel } from "@/lib/data";

// SEO member profile pages (battle plan Task 33). These resolve a slug against
// the LIVE congress-legislators roster — so every page is a real, current
// member — and show only verifiable identity data. Conflict scores, donor
// breakdowns, holdings, and per-vote flags are deliberately NOT fabricated
// here: those depend on the FEC/disclosure pipelines and are labeled "analysis
// in progress" until they can be sourced.

// Rendered on demand (dynamicParams defaults to true). We intentionally return
// no static params so the build never bakes in a fixed member list; each page
// resolves against the roster at request time and revalidates hourly.
export function generateStaticParams() {
  return [] as { slug: string }[];
}

export const revalidate = 3600;

type Params = { slug: string };

async function resolveMember(slug: string): Promise<RosterMember | null> {
  try {
    const roster = await fetchRoster();
    return roster.find((m) => slugifyName(m.nameFull) === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const member = await resolveMember(slug);
  if (!member) return { title: "Member not found — LOBBY CAM" };

  const chamber = member.chamber === "senate" ? "Sen." : "Rep.";
  const title = `${chamber} ${member.nameFull} (${member.party}-${member.state}) — LOBBY CAM`;
  const description = `Public-record transparency profile for ${member.nameFull} (${partyLabel(member.party)}, ${member.state}): campaign finance, contracts, and floor votes.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function InProgress({ heading, body, source }: { heading: string; body: string; source: string }) {
  return (
    <section>
      <h3 className="section-header mb-2">{heading}</h3>
      <div className="p-3" style={{ background: "var(--white-warm)", border: "1px solid var(--rule)" }}>
        <span className="text-xs mb-2 inline-block px-2 py-0.5" style={{ color: "#8A6D1E", background: "rgba(138,109,30,0.12)", fontSize: 10, fontWeight: 600 }}>
          Analysis in progress
        </span>
        <p className="text-sm leading-relaxed" style={{ fontSize: 13, color: "var(--muted-body)" }}>{body}</p>
        <p className="caption mt-2">Source: {source}</p>
      </div>
    </section>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const member = await resolveMember(slug);
  if (!member) notFound();

  const chamber = member.chamber === "senate" ? "Sen." : "Rep.";
  const fullTitle = `${chamber} ${member.nameFull}`;
  const govtrackUrl = member.ids.govtrack ? `https://www.govtrack.us/congress/members/${member.ids.govtrack}` : null;
  const fecUrl = member.ids.fec[0] ? `https://www.fec.gov/data/candidate/${member.ids.fec[0]}/` : null;
  const congressUrl = `https://bioguide.congress.gov/search/bio/${member.bioguide}`;
  const shareText = `${fullTitle} (${member.party}-${member.state}) — transparency profile on LOBBY CAM. Public-record campaign finance, contracts, and votes.`;

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
        {/* Identity */}
        <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <div>
            <h2 className="serif font-bold leading-tight" style={{ fontSize: 34 }}>{fullTitle}</h2>
            <p className="text-sm" style={{ color: "var(--muted-dark)" }}>
              {partyLabel(member.party)} — {member.state}{member.district ? `-${member.district}` : ""} · {member.chamber === "senate" ? "U.S. Senate" : "U.S. House"}
            </p>
          </div>
          <div className="text-right">
            <span className="uppercase tracking-wider font-semibold block" style={{ fontSize: 9, color: "var(--muted)" }}>Conflict Index</span>
            <span className="serif font-bold" style={{ fontSize: 30, lineHeight: 1.1, color: "var(--muted)" }}>—</span>
            <p className="caption">not yet scored</p>
          </div>
        </div>

        {/* Official record links — real, verifiable */}
        <section className="mb-8">
          <h3 className="section-header mb-2">Official Public Records</h3>
          <div className="flex flex-wrap gap-2">
            <a href={congressUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2 py-1 blue" style={{ border: "1px solid var(--rule)", fontSize: 12 }}>
              Bioguide ({member.bioguide}) ↗
            </a>
            {govtrackUrl && (
              <a href={govtrackUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2 py-1 blue" style={{ border: "1px solid var(--rule)", fontSize: 12 }}>
                GovTrack voting record ↗
              </a>
            )}
            {fecUrl && (
              <a href={fecUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2 py-1 blue" style={{ border: "1px solid var(--rule)", fontSize: 12 }}>
                FEC campaign finance ↗
              </a>
            )}
          </div>
          <p className="caption mt-2">Source: congress-legislators roster / Bioguide / GovTrack / FEC</p>
        </section>

        <div className="space-y-8">
          <InProgress
            heading="Career Donor Breakdown by Industry"
            body="Industry-classified PAC money from FEC filings is being wired into member pages (it already backs the homepage's Money Board). Until it lands here, no donor figures are shown for this member."
            source="FEC PAC filings"
          />
          <InProgress
            heading="Stock Holdings Relevant to Committee Assignments"
            body="Personal financial disclosures (the STOCK Act periodic-transaction reports) require a scraping-and-verification pipeline that isn't live yet. No holdings are asserted for this member until they can be sourced from the official filing."
            source="U.S. Senate / House financial disclosures"
          />
          <InProgress
            heading="Recent Votes with Conflict Flags"
            body="Roll-call votes are available live from GovTrack, but flagging a vote as a conflict requires the donor and holdings data above. Rather than guess, we link the member's full GovTrack voting record instead."
            source="GovTrack roll-call record"
          />

          <ShareButton shareText={shareText} />
        </div>
      </main>

      <footer className="px-6 py-6 text-center" style={{ borderTop: "1px solid var(--rule)", maxWidth: 820, margin: "0 auto" }}>
        <p className="caption">
          Identity data from the public congress-legislators roster. Sections marked &quot;analysis in progress&quot; are awaiting live data feeds; no figures are shown until they can be sourced. Not affiliated with any government agency. The presence of financial ties does not imply wrongdoing.
        </p>
      </footer>
    </div>
  );
}
