# Migrating the public layer to `dsh-score-index`

Status: **planned** (not executed). The brand is `dsh-score`; this repository
is the public evidence layer and is currently named `dsh-attention-index`.

The rename is a URL migration, not a scoring change. Do **not** change schema
ids (`dsh-attention/registry/v1`) or the plugin package names in the same step.

## Target names

| Surface | Name |
|---|---|
| Brand | `dsh-score` |
| Public evidence repo/site | `dsh-score-index` |
| Local/on-demand inspector | `dsh-score` (separate repo + npm package) |
| In-app consumer | `dsh-community-bench` (maintenance mode) |
| Avoid | `dsh-bench`, `dsh-attention`, `dsh-evidence` (npm names taken) |

## Preconditions

- Network access to GitHub, Gitee, GitCode, npm.
- GitHub PAT with `repo` scope; Gitee/GitCode tokens; npm token/OIDC.
- Confirm the GitHub/Gitee/GitCode target name `dsh-score-index` is unused.
- Freeze deploys during the migration.

## Steps

1. **Rename GitHub** (API, not a local `git mv`):
   `PATCH /repos/PerryLink/dsh-attention-index` with `{"name":"dsh-score-index"}`.
   GitHub keeps redirects from the old name.
2. **Update the local remote**:
   `git remote set-url origin https://github.com/PerryLink/dsh-score-index.git`.
3. **Rename Gitee/GitCode mirrors** to `dsh-score-index`; update their remotes.
   The family hub sync workflows list repo names — update
   `research/perrylink/.github/workflows/{gitee-sync,gitcode-sync}.yml`.
4. **Update URL defaults** (only after the rename is live):
   - `scripts/aggregate.mjs`: `BENCH_BADGE_BASE` default.
   - `README.md`, `site/index.html`, `integrations/dsh-recommend/README.md`,
     `docs/*` links.
   - `community-bench-plugin/scripts/build.mjs`:
     `BENCH_SITE_URL`, `BENCH_REGISTRY_URL`; its READMEs and snapshot source.
   - `research/dsh-kit/scripts/check-parity.mjs` `RESOURCES` (if the repo name
     changes) and the family-table link.
   - `research/dsh-catalog` only if it references this repo.
5. **Regenerate and verify**:
   ```sh
   node scripts/aggregate.mjs --today 2026-10-18
   node scripts/export-recommend.mjs
   node scripts/aggregate.mjs --check --today 2026-10-18
   node --test test/*.test.mjs
   ```
6. **Pages**: the project site URL becomes
   `https://perrylink.github.io/dsh-score-index/`. Verify the old URL redirects;
   update badges, JSON, and docs links.
7. **Publish the consumer patch** (`dsh-community-bench`) with the new defaults;
   regenerate its snapshot from the new registry URL. Do this only after the raw
   registry is reachable at the new path.
8. **Verify**:
   - `https://raw.githubusercontent.com/PerryLink/dsh-score-index/main/data/registry.json`
   - `https://perrylink.github.io/dsh-score-index/`
   - npm `dsh-community-bench` latest uses the new URLs.
   - Gitee/GitCode mirrors serve the same commit.
   - Family hub/kit links resolve (old links redirect).

## Rollback

Rename the repository back; GitHub redirects again. Revert the URL-default
commit and republish the consumer patch. No data migration is involved.

## Notes

- Old badge URLs may keep working through GitHub redirects; keep them for one
  release, then announce the new base.
- `dsh-score` (local inspector) keeps its npm name. Do not publish the public
  index under that name; the public layer is a repo/site, not a plugin package.
- Schema ids stay `dsh-attention/...` until a separate schema-version bump.
