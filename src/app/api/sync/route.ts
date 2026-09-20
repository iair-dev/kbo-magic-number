import { saveDashboard, recordSync } from "@/db/repository";
import { fetchLiveDashboard } from "@/lib/kbo/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchLiveDashboard();
    await saveDashboard(data);
    const summary = `${data.standings.length} teams, ${data.completedGames.length} completed, ${data.remainingGames.length} scheduled, ${data.unscheduledGames.length} unscheduled`;
    await recordSync("success", summary);
    return Response.json({
      ok: true,
      updatedAt: data.updatedAt,
      standings: data.standings.length,
      completedGames: data.completedGames.length,
      remainingGames: data.remainingGames.length,
      unscheduledGames: data.unscheduledGames.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await recordSync("failed", message).catch(() => undefined);
    return Response.json({ error: message }, { status: 500 });
  }
}
