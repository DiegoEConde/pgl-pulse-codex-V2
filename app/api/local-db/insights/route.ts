import { NextResponse } from "next/server";
import { emptyInsightsData, listInsightsData } from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListInsightsData() });
}

async function safeListInsightsData() {
  try {
    return await listInsightsData();
  } catch {
    return emptyInsightsData();
  }
}
