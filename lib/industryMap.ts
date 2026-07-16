// Curated donor -> industry classifier.
//
// OpenSecrets retired its API (April 2025), and it was the only free source
// that bucketed campaign donations by industry. That industry coding is the
// hard part — decades of hand-classifying employers. We rebuild a focused
// version here: match FEC PAC/contributor names against a curated keyword
// list. FEC PAC names are plain ("LOCKHEED MARTIN EMPLOYEES PAC"), so keyword
// matching on PAC contributions is high-signal for the big-money industries
// this product cares about (defense, pharma, energy, finance, insurance,
// tech). It is intentionally NOT comprehensive — the long tail of individual
// donors' free-text employers is not classified. Extend the list below over
// time; it is the single source of truth for industry attribution.

export type IndustryName =
  | "Defense"
  | "Pharma"
  | "Energy"
  | "Finance"
  | "Insurance"
  | "Tech"
  | "Agriculture"
  | "Telecom";

interface IndustryRule {
  /** Uppercase substring to look for in the contributor/PAC name. */
  keyword: string;
  company: string;
  industry: IndustryName;
}

// Order matters: more specific keywords should precede generic ones. The first
// matching rule wins.
export const INDUSTRY_RULES: IndustryRule[] = [
  // ── Defense ──
  { keyword: "LOCKHEED", company: "Lockheed Martin", industry: "Defense" },
  { keyword: "NORTHROP", company: "Northrop Grumman", industry: "Defense" },
  { keyword: "RAYTHEON", company: "RTX (Raytheon)", industry: "Defense" },
  { keyword: "RTX ", company: "RTX (Raytheon)", industry: "Defense" },
  { keyword: "GENERAL DYNAMICS", company: "General Dynamics", industry: "Defense" },
  { keyword: "BOEING", company: "Boeing", industry: "Defense" },
  { keyword: "L3HARRIS", company: "L3Harris Technologies", industry: "Defense" },
  { keyword: "L-3 ", company: "L3Harris Technologies", industry: "Defense" },
  { keyword: "BAE SYSTEMS", company: "BAE Systems", industry: "Defense" },
  { keyword: "HUNTINGTON INGALLS", company: "Huntington Ingalls", industry: "Defense" },
  { keyword: "LEIDOS", company: "Leidos", industry: "Defense" },
  { keyword: "GENERAL ATOMICS", company: "General Atomics", industry: "Defense" },
  { keyword: "TEXTRON", company: "Textron", industry: "Defense" },

  // ── Pharma ──
  { keyword: "PHRMA", company: "PhRMA", industry: "Pharma" },
  { keyword: "PFIZER", company: "Pfizer", industry: "Pharma" },
  { keyword: "MERCK", company: "Merck", industry: "Pharma" },
  { keyword: "AMGEN", company: "Amgen", industry: "Pharma" },
  { keyword: "ELI LILLY", company: "Eli Lilly", industry: "Pharma" },
  { keyword: "LILLY", company: "Eli Lilly", industry: "Pharma" },
  { keyword: "ABBVIE", company: "AbbVie", industry: "Pharma" },
  { keyword: "JOHNSON & JOHNSON", company: "Johnson & Johnson", industry: "Pharma" },
  { keyword: "BRISTOL", company: "Bristol Myers Squibb", industry: "Pharma" },
  { keyword: "NOVARTIS", company: "Novartis", industry: "Pharma" },
  { keyword: "GILEAD", company: "Gilead Sciences", industry: "Pharma" },

  // ── Energy ──
  { keyword: "EXXON", company: "ExxonMobil", industry: "Energy" },
  { keyword: "CHEVRON", company: "Chevron", industry: "Energy" },
  { keyword: "KOCH", company: "Koch Industries", industry: "Energy" },
  { keyword: "PETROLEUM INSTITUTE", company: "American Petroleum Institute", industry: "Energy" },
  { keyword: "CONOCOPHILLIPS", company: "ConocoPhillips", industry: "Energy" },
  { keyword: "MARATHON", company: "Marathon Petroleum", industry: "Energy" },
  { keyword: "VALERO", company: "Valero Energy", industry: "Energy" },
  { keyword: "DUKE ENERGY", company: "Duke Energy", industry: "Energy" },
  { keyword: "OCCIDENTAL", company: "Occidental Petroleum", industry: "Energy" },

  // ── Finance ──
  { keyword: "GOLDMAN SACHS", company: "Goldman Sachs", industry: "Finance" },
  { keyword: "JPMORGAN", company: "JPMorgan Chase", industry: "Finance" },
  { keyword: "JP MORGAN", company: "JPMorgan Chase", industry: "Finance" },
  { keyword: "CITIGROUP", company: "Citigroup", industry: "Finance" },
  { keyword: "BANK OF AMERICA", company: "Bank of America", industry: "Finance" },
  { keyword: "WELLS FARGO", company: "Wells Fargo", industry: "Finance" },
  { keyword: "MORGAN STANLEY", company: "Morgan Stanley", industry: "Finance" },
  { keyword: "AMERICAN BANKERS", company: "American Bankers Assn", industry: "Finance" },
  { keyword: "BLACKSTONE", company: "Blackstone", industry: "Finance" },

  // ── Insurance ──
  { keyword: "UNITEDHEALTH", company: "UnitedHealth Group", industry: "Insurance" },
  { keyword: "CIGNA", company: "Cigna", industry: "Insurance" },
  { keyword: "AETNA", company: "Aetna", industry: "Insurance" },
  { keyword: "BLUE CROSS", company: "Blue Cross Blue Shield", industry: "Insurance" },
  { keyword: "AFLAC", company: "Aflac", industry: "Insurance" },
  { keyword: "METLIFE", company: "MetLife", industry: "Insurance" },
  { keyword: "PRUDENTIAL", company: "Prudential", industry: "Insurance" },

  // ── Tech ──
  { keyword: "MICROSOFT", company: "Microsoft", industry: "Tech" },
  { keyword: "ALPHABET", company: "Alphabet (Google)", industry: "Tech" },
  { keyword: "GOOGLE", company: "Alphabet (Google)", industry: "Tech" },
  { keyword: "AMAZON", company: "Amazon", industry: "Tech" },
  { keyword: "META PLATFORMS", company: "Meta", industry: "Tech" },
  { keyword: "APPLE INC", company: "Apple", industry: "Tech" },
  { keyword: "ORACLE", company: "Oracle", industry: "Tech" },
  { keyword: "INTEL ", company: "Intel", industry: "Tech" },

  // ── Telecom ──
  { keyword: "AT&T", company: "AT&T", industry: "Telecom" },
  { keyword: "VERIZON", company: "Verizon", industry: "Telecom" },
  { keyword: "COMCAST", company: "Comcast", industry: "Telecom" },
  { keyword: "T-MOBILE", company: "T-Mobile", industry: "Telecom" },

  // ── Agriculture ──
  { keyword: "CARGILL", company: "Cargill", industry: "Agriculture" },
  { keyword: "ARCHER DANIELS", company: "Archer Daniels Midland", industry: "Agriculture" },
  { keyword: "TYSON", company: "Tyson Foods", industry: "Agriculture" },
  { keyword: "FARM BUREAU", company: "American Farm Bureau", industry: "Agriculture" },
];

export interface Classification {
  industry: IndustryName;
  company: string;
}

/** Classify a single contributor/PAC name, or null if unrecognized. */
export function classifyContributor(name: string): Classification | null {
  if (!name) return null;
  const upper = name.toUpperCase();
  for (const rule of INDUSTRY_RULES) {
    if (upper.includes(rule.keyword)) {
      return { industry: rule.industry, company: rule.company };
    }
  }
  return null;
}

export interface IndustryTotal {
  industry: IndustryName;
  amount: number;
  companies: string[];
}

/** Aggregate a list of (contributorName, amount) into per-industry totals,
 *  sorted high to low. Unclassified amounts are returned separately. */
export function aggregateByIndustry(
  contributions: Array<{ name: string; amount: number }>
): { industries: IndustryTotal[]; unclassifiedTotal: number } {
  const byIndustry = new Map<IndustryName, { amount: number; companies: Set<string> }>();
  let unclassifiedTotal = 0;

  for (const c of contributions) {
    const hit = classifyContributor(c.name);
    if (!hit) {
      unclassifiedTotal += c.amount;
      continue;
    }
    const entry = byIndustry.get(hit.industry) ?? { amount: 0, companies: new Set<string>() };
    entry.amount += c.amount;
    entry.companies.add(hit.company);
    byIndustry.set(hit.industry, entry);
  }

  const industries: IndustryTotal[] = [...byIndustry.entries()]
    .map(([industry, v]) => ({ industry, amount: v.amount, companies: [...v.companies] }))
    .sort((a, b) => b.amount - a.amount);

  return { industries, unclassifiedTotal };
}
