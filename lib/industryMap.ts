// Curated donor -> industry classifier.
//
// OpenSecrets retired its API (April 2025), and it was the only free source
// that bucketed campaign donations by industry. That industry coding is the
// hard part — decades of hand-classifying employers. We rebuild a focused
// version here: match FEC PAC/contributor names against a curated keyword
// list. FEC PAC names are plain ("LOCKHEED MARTIN EMPLOYEES PAC"), so keyword
// matching on PAC contributions is high-signal for the big-money industries
// this product cares about. It is intentionally NOT comprehensive — the long
// tail of individual donors' free-text employers is not classified. Extend
// the list below over time; it is the single source of truth for industry
// attribution.
//
// Scope rule: this map classifies INDUSTRY money only — corporate PACs, trade
// associations, professional societies, and labor unions. Party committees,
// leadership PACs, and ideological/single-issue PACs are deliberately left
// unclassified: they are support/alignment money, not industry-conflict
// money, and classifying them would pollute The Money Board rankings and the
// Conflict Index (both are built on classified-industry totals).

export type IndustryName =
  | "Defense"
  | "Pharma"
  | "Health"
  | "Energy"
  | "Finance"
  | "Insurance"
  | "Real Estate"
  | "Tech"
  | "Telecom"
  | "Media"
  | "Agriculture"
  | "Labor"
  | "Transport"
  | "Construction"
  | "Manufacturing"
  | "Retail"
  | "Law";

interface IndustryRule {
  /** Uppercase substring to look for in the contributor/PAC name. */
  keyword: string;
  company: string;
  industry: IndustryName;
}

// Order matters: the FIRST matching rule wins, so more specific keywords must
// precede generic ones. Known ordering hazards are grouped and commented —
// e.g. "MOSAIC" (fertilizer) contains "SAIC" (defense IT), "MORTGAGE BANKERS"
// must beat the generic "BANKERS", and "KOCH FOODS" (poultry) must beat
// "KOCH" (Koch Industries). Keep hazard pairs adjacent when adding rules.
export const INDUSTRY_RULES: IndustryRule[] = [
  // ═══ Ordering hazards — specific rules that must fire before a broader
  //     rule further down would misclassify them. Keep this block first. ═══
  { keyword: "MOSAIC", company: "The Mosaic Company", industry: "Agriculture" }, // contains "SAIC"
  { keyword: "KOCH FOODS", company: "Koch Foods", industry: "Agriculture" }, // before "KOCH"
  { keyword: "MORTGAGE BANKERS", company: "Mortgage Bankers Assn", industry: "Real Estate" }, // before "BANKERS"
  { keyword: "FARM CREDIT", company: "Farm Credit Council", industry: "Agriculture" }, // before "CREDIT UNION"/finance generics
  { keyword: "BUILDING TRADES", company: "North America's Building Trades Unions", industry: "Labor" }, // union, not contractor
  { keyword: "BERKSHIRE HATHAWAY ENERGY", company: "Berkshire Hathaway Energy", industry: "Energy" }, // before "BERKSHIRE"
  { keyword: "GE AEROSPACE", company: "GE Aerospace", industry: "Defense" }, // before "GENERAL ELECTRIC"
  { keyword: "GE VERNOVA", company: "GE Vernova", industry: "Energy" },
  { keyword: "GE HEALTHCARE", company: "GE HealthCare", industry: "Health" },
  { keyword: "DELTA DENTAL", company: "Delta Dental", industry: "Health" }, // before "DELTA AIR" / "DENTAL"
  { keyword: "AIR TRAFFIC CONTROLLERS", company: "Air Traffic Controllers Assn (NATCA)", industry: "Labor" }, // union, not airline
  { keyword: "NURSES ASSOCIATION", company: "American Nurses Assn", industry: "Health" }, // professional assn, before "NURSES" union rule
  { keyword: "ENTERPRISE HOLDINGS", company: "Enterprise (car rental)", industry: "Transport" }, // before "ENTERPRISE PRODUCTS"
  { keyword: "OCCIDENTAL", company: "Occidental Petroleum", industry: "Energy" }, // "occiDENTAL" — before "DENTAL"
  { keyword: "CORTEVA", company: "Corteva Agriscience", industry: "Agriculture" }, // "corTEVA" — before "TEVA"
  { keyword: "INTUITIVE SURGICAL", company: "Intuitive Surgical", industry: "Pharma" }, // before "INTUIT"

  // ── Defense ──
  { keyword: "LOCKHEED", company: "Lockheed Martin", industry: "Defense" },
  { keyword: "NORTHROP", company: "Northrop Grumman", industry: "Defense" },
  { keyword: "RAYTHEON", company: "RTX (Raytheon)", industry: "Defense" },
  { keyword: "RTX ", company: "RTX (Raytheon)", industry: "Defense" },
  { keyword: "COLLINS AEROSPACE", company: "RTX (Collins Aerospace)", industry: "Defense" },
  { keyword: "PRATT & WHITNEY", company: "RTX (Pratt & Whitney)", industry: "Defense" },
  { keyword: "GENERAL DYNAMICS", company: "General Dynamics", industry: "Defense" },
  { keyword: "BOEING", company: "Boeing", industry: "Defense" },
  { keyword: "L3HARRIS", company: "L3Harris Technologies", industry: "Defense" },
  { keyword: "L-3 ", company: "L3Harris Technologies", industry: "Defense" },
  { keyword: "HARRIS CORPORATION", company: "L3Harris Technologies", industry: "Defense" },
  { keyword: "BAE SYSTEMS", company: "BAE Systems", industry: "Defense" },
  { keyword: "HUNTINGTON INGALLS", company: "Huntington Ingalls", industry: "Defense" },
  { keyword: "LEIDOS", company: "Leidos", industry: "Defense" },
  { keyword: "GENERAL ATOMICS", company: "General Atomics", industry: "Defense" },
  { keyword: "TEXTRON", company: "Textron", industry: "Defense" },
  { keyword: "HONEYWELL", company: "Honeywell (aerospace/defense)", industry: "Defense" },
  { keyword: "BOOZ ALLEN", company: "Booz Allen Hamilton", industry: "Defense" },
  { keyword: "CACI", company: "CACI International", industry: "Defense" },
  { keyword: "SAIC", company: "SAIC", industry: "Defense" }, // "MOSAIC" handled above
  { keyword: "AMENTUM", company: "Amentum", industry: "Defense" },
  { keyword: "PERATON", company: "Peraton", industry: "Defense" },
  { keyword: "KBR", company: "KBR", industry: "Defense" },
  { keyword: "PARSONS CORPORATION", company: "Parsons", industry: "Defense" },
  { keyword: "JACOBS ENGINEERING", company: "Jacobs", industry: "Defense" },
  { keyword: "JACOBS SOLUTIONS", company: "Jacobs", industry: "Defense" },
  { keyword: "SIERRA NEVADA CORP", company: "Sierra Nevada Corp", industry: "Defense" },
  { keyword: "ANDURIL", company: "Anduril Industries", industry: "Defense" },
  { keyword: "PALANTIR", company: "Palantir", industry: "Defense" },
  { keyword: "SPACE EXPLORATION TECH", company: "SpaceX", industry: "Defense" },
  { keyword: "SPACEX", company: "SpaceX", industry: "Defense" },
  { keyword: "BLUE ORIGIN", company: "Blue Origin", industry: "Defense" },
  { keyword: "UNITED LAUNCH", company: "United Launch Alliance", industry: "Defense" },
  { keyword: "ROCKET LAB", company: "Rocket Lab", industry: "Defense" },
  { keyword: "AEROVIRONMENT", company: "AeroVironment", industry: "Defense" },
  { keyword: "KRATOS", company: "Kratos Defense", industry: "Defense" },
  { keyword: "CURTISS-WRIGHT", company: "Curtiss-Wright", industry: "Defense" },
  { keyword: "MERCURY SYSTEMS", company: "Mercury Systems", industry: "Defense" },
  { keyword: "LEONARDO DRS", company: "Leonardo DRS", industry: "Defense" },
  { keyword: "ELBIT", company: "Elbit Systems of America", industry: "Defense" },
  { keyword: "ROLLS-ROYCE", company: "Rolls-Royce North America", industry: "Defense" },
  { keyword: "AIRBUS", company: "Airbus", industry: "Defense" },
  { keyword: "SPIRIT AEROSYSTEMS", company: "Spirit AeroSystems", industry: "Defense" },
  { keyword: "HOWMET", company: "Howmet Aerospace", industry: "Defense" },
  { keyword: "TRANSDIGM", company: "TransDigm", industry: "Defense" },
  { keyword: "HEICO", company: "HEICO", industry: "Defense" },
  { keyword: "TELEDYNE", company: "Teledyne", industry: "Defense" },
  { keyword: "BWX TECHNOLOGIES", company: "BWX Technologies", industry: "Defense" },
  { keyword: "BWXT", company: "BWX Technologies", industry: "Defense" },
  { keyword: "OSHKOSH", company: "Oshkosh (defense vehicles)", industry: "Defense" },
  { keyword: "AM GENERAL", company: "AM General", industry: "Defense" },
  { keyword: "DAY & ZIMMERMANN", company: "Day & Zimmermann", industry: "Defense" },

  // ── Pharma (drugs, biotech, devices, distribution) ──
  { keyword: "PHRMA", company: "PhRMA", industry: "Pharma" },
  { keyword: "PFIZER", company: "Pfizer", industry: "Pharma" },
  { keyword: "MERCK", company: "Merck", industry: "Pharma" },
  { keyword: "AMGEN", company: "Amgen", industry: "Pharma" },
  { keyword: "ELI LILLY", company: "Eli Lilly", industry: "Pharma" },
  { keyword: "LILLY AND COMPANY", company: "Eli Lilly", industry: "Pharma" },
  { keyword: "ABBVIE", company: "AbbVie", industry: "Pharma" },
  { keyword: "JOHNSON & JOHNSON", company: "Johnson & Johnson", industry: "Pharma" },
  { keyword: "BRISTOL MYERS", company: "Bristol Myers Squibb", industry: "Pharma" },
  { keyword: "BRISTOL-MYERS", company: "Bristol Myers Squibb", industry: "Pharma" },
  { keyword: "NOVARTIS", company: "Novartis", industry: "Pharma" },
  { keyword: "GILEAD", company: "Gilead Sciences", industry: "Pharma" },
  { keyword: "ASTRAZENECA", company: "AstraZeneca", industry: "Pharma" },
  { keyword: "SANOFI", company: "Sanofi", industry: "Pharma" },
  { keyword: "GLAXO", company: "GSK (GlaxoSmithKline)", industry: "Pharma" },
  { keyword: "GSK ", company: "GSK (GlaxoSmithKline)", industry: "Pharma" },
  { keyword: "BAYER", company: "Bayer", industry: "Pharma" },
  { keyword: "GENENTECH", company: "Genentech (Roche)", industry: "Pharma" },
  { keyword: "ROCHE HOLDING", company: "Roche", industry: "Pharma" }, // NOT bare "ROCHE" — "petROCHEmical"
  { keyword: "LA ROCHE", company: "Roche", industry: "Pharma" },
  { keyword: "NOVO NORDISK", company: "Novo Nordisk", industry: "Pharma" },
  { keyword: "TAKEDA", company: "Takeda", industry: "Pharma" },
  { keyword: "BOEHRINGER", company: "Boehringer Ingelheim", industry: "Pharma" },
  { keyword: "ASTELLAS", company: "Astellas", industry: "Pharma" },
  { keyword: "DAIICHI", company: "Daiichi Sankyo", industry: "Pharma" },
  { keyword: "OTSUKA", company: "Otsuka", industry: "Pharma" },
  { keyword: "TEVA", company: "Teva", industry: "Pharma" },
  { keyword: "VIATRIS", company: "Viatris", industry: "Pharma" },
  { keyword: "REGENERON", company: "Regeneron", industry: "Pharma" },
  { keyword: "VERTEX PHARMA", company: "Vertex Pharmaceuticals", industry: "Pharma" },
  { keyword: "MODERNA", company: "Moderna", industry: "Pharma" },
  { keyword: "BIOGEN", company: "Biogen", industry: "Pharma" },
  { keyword: "ZOETIS", company: "Zoetis (animal health)", industry: "Pharma" },
  { keyword: "ELANCO", company: "Elanco (animal health)", industry: "Pharma" },
  { keyword: "MEDTRONIC", company: "Medtronic", industry: "Pharma" },
  { keyword: "ABBOTT", company: "Abbott Laboratories", industry: "Pharma" },
  { keyword: "STRYKER", company: "Stryker", industry: "Pharma" },
  { keyword: "BOSTON SCIENTIFIC", company: "Boston Scientific", industry: "Pharma" },
  { keyword: "BAXTER", company: "Baxter International", industry: "Pharma" },
  { keyword: "BECTON", company: "Becton Dickinson", industry: "Pharma" },
  { keyword: "ZIMMER BIOMET", company: "Zimmer Biomet", industry: "Pharma" },
  { keyword: "EDWARDS LIFESCIENCES", company: "Edwards Lifesciences", industry: "Pharma" },
  { keyword: "ADVANCED MEDICAL TECHNOLOGY", company: "AdvaMed (device makers)", industry: "Pharma" },
  { keyword: "MCKESSON", company: "McKesson", industry: "Pharma" },
  { keyword: "CARDINAL HEALTH", company: "Cardinal Health", industry: "Pharma" },
  { keyword: "CENCORA", company: "Cencora (AmerisourceBergen)", industry: "Pharma" },
  { keyword: "AMERISOURCE", company: "Cencora (AmerisourceBergen)", industry: "Pharma" },
  { keyword: "CVS", company: "CVS Health", industry: "Pharma" },
  { keyword: "WALGREEN", company: "Walgreens", industry: "Pharma" },
  { keyword: "BIOTECHNOLOGY", company: "BIO (biotech trade assn)", industry: "Pharma" },

  // ── Health (providers: hospitals, physicians, dentists, care facilities) ──
  { keyword: "AMERICAN MEDICAL ASSOCIATION", company: "American Medical Assn", industry: "Health" },
  { keyword: "HCA ", company: "HCA Healthcare", industry: "Health" },
  { keyword: "TENET", company: "Tenet Healthcare", industry: "Health" },
  { keyword: "UNIVERSAL HEALTH SERVICES", company: "Universal Health Services", industry: "Health" },
  { keyword: "COMMUNITY HEALTH SYSTEMS", company: "Community Health Systems", industry: "Health" },
  { keyword: "ASCENSION", company: "Ascension", industry: "Health" },
  { keyword: "KAISER", company: "Kaiser Permanente", industry: "Health" },
  { keyword: "DAVITA", company: "DaVita (dialysis)", industry: "Health" },
  { keyword: "FRESENIUS", company: "Fresenius (dialysis)", industry: "Health" },
  { keyword: "DIALYSIS", company: "Dialysis providers", industry: "Health" },
  { keyword: "QUEST DIAGNOSTICS", company: "Quest Diagnostics", industry: "Health" },
  { keyword: "LABCORP", company: "Labcorp", industry: "Health" },
  { keyword: "AMERICAN HEALTH CARE ASSOCIATION", company: "American Health Care Assn (nursing homes)", industry: "Health" },
  { keyword: "HEALTH CARE ASSOCIATION", company: "Health care assns (state/national)", industry: "Health" },
  { keyword: "HOSPICE", company: "Hospice & home care", industry: "Health" },
  { keyword: "ANESTHESIOLOGISTS", company: "American Society of Anesthesiologists", industry: "Health" },
  { keyword: "NURSE ANESTHE", company: "Nurse anesthetists (AANA)", industry: "Health" },
  { keyword: "EMERGENCY PHYSICIANS", company: "American College of Emergency Physicians", industry: "Health" },
  { keyword: "FAMILY PHYSICIANS", company: "American Academy of Family Physicians", industry: "Health" },
  { keyword: "RADIOLOGY", company: "American College of Radiology", industry: "Health" },
  { keyword: "PATHOLOGISTS", company: "College of American Pathologists", industry: "Health" },
  { keyword: "OPHTHALMOLOGY", company: "American Academy of Ophthalmology", industry: "Health" },
  { keyword: "DERMATOLOGY", company: "American Academy of Dermatology", industry: "Health" },
  { keyword: "ORTHOPAEDIC", company: "American Assn of Orthopaedic Surgeons", industry: "Health" },
  { keyword: "ORTHOPEDIC", company: "Orthopedic surgeons", industry: "Health" },
  { keyword: "CARDIOLOGY", company: "American College of Cardiology", industry: "Health" },
  { keyword: "GASTROENTEROLOGY", company: "American Gastroenterological Assn", industry: "Health" },
  { keyword: "ONCOLOGY", company: "Oncology societies", industry: "Health" },
  { keyword: "UROLOG", company: "Urology societies", industry: "Health" },
  { keyword: "OPTOMETR", company: "American Optometric Assn", industry: "Health" },
  { keyword: "CHIROPRACT", company: "American Chiropractic Assn", industry: "Health" },
  { keyword: "PODIAT", company: "American Podiatric Medical Assn", industry: "Health" },
  { keyword: "PSYCHIATR", company: "American Psychiatric Assn", industry: "Health" },
  { keyword: "PHYSICAL THERAPY", company: "American Physical Therapy Assn", industry: "Health" },
  { keyword: "COLLEGE OF SURGEONS", company: "American College of Surgeons", industry: "Health" },
  { keyword: "SURGEONS", company: "Surgeon societies", industry: "Health" },
  { keyword: "AMERICAN DENTAL", company: "American Dental Assn", industry: "Health" },
  { keyword: "DENTAL", company: "Dental assns (state/national)", industry: "Health" },
  { keyword: "HOSPITAL", company: "Hospital assns & systems", industry: "Health" },
  { keyword: "MEDICAL ASSOCIATION", company: "Medical assns (state/national)", industry: "Health" },

  // ── Energy (oil & gas, utilities, coal, mining, renewables) ──
  { keyword: "EXXON", company: "ExxonMobil", industry: "Energy" },
  { keyword: "CHEVRON", company: "Chevron", industry: "Energy" },
  { keyword: "KOCH", company: "Koch Industries", industry: "Energy" }, // "KOCH FOODS" handled above
  { keyword: "PETROLEUM INSTITUTE", company: "American Petroleum Institute", industry: "Energy" },
  { keyword: "CONOCOPHILLIPS", company: "ConocoPhillips", industry: "Energy" },
  { keyword: "MARATHON", company: "Marathon Petroleum / Oil", industry: "Energy" },
  { keyword: "VALERO", company: "Valero Energy", industry: "Energy" },
  { keyword: "DUKE ENERGY", company: "Duke Energy", industry: "Energy" },
  { keyword: "SHELL OIL", company: "Shell", industry: "Energy" },
  { keyword: "SHELL USA", company: "Shell", industry: "Energy" },
  { keyword: "BP AMERICA", company: "BP", industry: "Energy" },
  { keyword: "BP CORPORATION", company: "BP", industry: "Energy" },
  { keyword: "TOTALENERGIES", company: "TotalEnergies", industry: "Energy" },
  { keyword: "HESS CORP", company: "Hess", industry: "Energy" },
  { keyword: "PHILLIPS 66", company: "Phillips 66", industry: "Energy" },
  { keyword: "DEVON ENERGY", company: "Devon Energy", industry: "Energy" },
  { keyword: "EOG RESOURCES", company: "EOG Resources", industry: "Energy" },
  { keyword: "DIAMONDBACK", company: "Diamondback Energy", industry: "Energy" },
  { keyword: "PIONEER NATURAL", company: "Pioneer Natural Resources", industry: "Energy" },
  { keyword: "CONTINENTAL RESOURCES", company: "Continental Resources", industry: "Energy" },
  { keyword: "COTERRA", company: "Coterra Energy", industry: "Energy" },
  { keyword: "HALLIBURTON", company: "Halliburton", industry: "Energy" },
  { keyword: "BAKER HUGHES", company: "Baker Hughes", industry: "Energy" },
  { keyword: "SCHLUMBERGER", company: "SLB (Schlumberger)", industry: "Energy" },
  { keyword: "KINDER MORGAN", company: "Kinder Morgan", industry: "Energy" },
  { keyword: "WILLIAMS COMPANIES", company: "Williams Companies", industry: "Energy" },
  { keyword: "ENERGY TRANSFER", company: "Energy Transfer", industry: "Energy" },
  { keyword: "ENTERPRISE PRODUCTS", company: "Enterprise Products", industry: "Energy" },
  { keyword: "PLAINS ALL AMERICAN", company: "Plains All American", industry: "Energy" },
  { keyword: "ONEOK", company: "ONEOK", industry: "Energy" },
  { keyword: "ENBRIDGE", company: "Enbridge", industry: "Energy" },
  { keyword: "TC ENERGY", company: "TC Energy", industry: "Energy" },
  { keyword: "CHENIERE", company: "Cheniere Energy", industry: "Energy" },
  { keyword: "SEMPRA", company: "Sempra", industry: "Energy" },
  { keyword: "NEXTERA", company: "NextEra Energy", industry: "Energy" },
  { keyword: "SOUTHERN COMPANY", company: "Southern Company", industry: "Energy" },
  { keyword: "EXELON", company: "Exelon", industry: "Energy" },
  { keyword: "CONSTELLATION ENERGY", company: "Constellation Energy", industry: "Energy" },
  { keyword: "DOMINION ENERGY", company: "Dominion Energy", industry: "Energy" },
  { keyword: "AMERICAN ELECTRIC POWER", company: "American Electric Power", industry: "Energy" },
  { keyword: "ENTERGY", company: "Entergy", industry: "Energy" },
  { keyword: "XCEL ENERGY", company: "Xcel Energy", industry: "Energy" }, // NOT bare "XCEL" — "eXCELlence"
  { keyword: "DTE ENERGY", company: "DTE Energy", industry: "Energy" },
  { keyword: "AMEREN", company: "Ameren", industry: "Energy" },
  { keyword: "FIRSTENERGY", company: "FirstEnergy", industry: "Energy" },
  { keyword: "PUBLIC SERVICE ENTERPRISE", company: "PSEG", industry: "Energy" },
  { keyword: "PG&E", company: "PG&E", industry: "Energy" },
  { keyword: "PACIFIC GAS", company: "PG&E", industry: "Energy" },
  { keyword: "EDISON INTERNATIONAL", company: "Edison International", industry: "Energy" },
  { keyword: "SOUTHERN CALIFORNIA EDISON", company: "Southern California Edison", industry: "Energy" },
  { keyword: "CONSOLIDATED EDISON", company: "Consolidated Edison", industry: "Energy" },
  { keyword: "WEC ENERGY", company: "WEC Energy", industry: "Energy" },
  { keyword: "EVERGY", company: "Evergy", industry: "Energy" },
  { keyword: "PPL ", company: "PPL", industry: "Energy" },
  { keyword: "NRG ENERGY", company: "NRG Energy", industry: "Energy" },
  { keyword: "VISTRA", company: "Vistra", industry: "Energy" },
  { keyword: "EDISON ELECTRIC INSTITUTE", company: "Edison Electric Institute", industry: "Energy" },
  { keyword: "RURAL ELECTRIC", company: "Rural electric co-ops (NRECA)", industry: "Energy" },
  { keyword: "ELECTRIC COOPERATIVE", company: "Electric cooperatives", industry: "Energy" },
  { keyword: "AMERICAN GAS ASSOCIATION", company: "American Gas Assn", industry: "Energy" },
  { keyword: "FUEL & PETROCHEMICAL", company: "AFPM (refiners)", industry: "Energy" },
  { keyword: "NUCLEAR ENERGY", company: "Nuclear Energy Institute", industry: "Energy" },
  { keyword: "PEABODY", company: "Peabody Energy (coal)", industry: "Energy" },
  { keyword: "ALLIANCE RESOURCE", company: "Alliance Resource Partners (coal)", industry: "Energy" },
  { keyword: "CONSOL ENERGY", company: "CONSOL Energy (coal)", industry: "Energy" }, // NOT bare "CONSOL" — "CONSOLidated"
  { keyword: "FREEPORT", company: "Freeport-McMoRan (mining)", industry: "Energy" },
  { keyword: "NEWMONT", company: "Newmont (mining)", industry: "Energy" },
  { keyword: "NATIONAL MINING", company: "National Mining Assn", industry: "Energy" },
  { keyword: "PETROLEUM", company: "Petroleum industry PACs", industry: "Energy" },
  { keyword: "OIL & GAS", company: "Oil & gas industry PACs", industry: "Energy" },
  { keyword: "NATURAL GAS", company: "Natural gas industry PACs", industry: "Energy" },

  // ── Finance (banks, securities, PE, payments, accounting, crypto) ──
  { keyword: "GOLDMAN SACHS", company: "Goldman Sachs", industry: "Finance" },
  { keyword: "JPMORGAN", company: "JPMorgan Chase", industry: "Finance" },
  { keyword: "JP MORGAN", company: "JPMorgan Chase", industry: "Finance" },
  { keyword: "CITIGROUP", company: "Citigroup", industry: "Finance" },
  { keyword: "BANK OF AMERICA", company: "Bank of America", industry: "Finance" },
  { keyword: "WELLS FARGO", company: "Wells Fargo", industry: "Finance" },
  { keyword: "MORGAN STANLEY", company: "Morgan Stanley", industry: "Finance" },
  { keyword: "AMERICAN BANKERS", company: "American Bankers Assn", industry: "Finance" },
  { keyword: "BLACKSTONE", company: "Blackstone", industry: "Finance" },
  { keyword: "BLACKROCK", company: "BlackRock", industry: "Finance" },
  { keyword: "KKR", company: "KKR", industry: "Finance" },
  { keyword: "CARLYLE", company: "The Carlyle Group", industry: "Finance" },
  { keyword: "APOLLO GLOBAL", company: "Apollo Global Management", industry: "Finance" },
  { keyword: "ARES MANAGEMENT", company: "Ares Management", industry: "Finance" },
  { keyword: "BERKSHIRE", company: "Berkshire Hathaway", industry: "Finance" }, // "BERKSHIRE HATHAWAY ENERGY" handled above
  { keyword: "AMERICAN EXPRESS", company: "American Express", industry: "Finance" },
  { keyword: "VISA ", company: "Visa", industry: "Finance" },
  { keyword: "MASTERCARD", company: "Mastercard", industry: "Finance" },
  { keyword: "DISCOVER FINANCIAL", company: "Discover", industry: "Finance" },
  { keyword: "PAYPAL", company: "PayPal", industry: "Finance" },
  { keyword: "CAPITAL ONE", company: "Capital One", industry: "Finance" },
  { keyword: "U.S. BANCORP", company: "U.S. Bancorp", industry: "Finance" },
  { keyword: "US BANCORP", company: "U.S. Bancorp", industry: "Finance" },
  { keyword: "PNC ", company: "PNC Financial", industry: "Finance" },
  { keyword: "TRUIST", company: "Truist", industry: "Finance" },
  { keyword: "FIFTH THIRD", company: "Fifth Third Bank", industry: "Finance" },
  { keyword: "KEYCORP", company: "KeyCorp", industry: "Finance" },
  { keyword: "REGIONS FINANCIAL", company: "Regions Financial", industry: "Finance" },
  { keyword: "M&T BANK", company: "M&T Bank", industry: "Finance" },
  { keyword: "HUNTINGTON BANCSHARES", company: "Huntington Bancshares", industry: "Finance" },
  { keyword: "STATE STREET", company: "State Street", industry: "Finance" },
  { keyword: "BNY", company: "BNY (Bank of New York Mellon)", industry: "Finance" },
  { keyword: "CHARLES SCHWAB", company: "Charles Schwab", industry: "Finance" },
  { keyword: "SCHWAB", company: "Charles Schwab", industry: "Finance" },
  { keyword: "FIDELITY INVESTMENTS", company: "Fidelity Investments", industry: "Finance" },
  { keyword: "FMR LLC", company: "Fidelity Investments", industry: "Finance" },
  { keyword: "VANGUARD GROUP", company: "Vanguard", industry: "Finance" },
  { keyword: "AMERIPRISE", company: "Ameriprise Financial", industry: "Finance" },
  { keyword: "RAYMOND JAMES", company: "Raymond James", industry: "Finance" },
  { keyword: "EDWARD JONES", company: "Edward Jones", industry: "Finance" },
  { keyword: "STIFEL", company: "Stifel Financial", industry: "Finance" },
  { keyword: "INVESTMENT COMPANY INSTITUTE", company: "Investment Company Institute", industry: "Finance" },
  { keyword: "SECURITIES INDUSTRY", company: "SIFMA", industry: "Finance" },
  { keyword: "INTERCONTINENTAL EXCHANGE", company: "Intercontinental Exchange (NYSE)", industry: "Finance" },
  { keyword: "NASDAQ", company: "Nasdaq", industry: "Finance" },
  { keyword: "CME GROUP", company: "CME Group", industry: "Finance" },
  { keyword: "CBOE", company: "Cboe Global Markets", industry: "Finance" },
  { keyword: "COINBASE", company: "Coinbase (crypto)", industry: "Finance" },
  { keyword: "RIPPLE LABS", company: "Ripple (crypto)", industry: "Finance" },
  { keyword: "H&R BLOCK", company: "H&R Block", industry: "Finance" },
  { keyword: "DELOITTE", company: "Deloitte", industry: "Finance" },
  { keyword: "ERNST & YOUNG", company: "EY (Ernst & Young)", industry: "Finance" },
  { keyword: "KPMG", company: "KPMG", industry: "Finance" },
  { keyword: "PRICEWATERHOUSE", company: "PwC", industry: "Finance" },
  { keyword: "CERTIFIED PUBLIC ACCOUNTANTS", company: "CPAs (AICPA & state societies)", industry: "Finance" },
  { keyword: "NAVY FEDERAL", company: "Navy Federal Credit Union", industry: "Finance" },
  { keyword: "COMMUNITY BANKERS", company: "Independent Community Bankers", industry: "Finance" },
  { keyword: "CREDIT UNION", company: "Credit union assns", industry: "Finance" },
  { keyword: "BANKERS ASSOCIATION", company: "Bankers assns (state/national)", industry: "Finance" }, // "MORTGAGE BANKERS" handled above

  // ── Insurance (P&C, life, health insurers) ──
  { keyword: "UNITEDHEALTH", company: "UnitedHealth Group", industry: "Insurance" },
  { keyword: "CIGNA", company: "Cigna", industry: "Insurance" },
  { keyword: "AETNA", company: "Aetna (CVS Health)", industry: "Insurance" },
  { keyword: "BLUE CROSS", company: "Blue Cross Blue Shield", industry: "Insurance" },
  { keyword: "BLUE SHIELD", company: "Blue Cross Blue Shield", industry: "Insurance" },
  { keyword: "AFLAC", company: "Aflac", industry: "Insurance" },
  { keyword: "METLIFE", company: "MetLife", industry: "Insurance" },
  { keyword: "PRUDENTIAL", company: "Prudential", industry: "Insurance" },
  { keyword: "ELEVANCE", company: "Elevance Health", industry: "Insurance" },
  { keyword: "ANTHEM", company: "Elevance Health (Anthem)", industry: "Insurance" },
  { keyword: "HUMANA", company: "Humana", industry: "Insurance" },
  { keyword: "CENTENE", company: "Centene", industry: "Insurance" },
  { keyword: "MOLINA", company: "Molina Healthcare", industry: "Insurance" },
  { keyword: "HEALTH INSURANCE PLANS", company: "AHIP (health insurers)", industry: "Insurance" },
  { keyword: "STATE FARM", company: "State Farm", industry: "Insurance" },
  { keyword: "ALLSTATE", company: "Allstate", industry: "Insurance" },
  { keyword: "NATIONWIDE MUTUAL", company: "Nationwide", industry: "Insurance" },
  { keyword: "LIBERTY MUTUAL", company: "Liberty Mutual", industry: "Insurance" },
  { keyword: "TRAVELERS", company: "Travelers", industry: "Insurance" },
  { keyword: "AMERICAN INTERNATIONAL GROUP", company: "AIG", industry: "Insurance" },
  { keyword: "CHUBB", company: "Chubb", industry: "Insurance" },
  { keyword: "HARTFORD FINANCIAL", company: "The Hartford", industry: "Insurance" },
  { keyword: "USAA", company: "USAA", industry: "Insurance" },
  { keyword: "NEW YORK LIFE", company: "New York Life", industry: "Insurance" },
  { keyword: "NORTHWESTERN MUTUAL", company: "Northwestern Mutual", industry: "Insurance" },
  { keyword: "MASSACHUSETTS MUTUAL", company: "MassMutual", industry: "Insurance" },
  { keyword: "MASSMUTUAL", company: "MassMutual", industry: "Insurance" },
  { keyword: "GUARDIAN LIFE", company: "Guardian Life", industry: "Insurance" },
  { keyword: "PACIFIC LIFE", company: "Pacific Life", industry: "Insurance" },
  { keyword: "LINCOLN NATIONAL", company: "Lincoln Financial", industry: "Insurance" },
  { keyword: "PRINCIPAL FINANCIAL", company: "Principal Financial", industry: "Insurance" },
  { keyword: "UNUM", company: "Unum", industry: "Insurance" },
  { keyword: "INDEPENDENT INSURANCE AGENTS", company: "Independent Insurance Agents", industry: "Insurance" },
  { keyword: "INSURANCE AND FINANCIAL ADVISORS", company: "NAIFA", industry: "Insurance" },
  { keyword: "MUTUAL INSURANCE", company: "Mutual insurers (NAMIC)", industry: "Insurance" },
  { keyword: "INSURANCE", company: "Insurance industry PACs", industry: "Insurance" },

  // ── Real Estate (realtors, builders, REITs, property, mortgage) ──
  { keyword: "REALTOR", company: "Realtors (NAR & state assns)", industry: "Real Estate" },
  { keyword: "HOME BUILDERS", company: "Home builders (NAHB & state assns)", industry: "Real Estate" },
  { keyword: "APARTMENT", company: "Apartment & rental housing assns", industry: "Real Estate" },
  { keyword: "MULTIFAMILY", company: "National Multifamily Housing Council", industry: "Real Estate" },
  { keyword: "LAND TITLE", company: "American Land Title Assn", industry: "Real Estate" },
  { keyword: "REAL ESTATE INVESTMENT", company: "REITs (Nareit)", industry: "Real Estate" },
  { keyword: "REAL ESTATE", company: "Real estate PACs", industry: "Real Estate" },

  // ── Tech (software, internet, semiconductors, IT) ──
  { keyword: "MICROSOFT", company: "Microsoft", industry: "Tech" },
  { keyword: "ALPHABET", company: "Alphabet (Google)", industry: "Tech" },
  { keyword: "GOOGLE", company: "Alphabet (Google)", industry: "Tech" },
  { keyword: "AMAZON", company: "Amazon", industry: "Tech" },
  { keyword: "META PLATFORMS", company: "Meta", industry: "Tech" },
  { keyword: "APPLE INC", company: "Apple", industry: "Tech" },
  { keyword: "ORACLE", company: "Oracle", industry: "Tech" },
  { keyword: "INTEL ", company: "Intel", industry: "Tech" },
  { keyword: "CISCO", company: "Cisco", industry: "Tech" },
  { keyword: "IBM", company: "IBM", industry: "Tech" },
  { keyword: "DELL ", company: "Dell Technologies", industry: "Tech" },
  { keyword: "HEWLETT", company: "HP / HPE", industry: "Tech" },
  { keyword: "HP INC", company: "HP", industry: "Tech" },
  { keyword: "QUALCOMM", company: "Qualcomm", industry: "Tech" },
  { keyword: "BROADCOM", company: "Broadcom", industry: "Tech" },
  { keyword: "TEXAS INSTRUMENTS", company: "Texas Instruments", industry: "Tech" },
  { keyword: "MICRON", company: "Micron", industry: "Tech" },
  { keyword: "NVIDIA", company: "Nvidia", industry: "Tech" },
  { keyword: "ADVANCED MICRO DEVICES", company: "AMD", industry: "Tech" },
  { keyword: "APPLIED MATERIALS", company: "Applied Materials", industry: "Tech" },
  { keyword: "LAM RESEARCH", company: "Lam Research", industry: "Tech" },
  { keyword: "ANALOG DEVICES", company: "Analog Devices", industry: "Tech" },
  { keyword: "GLOBALFOUNDRIES", company: "GlobalFoundries", industry: "Tech" },
  { keyword: "TAIWAN SEMICONDUCTOR", company: "TSMC", industry: "Tech" },
  { keyword: "SEMICONDUCTOR", company: "Semiconductor industry PACs", industry: "Tech" },
  { keyword: "SALESFORCE", company: "Salesforce", industry: "Tech" },
  { keyword: "ADOBE", company: "Adobe", industry: "Tech" },
  { keyword: "SERVICENOW", company: "ServiceNow", industry: "Tech" },
  { keyword: "WORKDAY", company: "Workday", industry: "Tech" },
  { keyword: "INTUIT", company: "Intuit", industry: "Tech" },
  { keyword: "PALO ALTO NETWORKS", company: "Palo Alto Networks", industry: "Tech" },
  { keyword: "CROWDSTRIKE", company: "CrowdStrike", industry: "Tech" },
  { keyword: "MOTOROLA", company: "Motorola Solutions", industry: "Tech" },
  { keyword: "CORNING", company: "Corning", industry: "Tech" },
  { keyword: "ACCENTURE", company: "Accenture", industry: "Tech" },
  { keyword: "COGNIZANT", company: "Cognizant", industry: "Tech" },
  { keyword: "UBER TECHNOLOGIES", company: "Uber", industry: "Tech" }, // NOT bare "UBER" — surnames ("GRUBER")
  { keyword: "LYFT", company: "Lyft", industry: "Tech" },
  { keyword: "DOORDASH", company: "DoorDash", industry: "Tech" },
  { keyword: "AIRBNB", company: "Airbnb", industry: "Tech" },
  { keyword: "EBAY", company: "eBay", industry: "Tech" },
  { keyword: "EXPEDIA", company: "Expedia", industry: "Tech" },
  { keyword: "BOOKING HOLDINGS", company: "Booking Holdings", industry: "Tech" },
  { keyword: "TIKTOK", company: "TikTok (ByteDance)", industry: "Tech" },
  { keyword: "BYTEDANCE", company: "TikTok (ByteDance)", industry: "Tech" },
  { keyword: "INFORMATION TECHNOLOGY INDUSTRY", company: "ITI (tech trade assn)", industry: "Tech" },

  // ── Telecom ──
  { keyword: "AT&T", company: "AT&T", industry: "Telecom" },
  { keyword: "VERIZON", company: "Verizon", industry: "Telecom" },
  { keyword: "COMCAST", company: "Comcast", industry: "Telecom" },
  { keyword: "T-MOBILE", company: "T-Mobile", industry: "Telecom" },
  { keyword: "CHARTER COMMUNICATIONS", company: "Charter Communications", industry: "Telecom" },
  { keyword: "COX ENTERPRISES", company: "Cox Enterprises", industry: "Telecom" },
  { keyword: "COX COMMUNICATIONS", company: "Cox Communications", industry: "Telecom" },
  { keyword: "LUMEN", company: "Lumen Technologies", industry: "Telecom" },
  { keyword: "ECHOSTAR", company: "EchoStar (DISH)", industry: "Telecom" },
  { keyword: "DISH NETWORK", company: "DISH Network", industry: "Telecom" },
  { keyword: "NCTA", company: "NCTA (cable trade assn)", industry: "Telecom" },
  { keyword: "CTIA", company: "CTIA (wireless trade assn)", industry: "Telecom" },
  { keyword: "USTELECOM", company: "USTelecom", industry: "Telecom" },
  { keyword: "CROWN CASTLE", company: "Crown Castle", industry: "Telecom" },
  { keyword: "AMERICAN TOWER", company: "American Tower", industry: "Telecom" },
  { keyword: "ERICSSON", company: "Ericsson", industry: "Telecom" },
  { keyword: "NOKIA", company: "Nokia", industry: "Telecom" },

  // ── Media & entertainment ──
  { keyword: "WALT DISNEY", company: "Disney", industry: "Media" },
  { keyword: "DISNEY", company: "Disney", industry: "Media" },
  { keyword: "WARNER BROS", company: "Warner Bros. Discovery", industry: "Media" },
  { keyword: "PARAMOUNT", company: "Paramount", industry: "Media" },
  { keyword: "FOX CORP", company: "Fox Corporation", industry: "Media" },
  { keyword: "SONY", company: "Sony", industry: "Media" },
  { keyword: "NETFLIX", company: "Netflix", industry: "Media" },
  { keyword: "FLIXPAC", company: "Netflix", industry: "Media" },
  { keyword: "LIVE NATION", company: "Live Nation", industry: "Media" },
  { keyword: "RECORDING INDUSTRY", company: "RIAA", industry: "Media" },
  { keyword: "MOTION PICTURE", company: "Motion Picture Assn", industry: "Media" },
  { keyword: "BROADCASTERS", company: "Broadcasters (NAB & state assns)", industry: "Media" },
  { keyword: "NEXSTAR", company: "Nexstar Media", industry: "Media" },
  { keyword: "SINCLAIR BROADCAST", company: "Sinclair Broadcast Group", industry: "Media" }, // NOT bare "SINCLAIR" — HF Sinclair is oil
  { keyword: "IHEART", company: "iHeartMedia", industry: "Media" },
  { keyword: "GRAY TELEVISION", company: "Gray Television", industry: "Media" },
  { keyword: "NEWS CORP", company: "News Corp", industry: "Media" },

  // ── Agriculture & food (farming, food/beverage processing, tobacco) ──
  { keyword: "CARGILL", company: "Cargill", industry: "Agriculture" },
  { keyword: "ARCHER DANIELS", company: "Archer Daniels Midland", industry: "Agriculture" },
  { keyword: "TYSON", company: "Tyson Foods", industry: "Agriculture" },
  { keyword: "FARM BUREAU", company: "Farm Bureau (national & state)", industry: "Agriculture" },
  { keyword: "DEERE", company: "John Deere", industry: "Agriculture" },
  { keyword: "SYNGENTA", company: "Syngenta", industry: "Agriculture" },
  { keyword: "NUTRIEN", company: "Nutrien", industry: "Agriculture" },
  { keyword: "CF INDUSTRIES", company: "CF Industries (fertilizer)", industry: "Agriculture" },
  { keyword: "LAND O'LAKES", company: "Land O'Lakes", industry: "Agriculture" },
  { keyword: "LAND O LAKES", company: "Land O'Lakes", industry: "Agriculture" },
  { keyword: "DAIRY FARMERS", company: "Dairy Farmers of America", industry: "Agriculture" },
  { keyword: "MILK PRODUCERS", company: "Milk producer co-ops", industry: "Agriculture" },
  { keyword: "CRYSTAL SUGAR", company: "American Crystal Sugar", industry: "Agriculture" },
  { keyword: "SUGAR CANE", company: "Sugar cane growers", industry: "Agriculture" },
  { keyword: "SUGARBEET", company: "Sugarbeet growers", industry: "Agriculture" },
  { keyword: "SUGAR BEET", company: "Sugarbeet growers", industry: "Agriculture" },
  { keyword: "CORN GROWERS", company: "Corn growers assns", industry: "Agriculture" },
  { keyword: "COTTON COUNCIL", company: "National Cotton Council", industry: "Agriculture" },
  { keyword: "SOYBEAN", company: "Soybean growers assns", industry: "Agriculture" },
  { keyword: "PORK PRODUCERS", company: "National Pork Producers", industry: "Agriculture" },
  { keyword: "CATTLEMEN", company: "Cattlemen's assns", industry: "Agriculture" },
  { keyword: "POULTRY", company: "Poultry industry PACs", industry: "Agriculture" },
  { keyword: "CHICKEN COUNCIL", company: "National Chicken Council", industry: "Agriculture" },
  { keyword: "UNITED EGG", company: "United Egg Producers", industry: "Agriculture" },
  { keyword: "USA RICE", company: "USA Rice Federation", industry: "Agriculture" },
  { keyword: "PEANUT", company: "Peanut growers", industry: "Agriculture" },
  { keyword: "WHEAT GROWERS", company: "Wheat growers assns", industry: "Agriculture" },
  { keyword: "CHS INC", company: "CHS Inc", industry: "Agriculture" },
  { keyword: "BUNGE", company: "Bunge", industry: "Agriculture" },
  { keyword: "SMITHFIELD", company: "Smithfield Foods", industry: "Agriculture" },
  { keyword: "HORMEL", company: "Hormel Foods", industry: "Agriculture" },
  { keyword: "PEPSICO", company: "PepsiCo", industry: "Agriculture" },
  { keyword: "COCA-COLA", company: "Coca-Cola", industry: "Agriculture" },
  { keyword: "GENERAL MILLS", company: "General Mills", industry: "Agriculture" },
  { keyword: "KELLOGG", company: "Kellanova (Kellogg)", industry: "Agriculture" },
  { keyword: "KELLANOVA", company: "Kellanova (Kellogg)", industry: "Agriculture" },
  { keyword: "KRAFT HEINZ", company: "Kraft Heinz", industry: "Agriculture" },
  { keyword: "ANHEUSER", company: "Anheuser-Busch (alcohol)", industry: "Agriculture" },
  { keyword: "MOLSON COORS", company: "Molson Coors (alcohol)", industry: "Agriculture" },
  { keyword: "CONSTELLATION BRANDS", company: "Constellation Brands (alcohol)", industry: "Agriculture" },
  { keyword: "BROWN-FORMAN", company: "Brown-Forman (alcohol)", industry: "Agriculture" },
  { keyword: "DIAGEO", company: "Diageo (alcohol)", industry: "Agriculture" },
  { keyword: "BEER WHOLESALERS", company: "Beer wholesalers (NBWA)", industry: "Agriculture" },
  { keyword: "BEER INSTITUTE", company: "Beer Institute", industry: "Agriculture" },
  { keyword: "WINE & SPIRITS", company: "Wine & spirits wholesalers", industry: "Agriculture" },
  { keyword: "DISTILLED SPIRITS", company: "Distilled Spirits Council", industry: "Agriculture" },
  { keyword: "ALTRIA", company: "Altria (tobacco)", industry: "Agriculture" },
  { keyword: "PHILIP MORRIS", company: "Philip Morris (tobacco)", industry: "Agriculture" },
  { keyword: "REYNOLDS AMERICAN", company: "Reynolds American (tobacco)", industry: "Agriculture" },

  // ── Labor (unions — corporate-scale PAC money, distinct policy agenda) ──
  { keyword: "IBEW", company: "Electrical Workers (IBEW)", industry: "Labor" },
  { keyword: "ELECTRICAL WORKERS", company: "Electrical Workers (IBEW)", industry: "Labor" },
  { keyword: "CARPENTERS", company: "Carpenters union", industry: "Labor" },
  { keyword: "LIUNA", company: "Laborers (LIUNA)", industry: "Labor" },
  { keyword: "LABORERS", company: "Laborers (LIUNA)", industry: "Labor" },
  { keyword: "OPERATING ENGINEERS", company: "Operating Engineers (IUOE)", industry: "Labor" },
  { keyword: "SHEET METAL", company: "Sheet Metal Workers (SMART)", industry: "Labor" },
  { keyword: "PLUMBERS", company: "Plumbers & Pipefitters (UA)", industry: "Labor" },
  { keyword: "PIPEFITTERS", company: "Plumbers & Pipefitters (UA)", industry: "Labor" },
  { keyword: "PIPE FITTERS", company: "Plumbers & Pipefitters (UA)", industry: "Labor" },
  { keyword: "JOURNEYMEN", company: "Plumbers & Pipefitters (UA)", industry: "Labor" },
  { keyword: "IRONWORKERS", company: "Ironworkers union", industry: "Labor" },
  { keyword: "IRON WORKERS", company: "Ironworkers union", industry: "Labor" },
  { keyword: "STEELWORKERS", company: "United Steelworkers", industry: "Labor" },
  { keyword: "MINE WORKERS", company: "United Mine Workers", industry: "Labor" },
  { keyword: "BOILERMAKERS", company: "Boilermakers union", industry: "Labor" },
  { keyword: "PAINTERS", company: "Painters & Allied Trades (IUPAT)", industry: "Labor" },
  { keyword: "BRICKLAYERS", company: "Bricklayers union", industry: "Labor" },
  { keyword: "ROOFERS", company: "Roofers union", industry: "Labor" },
  { keyword: "ELEVATOR CONSTRUCTORS", company: "Elevator Constructors union", industry: "Labor" },
  { keyword: "MACHINISTS", company: "Machinists (IAM)", industry: "Labor" },
  { keyword: "UNITED AUTO WORKERS", company: "United Auto Workers (UAW)", industry: "Labor" },
  { keyword: "UAW", company: "United Auto Workers (UAW)", industry: "Labor" },
  { keyword: "TEAMSTERS", company: "Teamsters", industry: "Labor" },
  { keyword: "DRIVE COMMITTEE", company: "Teamsters (DRIVE)", industry: "Labor" },
  { keyword: "AFSCME", company: "AFSCME (public employees)", industry: "Labor" },
  { keyword: "MUNICIPAL EMPLOYEES", company: "AFSCME (public employees)", industry: "Labor" },
  { keyword: "SEIU", company: "Service Employees (SEIU)", industry: "Labor" },
  { keyword: "SERVICE EMPLOYEES", company: "Service Employees (SEIU)", industry: "Labor" },
  { keyword: "FOOD & COMMERCIAL WORKERS", company: "Food & Commercial Workers (UFCW)", industry: "Labor" },
  { keyword: "UFCW", company: "Food & Commercial Workers (UFCW)", industry: "Labor" },
  { keyword: "COMMUNICATIONS WORKERS", company: "Communications Workers (CWA)", industry: "Labor" },
  { keyword: "NEA FUND", company: "National Education Assn", industry: "Labor" },
  { keyword: "NATIONAL EDUCATION ASSOCIATION", company: "National Education Assn", industry: "Labor" },
  { keyword: "FEDERATION OF TEACHERS", company: "American Federation of Teachers", industry: "Labor" },
  { keyword: "LETTER CARRIERS", company: "Letter Carriers (NALC)", industry: "Labor" },
  { keyword: "POSTAL WORKERS", company: "Postal Workers (APWU)", industry: "Labor" },
  { keyword: "RURAL LETTER", company: "Rural Letter Carriers", industry: "Labor" },
  { keyword: "AIR LINE PILOTS", company: "Air Line Pilots Assn (ALPA)", industry: "Labor" },
  { keyword: "FLIGHT ATTENDANTS", company: "Flight Attendants (AFA)", industry: "Labor" },
  { keyword: "FIRE FIGHTERS", company: "Fire Fighters (IAFF)", industry: "Labor" },
  { keyword: "FIREFIGHTERS", company: "Fire Fighters (IAFF)", industry: "Labor" },
  { keyword: "FRATERNAL ORDER OF POLICE", company: "Fraternal Order of Police", industry: "Labor" },
  { keyword: "TRANSPORT WORKERS", company: "Transport Workers Union", industry: "Labor" },
  { keyword: "TRANSPORTATION UNION", company: "SMART Transportation Division", industry: "Labor" },
  { keyword: "LOCOMOTIVE ENGINEERS", company: "Locomotive Engineers (BLET)", industry: "Labor" },
  { keyword: "MAINTENANCE OF WAY", company: "Maintenance of Way (BMWED)", industry: "Labor" },
  { keyword: "SIGNALMEN", company: "Railroad Signalmen (BRS)", industry: "Labor" }, // NOT bare "RAILWAY" — BNSF Railway et al.
  { keyword: "SEAFARERS", company: "Seafarers union", industry: "Labor" },
  { keyword: "LONGSHOREMEN", company: "Longshoremen (ILA)", industry: "Labor" },
  { keyword: "MARINE ENGINEERS", company: "Marine Engineers (MEBA)", industry: "Labor" },
  { keyword: "NATIONAL NURSES", company: "National Nurses United", industry: "Labor" },
  { keyword: "AFL-CIO", company: "AFL-CIO", industry: "Labor" },
  { keyword: "UNITE HERE", company: "UNITE HERE (hospitality workers)", industry: "Labor" },

  // ── Transport (airlines, rail, trucking, shipping, auto) ──
  { keyword: "AMERICAN AIRLINES", company: "American Airlines", industry: "Transport" },
  { keyword: "DELTA AIR", company: "Delta Air Lines", industry: "Transport" },
  { keyword: "UNITED AIRLINES", company: "United Airlines", industry: "Transport" },
  { keyword: "SOUTHWEST AIRLINES", company: "Southwest Airlines", industry: "Transport" },
  { keyword: "ALASKA AIR", company: "Alaska Airlines", industry: "Transport" },
  { keyword: "JETBLUE", company: "JetBlue", industry: "Transport" },
  { keyword: "AIRLINES FOR AMERICA", company: "Airlines for America", industry: "Transport" },
  { keyword: "FEDEX", company: "FedEx", industry: "Transport" },
  { keyword: "UNITED PARCEL", company: "UPS", industry: "Transport" },
  { keyword: "UNION PACIFIC", company: "Union Pacific", industry: "Transport" },
  { keyword: "BNSF", company: "BNSF Railway", industry: "Transport" },
  { keyword: "NORFOLK SOUTHERN", company: "Norfolk Southern", industry: "Transport" },
  { keyword: "CSX", company: "CSX", industry: "Transport" },
  { keyword: "CPKC", company: "CPKC (Canadian Pacific Kansas City)", industry: "Transport" },
  { keyword: "CANADIAN PACIFIC", company: "CPKC (Canadian Pacific Kansas City)", industry: "Transport" },
  { keyword: "AMERICAN RAILROADS", company: "Assn of American Railroads", industry: "Transport" },
  { keyword: "SHORT LINE", company: "Short line railroads (ASLRRA)", industry: "Transport" },
  { keyword: "RAILROAD", company: "Railroad industry PACs", industry: "Transport" },
  { keyword: "AMERICAN TRUCKING", company: "American Trucking Assns", industry: "Transport" },
  { keyword: "GENERAL MOTORS", company: "General Motors", industry: "Transport" },
  { keyword: "FORD MOTOR", company: "Ford", industry: "Transport" },
  { keyword: "TOYOTA", company: "Toyota", industry: "Transport" },
  { keyword: "HONDA", company: "Honda", industry: "Transport" },
  { keyword: "STELLANTIS", company: "Stellantis", industry: "Transport" },
  { keyword: "HYUNDAI", company: "Hyundai", industry: "Transport" },
  { keyword: "VOLKSWAGEN", company: "Volkswagen", industry: "Transport" },
  { keyword: "TESLA", company: "Tesla", industry: "Transport" },
  { keyword: "AUTOMOBILE DEALERS", company: "Auto dealers (NADA & state assns)", industry: "Transport" },
  { keyword: "AUTO DEALERS", company: "Auto dealers (NADA & state assns)", industry: "Transport" },
  { keyword: "CRUISE", company: "Cruise lines", industry: "Transport" },
  { keyword: "CARNIVAL CORP", company: "Carnival", industry: "Transport" },
  { keyword: "ROYAL CARIBBEAN", company: "Royal Caribbean", industry: "Transport" },
  { keyword: "NORWEGIAN", company: "Norwegian Cruise Line", industry: "Transport" },

  // ── Construction (contractors, engineering, materials) ──
  { keyword: "GENERAL CONTRACTORS", company: "Associated General Contractors", industry: "Construction" },
  { keyword: "BUILDERS AND CONTRACTORS", company: "Associated Builders & Contractors", industry: "Construction" },
  { keyword: "ELECTRICAL CONTRACTORS", company: "Electrical contractors (NECA)", industry: "Construction" },
  { keyword: "AIR CONDITIONING CONTRACTORS", company: "HVAC contractors (SMACNA)", industry: "Construction" },
  { keyword: "CATERPILLAR", company: "Caterpillar", industry: "Construction" },
  { keyword: "VULCAN MATERIALS", company: "Vulcan Materials", industry: "Construction" },
  { keyword: "MARTIN MARIETTA", company: "Martin Marietta Materials", industry: "Construction" },
  { keyword: "QUANTA SERVICES", company: "Quanta Services", industry: "Construction" },
  { keyword: "FLUOR", company: "Fluor", industry: "Construction" },
  { keyword: "BECHTEL", company: "Bechtel", industry: "Construction" },
  { keyword: "KIEWIT", company: "Kiewit", industry: "Construction" },
  { keyword: "EMCOR", company: "EMCOR", industry: "Construction" },
  { keyword: "AECOM", company: "AECOM", industry: "Construction" },
  { keyword: "CONCRETE", company: "Concrete & aggregates PACs", industry: "Construction" },
  { keyword: "ROOFING", company: "Roofing contractors", industry: "Construction" },
  { keyword: "ENGINEERING COMPANIES", company: "Engineering firms (ACEC)", industry: "Construction" },

  // ── Manufacturing (industrials, chemicals, consumer goods) ──
  { keyword: "GENERAL ELECTRIC", company: "General Electric", industry: "Manufacturing" },
  { keyword: "3M ", company: "3M", industry: "Manufacturing" },
  { keyword: "DOW INC", company: "Dow", industry: "Manufacturing" },
  { keyword: "DOW CHEMICAL", company: "Dow", industry: "Manufacturing" },
  { keyword: "DUPONT", company: "DuPont", industry: "Manufacturing" },
  { keyword: "LYONDELL", company: "LyondellBasell", industry: "Manufacturing" },
  { keyword: "AIR PRODUCTS", company: "Air Products", industry: "Manufacturing" },
  { keyword: "SHERWIN", company: "Sherwin-Williams", industry: "Manufacturing" },
  { keyword: "PPG INDUSTRIES", company: "PPG Industries", industry: "Manufacturing" },
  { keyword: "AMERICAN CHEMISTRY", company: "American Chemistry Council", industry: "Manufacturing" },
  { keyword: "WHIRLPOOL", company: "Whirlpool", industry: "Manufacturing" },
  { keyword: "EMERSON ELECTRIC", company: "Emerson Electric", industry: "Manufacturing" },
  { keyword: "EATON CORP", company: "Eaton", industry: "Manufacturing" },
  { keyword: "PARKER HANNIFIN", company: "Parker Hannifin", industry: "Manufacturing" },
  { keyword: "ILLINOIS TOOL WORKS", company: "Illinois Tool Works", industry: "Manufacturing" },
  { keyword: "JOHNSON CONTROLS", company: "Johnson Controls", industry: "Manufacturing" },
  { keyword: "CARRIER", company: "Carrier", industry: "Manufacturing" },
  { keyword: "CUMMINS", company: "Cummins", industry: "Manufacturing" },
  { keyword: "PACCAR", company: "PACCAR", industry: "Manufacturing" },
  { keyword: "NUCOR", company: "Nucor", industry: "Manufacturing" },
  { keyword: "STEEL DYNAMICS", company: "Steel Dynamics", industry: "Manufacturing" },
  { keyword: "CLEVELAND-CLIFFS", company: "Cleveland-Cliffs", industry: "Manufacturing" },
  { keyword: "UNITED STATES STEEL", company: "U.S. Steel", industry: "Manufacturing" },
  { keyword: "ALCOA", company: "Alcoa", industry: "Manufacturing" },
  { keyword: "GOODYEAR", company: "Goodyear", industry: "Manufacturing" },
  { keyword: "BLACK & DECKER", company: "Stanley Black & Decker", industry: "Manufacturing" },
  { keyword: "PROCTER & GAMBLE", company: "Procter & Gamble", industry: "Manufacturing" },
  { keyword: "KIMBERLY-CLARK", company: "Kimberly-Clark", industry: "Manufacturing" },
  { keyword: "ASSOCIATION OF MANUFACTURERS", company: "National Assn of Manufacturers", industry: "Manufacturing" },

  // ── Retail, restaurants & hospitality ──
  { keyword: "WALMART", company: "Walmart", industry: "Retail" },
  { keyword: "WAL-MART", company: "Walmart", industry: "Retail" },
  { keyword: "HOME DEPOT", company: "Home Depot", industry: "Retail" },
  { keyword: "LOWE'S", company: "Lowe's", industry: "Retail" },
  { keyword: "LOWES", company: "Lowe's", industry: "Retail" },
  { keyword: "TARGET CORP", company: "Target", industry: "Retail" },
  { keyword: "BEST BUY", company: "Best Buy", industry: "Retail" },
  { keyword: "COSTCO", company: "Costco", industry: "Retail" },
  { keyword: "KROGER", company: "Kroger", industry: "Retail" },
  { keyword: "PUBLIX", company: "Publix", industry: "Retail" },
  { keyword: "ALBERTSONS", company: "Albertsons", industry: "Retail" },
  { keyword: "DOLLAR GENERAL", company: "Dollar General", industry: "Retail" },
  { keyword: "AUTOZONE", company: "AutoZone", industry: "Retail" },
  { keyword: "RETAIL FEDERATION", company: "National Retail Federation", industry: "Retail" },
  { keyword: "CONVENIENCE STORES", company: "Convenience stores (NACS)", industry: "Retail" },
  { keyword: "GROCERS", company: "Grocers assns", industry: "Retail" },
  { keyword: "NATIONAL RESTAURANT", company: "National Restaurant Assn", industry: "Retail" },
  { keyword: "RESTAURANT ASSOCIATION", company: "Restaurant assns (state/national)", industry: "Retail" },
  { keyword: "MCDONALD'S", company: "McDonald's", industry: "Retail" },
  { keyword: "MCDONALDS", company: "McDonald's", industry: "Retail" },
  { keyword: "YUM! BRANDS", company: "Yum! Brands", industry: "Retail" },
  { keyword: "YUM BRANDS", company: "Yum! Brands", industry: "Retail" },
  { keyword: "DARDEN", company: "Darden Restaurants", industry: "Retail" },
  { keyword: "STARBUCKS", company: "Starbucks", industry: "Retail" },
  { keyword: "MARRIOTT", company: "Marriott", industry: "Retail" },
  { keyword: "HILTON", company: "Hilton", industry: "Retail" },
  { keyword: "HOTEL & LODGING", company: "Hotel & lodging assns", industry: "Retail" },
  { keyword: "AMERICAN GAMING", company: "American Gaming Assn", industry: "Retail" },
  { keyword: "LAS VEGAS SANDS", company: "Las Vegas Sands", industry: "Retail" },
  { keyword: "MGM RESORTS", company: "MGM Resorts", industry: "Retail" },
  { keyword: "CAESARS", company: "Caesars Entertainment", industry: "Retail" },
  { keyword: "DRAFTKINGS", company: "DraftKings", industry: "Retail" },
  { keyword: "FANDUEL", company: "FanDuel", industry: "Retail" },

  // ── Law & lobbying ──
  { keyword: "ASSOCIATION FOR JUSTICE", company: "American Assn for Justice (trial lawyers)", industry: "Law" },
  { keyword: "TRIAL LAWYERS", company: "Trial lawyers assns", industry: "Law" },
  { keyword: "AKIN GUMP", company: "Akin Gump", industry: "Law" },
  { keyword: "HOLLAND & KNIGHT", company: "Holland & Knight", industry: "Law" },
  { keyword: "K&L GATES", company: "K&L Gates", industry: "Law" },
  { keyword: "SQUIRE PATTON", company: "Squire Patton Boggs", industry: "Law" },
  { keyword: "BROWNSTEIN", company: "Brownstein Hyatt", industry: "Law" },
  { keyword: "GREENBERG TRAURIG", company: "Greenberg Traurig", industry: "Law" },
  { keyword: "COVINGTON", company: "Covington & Burling", industry: "Law" },
  { keyword: "DLA PIPER", company: "DLA Piper", industry: "Law" },
  { keyword: "VENABLE", company: "Venable", industry: "Law" },
  { keyword: "STEPTOE", company: "Steptoe", industry: "Law" },
  { keyword: "ALSTON & BIRD", company: "Alston & Bird", industry: "Law" },
  { keyword: "SIDLEY", company: "Sidley Austin", industry: "Law" },
  { keyword: "KIRKLAND & ELLIS", company: "Kirkland & Ellis", industry: "Law" },

  // ═══ Generic catch-alls — keep LAST so specific rules above always win. ═══
  { keyword: "PHARMA", company: "Other pharmaceutical PACs", industry: "Pharma" }, // PHARMACEUTICAL / PHARMACY / PHARMACISTS / BIOPHARMA
  { keyword: "PHYSICIAN", company: "Physician PACs", industry: "Health" },
  { keyword: "BANKERS", company: "Bankers PACs (state/regional)", industry: "Finance" },
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
