#!/bin/sh
# Run the local DSH binary inside a bubblewrap filesystem/pid/user sandbox.
#
# This is a PARTIAL sandbox: the filesystem, PID, UTS and IPC namespaces are
# isolated, but the network is shared. It is not sufficient for E3+ (which
# requires an egress allowlist and a bench-scoped key). It is enough to stop a
# plugin from reading the host home, SSH agent or npm credentials.
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

EXTRA_BINDS=""
# WSL exposes resolv.conf through /mnt/wsl; bind it only when present.
if [ -e /mnt/wsl/resolv.conf ]; then
  EXTRA_BINDS="--ro-bind /mnt/wsl /mnt/wsl"
fi

# shellcheck disable=SC2086
exec "$BWRAP" \
  --die-with-parent \
  --unshare-user --unshare-pid --unshare-uts --unshare-ipc --share-net \
  --ro-bind /usr /usr --ro-bind /bin /bin --ro-bind /lib /lib --ro-bind /lib64 /lib64 \
  --ro-bind /etc /etc $EXTRA_BINDS \
  --ro-bind "$NODE_ROOT" /opt/node \
  --ro-bind "$CHECKOUT" /opt/dsh \
  --bind "$WORKSPACE" /workspace \
  --bind "$HOME_TMP" /dsh-home \
  --tmpfs /tmp --dev /dev --proc /proc --chdir /workspace \
  --setenv HOME /dsh-home --setenv DSH_HOME /dsh-home \
  --setenv PATH /opt/node/bin:/usr/bin:/bin \
  --setenv DEEPSEEK_API_KEY "${DEEPSEEK_API_KEY:-}" \
  -- /opt/node/bin/node /opt/dsh/apps/cli/lib/bin.js "$@"
