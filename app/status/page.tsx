import type { Metadata } from "next";
import Link from "next/link";
import GlobalStyles from "@/components/GlobalStyles";
import { getSourceStatuses } from "@/lib/config";

export const metadata: Metadata = {
  title: "Data Source Status — LOBBY CAM",
  robots: { index: false },
};

// Always reflect current env at request time.
export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  green: "Free · no cost",
  yellow: "Free key · rate-limited",
  red: "Heavy build · deferred",
};

export default function StatusPage() {
  const sources = getSourceStatuses();
  const configured = sources.filter((s) => s.configured).length;

  return (
    <div className="sans ink min-h-screen" style={{ background: "var(--cream)" }}>
      <GlobalStyles />
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
        <h2 className="serif font-bold mb-1" style={{ fontSize: 28 }}>Data Source Status</h2>
        <p className="text-sm mb-6" style={{ color: "var(--muted-dark)" }}>
          {configured} of {sources.length} feeds configured. A feed with no key needed is always ready;
          keyed feeds turn on once their environment variable is set in Railway. See{" "}
          <span className="font-semibold">docs/ENV_SETUP.md</span> for how to get each key.
        </p>

        <div style={{ borderTop: "2px solid var(--ink)" }}>
          {sources.map((s) => (
            <div key={s.id} className="py-3 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontSize: 14 }}>{s.label}</span>
                  <span
                    className="uppercase tracking-wider font-semibold px-1.5 py-0.5"
                    style={{
                      fontSize: 8,
                      color: s.tier === "green" ? "#2E5D34" : "#8A6D1E",
                      background: s.tier === "green" ? "rgba(46,93,52,0.1)" : "rgba(138,109,30,0.12)",
                    }}
                  >
                    {TIER_LABEL[s.tier]}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-dark)", fontSize: 12 }}>{s.description}</p>
                {s.envKey && (
                  <p className="caption mt-0.5">Environment variable: <span className="font-semibold">{s.envKey}</span></p>
                )}
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 120 }}>
                {s.configured ? (
                  <span className="font-bold" style={{ color: "#2E5D34", fontSize: 13 }}>
                    {s.needsKey ? "● Live" : "● Ready"}
                  </span>
                ) : (
                  <span className="font-bold" style={{ color: "var(--muted)", fontSize: 13 }}>○ Awaiting key</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="caption mt-6">
          Note: a &quot;Live&quot; keyed feed means the key is present. If an upstream API is briefly down, that feed
          falls back to demo data automatically rather than breaking the page.
        </p>
      </main>
    </div>
  );
}
