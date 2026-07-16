import { NextResponse } from "next/server";
import { getSourceStatuses } from "@/lib/config";

// Machine-readable view of which data feeds are configured. Backs /status.
export async function GET() {
  const sources = getSourceStatuses();
  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      label: s.label,
      tier: s.tier,
      needsKey: s.needsKey,
      envKey: s.envKey,
      configured: s.configured,
    })),
    summary: {
      total: sources.length,
      configured: sources.filter((s) => s.configured).length,
      awaitingKey: [...new Set(sources.filter((s) => !s.configured).map((s) => s.envKey))],
    },
  });
}
