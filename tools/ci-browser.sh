#!/usr/bin/env bash
# CI-only browser environment. The project test/config budgets remain authoritative.
set -euo pipefail
cd "$(dirname "$0")/.."
image=mcr.microsoft.com/playwright:v1.63.0-noble
if [[ "${1:-}" == --pull && $# == 1 ]]; then
  timeout 240s docker pull "$image"
  exit 0
fi
[[ $# == 0 ]] || { echo 'Usage: ci-browser.sh [--pull]' >&2; exit 2; }
[[ "$(id -u)" != 0 ]] || { echo 'CI browsers require a non-root runner' >&2; exit 1; }
[[ "${APP_URL:-}" == http://localhost:8080 && "${EXPECT_SECURE_COOKIES:-}" == true ]] || exit 1
[[ "$(node -p process.version)" == v24.21.0 ]] || exit 1
sha256sum --check evaluation/ci-browser/seccomp-playwright-v1.63.0.sha256
sha256sum --check evaluation/ci-browser/seccomp-playwright-v1.63.0-node24.sha256
repo=$(pwd -P)
node_root=$(dirname "$(dirname "$(node -p process.execPath)")")
profile="$repo/evaluation/ci-browser/seccomp-playwright-v1.63.0-node24.json"
mkdir -p .local/browser-environment .local/browser-results .local/browser-report .local/ci-browser-home
# Read the host restriction before/after; this script never writes a kernel setting.
restriction=$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns)
container=
cleanup() {
  result=$?
  if [[ -n "$container" ]]; then docker rm -f "$container" >/dev/null || result=1; fi
  if [[ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns)" != "$restriction" ]]; then
    echo "Host user-namespace restriction changed during the CI browser step" >&2
    result=1
  fi
  exit "$result"
}
trap cleanup EXIT
image_id=$(docker image inspect --format '{{.Id}}' "$image")
container=$(docker create --init --user "$(id -u):$(id -g)" \
  --network host --ipc private --shm-size 1g \
  --security-opt "seccomp=$profile" --workdir /workspace \
  --mount "type=bind,src=$repo,dst=/workspace,readonly" \
  --mount "type=bind,src=$node_root,dst=/opt/ci-node,readonly" \
  --mount "type=bind,src=$repo/.local/browser-results,dst=/workspace/.local/browser-results" \
  --mount "type=bind,src=$repo/.local/browser-report,dst=/workspace/.local/browser-report" \
  --mount "type=bind,src=$repo/.local/browser-environment,dst=/workspace/.local/browser-environment" \
  --mount "type=bind,src=$repo/.local/ci-browser-home,dst=/ci-home" \
  --env HOME=/ci-home --env PATH=/opt/ci-node/bin:/usr/local/bin:/usr/bin:/bin \
  --env APP_URL --env EXPECT_SECURE_COOKIES --env CI=true \
  --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --env PW_OUTPUT_DIR=.local/browser-results/run \
  --env PW_REPORT_DIR=.local/browser-report/html \
  "$image_id" bash -c 'node tools/ci-browser-sandbox.mjs && exec node node_modules/@playwright/test/cli.js test tests/e2e/ci-core.spec.ts tests/e2e/first-night.spec.ts tests/e2e/board.spec.ts tests/e2e/title-dialog.spec.ts')
node tools/ci-browser-sandbox.mjs --inspect "$container" "$image_id" "$restriction"
docker start --attach "$container"
