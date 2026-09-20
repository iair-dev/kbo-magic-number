import "server-only";

import { unstable_cache } from "next/cache";
import {
  SERIES_GAMES,
  type DashboardData,
  type Game,
  type TeamStanding,
  type UnscheduledGame,
} from "@/lib/types";

const KBO_BASE = "https://www.koreabaseball.com";
/** 정규시즌만. 시범경기·포스트시즌이 전적에 섞이지 않게 한다. */
const REGULAR_SEASON = "0";
const SEASON_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11];
/** 한 페어가 홈에서 치를 수 있는 최대 경기 수. KBO는 16경기를 7-9로 나눈다. */
const MAX_HOME_PER_PAIR = 9;

type KboCell = { Text: string; Class: string | null };
type KboRow = { row: KboCell[] };
type KboTable = { rows?: KboRow[] };

const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function number(value: string) {
  const parsed = Number(stripHtml(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

async function postKbo(path: string, body: URLSearchParams, referer: string) {
  const response = await fetch(`${KBO_BASE}${path}`, {
    method: "POST",
    headers: { ...headers, Referer: `${KBO_BASE}${referer}` },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`KBO request failed: ${response.status}`);
  }

  return (await response.json()) as KboTable;
}

export async function fetchStandings(season: number): Promise<TeamStanding[]> {
  const data = await postKbo(
    "/ws/Main.asmx/GetTeamRank",
    new URLSearchParams({ leId: "1", srId: "0", seasonId: String(season) }),
    "/",
  );

  const standings = (data.rows ?? []).flatMap(({ row }) => {
    if (row.length < 8) return [];
    const teamMatch = row[1].Text.match(/team-name[^>]*>([^<]+)</);
    const team = teamMatch?.[1]?.trim() ?? stripHtml(row[1].Text);
    const gamesBehindText = stripHtml(row[7].Text);
    return [
      {
        rank: number(row[0].Text),
        team,
        games: number(row[2].Text),
        wins: number(row[3].Text),
        losses: number(row[4].Text),
        draws: number(row[5].Text),
        winRate: Number(stripHtml(row[6].Text)),
        gamesBehind: gamesBehindText === "-" ? null : Number(gamesBehindText),
        streak: stripHtml(row[8]?.Text ?? "-"),
      },
    ];
  });

  if (standings.length !== 10) {
    throw new Error(`Unexpected KBO standings row count: ${standings.length}`);
  }
  return standings;
}

export async function fetchScheduleMonth(season: number, month: number): Promise<Game[]> {
  const data = await postKbo(
    "/ws/Schedule.asmx/GetScheduleList",
    new URLSearchParams({
      leId: "1",
      srIdList: REGULAR_SEASON,
      seasonId: String(season),
      gameMonth: String(month).padStart(2, "0"),
      teamId: "",
    }),
    "/Schedule/Schedule.aspx",
  );

  let currentDate = "";
  return (data.rows ?? []).flatMap(({ row }, index) => {
    const dayCell = row.find((cell) => cell.Class === "day");
    if (dayCell) {
      const match = stripHtml(dayCell.Text).match(/(\d{2})\.(\d{2})/);
      if (match) currentDate = `${season}-${match[1]}-${match[2]}`;
    }

    const timeCell = row.find((cell) => cell.Class === "time");
    const playCell = row.find((cell) => cell.Class === "play");
    if (!currentDate || !playCell) return [];

    const teams = playCell.Text.match(
      /^<span>([^<]+)<\/span><em>[\s\S]*<\/em><span>([^<]+)<\/span>$/,
    );
    if (!teams) return [];

    const scores = playCell.Text.match(
      /<em><span[^>]*>(\d+)<\/span><span>vs<\/span><span[^>]*>(\d+)<\/span><\/em>/,
    );
    const relayCell = row.find((cell) => cell.Class === "relay");
    const idMatch = relayCell?.Text.match(/gameId=([^&'"]+)/);
    const startIndex = dayCell ? 1 : 0;
    const stadium = stripHtml(row[startIndex + 6]?.Text ?? "");
    const note = stripHtml(row[startIndex + 7]?.Text ?? "-");
    const status = scores
      ? "completed"
      : note && note !== "-"
        ? "cancelled"
        : "scheduled";

    return [
      {
        id: idMatch?.[1] ?? `${currentDate}-${teams[1]}-${teams[2]}-${index}`,
        date: currentDate,
        time: stripHtml(timeCell?.Text ?? ""),
        awayTeam: teams[1].trim(),
        homeTeam: teams[2].trim(),
        awayScore: scores ? Number(scores[1]) : null,
        homeScore: scores ? Number(scores[2]) : null,
        stadium,
        status: status as Game["status"],
      },
    ];
  });
}

/**
 * 우천·폭염으로 취소된 뒤 아직 재편성되지 않은 경기를 복원한다.
 *
 * KBO는 두 팀이 시즌 16경기를 치르므로 페어별 `16 - (완료 + 편성)`이 곧
 * 미편성 경기 수다. 홈 배정은 그 페어의 취소 이력에서 가져오고, 한 팀이
 * 9경기를 넘게 홈으로 갖지 않도록 맞춘다.
 */
export function reconstructUnscheduled(games: Game[]): UnscheduledGame[] {
  const live = games.filter((game) => game.status !== "cancelled");
  const played = new Map<string, number>();
  const homeCount = new Map<string, number>();
  const cancelledByHome = new Map<string, number>();
  const teams = new Set<string>();

  for (const game of games) {
    teams.add(game.homeTeam);
    teams.add(game.awayTeam);
  }
  for (const game of live) {
    const key = pairKey(game.homeTeam, game.awayTeam);
    played.set(key, (played.get(key) ?? 0) + 1);
    const home = `${key}#${game.homeTeam}`;
    homeCount.set(home, (homeCount.get(home) ?? 0) + 1);
  }
  for (const game of games) {
    if (game.status !== "cancelled") continue;
    const home = `${pairKey(game.homeTeam, game.awayTeam)}#${game.homeTeam}`;
    cancelledByHome.set(home, (cancelledByHome.get(home) ?? 0) + 1);
  }

  const sorted = [...teams].sort();
  const result: UnscheduledGame[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const [a, b] = [sorted[i], sorted[j]];
      const key = pairKey(a, b);
      const missing = SERIES_GAMES - (played.get(key) ?? 0);
      if (missing <= 0) continue;

      const hosted = { [a]: homeCount.get(`${key}#${a}`) ?? 0, [b]: homeCount.get(`${key}#${b}`) ?? 0 };
      const cancelled = {
        [a]: cancelledByHome.get(`${key}#${a}`) ?? 0,
        [b]: cancelledByHome.get(`${key}#${b}`) ?? 0,
      };

      for (let n = 0; n < missing; n += 1) {
        // 취소가 더 많이 남은 쪽을 홈으로, 단 한 팀이 9홈을 넘지 않게.
        const canHostA = hosted[a] < MAX_HOME_PER_PAIR;
        const canHostB = hosted[b] < MAX_HOME_PER_PAIR;
        const preferA = cancelled[a] >= cancelled[b];
        const home = canHostA && (preferA || !canHostB) ? a : b;
        const awayTeam = home === a ? b : a;

        hosted[home] += 1;
        cancelled[home] = Math.max(0, cancelled[home] - 1);
        result.push({ id: `tbd-${key}-${n}`, awayTeam, homeTeam: home });
      }
    }
  }

  return result;
}

export function currentKboSeason() {
  const configured = Number(process.env.KBO_SEASON);
  if (Number.isInteger(configured) && configured > 2000) return configured;
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "Asia/Seoul",
    }).format(new Date()),
  );
}

export function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date());
}

export async function fetchLiveDashboard(): Promise<DashboardData> {
  const season = currentKboSeason();
  const today = todayInKorea();

  const [standings, schedules] = await Promise.all([
    fetchStandings(season),
    Promise.all(SEASON_MONTHS.map((month) => fetchScheduleMonth(season, month))),
  ]);

  const allGames = schedules.flat();
  const byStart = (a: Game, b: Game) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

  return {
    season,
    standings,
    completedGames: allGames.filter((game) => game.status === "completed").sort(byStart),
    remainingGames: allGames
      .filter((game) => game.status === "scheduled" && game.date >= today)
      .sort(byStart),
    unscheduledGames: reconstructUnscheduled(allGames),
    updatedAt: new Date().toISOString(),
    source: "KBO",
  };
}

export const getCachedLiveDashboard = unstable_cache(
  fetchLiveDashboard,
  ["kbo-live-dashboard-v2"],
  { revalidate: 300 },
);
