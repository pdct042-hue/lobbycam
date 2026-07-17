import type { IndustryTotal } from "@/lib/industryMap";

// ═══════════════════════════════════════════════════════════════════════
// CONFLICT INDEX (v0) — the scoring scaffold for member files.
// ═══════════════════════════════════════════════════════════════════════
//
// The eventual index blends five inputs. Only the two money inputs can be
// computed today (FEC PAC filings are live); the other three wait on their
// data pipelines. The rules of the house apply: every input is either
// computed from real public records or shown as PENDING — nothing is guessed.
// The headline number is therefore explicitly PROVISIONAL and labeled with
// its coverage ("2 of 5 inputs") everywhere it appears.
//
//   money-volume        LIVE     cycle-to-date industry PAC money, log-scaled
//   money-concentration LIVE     how concentrated that money is in few
//                                industries (Herfindahl–Hirschman index)
//   contract-overlap    PENDING  donor industries vs federal contract flows
//                                (USASpending join — Phase 1.4)
//   holdings            PENDING  STOCK Act personal financial disclosures
//                                (red-tier pipeline — Phase 4)
//   lobbying-pressure   PENDING  Senate LDA lobbying disclosures targeting the
//                                member's committees (red tier — Phase 4)
//
// Each live input scores 0–100; the provisional index is the mean of the live
// inputs only. When a pending pipeline lands, add its input here and the
// coverage label updates everywhere automatically.

export type InputStatus = "live" | "pending";

export interface ScoreInput {
  key: string;
  label: string;
  status: InputStatus;
  /** 0–100, present only when status is "live". */
  value?: number;
  /** One-line, human-readable basis for the value (or what's blocking it). */
  detail: string;
  source: string;
}

export interface ConflictScore {
  version: "v0";
  /** Mean of the live inputs, 0–100. Always provisional until all inputs are live. */
  provisionalScore: number;
  liveInputs: number;
  totalInputs: number;
  inputs: ScoreInput[];
}

export interface MoneyMetrics {
  totalClassified: number;
  unclassifiedTotal: number;
  industryCount: number;
  topIndustry: { name: string; amount: number; share: number } | null;
  /** Herfindahl–Hirschman index over industry shares, 0–100. */
  concentration: number;
  concentrationLabel: "Diversified" | "Mixed" | "Concentrated";
}

/** Factual roll-ups of a member's classified industry PAC money. */
export function computeMoneyMetrics(industries: IndustryTotal[], unclassifiedTotal: number): MoneyMetrics {
  const totalClassified = industries.reduce((s, i) => s + i.amount, 0);
  const top = industries.length
    ? industries.reduce((a, b) => (b.amount > a.amount ? b : a))
    : null;
  const hhi =
    totalClassified > 0
      ? industries.reduce((s, i) => {
          const share = i.amount / totalClassified;
          return s + share * share;
        }, 0) * 100
      : 0;
  return {
    totalClassified,
    unclassifiedTotal,
    industryCount: industries.length,
    topIndustry: top
      ? { name: top.industry, amount: top.amount, share: totalClassified > 0 ? top.amount / totalClassified : 0 }
      : null,
    concentration: Math.round(hhi),
    concentrationLabel: hhi >= 50 ? "Concentrated" : hhi >= 25 ? "Mixed" : "Diversified",
  };
}

/** Log-scale dollars to 0–100: $0 → 0, ~$1K → 33, ~$100K → 78, ≥$1M → 100. */
function moneyVolumeScore(totalClassified: number): number {
  if (totalClassified <= 0) return 0;
  return Math.round(Math.min(100, (Math.log10(1 + totalClassified) / 6) * 100));
}

export function computeConflictScore(metrics: MoneyMetrics): ConflictScore {
  const volume = moneyVolumeScore(metrics.totalClassified);
  const concentration = metrics.totalClassified > 0 ? metrics.concentration : 0;

  const inputs: ScoreInput[] = [
    {
      key: "money-volume",
      label: "Industry money volume",
      status: "live",
      value: volume,
      detail: `Classified industry PAC money this cycle, log-scaled ($1M+ scores 100).`,
      source: "FEC PAC filings",
    },
    {
      key: "money-concentration",
      label: "Industry concentration",
      status: "live",
      value: concentration,
      detail: `How concentrated that money is in few industries (Herfindahl–Hirschman index).`,
      source: "FEC PAC filings",
    },
    {
      key: "contract-overlap",
      label: "Donor ↔ contract overlap",
      status: "pending",
      detail: "Federal contract dollars flowing to the member's donor industries. Needs the USASpending join (Phase 1.4).",
      source: "USASpending.gov",
    },
    {
      key: "holdings",
      label: "Personal stock holdings",
      status: "pending",
      detail: "STOCK Act periodic-transaction reports. Needs the disclosure-scraping pipeline (Phase 4).",
      source: "Senate/House financial disclosures",
    },
    {
      key: "lobbying-pressure",
      label: "Lobbying pressure",
      status: "pending",
      detail: "LDA lobbying disclosures targeting the member's committees. Needs the red-tier pipeline (Phase 4).",
      source: "Senate LDA filings",
    },
  ];

  const live = inputs.filter((i) => i.status === "live");
  const provisionalScore = live.length
    ? Math.round(live.reduce((s, i) => s + (i.value ?? 0), 0) / live.length)
    : 0;

  return {
    version: "v0",
    provisionalScore,
    liveInputs: live.length,
    totalInputs: inputs.length,
    inputs,
  };
}
