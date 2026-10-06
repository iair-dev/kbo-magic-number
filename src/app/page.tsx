import { unstable_cache } from "next/cache";
import { RaceDashboard } from "@/components/race-dashboard";
import { getLatestDashboardFromDb } from "@/db/repository";
import { fetchLiveDashboard } from "@/lib/kbo/client";
import { buildModel } from "@/lib/race/model";
import { sampleData } from "@/lib/sample-data";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadData(): Promise<DashboardData> {
  try {
    return await fetchLiveDashboard();
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
 * 매직넘버 전수 탐색과 몬테카를로 2만회는 서버에서 끝낸다. 콜드 계산이 몇 초
 * 걸려 매 요청마다 돌릴 수 없으므로 결과를 캐시한다.
 *
 * 캐시는 여기 한 겹만 둔다. 예전에는 수집(getCachedLiveDashboard)에도 같은
 * TTL의 캐시가 있었는데, 바깥 캐시가 갱신될 때 안쪽의 stale 값을 집어넣어
 * 화면에 찍히는 시각이 한 주기씩 뒤처졌다.
 *
 * 이 캐시는 stale-while-revalidate다. 만료 뒤 첫 요청은 옛 값을 받고 갱신은
 * 뒤에서 돈다. 방문이 뜸하면 아무도 갱신을 깨우지 않아 며칠 묵은 값이 그대로
 * 나가므로, sync CronJob이 10분마다 페이지를 한 번 받아 캐시를 데운다.
 * k8s/sync-cronjob.yaml 참고.
 */
const getCachedModel = unstable_cache(
  async () => buildModel(await loadData()),
  ["kbo-dashboard-model-v2"],
  { revalidate: 300 },
);

export default async function Home() {
  return <RaceDashboard model={await getCachedModel()} />;
}
