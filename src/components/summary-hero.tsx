"use client";

import { StatusPill, TeamMark, formatPercent, formatRate } from "@/components/ui";
import type { TeamNumbers } from "@/lib/race/magic-number";
import type { TeamProjection } from "@/lib/race/monte-carlo";
import { PLAYOFF_SPOTS, type TeamStanding } from "@/lib/types";

export function SummaryHero({
  leader,
  leaderNumbers,
  leaderProjection,
  runnerUp,
  bubble,
  counts,
}: {
  leader: TeamStanding;
  leaderNumbers: TeamNumbers;
  leaderProjection: TeamProjection;
  runnerUp: TeamStanding | undefined;
  bubble: { team: string; probability: number }[];
  counts: { scheduled: number; unscheduled: number };
}) {
  const magic = leaderNumbers.titleMagic;
  const clinched = magic === 0;

  return (
    <section className="hero panel" aria-labelledby="hero-title">
      <div className="hero-main">
        <p className="section-kicker">1위 {leader.team} · 우승 매직넘버</p>
        <p className="hero-figure" id="hero-title">
          {clinched ? "확정" : (magic ?? "—")}
        </p>
        <p className="hero-caption">
          {clinched ? (
            <>
              <b>{leader.team}</b>의 정규시즌 우승이 확정됐습니다.
            </>
          ) : magic === null ? (
            <>남은 경기로는 아직 우승을 확정할 수 없습니다.</>
          ) : (
            <>
              <b>{leader.team}</b>의 승리와 <b>{runnerUp?.team ?? "경쟁팀"}</b>의 패배를 합쳐{" "}
              <b>{magic}번</b>이면 정규시즌 우승이 확정됩니다.
            </>
          )}
        </p>
        <div className="hero-meta">
          <span>
            <TeamMark team={leader.team} small />
            {leader.wins}승 {leader.losses}패 {leader.draws}무 · {formatRate(leader.winRate)}
          </span>
          <span>잔여 {leaderNumbers.remaining}경기</span>
          <span>우승 확률 {formatPercent(leaderProjection.titleProbability)}</span>
        </div>
      </div>

      <div className="hero-side">
        <h2>{PLAYOFF_SPOTS}위 경쟁</h2>
        <ul className="bubble-list">
          {bubble.map((row) => (
            <li key={row.team}>
              <TeamMark team={row.team} small />
              <span>{row.team}</span>
              <b>{formatPercent(row.probability, 0)}</b>
            </li>
          ))}
        </ul>
        <p className="hero-side-note">
          {counts.unscheduled > 0 ? (
            <StatusPill tone="warning">
              편성 미정 {counts.unscheduled}경기 포함 · 잔여 {counts.scheduled + counts.unscheduled}경기
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">잔여 {counts.scheduled}경기</StatusPill>
          )}
        </p>
      </div>
    </section>
  );
}
