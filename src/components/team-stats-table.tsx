"use client";

import { SectionHeading, TeamMark, formatRate } from "@/components/ui";
import { recordRate, type TeamStats } from "@/lib/race/stats";
import type { TeamStanding } from "@/lib/types";

const RESULT_LABEL = { W: "승", L: "패", D: "무" } as const;

/** 1위가 가장 어려운 일정. 순위만 던지면 방향이 헷갈려 양 끝은 말로 쓴다. */
function sosLabel(rank: number, total: number) {
  if (rank === 1) return "리그에서 가장 어려움";
  if (rank === total) return "리그에서 가장 쉬움";
  return `어려운 순서 ${rank}위`;
}

function FormStrip({ recent }: { recent: TeamStats["recent"] }) {
  if (recent.length === 0) return <span className="magic-none">—</span>;
  return (
    <span className="form-strip">
      {recent.map((result, index) => (
        <i className={`form-chip form-chip--${result}`} key={index}>
          {RESULT_LABEL[result]}
        </i>
      ))}
    </span>
  );
}

export function TeamStatsTable({
  standings,
  stats,
}: {
  standings: TeamStanding[];
  stats: TeamStats[];
}) {
  const byTeam = new Map(stats.map((row) => [row.team, row]));
  // 잔여 일정이 어려운 순서. 1이 가장 어렵다.
  const sosRank = new Map(
    [...stats]
      .sort((a, b) => b.strengthOfSchedule - a.strengthOfSchedule)
      .map((row, index) => [row.team, index + 1]),
  );

  return (
    <section className="data-section" id="stats">
      <SectionHeading
        kicker="TEAM SPLITS"
        title="팀별 심화 기록"
        aside="완료 경기 기준"
        description="종료된 정규시즌 경기를 모두 집계한 값입니다. 잔여 난이도는 남은 상대들의 평균 승률이며, 높을수록 어려운 일정입니다."
      />
      <div className="panel">
        <div className="table-scroll">
          <table className="stats-table">
            <thead>
              <tr>
                <th scope="col">팀</th>
                <th scope="col">홈</th>
                <th scope="col">원정</th>
                <th scope="col">최근 10경기</th>
                <th scope="col">연속</th>
                <th scope="col">잔여 난이도</th>
                <th scope="col">잔여 홈/원정</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => {
                const row = byTeam.get(standing.team);
                if (!row) return null;
                const streak = row.streak;
                return (
                  <tr key={standing.team}>
                    <th scope="row">
                      <span className="team-cell-static">
                        <TeamMark team={standing.team} small />
                        <b>{standing.team}</b>
                      </span>
                    </th>
                    <td>
                      {row.home.wins}-{row.home.losses}-{row.home.draws}
                      <small>{formatRate(recordRate(row.home))}</small>
                    </td>
                    <td>
                      {row.away.wins}-{row.away.losses}-{row.away.draws}
                      <small>{formatRate(recordRate(row.away))}</small>
                    </td>
                    <td className="form-cell">
                      <b>
                        {row.last10.wins}승 {row.last10.losses}패
                        {row.last10.draws > 0 ? ` ${row.last10.draws}무` : ""}
                      </b>
                      <FormStrip recent={row.recent} />
                    </td>
                    <td>
                      {streak ? (
                        <span className={`streak streak--${streak.kind}`}>
                          {streak.length}
                          {RESULT_LABEL[streak.kind]}
                        </span>
                      ) : (
                        <span className="magic-none">—</span>
                      )}
                    </td>
                    <td>
                      {formatRate(row.strengthOfSchedule)}
                      <small>{sosLabel(sosRank.get(standing.team) ?? 0, stats.length)}</small>
                    </td>
                    <td>
                      {row.remainingHome} / {row.remainingAway}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
