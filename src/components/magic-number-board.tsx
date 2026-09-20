"use client";

import { SectionHeading, StatusPill, TeamMark } from "@/components/ui";
import type { TeamNumbers } from "@/lib/race/magic-number";
import { PLAYOFF_SPOTS } from "@/lib/types";

function MagicCell({ value, kind }: { value: number | null; kind: "magic" | "tragic" }) {
  if (value === 0) {
    return kind === "magic" ? (
      <StatusPill tone="good">확정</StatusPill>
    ) : (
      <StatusPill tone="critical">탈락</StatusPill>
    );
  }
  if (value === null) {
    return <span className="magic-none">—</span>;
  }
  return (
    <span className="magic-figure">
      {value}
      <small>{kind === "magic" ? "M" : "T"}</small>
    </span>
  );
}

export function MagicNumberBoard({ numbers }: { numbers: TeamNumbers[] }) {
  return (
    <section className="data-section" id="magic">
      <SectionHeading
        kicker="MAGIC & TRAGIC NUMBER"
        title="매직넘버 보드"
        aside={`${PLAYOFF_SPOTS}위까지 가을야구`}
        description={
          <>
            <b>매직넘버(M)</b>는 순위를 확정하기까지 남은 &lsquo;우리 승 + 경쟁팀 패&rsquo;
            횟수, <b>트래직넘버(T)</b>는 탈락이 확정되기까지 남은 &lsquo;우리 패 + 경쟁팀 승&rsquo;
            횟수입니다.
          </>
        }
      />
      <div className="panel">
        <div className="table-scroll">
          <table className="magic-table">
            <thead>
              <tr>
                <th scope="col">팀</th>
                <th scope="col">잔여</th>
                <th scope="col">우승 매직</th>
                <th scope="col">가을야구 매직</th>
                <th scope="col">우승 트래직</th>
                <th scope="col">가을야구 트래직</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((row) => (
                <tr key={row.team} data-status={row.status}>
                  <th scope="row">
                    <span className="team-cell-static">
                      <TeamMark team={row.team} small />
                      <b>{row.team}</b>
                    </span>
                  </th>
                  <td>{row.remaining}</td>
                  <td>
                    <MagicCell value={row.titleMagic} kind="magic" />
                  </td>
                  <td>
                    <MagicCell value={row.playoffMagic} kind="magic" />
                  </td>
                  <td>
                    <MagicCell value={row.titleTragic} kind="tragic" />
                  </td>
                  <td>
                    <MagicCell value={row.playoffTragic} kind="tragic" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">
          잔여 경기 전수 탐색으로 계산합니다. 승률이 같으면 상대전적으로 순위가 갈리지만 남은
          맞대결에서 뒤집힐 수 있어, 확정 판정은 <b>승률 우위</b>만 인정하는 보수적 기준입니다.
          &ldquo;—&rdquo;는 남은 경기로는 확정도 탈락도 불가능하다는 뜻입니다.
        </p>
      </div>
    </section>
  );
}
