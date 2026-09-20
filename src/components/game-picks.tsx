"use client";

import { SectionHeading, TeamMark } from "@/components/ui";
import type { GameOutcome, GamePicks } from "@/lib/race/schedule-simulator";
import type { Game, UnscheduledGame } from "@/lib/types";

function PickRow({
  id,
  awayTeam,
  homeTeam,
  meta,
  picks,
  onSelect,
}: {
  id: string;
  awayTeam: string;
  homeTeam: string;
  meta: string;
  picks: GamePicks;
  onSelect: (id: string, outcome: GameOutcome) => void;
}) {
  const pick = picks[id];
  return (
    <div className="match-pick">
      <button
        type="button"
        className={pick === "away" ? "winner" : ""}
        aria-pressed={pick === "away"}
        onClick={() => onSelect(id, "away")}
      >
        <TeamMark team={awayTeam} small />
        <span>{awayTeam}</span>
      </button>
      <button
        type="button"
        className={`draw-pick${pick === "draw" ? " winner" : ""}`}
        aria-pressed={pick === "draw"}
        onClick={() => onSelect(id, "draw")}
        aria-label={`${awayTeam} 대 ${homeTeam} 무승부 선택`}
      >
        무
      </button>
      <button
        type="button"
        className={pick === "home" ? "winner" : ""}
        aria-pressed={pick === "home"}
        onClick={() => onSelect(id, "home")}
      >
        <span>{homeTeam}</span>
        <TeamMark team={homeTeam} small />
      </button>
      <small>{meta}</small>
    </div>
  );
}

export function GamePicksSection({
  games,
  unscheduled,
  picks,
  onSelect,
}: {
  games: Game[];
  unscheduled: UnscheduledGame[];
  picks: GamePicks;
  onSelect: (id: string, outcome: GameOutcome) => void;
}) {
  const byDate = new Map<string, Game[]>();
  for (const game of games) {
    byDate.set(game.date, [...(byDate.get(game.date) ?? []), game]);
  }
  const groups = [...byDate.entries()];

  return (
    <section className="data-section" id="picks">
      <SectionHeading
        kicker="GAME PICKS"
        title="잔여 경기 결과 선택"
        aside={`${games.length + unscheduled.length}경기`}
        description="승자를 고르면 양 팀의 승패와 시나리오 순위가 동시에 바뀝니다."
      />

      <div className="date-groups">
        {unscheduled.length > 0 && (
          <article className="date-group panel date-group--tbd">
            <header>
              <strong>편성 미정</strong>
              <span>{unscheduled.length}경기</span>
            </header>
            <p className="tbd-note">
              우천·폭염으로 취소된 뒤 아직 날짜가 잡히지 않은 경기입니다. 상대별 16경기
              편성에서 역산했으며, 순위 계산에는 그대로 포함됩니다.
            </p>
            <div className="match-list">
              {unscheduled.map((game) => (
                <PickRow
                  key={game.id}
                  id={game.id}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  meta="일정 미정"
                  picks={picks}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </article>
        )}

        {groups.length > 0 ? (
          groups.map(([date, dayGames]) => (
            <article className="date-group panel" key={date}>
              <header>
                <strong>{date.slice(5).replace("-", ".")}</strong>
                <span>{dayGames.length}경기</span>
              </header>
              <div className="match-list">
                {dayGames.map((game) => (
                  <PickRow
                    key={game.id}
                    id={game.id}
                    awayTeam={game.awayTeam}
                    homeTeam={game.homeTeam}
                    meta={`${game.time} · ${game.stadium}`}
                    picks={picks}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty-state">발표된 잔여 경기 일정이 없습니다.</div>
        )}
      </div>
    </section>
  );
}
