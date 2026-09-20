"use client";

import { useCallback, useMemo, useState } from "react";
import { ProbabilityBars } from "@/components/charts/probability-bars";
import { RankHeatmap } from "@/components/charts/rank-heatmap";
import { GamePicksSection } from "@/components/game-picks";
import { MagicNumberBoard } from "@/components/magic-number-board";
import { MatchupMatrix } from "@/components/matchup-matrix";
import { ProjectionTable } from "@/components/projection-table";
import { ScenarioBoard } from "@/components/scenario-board";
import { SummaryHero } from "@/components/summary-hero";
import { TeamStatsTable } from "@/components/team-stats-table";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionHeading, formatPercent } from "@/components/ui";
import { remainingByOpponent } from "@/lib/race/core";
import { headToHeadMap, type DashboardModel } from "@/lib/race/model";
import {
  makeDefaultPicks,
  projectStandings,
  toFixtures,
  type GameOutcome,
  type GamePicks,
} from "@/lib/race/schedule-simulator";
import { PLAYOFF_SPOTS, type DashboardData } from "@/lib/types";

function sourceLabel(source: DashboardData["source"]) {
  if (source === "KBO") return "KBO 실시간";
  if (source === "database") return "저장 데이터";
  return "샘플 데이터";
}

export function RaceDashboard({ model }: { model: DashboardModel }) {
  const fixtures = useMemo(
    () => toFixtures(model.remainingGames, model.unscheduledGames),
    [model.remainingGames, model.unscheduledGames],
  );
  const baseHeadToHead = useMemo(() => headToHeadMap(model.headToHead), [model.headToHead]);
  const defaultPicks = useMemo(
    () => makeDefaultPicks(fixtures, model.standings),
    [fixtures, model.standings],
  );
  const [picks, setPicks] = useState<GamePicks>(defaultPicks);

  const projections = useMemo(
    () => projectStandings(model.standings, fixtures, picks, baseHeadToHead),
    [model.standings, fixtures, picks, baseHeadToHead],
  );
  const projectionByTeam = useMemo(
    () => new Map(projections.map((row) => [row.team, row])),
    [projections],
  );
  const teams = useMemo(() => model.standings.map((row) => row.team), [model.standings]);

  const remainingByTeam = useMemo(
    () => new Map(projections.map((row) => [row.team, row.remainingGames])),
    [projections],
  );
  const opponentsByTeam = useMemo(
    () =>
      new Map(
        teams.map((team) => [
          team,
          remainingByOpponent(team, model.remainingGames, model.unscheduledGames),
        ]),
      ),
    [teams, model.remainingGames, model.unscheduledGames],
  );

  const fixturesByTeam = useMemo(() => {
    const map = new Map<string, typeof fixtures>();
    for (const team of teams) {
      map.set(
        team,
        fixtures.filter((fixture) => fixture.awayTeam === team || fixture.homeTeam === team),
      );
    }
    return map;
  }, [fixtures, teams]);

  const selectOutcome = useCallback((id: string, outcome: GameOutcome) => {
    setPicks((current) => ({ ...current, [id]: outcome }));
  }, []);

  const setTeamTargetWins = useCallback(
    (team: string, targetWins: number) => {
      setPicks((current) => {
        const teamFixtures = fixturesByTeam.get(team) ?? [];
        const next = { ...current };
        const isWin = (id: string, away: string) =>
          (away === team && next[id] === "away") || (away !== team && next[id] === "home");

        let wins = teamFixtures.filter((f) => isWin(f.id, f.awayTeam)).length;
        if (targetWins > wins) {
          for (const fixture of teamFixtures) {
            if (wins >= targetWins) break;
            if (isWin(fixture.id, fixture.awayTeam)) continue;
            next[fixture.id] = fixture.awayTeam === team ? "away" : "home";
            wins += 1;
          }
        } else if (targetWins < wins) {
          for (const fixture of [...teamFixtures].reverse()) {
            if (wins <= targetWins) break;
            if (!isWin(fixture.id, fixture.awayTeam)) continue;
            next[fixture.id] = fixture.awayTeam === team ? "home" : "away";
            wins -= 1;
          }
        }
        return next;
      });
    },
    [fixturesByTeam],
  );

  const adjustTeamWins = useCallback(
    (team: string, direction: -1 | 1) => {
      const current = projectionByTeam.get(team)?.projectedWins ?? 0;
      setTeamTargetWins(team, current + direction);
    },
    [projectionByTeam, setTeamTargetWins],
  );

  const applyAll = useCallback(
    (outcome: "away" | "home") => {
      setPicks(Object.fromEntries(fixtures.map((fixture) => [fixture.id, outcome])));
    },
    [fixtures],
  );

  const projectionsBySim = useMemo(
    () => new Map(model.simulation.projections.map((row) => [row.team, row])),
    [model.simulation.projections],
  );
  const leader = model.standings[0];
  const bubble = useMemo(
    () =>
      [...model.simulation.projections]
        .filter(
          (row) => row.playoffProbability > 0.001 && row.playoffProbability < 0.999,
        )
        .sort((a, b) => b.playoffProbability - a.playoffProbability)
        .slice(0, 5)
        .map((row) => ({ team: row.team, probability: row.playoffProbability })),
    [model.simulation.projections],
  );

  const updated = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(model.updatedAt));

  return (
    <>
      <a className="skip-link" href="#main">
        본문 바로가기
      </a>
      <header className="site-header">
        <a className="brand" href="#main" aria-label="KBO 매직넘버 홈">
          <span className="brand-ball" aria-hidden="true" />
          <span>KBO</span>
          <strong>매직넘버</strong>
        </a>
        <div className="header-meta">
          <span className={`source-badge source-badge--${model.source.toLowerCase()}`}>
            <span className="live-dot" aria-hidden="true" />
            {sourceLabel(model.source)}
          </span>
          <span className="header-time">{updated} 기준</span>
          <ThemeToggle />
        </div>
      </header>

      <main id="main">
        <div className="dashboard-heading">
          <p className="section-kicker">{model.season} KBO RACE SIMULATOR</p>
          <h1>가을야구 레이스, 숫자로 보기</h1>
          <p className="lede">
            정규시즌 {model.counts.completed}경기 결과와 잔여{" "}
            {model.counts.scheduled + model.counts.unscheduled}경기를 바탕으로 매직넘버, 진출
            확률, 최종 순위 시나리오를 계산합니다.
          </p>
        </div>

        {model.source === "sample" && (
          <div className="notice" role="status">
            공식 데이터 연결에 실패해 샘플 데이터를 표시하고 있습니다. 확률과 매직넘버는 참고만
            해주세요.
          </div>
        )}

        {leader && projectionsBySim.get(leader.team) && model.numbers[0] && (
          <SummaryHero
            leader={leader}
            leaderNumbers={model.numbers.find((row) => row.team === leader.team) ?? model.numbers[0]}
            leaderProjection={projectionsBySim.get(leader.team)!}
            runnerUp={model.standings[1]}
            bubble={bubble}
            counts={{
              scheduled: model.counts.scheduled,
              unscheduled: model.counts.unscheduled,
            }}
          />
        )}

        <section className="data-section" id="probability">
          <SectionHeading
            kicker="MONTE CARLO SIMULATION"
            title="진출 확률과 순위 분포"
            aside={`${model.simulation.simulations.toLocaleString("ko-KR")}회 시뮬레이션`}
            description={
              <>
                남은 경기를 {model.simulation.simulations.toLocaleString("ko-KR")}번 시뮬레이션한
                결과입니다. 팀 실력은 승률을 .500 쪽으로 보정해 추정하고, 홈 승률{" "}
                {formatPercent(model.simulation.model.homeWinRate, 1)}과 무승부 비율{" "}
                {formatPercent(model.simulation.model.drawRate, 1)}을 리그 실적에서 가져왔습니다.
              </>
            }
          />
          <div className="chart-grid">
            <article className="panel chart-panel">
              <h3>우승 · 가을야구 진출 확률</h3>
              <ProbabilityBars projections={model.simulation.projections} />
            </article>
            <article className="panel chart-panel">
              <h3>최종 순위 확률 분포</h3>
              <RankHeatmap projections={model.simulation.projections} />
            </article>
          </div>
        </section>

        <MagicNumberBoard numbers={model.numbers} />

        <TeamStatsTable standings={model.standings} stats={model.stats} />

        <ScenarioBoard
          standings={model.standings}
          projections={projectionByTeam}
          remainingByTeam={remainingByTeam}
          opponentsByTeam={opponentsByTeam}
          onSelectWins={setTeamTargetWins}
        />

        <div className="data-section">
          <ProjectionTable
            projections={projections}
            onAdjustWins={adjustTeamWins}
            onReset={() => setPicks(defaultPicks)}
            onApplyAll={applyAll}
          />
        </div>

        <GamePicksSection
          games={model.remainingGames}
          unscheduled={model.unscheduledGames}
          picks={picks}
          onSelect={selectOutcome}
        />

        <MatchupMatrix teams={teams} headToHead={model.headToHead} fixtures={fixtures} />
      </main>

      <footer>
        <div>
          <strong>KBO 매직넘버</strong>
          <p>KBO 및 구단의 공식 서비스가 아닙니다. 계산 결과는 참고용입니다.</p>
        </div>
        <p className="footer-note">
          상위 {PLAYOFF_SPOTS}팀이 포스트시즌에 진출하며, 4위와 5위는 와일드카드 결정전을 치릅니다.
        </p>
      </footer>
    </>
  );
}
