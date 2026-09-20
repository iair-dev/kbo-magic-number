#!/usr/bin/env bash
# SYNC_SECRET을 새로 발급해 봉인하고 k8s/sealed-secret.yaml 로 씁니다.
#
# 평문은 파일에도 셸 히스토리에도 남지 않습니다. 만들어진 파일은 암호화돼 있어
# git에 커밋해도 됩니다. 복호화는 클러스터의 sealed-secrets 컨트롤러만 할 수 있습니다.
#
#   ./scripts/seal-secret.sh
#
# 필요한 것: kubectl(클러스터 접근), kubeseal, openssl
set -euo pipefail

cd "$(dirname "$0")/.."
NS=kbo
NAME=kbo-magic-number
OUT=k8s/sealed-secret.yaml

command -v kubeseal >/dev/null || {
  echo "kubeseal이 필요합니다: https://github.com/bitnami-labs/sealed-secrets/releases"; exit 1; }
# 셸에 KUBECONFIG가 없으면 infra/oracle의 표준 경로를 씁니다.
if [ -z "${KUBECONFIG:-}" ] && [ -f "$HOME/.kube/config-production" ]; then
  export KUBECONFIG="$HOME/.kube/config-production"
fi
kubectl cluster-info >/dev/null 2>&1 || {
  echo "클러스터에 닿지 않습니다. Tailscale 연결과 kubeconfig를 확인하세요:"
  echo "  export KUBECONFIG=~/.kube/config-production"; exit 1; }
kubectl -n kube-system get deploy sealed-secrets-controller >/dev/null 2>&1 || {
  echo "클러스터에 sealed-secrets 컨트롤러가 없습니다."; exit 1; }

# /api/sync 호출용 토큰. 사람이 외울 필요가 없으므로 무작위로 만듭니다.
SYNC_SECRET=$(openssl rand -base64 36 | tr -d '\n/+=' | cut -c1-48)

kubectl create secret generic "$NAME" --namespace "$NS" --dry-run=client -o yaml \
  --from-literal=SYNC_SECRET="$SYNC_SECRET" \
  | kubeseal --format yaml > "$OUT"

echo "[+] $OUT 생성 완료 (SYNC_SECRET ${#SYNC_SECRET}자). 평문은 어디에도 저장하지 않았습니다."
echo
echo "    git add $OUT && git commit -m '시크릿 봉인' && git push"
echo
# envFrom은 컨테이너가 뜰 때만 값을 읽습니다. Secret이 바뀌어도 도는 파드는 옛 값을 계속 씁니다.
echo "    값을 바꾼 경우에는 파드를 다시 띄워야 반영됩니다:"
echo "      kubectl -n $NS rollout restart deploy/$NAME"
