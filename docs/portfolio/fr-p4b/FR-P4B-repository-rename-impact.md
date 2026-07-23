# FR-P4B repository rename impact

## Decision

The repository is to be renamed during the local FR-P4B closeout:

```text
Archmays/Family-Reading
→ Archmays/Family-Reading-Codex
```

The repository must be renamed in place. Do not create a second repository and copy content into it. Repository id `1271691196`, public visibility, default branch `main`, commit history, Actions settings and Pages configuration must remain associated with the same repository object.

## Web-side evidence boundary

The connected GitHub repository reports `is_code_search_indexed: false`. Repository code search therefore returned no usable result set and cannot prove a full-tree zero match. The web phase inspected the current active entry and deployment surfaces directly and updated the files that are safe to change before the rename:

- `README.md`
- `docs/github-pages-deployment.md`
- `index.html`
- `.github/workflows/pages.yml` — inspected; no repository-name literal was found in the current workflow
- `package.json` — inspected; no repository-name literal was found
- `assets/app.js` — inspected for route and project-subpath behavior; paths are relative
- `public/runtime/index.json` and Work Cells runtime paths — inspected; paths are relative

A full local text scan remained a mandatory Codex gate because the web connector could not enumerate and search every tracked text blob in this repository.

## Current references updated on the shared branch

### README

The active repository and Pages identities are now recorded as:

- `Archmays/Family-Reading-Codex`
- `https://archmays.github.io/Family-Reading-Codex/`

It also records that the old repository name must not be recreated.

### Pages deployment guide

The active deployment guide now:

- names the new repository and Pages URL;
- reflects P4A runtime files rather than the removed Work Cells draft manifest/page-map runtime path;
- reflects Carmela `preload="none"` and user-triggered audio;
- records the P4B Work Cells media request contract;
- retains older P0–P4 measurements as historical evidence rather than current truth.

### Entry document

`index.html` continues to use relative assets and therefore does not require a hard-coded project base path. It loads only the application module; `app.js` imports the pure P4B science module directly.

## References that must remain historical

Do not bulk-replace the old repository name inside immutable or historical acceptance evidence where it describes the repository identity at the time of that report, including:

- P0/P0R1 reports
- P2 reports
- P3A/P3B reports
- P4A reports and run manifests
- historical GitHub Actions run links
- historical commit/Pages evidence

If a historical document is surfaced as current documentation, add a short rename note outside the original evidence block rather than rewriting its recorded facts.

## Local Codex full-tree scan

After syncing the web branch and before the rename, run a tracked-text scan equivalent to:

```text
rg -n --hidden --glob '!.git/**' \
  -e 'Archmays/Family-Reading' \
  -e 'github\.com/Archmays/Family-Reading' \
  -e 'archmays\.github\.io/Family-Reading' \
  -e 'uses:\s*Archmays/Family-Reading@' .
```

Classify every match as:

1. current active reference — update;
2. historical evidence — preserve, optionally add rename context;
3. external Action consumer — update because repository-action references do not safely inherit ordinary repository redirects;
4. false positive or unrelated text — document and leave unchanged.

The final public-repository validator must not reject intentionally preserved historical evidence merely because it contains the old repository name.

The local tracked-tree scan completed with zero current active old-name references. Matches were classified as historical evidence, explicit rename-transition context, the scan command itself, or validator fixtures. No external `uses: Archmays/Family-Reading@...` consumer exists. The only active old identity before the GitHub operation is the local `origin`; it must change immediately after the in-place rename.

## Rename preconditions

Only rename after all of the following pass on the shared branch:

- targeted P4B tests;
- runtime staleness check;
- representative Work Cells browser and media request checks;
- no unknown working-tree changes;
- target repository name is still available;
- authenticated user has admin permission;
- branch work is committed and recoverable.

## Rename operation

Use authenticated GitHub CLI/API to rename the existing repository. Do not:

- create a replacement repository;
- transfer ownership;
- change visibility;
- archive the repository;
- rewrite history;
- force-push.

Immediately update the local remote to the new clone URL and verify repository id, permissions, branches and commit identities.

## Pages impact

The expected new project site is:

```text
https://archmays.github.io/Family-Reading-Codex/
```

The old project Pages path must not be treated as the release acceptance target. Verify the new URL after an exact-final-SHA Actions deployment.

Required live smoke:

- home;
- Carmela series and representative detail;
- Work Cells series;
- representative Work Cells topic;
- P4B media disclosure and group lightbox;
- three Work Cells detail JSON requests;
- zero old manifest/page-map requests;
- zero console errors and broken images.

## Post-rename zero-current-reference gate

After the rename and local remote update, repeat the full scan. Final acceptance requires:

```text
OLD_NAME_CURRENT_REFERENCES: 0
HISTORICAL_REFERENCES: PRESERVED_WITH_CONTEXT
REPOSITORY_ID_UNCHANGED: VERIFIED
LOCAL_ORIGIN_STATUS: UPDATED
NEW_PAGES_URL_STATUS: VERIFIED
```

Do not create a new repository named `Family-Reading` after the rename because doing so can break GitHub's old repository URL redirection behavior.
