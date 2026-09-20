/** 정규시즌 팀당 경기 수. 9개 상대 × 16경기. */
export const SEASON_GAMES = 144;
/** 상대별 시즌 시리즈 경기 수. */
export const SERIES_GAMES = 16;
/** 포스트시즌 진출 팀 수. */
export const PLAYOFF_SPOTS = 5;

export type TeamStanding = {
  rank: number;
  team: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gamesBehind: number | null;
  streak: string;
};

export type Game = {
  id: string;
  date: string;
  time: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  stadium: string;
  status: "scheduled" | "completed" | "cancelled";
};

/**
 * 우천·폭염 취소 후 아직 날짜가 잡히지 않은 경기. KBO는 상대별 16경기를
 * 균형 편성하므로 `16 - (완료 + 편성)`으로 대진을 역산할 수 있다.
 */
export type UnscheduledGame = {
  id: string;
  awayTeam: string;
  homeTeam: string;
};

export type DashboardData = {
  season: number;
  standings: TeamStanding[];
  /** 종료된 정규시즌 경기 전체. 상대전적·최근 폼·홈원정 분리의 원천. */
  completedGames: Game[];
  /** 날짜가 확정된 잔여 경기. */
  remainingGames: Game[];
  /** 날짜 미정 잔여 경기. */
  unscheduledGames: UnscheduledGame[];
  updatedAt: string;
  source: "KBO" | "database" | "sample";
};

/**
 * `ink`는 구단 색 위에 올릴 글자색이다. 흰색과 검정 중 대비가 큰 쪽을 미리
 * 계산해 고정했다. 한화의 주황(#f37321)만 흰 글자가 2.88:1로 미달이라 검정을 쓴다.
 */
export const TEAM_META: Record<
  string,
  { color: string; ink: string; short: string; full: string }
> = {
  KIA: { color: "#e61a32", ink: "#ffffff", short: "KIA", full: "KIA 타이거즈" },
  삼성: { color: "#0c64b0", ink: "#ffffff", short: "삼성", full: "삼성 라이온즈" },
  LG: { color: "#c30452", ink: "#ffffff", short: "LG", full: "LG 트윈스" },
  두산: { color: "#131230", ink: "#ffffff", short: "두산", full: "두산 베어스" },
  KT: { color: "#231f20", ink: "#ffffff", short: "KT", full: "KT 위즈" },
  SSG: { color: "#ce0e2d", ink: "#ffffff", short: "SSG", full: "SSG 랜더스" },
  롯데: { color: "#041e42", ink: "#ffffff", short: "롯데", full: "롯데 자이언츠" },
  한화: { color: "#f37321", ink: "#111111", short: "한화", full: "한화 이글스" },
  NC: { color: "#315288", ink: "#ffffff", short: "NC", full: "NC 다이노스" },
  키움: { color: "#570514", ink: "#ffffff", short: "키움", full: "키움 히어로즈" },
};
