# Sandbox requirements (P1.2)

Status: **partial.** The runner supports a `bwrap-fs` sandbox (filesystem,
user, PID, UTS and IPC namespaces). The network is shared, so this is not yet
E3+ evidence; an egress allowlist and seccomp are still required.

## What the runner does today

- Creates a throwaway `DSH_HOME` and workspace under `/tmp`.
- Scrubs ambient environment; only `PATH`, `HOME` (the temp home), locale,
  `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` are forwarded.
- Hashes the fixture directory and records the environment manifest.
- Runs through `scripts/bench-sandbox.sh` when `--sandbox` is set: read-only
  system, read-only DSH checkout/Node, writable workspace and throwaway home.

That blocks host-home reads and PID/UTS/IPC interference, but **the child can
still reach the network**. A malicious plugin could exfiltrate a key; that is why
the result stays at E2.

## Required sandbox for E3+

- **Filesystem:** read-only system dirs; bind only the workspace and a throwaway
  `DSH_HOME`; no host home, no `/mnt`, no ssh agent, no npm credentials.
- **Network:** default deny; allow only the model endpoint. If the provider does
  not support an egress allowlist, run behind a proxy that injects the key and
  exposes only the model API.
- **Identity:** run as an unprivileged uid; drop capabilities; no new privileges.
- **Resources:** CPU/memory/PID/time limits; no fork bomb; bounded disk.
- **Syscalls:** seccomp profile; no ptrace, mount, module load, raw sockets.
- **Credentials:** a bench-scoped key with a hard spend cap, rotated per run;
  never the user's personal key.
- **Reproducibility:** record kernel, bwrap version, image digest, model,
  harness, DSH version, fixture hash and command line.

## Current blocker

This machine has a local `bwrap` 0.9.0 and `unshare`; the filesystem sandbox
works. The missing piece is the egress proxy/allowlist (and seccomp/resource
limits) that would let the runner claim `sandboxStrength: "full"`. Until then no
E3+ result may be published.

## What not to do

- Do not run untrusted plugins against the real `~/.dsh` or a personal API key.
- Do not call an unsandboxed run "measured" or E3.
- Do not copy `.credentials.yaml` into the throwaway home.
- Do not hide a failed sandbox check; publish `0 measured`.
