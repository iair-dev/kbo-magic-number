# KBO 매직넘버

KBO 공식 데이터로 매직넘버·트래직넘버, 가을야구 진출 확률, 최종 순위 시나리오를
계산하는 Next.js 웹앱입니다.

## 화면 구성

1. **요약** — 1위 팀의 우승 매직넘버와 5위 경쟁 현황
2. **진출 확률과 순위 분포** — 몬테카를로 2만회 시뮬레이션. 우승·가을야구 확률
   막대와 팀별 최종 순위 확률 히트맵
3. **매직넘버 보드** — 팀별 우승/가을야구 매직넘버와 트래직넘버
4. **팀별 심화 기록** — 홈·원정 분리, 최근 10경기, 연속 기록, 잔여 일정 난이도
5. **승패 시나리오 + 시나리오 순위표** — 잔여 승수를 직접 조정하면 상대 팀 승패와
   최종 순위가 함께 바뀜
6. **잔여 경기 선택 / 상대전적 매트릭스**

## 구성

- Next.js App Router + React + TypeScript
- PostgreSQL + Drizzle ORM
- KBO 순위/일정 서버 수집기, 5분 서버 캐시와 DB 폴백
- 라이트·다크 테마, 모바일 대응, WCAG 2.1 AA 대비 충족

## 실행

호스트에 Node.js가 있다면:

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Docker를 사용하면 호스트 Node.js 없이 실행할 수 있습니다.

```bash
cp .env.example .env.local
docker compose build
docker compose run --rm web npm run db:migrate
docker compose up -d
```

기본 주소는 `http://127.0.0.1:3100`입니다.

기존 `/workpsace/infra/postgres` 컨테이너와 함께 쓸 때 `.env.local`의 호스트는
외부 Docker 네트워크의 서비스 이름인 `postgres`를 사용합니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/DATABASE
SYNC_SECRET=충분히-긴-임의의-문자열
KBO_SEASON=2026
```

## 데이터 동기화

화면은 공식 KBO 데이터를 직접 읽고 5분간 캐시합니다. PostgreSQL에 스냅샷을
저장하려면 마이그레이션 후 동기화 API를 호출합니다.

```bash
curl -X POST http://127.0.0.1:3100/api/sync \
  -H "Authorization: Bearer $SYNC_SECRET"
```

운영 환경에서는 위 요청을 cron 등으로 5~10분 간격으로 실행하면 됩니다.

## k3s 배포 (production)

GitHub Actions가 arm64 이미지를 빌드해 OCIR에 올리고, ArgoCD가 `k8s/`를 동기화합니다.
인프라 구성은 [/workpsace/infra/oracle](../../infra/oracle/README.md) 참고.

| 항목 | 값 |
| --- | --- |
| URL | https://kbo.iair.dev |
| 네임스페이스 | `kbo` |
| 이미지 | `icn.ocir.io/cnllupo1f1x2/kbo-magic-number` |
| DB | `postgres.database.svc.cluster.local:5432` (클러스터 내부 전용) |

### 최초 1회 준비

```bash
export KUBECONFIG=~/.kube/config-production

# OCIR pull secret (네임스페이스도 함께 생성)
/workpsace/infra/oracle/registry/ocir-pull-secret.sh kbo

# DB 비밀번호를 database 네임스페이스에서 복사
kubectl -n database get secret postgres-credentials -o yaml \
  | sed 's/namespace: database/namespace: kbo/' | kubectl apply -f -

# SYNC_SECRET 발급 및 봉인 → k8s/sealed-secret.yaml
./scripts/seal-secret.sh

# GitHub Actions 시크릿 (OCIR_USERNAME, OCIR_TOKEN)
gh auth login
/workpsace/infra/oracle/registry/sync-github-secrets.sh kbo-magic-number

# ArgoCD에 앱 등록
kubectl apply -f argocd/application.yaml
```

### 배포 흐름

`main`에 push하면 Actions가 arm64 이미지를 빌드·푸시하고 `k8s/deployment.yaml`의
태그를 커밋 SHA로 바꿔 되돌려 커밋합니다. ArgoCD가 그 커밋을 감지해 동기화합니다.

### 매니페스트

| 파일 | 역할 |
| --- | --- |
| `k8s/deployment.yaml` | Deployment · Service · Ingress |
| `k8s/migration-job.yaml` | 스키마 생성. ArgoCD PreSync 훅으로 동기화 전에 실행 |
| `k8s/sync-cronjob.yaml` | 10분마다 `/api/sync` 호출해 스냅샷 적재 |
| `k8s/sealed-secret.yaml` | `SYNC_SECRET` (암호화됨, 커밋해도 안전) |
| `argocd/application.yaml` | ArgoCD Application. 동기화 대상 밖에 둡니다 |

마이그레이션 Job은 `kbo_magic` 스키마가 이미 있으면 건너뛰므로 매 동기화마다 돌아도
안전합니다. `npm run db:generate`로 새 마이그레이션을 만들면 `k8s/migration-job.yaml`의
ConfigMap에도 같은 SQL을 추가해야 합니다.

### 검증 기록 (2026-09-20)

- GitHub Actions arm64 빌드 → OCIR 푸시 → 매니페스트 태그 커밋 → ArgoCD 동기화
- PreSync 마이그레이션 Job: 스키마 4개 테이블 생성, 재실행 시 건너뜀 확인
- SealedSecret 복호화 성공, 파드 기동 후 `/api/health` 200 (`databaseConfigured: true`)
- `/api/sync` 수동 실행 → PostgreSQL에 games 712행 · standings 10행 · teams 10행 적재
- https://kbo.iair.dev HTTP/2 200 (Cloudflare Universal SSL, 인증서 작업 없음)

### 알아둘 것

- `replicas: 1`입니다. Next.js가 KBO 응답과 계산 결과를 **프로세스 메모리**에 5분간
  캐시하므로 파드를 늘리면 캐시가 파드별로 따로 놀아 새로고침마다 숫자가 튑니다.
  늘리려면 먼저 공유 캐시로 바꿔야 합니다.
- 루트 파일시스템이 읽기전용이라 `.next/cache`와 `/tmp`를 emptyDir로 붙였고,
  `fsGroup: 1001`이 있어야 앱 사용자가 쓸 수 있습니다.

## 주요 경로

| 경로 | 역할 |
| --- | --- |
| `src/lib/kbo/client.ts` | KBO 순위·일정 수집, 파싱, 미편성 경기 복원 |
| `src/lib/race/magic-number.ts` | 매직넘버·트래직넘버 전수 탐색 |
| `src/lib/race/monte-carlo.ts` | 시즌 시뮬레이션과 순위 확률 |
| `src/lib/race/tiebreak.ts` | 상대전적과 KBO 동률 규정 |
| `src/lib/race/stats.ts` | 홈·원정, 최근 폼, 잔여 일정 난이도 |
| `src/lib/race/model.ts` | 서버에서 집계해 화면으로 넘기는 페이로드 |
| `src/lib/race/schedule-simulator.ts` | 사용자가 직접 찍는 시나리오 계산 |
| `src/components/` | 대시보드 UI와 차트 |
| `src/db/schema.ts` | PostgreSQL 테이블 정의 |

## 계산 기준

**미편성 경기.** 우천·폭염으로 취소된 뒤 아직 날짜가 잡히지 않은 경기가 있습니다.
KBO는 두 팀이 시즌 16경기를 치르므로 페어별 `16 - (완료 + 편성)`으로 미편성 경기
수를 역산하고, 홈 배정은 그 페어의 취소 이력에서 가져옵니다. 이 경기들도 잔여
경기에 포함되므로 팀별 잔여 경기 수가 `144 - 소화 경기`와 항상 일치합니다.

**동률.** KBO 규정대로 승률 → 상대전적 → 다승 순으로 가립니다. 전년도 순위
데이터가 없어 마지막 기준은 현재 순위로 대신합니다. 시나리오에서 선택한 잔여
경기 결과도 상대전적에 반영됩니다.

**매직넘버.** 잔여 경기 전수 탐색으로 계산합니다. 순위 `k` 이내를 확정하려면 9개
상대 중 `10 - k`개를 확실히 제쳐야 하므로, 상대별 매직넘버 중 `10 - k`번째로 작은
값이 해당 순위의 매직넘버입니다. 승률이 같으면 상대전적으로 갈리지만 남은
맞대결에서 뒤집힐 수 있어, 확정 판정은 승률 우위만 인정하는 보수적 기준입니다.

**몬테카를로.** 팀 실력은 관측 승률을 60경기 분량만큼 .500 쪽으로 보정해
추정하고, 경기별 승률은 log5로 계산한 뒤 홈 어드밴티지를 더합니다. 홈 승률과
무승부 비율은 해당 시즌 실적에서 가져옵니다. 결과가 매번 흔들리지 않도록 난수
시드는 고정되어 있습니다.

KBO 및 구단의 공식 서비스가 아니며 계산 결과는 참고용입니다.
