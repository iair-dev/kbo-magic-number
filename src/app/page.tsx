import { unstable_cache } from "next/cache";
import { RaceDashboard } from "@/components/race-dashboard";
import { getLatestDashboardFromDb } from "@/db/repository";
import { getCachedLiveDashboard } from "@/lib/kbo/client";
import { buildModel } from "@/lib/race/model";
import { sampleData } from "@/lib/sample-data";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadData(): Promise<DashboardData> {
  try {
    return await getCachedLiveDashboard();
  } catch (error) {
    console.error("KBO live fetch failed", error);
  }

  try {
    const stored = await getLatestDashboardFromDb();
    if (stored) return stored;
  } catch (error) {
    console.error("Database fallback failed", error);
  }

  return sampleData;
}

/**
 * 매직넘버 전수 탐색과 몬테카를로 2만회는 서버에서 끝낸다. 원본 데이터가 5분
 * 캐시라 같은 입력으로 매 요청마다 다시 계산할 이유가 없어 결과까지 함께 캐시한다.
 */
const getCachedModel = unstable_cache(
  async () => buildModel(await loadData()),
  ["kbo-dashboard-model-v1"],
  { revalidate: 300 },
);

export default async function Home() {
  return <RaceDashboard model={await getCachedModel()} />;
}
