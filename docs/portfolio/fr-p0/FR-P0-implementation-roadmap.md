# FR-P0 implementation roadmap

## Sequence

```text
FR-P1 Safety and Publishing Containment
  → FR-P2 Design System and Core IA
  → FR-P3 Carmela Companion Core
  → FR-P4 Science Topic and Data Loading
  → FR-P5 Media and Pages Performance
  → FR-P6 Final Acceptance and Release
```

P1 是硬依赖。未解除 rights/privacy blocker 前，不得以 UI、sharding 或压图扩大公开发布面。P0 到此停止，不自动执行任何 future phase。

## FR-P1 Safety and Publishing Containment

**Scope**

- 用户明确决定 public-repo containment 与每类媒体的权利状态。
- 把 private animation authoring metadata、OCR processing artifacts 和未经批准的 full-work runtime assets 从 current public tree / Pages allowlist 中隔离。
- 建立 asset-level rights/provenance manifest。
- 用 exact allowlist 替代 build/audit 的 blacklist-only 逻辑。
- 把 publish/source/privacy tests 从大 `mvp` suite 中先行拆出。
- 决定但不默认执行 history rewrite。

**Hard boundaries**

- 不删除、移动、压缩、重编码本地 `source/`。
- visibility、history rewrite、BFG/filter-repo/LFS/force push 都要单独明确授权。
- 不做 UI redesign、media optimization 或 content rewrite。

**Likely files**

- `.gitignore`
- `scripts/build.mjs`
- `scripts/audit-dist-assets.mjs`
- one rights/provenance schema + approved asset manifest
- focused `source-boundary` / `publish-surface` / `build` tests
- Pages workflow only after local gates are proven
- current tracked private/OCR paths as explicitly approved removals from Git index

**Dependencies**

- 用户对 Carmela 公开权利、Work Cells asset classes、临时 visibility 和 history 处置的明确决定。

**Expected changes**

- fail-closed `publicApproved` + `runtimeRefs`；
- JSON audit output；
- forbidden-path and rights checks run inside build；
- Pages workflow runs the same gate；
- reduced Work Cells runtime manifest boundary；
- no authoring/private paths in runtime payload。

**Tests**

- positive allowlist fixture；
- forbidden PDF/EPUB/video/subtitle/OCR/private negative fixtures；
- missing rights record；
- orphan/unreferenced media；
- path case and traversal；
- current tracked-tree privacy scan；
- atomic build failure behavior。

**Browser QA**

- current content may be intentionally unavailable with a clear family-safe notice；
- no unrelated series failure when one rights set is absent；
- direct route and error/fallback states。

**Performance gates**

- Do not optimize media yet；
- ensure reduced manifest does not increase startup bytes；
- record new dist/artifact baseline。

**Rights/privacy gates**

- active private/OCR current-tree exposure removed；
- every public asset class has explicit basis；
- Carmela full pages/audio are either approved or absent；
- history decision documented separately。

**Rollback**

- revert current-tree containment commit；
- restore previous build only on a private/local branch, never by weakening public gate；
- preserve source and before manifests。

**Complexity**

- Very high; external decision and potentially high-risk Git coordination.

**Fits one ≤2 hour Codex task?**

- No. Split into at least: decision/containment, validator/build, and separately authorized history operation.

**Done condition**

- `PRIVACY_STATUS: PASS` and `RIGHTS_STATUS: PASS` for current tree + Pages；
- exact allowlist gates build/workflow；
- no source mutation；
- if history remains exposed by explicit decision, repository visibility and risk acceptance are recorded and release policy reflects it。

## FR-P2 Design System and Core IA

**Scope**

- Formalize tokens, shared shell, typography/spacing/focus/status primitives.
- Refine homepage and both series pages without changing product identity.
- Add skip link, route title/focus announcement, consistent 44 px controls.
- Fix short-landscape, reduced-motion, forced-colors and companion-only print foundation.

**Hard boundaries**

- No dashboard, progress, account, ebook reading body, content rewrite or media batch conversion.
- No detail-page feature expansion.

**Likely files**

- `assets/styles.css`
- bounded shared rendering/helpers in `assets/app.js`
- `index.html`
- browser/accessibility tests

**Dependencies**

- P1 rights-safe runtime inventory and stable public envelopes.

**Expected changes**

- named tokens for color/spacing/type/radius/focus；
- accessible route shell；
- distinct series card variants；
- 1024×400 non-sticky/scroll-safe layout；
- print hides navigation/media/full copyrighted pages。

**Tests**

- forbidden product copy/state；
- route heading/title；
- 44 px controls；
- focus target；
- media-query presence；
- no horizontal overflow。

**Browser QA**

- desktop/mobile/tablet/1024×400/667×375；
- keyboard-only；
- reduced motion；
- forced colors；
- 200% zoom；
- print preview。

**Performance gates**

- no increase in startup JSON；
- CSS/JS growth budget agreed before implementation；
- home referenced bytes remain within the P1 safe baseline。

**Rights/privacy gates**

- only rights-approved thumbnails/screenshots used；
- print never emits full page sequences。

**Rollback**

- revert tokens/shell commit independently from content/data.

**Complexity**

- Medium-high.

**Fits one ≤2 hour Codex task?**

- Yes if limited to shell/tokens/accessibility foundation; homepage/series visual refinement may need a second bounded task.

**Done condition**

- all representative entrance routes pass visual, responsive, keyboard and media-query gates with no product-boundary regression.

## FR-P3 Carmela Companion Core

**Scope**

- Reshape the Carmela book detail into readable companion sections.
- Preserve overview, story review, scenes/page clues, three question types, background, encyclopedia, audio and parent guidance.
- Implement accessible answer cards, media gallery/lightbox and audio status.

**Hard boundaries**

- No full ebook reading mode, OCR body, reading state, check-in or progress.
- No new book titles and no source/media reprocessing without rights approval.

**Likely files**

- `assets/app.js`
- `assets/styles.css`
- Carmela schema/envelope adapter
- focused Carmela/browser tests

**Dependencies**

- P1 rights approval/allowlist；
- P2 shared shell/primitives.

**Expected changes**

- section-scoped render/loading；
- `aria-controls` and stable answer state；
- focus-trapped/inert lightbox with opener restoration；
- deduplicated gallery；
- audio live/error semantics；
- shorter mobile navigation and optional collapsed secondary evidence。

**Tests**

- 12-book schema and boundary fixtures；
- answer/card keyboard；
- dialog tab/Escape/focus restore；
- audio fallback/error；
- invalid book/section；
- no OCR/source path in runtime。

**Browser QA**

- first book + complex book 11；
- direct hash/back/forward；
- keyboard/lightbox/audio；
- mobile long-page density；
- missing image/audio fallback。

**Performance gates**

- detail initial image raw bytes ≤1.5 MB target；
- noncritical page evidence lazy；
- interactive elements ≤80 initial；
- no unrelated Work Cells JSON for direct book route。

**Rights/privacy gates**

- only approved pages/audio/generated assets；
- no full sequence if rights do not permit；
- companion text stays transformative and source-linked without raw source path exposure。

**Rollback**

- keep adapter and UI changes separate；
- revert detail template without reverting P1 gates.

**Complexity**

- High.

**Fits one ≤2 hour Codex task?**

- No for all sections. Use two bounded tasks: accessible detail skeleton, then media/audio/question refinement.

**Done condition**

- first and complex book pass content, accessibility, responsive, performance and rights gates with static Pages compatibility.

## FR-P4 Science Topic and Data Loading

**Scope**

- Implement discriminated envelope and science-specific topic template.
- Split reduced Work Cells runtime data by series/topic/section.
- Load home/series/topic data on demand with per-domain fallback.
- Preserve sensitive medical guidance and source notes.

**Hard boundaries**

- No medical content rewrite without review；
- no full EPUB/comic pages/animation dialogue/subtitle；
- no merge of distinct topics such as Cancer Cell and Cancer Cell II；
- no audio feature unless separately sourced and approved。

**Likely files**

- runtime schemas/adapters；
- generated reduced manifests；
- `assets/app.js` science rendering/loading；
- build generator and tests；
- terminology/review status records。

**Dependencies**

- P1 allowlist/schema rules；
- P2 shell；
- P3 shared answer/dialog primitives.

**Expected changes**

- one small series envelope；
- topic index；
- topic/section JSON；
- authoring-only fields removed；
- page map/media refs generated from one source；
- domain error isolation。

**Tests**

- 27 topic identity/source/range；
- 4 stations + 6 questions；
- discriminated schema negatives；
- runtime ref integrity；
- authoring/private key rejection；
- slug collision and invalid target；
- medical verification state remains explicit。

**Browser QA**

- series；
- a normal topic；
- `cancer-cell-ii`；
- `novel-coronavirus`；
- one human-review/audio-fallback topic；
- network failure for unrelated Carmela file。

**Performance gates**

- initial JSON ≤200 KB and ≤6 requests；
- topic initial images ≤1.5 MB target；
- no 2.45 MB draft manifest in runtime；
- no full 991 thumbnails unless referenced by current route。

**Rights/privacy gates**

- reduced summaries only；
- no `zipPath`, `notesForCodex`, transcript/dialogue/private scene notes；
- each media ref must exist in approved manifest。

**Rollback**

- generate new runtime files alongside authoring source；
- adapter switch can revert without changing source manifests。

**Complexity**

- Very high.

**Fits one ≤2 hour Codex task?**

- No. Split into schema/generator and runtime/template tasks.

**Done condition**

- all 27 topics validate from one authoring source, representative routes are isolated and small, and no private/full-work field enters dist.

## FR-P5 Media and Pages Performance

**Scope**

- Build responsive thumbnail/detail image derivatives from rights-approved inputs.
- Define audio metadata/range strategy.
- Add content-hash/cache busting, dist/artifact budgets and Pages cache verification.
- Reduce upload/deploy cost without deleting source.

**Hard boundaries**

- No source overwrite/re-encode；
- no rights-unapproved conversion；
- no service worker/PWA/backend；
- no performance pass by removing required companion content。

**Likely files**

- media derivative manifest/pipeline；
- build and audit scripts；
- HTML/app image attributes；
- Pages workflow/cache headers where supported；
- performance tests/reports。

**Dependencies**

- P1 approved assets；
- P3/P4 exact runtime refs.

**Expected changes**

- thumbnail/detail variants；
- `srcset/sizes`, width/height, decoding/fetchpriority；
- lightbox detail-on-open；
- audio metadata + range checks；
- hashed filenames or versioned manifest；
- hard dist/artifact/route gates。

**Tests**

- deterministic derivative hash；
- dimensions and format；
- no source write；
- referenced-only copy；
- stale/orphan detection；
- budget negative fixtures；
- cache-busting mapping。

**Browser QA**

- cold/warm cache；
- slow network/CPU；
- image DPR and viewport variants；
- lightbox detail request；
- audio play/seek/error/range；
- Pages MIME/cache/404。

**Performance gates**

- proposed route budgets from P0；
- dist warn 500 MiB / fail 600 MiB, revisited after P1 rights surface；
- Pages artifact and workflow duration budget；
- LCP/CLS/INP targets set from first real Lighthouse baseline。

**Rights/privacy gates**

- derivative manifest links every output to approved source class；
- no full-work output unless explicitly authorized；
- source hash/integrity unchanged。

**Rollback**

- retain old runtime manifest for one release；
- switch manifest pointer back；
- never roll back by restoring forbidden public assets。

**Complexity**

- High.

**Fits one ≤2 hour Codex task?**

- No; image pipeline and audio/cache/Pages should be separate bounded tasks within the phase.

**Done condition**

- representative routes meet transfer/Web Vitals budgets, dist/artifact gates run in CI, and source integrity remains identical.

## FR-P6 Final Acceptance and Release

**Scope**

- Full content/build/publish validation.
- Browser, visual, accessibility, Lighthouse and live Pages QA.
- Documentation and Git/GitHub/Pages closeout.

**Hard boundaries**

- No feature work or threshold weakening during acceptance；
- unavailable device/AT coverage must be reported, not invented；
- no merge if rights/privacy/source/build/test/Pages gate fails。

**Likely files**

- acceptance reports/manifests only；
- narrowly scoped fixes if a gate exposes an in-scope defect。

**Dependencies**

- P1–P5 complete and rights cleared.

**Expected changes**

- final evidence；
- stale-doc correction；
- release record；
- no runtime change unless a failed gate requires a small reviewed fix。

**Tests**

- one final full build；
- exact allowlist/dist audit；
- schemas/content；
- browser/axe/Lighthouse/visual；
- Pages artifact/live smoke。

**Browser QA**

- all representative routes；
- direct/back/invalid/error；
- desktop/mobile/tablet/short landscape/zoom；
- keyboard/dialog/audio；
- reduced motion/forced colors/print；
- live Pages project-subpath/MIME/cache。

**Performance gates**

- all P5 gates pass on local and live build；
- local dist, artifact and route transfer reported separately。

**Rights/privacy gates**

- current tree/history decision/dist/live all match approved release policy；
- no task scratch, profiles, HAR secrets or raw source committed。

**Rollback**

- revert/rollback one release commit or Pages deployment；
- preserve previous known-good artifact and evidence；
- no force operation without explicit authorization。

**Complexity**

- High but bounded if prior phases are truly complete.

**Fits one ≤2 hour Codex task?**

- Yes for acceptance/closeout when no remediation is needed; otherwise stop and create a focused fix task.

**Done condition**

- local main = origin/main = Pages commit；
- all required status lines PASS/VERIFIED；
- branch/worktree/stash/scratch clean；
- quality compromises 0。
