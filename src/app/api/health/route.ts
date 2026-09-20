import { getDb } from "@/db/client";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    databaseConfigured: Boolean(getDb()),
    timestamp: new Date().toISOString(),
  });
}
