import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "@/lib/runtime-config";

export async function GET() {
  const readiness = getRuntimeReadiness();

  return NextResponse.json(
    {
      ok: readiness.productionReady,
      issues: readiness.issues,
      warnings: readiness.warnings,
      timestamp: new Date().toISOString(),
    },
    { status: readiness.productionReady ? 200 : 503 },
  );
}
