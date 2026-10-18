# Sandbox requirements (P1.2)

Status: **not complete.** The runner currently provides process hygiene, not a
security boundary. Measured E3+ evidence requires the sandbox below.

## What the runner does today

- Creates a throwaway `DSH_HOME` and workspace under `/tmp`.
- Scrubs ambient environment; only `PATH`, `HOME` (the temp home), locale,
  `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` are forwarded.
- Hashes the fixture directory and records the environment manifest.
- Refuses `--sandbox` entirely until the backend is implemented.

That is **not enough**: the child can still read the host filesystem and reach
the network. A malicious plugin could read host files or exfiltrate a key.

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

This machine has `unshare` but no `bwrap`/`firejail` and no root to install one.
The runner therefore refuses measured runs. Implementing the bwrap backend and
the egress proxy is the next P1.2 task; until then no E3+ result may be published.

## What not to do

- Do not run untrusted plugins against the real `~/.dsh` or a personal API key.
- Do not call an unsandboxed run "measured" or E3.
- Do not copy `.credentials.yaml` into the throwaway home.
- Do not hide a failed sandbox check; publish `0 measured`.
