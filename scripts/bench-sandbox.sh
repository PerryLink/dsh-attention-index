#!/bin/sh
# Run DSH inside a bwrap filesystem/pid/user/network sandbox.
#
# Network: the sandbox has its own network namespace (loopback only). The sole
# route out is a Unix socket served by scripts/egress-proxy.mjs, which allows
# HTTPS CONNECT only to DeepSeek model hosts. A TCP-to-Unix relay inside the
# sandbox lets DSH use HTTPS_PROXY=http://127.0.0.1:3128.
#
# Required env:
#   DSH_BENCH_CHECKOUT  absolute path to the DSH checkout (read-only /opt/dsh)
#   DSH_BENCH_NODE_ROOT absolute path to the Node distribution (read-only /opt/node)
#   DSH_HOME            throwaway DSH home (writable /dsh-home)
# Optional:
#   DSH_BENCH_BWRAP     path to bwrap (default: bwrap on PATH)
#   DEEPSEEK_API_KEY    forwarded to the child
set -eu

BWRAP=${DSH_BENCH_BWRAP:-bwrap}
NODE_ROOT=${DSH_BENCH_NODE_ROOT:?DSH_BENCH_NODE_ROOT required}
CHECKOUT=${DSH_BENCH_CHECKOUT:?DSH_BENCH_CHECKOUT required}
WORKSPACE=${PWD}
HOME_TMP=${DSH_HOME:?DSH_HOME required}
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TMP=$(mktemp -d /tmp/dsh-egress.XXXXXX)
SOCKET=$TMP/egress.sock
PROXY_PID=''
cleanup() {
  [ -n "$PROXY_PID" ] && kill "$PROXY_PID" 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

node "$ROOT/scripts/egress-proxy.mjs" "$SOCKET" >"$TMP/proxy.log" 2>&1 &
PROXY_PID=$!
i=0
while [ ! -S "$SOCKET" ] && [ "$i" -lt 50 ]; do i=$((i+1)); sleep 0.1; done
if [ ! -S "$SOCKET" ]; then cat "$TMP/proxy.log" >&2; exit 1; fi

EXTRA_BINDS=""
if [ -e /mnt/wsl/resolv.conf ]; then
  EXTRA_BINDS="--ro-bind /mnt/wsl /mnt/wsl"
fi

# shellcheck disable=SC2086
exec "$BWRAP" \
  --die-with-parent \
  --unshare-user --unshare-pid --unshare-uts --unshare-ipc --unshare-net \
  --ro-bind /usr /usr --ro-bind /bin /bin --ro-bind /lib /lib --ro-bind /lib64 /lib64 \
  --ro-bind /etc /etc $EXTRA_BINDS \
  --ro-bind "$NODE_ROOT" /opt/node \
  --ro-bind "$CHECKOUT" /opt/dsh \
  --ro-bind "$ROOT/scripts/egress-relay.mjs" /opt/egress-relay.mjs \
  --bind "$SOCKET" /egress.sock \
  --bind "$WORKSPACE" /workspace \
  --bind "$HOME_TMP" /dsh-home \
  --tmpfs /tmp --dev /dev --proc /proc --chdir /workspace \
  --setenv HOME /dsh-home --setenv DSH_HOME /dsh-home \
  --setenv PATH /opt/node/bin:/usr/sbin:/usr/bin:/bin \
  --setenv HTTPS_PROXY http://127.0.0.1:3128 \
  --setenv HTTP_PROXY http://127.0.0.1:3128 \
  --setenv NO_PROXY '' \
  --setenv DEEPSEEK_API_KEY "${DEEPSEEK_API_KEY:-}" \
  -- /usr/bin/prlimit --nproc=256 --nofile=256 --fsize=67108864 -- /bin/sh -c 'ip link set lo up 2>/dev/null || true; /opt/node/bin/node /opt/egress-relay.mjs /egress.sock >/tmp/relay.log 2>&1 & exec /opt/node/bin/node /opt/dsh/apps/cli/lib/bin.js "$@"' sh "$@"
