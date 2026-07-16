import { NextResponse } from "next/server";

// Census Geocoder API — no auth required. See lobbycambattleplan.md Task 28.
// NOTE: this session's network egress policy blocks geocoding.geo.census.gov,
// so this route is written against the documented API shape but could not be
// exercised end-to-end here; verify once deployed with normal internet access.
//
// Caveat carried over from the battle plan: the Census Geocoder resolves a
// *street address* to a congressional district reliably. A ZIP code alone
// can span multiple districts, so a ZIP-only lookup here is best-effort (it
// geocodes to the ZIP's centroid) — good enough for "your district is
// probably X", not authoritative. Task 28's real signup flow should collect
// a street address, not just a ZIP.

const CENSUS_BASE = "https://geocoding.geo.census.gov/geocoder/geographies/address";
const FETCH_TIMEOUT_MS = 6000;
const CONGRESSIONAL_DISTRICT_LAYER = "54"; // 119th Congressional Districts

interface CensusGeography {
  STATE?: string;
  CD119?: string;
  BASENAME?: string;
}

interface CensusResponse {
  result?: {
    addressMatches?: Array<{
      geographies?: Record<string, CensusGeography[]>;
    }>;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim();
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Provide a 5-digit 'zip' query param" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = new URL(CENSUS_BASE);
    url.searchParams.set("zip", zip);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("vintage", "Current_Current");
    url.searchParams.set("layers", CONGRESSIONAL_DISTRICT_LAYER);
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Census geocoder ${res.status}`);

    const data = (await res.json()) as CensusResponse;
    const match = data.result?.addressMatches?.[0];
    const districts = match?.geographies?.["119th Congressional Districts"];
    const district = districts?.[0];

    if (!district) {
      return NextResponse.json({
        source: "census",
        zip,
        resolved: false,
        state: null,
        district: null,
      });
    }

    return NextResponse.json({
      source: "census",
      zip,
      resolved: true,
      state: district.STATE ?? null,
      district: district.CD119 ?? null,
      label: district.BASENAME ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        source: "mock",
        error: err instanceof Error ? err.message : "Unknown error fetching Census geocoder data",
        zip,
        resolved: false,
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
