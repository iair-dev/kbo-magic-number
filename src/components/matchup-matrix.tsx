"use client";

import { useState } from "react";
import { SectionHeading, TeamMark } from "@/components/ui";
import type { HeadToHeadPayload } from "@/lib/race/model";
import type { Fixture } from "@/lib/race/schedule-simulator";

type Mode = "record" | "remaining";

export function MatchupMatrix({
  teams,
  headToHead,
  fixtures,
}: {
  teams: string[];
  headToHead: HeadToHeadPayload;
  fixtures: Fixture[];
}) {
  const [mode, setMode] = useState<Mode>("record");

  const remaining = new Map<string, number>();
  for (const fixture of fixtures) {
    for (const [a, b] of [
      [fixture.awayTeam, fixture.homeTeam],
      [fixture.homeTeam, fixture.awayTeam],
    ]) {
      remaining.set(`${a}:${b}`, (remaining.get(`${a}:${b}`) ?? 0) + 1);
    }
  }

  return (
    <section className="data-section" id="matchups">
      <SectionHeading
        kicker="MATCHUP MATRIX"
        title="상대별 전적과 잔여 대진"
        description="승률이 같을 때 순위를 가르는 첫 기준이 상대전적입니다."
        aside={
          <span className="segmented" role="group" aria-label="매트릭스 표시 기준">
            <button
              type="button"
              aria-pressed={mode === "record"}
              onClick={() => setMode("record")}
            >
              상대전적
            </button>
            <button
              type="button"
              aria-pressed={mode === "remaining"}
              onClick={() => setMode("remaining")}
            >
              잔여 대진
            </button>
          </span>
        }
      />

      <article className="panel matrix-panel">
        <div className="table-scroll">
          <table className="matrix-table">
            <caption className="visually-hidden">
              {mode === "record"
                ? "가로축 팀이 세로축 팀을 상대로 거둔 승-패-무 전적"
                : "가로축 팀과 세로축 팀의 남은 맞대결 경기 수"}
            </caption>
            <thead>
              <tr>
                <th scope="col">팀</th>
                {teams.map((team) => (
                  <th scope="col" key={team}>
                    {team}
                  </th>
                ))}
                <th scope="col">합계</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const total = teams.reduce(
                  (sum, opponent) =>
                    sum + (opponent === team ? 0 : (remaining.get(`${team}:${opponent}`) ?? 0)),
                  0,
                );
                const wins = teams.reduce(
                  (sum, opponent) => sum + (headToHead[`${team}:${opponent}`]?.[0] ?? 0),
                  0,
                );
                return (
                  <tr key={team}>
                    <th scope="row">
                      <span className="team-cell-static">
                        <TeamMark team={team} small />
                        <b>{team}</b>
                      </span>
                    </th>
                    {teams.map((opponent) => {
                      if (opponent === team) {
                        return (
                          <td className="matrix-self" key={opponent}>
                            —
                          </td>
                        );
                      }
                      if (mode === "remaining") {
                        const count = remaining.get(`${team}:${opponent}`) ?? 0;
                        return (
                          <td className={count ? "has-games" : ""} key={opponent}>
                            {count || ""}
                          </td>
                        );
                      }
                      const record = headToHead[`${team}:${opponent}`];
                      if (!record) {
                        return <td key={opponent}>—</td>;
                      }
                      const [w, l, d] = record;
                      const edge = w > l ? "edge-up" : w < l ? "edge-down" : "edge-even";
                      return (
                        <td className={edge} key={opponent}>
                          {w}-{l}
                          {d > 0 ? `-${d}` : ""}
                        </td>
                      );
                    })}
                    <td className="matrix-total">{mode === "remaining" ? total : wins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">
          {mode === "record"
            ? "가로 방향 팀이 거둔 성적입니다. 굵게 표시된 칸은 상대전적 우위를 뜻합니다. 합계는 총 상대전적 승수입니다."
            : "편성이 확정되지 않은 경기도 포함한 잔여 맞대결 수입니다."}
        </p>
      </article>
    </section>
  );
}
