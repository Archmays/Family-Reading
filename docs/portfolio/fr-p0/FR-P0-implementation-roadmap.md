# FR-P0 implementation roadmap

## Sequence

```text
FR-P1 Privacy and Publishing Hygiene — conditional completion in P0R1
  → FR-P2 Design System and Core IA
  → FR-P3 Carmela Companion Core
  → FR-P4 Science Topic and Route-Scoped Data Loading
  → FR-P5 Media and Pages Performance
  → FR-P6 Final Acceptance and Release
```

FR-P1 不再是 rights-clearance phase。P0R1 已把它重写并完成为 private/current-tree hygiene、absolute-path cleanup、public repository validator 和 build/Pages fail-closed integration；本地 Node 22 acceptance 与 Source 已 PASS，post-commit Git/Pages immutable evidence 由 final handoff 记录。P0R1 到此停止，不自动执行 FR-P2。

## FR-P1 Privacy and Publishing Hygiene

**Status**

- Privacy disposition implemented；validator/build/Pages integration and final acceptance underway.
- Rights status is fixed independently as `PASS_BY_USER_AUTHORIZATION`.
- Result：`COMPLETE_WITH_DOCUMENTED_LIMITATIONS`.

**Implemented and active scope**

- 27 个明确 private 的 animation authoring JSON 从 public Git index 取消跟踪，本地文件保留。
- 344 个 processing-only OCR artifacts 从 public Git index 取消跟踪，本地文件保留。
- 13 个 runtime JSON 中的 48 个 stale OCR locator fields 与 content template 中的 3 个同类字段已清理；runtime 继续使用既有 27-topic reduced projection。
- 三个 OCR report 的本机绝对路径不再位于 tracked current tree。
- `.gitignore` 取消 private JSON 反向放行，并覆盖 OCR、full text、processing reports、test/browser scratch。
- public repository validator 已接入 tracked current tree 的 private roots、OCR processing、absolute paths、secret patterns、scratch/HAR/trace/profile/log 检查。
- build/Pages 已接入同一 fail-closed chain：复制前 validator、build 后 dist audit、upload 前统一验证。
- 无 copyright/license clearance、rights manifest requirement、full-work/page/audio gate 或 history cleanup。

**Hard boundaries**

- 不删除、移动、压缩、覆盖或重编码本地 `source/`、`source-private/` 或其他 protected roots。
- 不改 visibility，不运行 history rewrite、BFG/filter-repo/LFS migrate、force push 或 reflog purge。
- 不做 UI redesign、media optimization 或 content rewrite。
- 不因 full-work、page sequence、audio length、OCR content 或 missing rights record 阻断。

**Likely files**

- `.gitignore`
- `scripts/validate-public-repository.mjs`
- `scripts/build.mjs`
- `scripts/audit-dist-assets.mjs`
- `package.json`
- `.github/workflows/pages.yml`
- focused `source-boundary` / `publish-surface` / `build` tests
- P0/P0R1 docs and machine-readable reports

**Dependencies**

- Global `User-Authorized Project Resources` policy installed and verified.
- No asset-level rights approval or visibility/history decision.

**Gate behavior**

- fail-closed tracked-file validation with human-readable and JSON output；
- Windows/Linux path normalization and case-insensitive blocking where required；
- validator before build copy；
- dist audit after build；
- Pages upload only after the same validation chain passes；
- reduced Work Cells runtime manifest boundary；
- no private/authoring/local-path fields in runtime payload；
- no copyright/license checks or rights-derived release hold。

**Tests**

- tracked `data-private` negative fixture；
- OCR processing path negative fixture with synthetic-fixture exception；
- Windows and Unix absolute paths；
- secret token；
- task scratch/HAR/trace；
- allowed repository-relative `source/...` reference；
- allowed Carmela page/audio/full-work path；
- allowed `user_confirmed_authorization`；
- build fails before artifact upload；
- valid JSON report；
- original 40/40 baseline retained；P0R1 final count 63/63。

**Browser QA**

- home、Carmela series/book、Work Cells series/heavy topic；
- no runtime 404 after private/OCR index cleanup；
- direct hash、lightbox、answer、audio metadata、mobile；
- final local result `PASS_NODE22_63_OF_63_VALIDATOR_BUILD_DIST`。

**Performance gates**

- do not optimize media in P0R1；
- ensure reduced manifest does not increase startup bytes；
- record final dist/artifact evidence without rerunning the full P0 size audit。

**Privacy/publishing gates**

- active private/OCR current-tree exposure removed；
- no real secret/PII/local absolute path in tracked current tree；
- Source and raw runtime-format exclusions preserved；
- Carmela pages/audio and all other user-authorized resources remain publishable；
- history retained unchanged。

**Rollback**

- revert the P0R1 commit if validation exposes an in-scope regression；
- never roll back by re-tracking explicitly private or processing-only files；
- preserve local source, local private/OCR files and before manifests。

**Complexity**

- High but bounded；no high-risk history operation.

**Fits one ≤2 hour Codex task?**

- Yes as P0R1 only with targeted checks and one final acceptance；no FR-P2 work.

**Done condition**

- `PRIVACY_STATUS: PASS`；
- `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`；
- validator/build/dist/Pages chain passes once；
- Source verified at 1,649 files / 7,884,142,200 B with identical P0R1 before-after signature；
- final main SHA and Pages run for that SHA recorded in the post-commit final handoff；
- clean main/worktree/stash/branch evidence recorded in the post-commit final handoff；
- quality compromises 0；
- stop before FR-P2。

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

- P0R1 privacy-safe current tree, public repository gate and stable public envelopes.

**Expected changes**

- named tokens for color/spacing/type/radius/focus；
- accessible route shell；
- distinct series card variants；
- 1024×400 non-sticky/scroll-safe layout；
- companion-only print hides navigation and heavy media by product layout。

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

**Privacy/publishing gates**

- only runtime-referenced thumbnails/screenshots used；
- print behavior follows companion-only product design, not a copyright restriction。

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
- No new book titles and no source/media reprocessing without an explicit task request；Source originals remain immutable.

**Likely files**

- `assets/app.js`
- `assets/styles.css`
- Carmela schema/envelope adapter
- focused Carmela/browser tests

**Dependencies**

- P0R1 public repository/runtime-reference gate；
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

**Privacy/publishing gates**

- only runtime-referenced pages/audio/generated assets；
- complete Carmela page sequences and 12 audio files remain allowed；
- companion text remains source-linked without raw local source path exposure。

**Rollback**

- keep adapter and UI changes separate；
- revert detail template without reverting P1 gates.

**Complexity**

- High.

**Fits one ≤2 hour Codex task?**

- No for all sections. Use two bounded tasks: accessible detail skeleton, then media/audio/question refinement.

**Done condition**

- first and complex book pass content, accessibility, responsive, performance and publishing gates with static Pages compatibility.

## FR-P4 Science Topic and Route-Scoped Data Loading

**Scope**

- Implement discriminated envelope and science-specific topic template.
- Split reduced Work Cells runtime data by series/topic/section.
- Load home/series/topic data on demand with per-domain fallback.
- Preserve sensitive medical guidance and source notes.

**Hard boundaries**

- No medical content rewrite without review；
- no raw EPUB/video/subtitle or private animation dialogue in runtime；no ebook-style full comic reading mode；
- no merge of distinct topics such as Cancer Cell and Cancer Cell II；
- no audio feature unless separately requested and supported by the runtime model。

**Likely files**

- runtime schemas/adapters；
- generated reduced manifests；
- `assets/app.js` science rendering/loading；
- build generator and tests；
- terminology/review status records。

**Dependencies**

- P0R1 public repository/runtime boundary；
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

**Privacy/publishing gates**

- reduced summaries only；
- no `zipPath`, `notesForCodex`, transcript/dialogue/private scene notes；
- each media ref must exist in the runtime manifest。

**Rollback**

- generate new runtime files alongside authoring source；
- adapter switch can revert without changing source manifests。

**Complexity**

- Very high.

**Fits one ≤2 hour Codex task?**

- No. Split into schema/generator and runtime/template tasks.

**Done condition**

- all 27 topics validate from one authoring source, representative routes are isolated and small, and no private/raw-source/authoring-only field enters dist.

## FR-P5 Media and Pages Performance

**Scope**

- Build responsive thumbnail/detail image derivatives from user-authorized, source-integrity-verified inputs.
- Define audio metadata/range strategy.
- Add content-hash/cache busting, dist/artifact budgets and Pages cache verification.
- Reduce upload/deploy cost without deleting source.

**Hard boundaries**

- No source overwrite/re-encode；
- no unrequested conversion of protected originals；
- no service worker/PWA/backend；
- no performance pass by removing required companion content。

**Likely files**

- media derivative manifest/pipeline；
- build and audit scripts；
- HTML/app image attributes；
- Pages workflow/cache headers where supported；
- performance tests/reports。

**Dependencies**

- P0R1 validated public resources and protected-source boundary；
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
- dist warn 500 MiB / fail 600 MiB, revisited after the P0R1 corrected publish surface；
- Pages artifact and workflow duration budget；
- LCP/CLS/INP targets set from first real Lighthouse baseline。

**Privacy/publishing gates**

- derivative manifest links every output to its source class for reproducibility；
- full-work output remains allowed by user authorization；
- source hash/integrity unchanged。

**Rollback**

- retain old runtime manifest for one release；
- switch manifest pointer back；
- never roll back by restoring explicitly private or processing-only public-tree artifacts。

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
- no merge if privacy/source/build/test/Pages gate fails。

**Likely files**

- acceptance reports/manifests only；
- narrowly scoped fixes if a gate exposes an in-scope defect。

**Dependencies**

- P1–P5 complete；global authorization remains `PASS_BY_USER_AUTHORIZATION`.

**Expected changes**

- final evidence；
- stale-doc correction；
- release record；
- no runtime change unless a failed gate requires a small reviewed fix。

**Tests**

- one final full build；
- exact runtime-reference/public-repository/dist audit；
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

**Privacy/publishing gates**

- current tree/dist/live all match the privacy and publishing policy；history remains unchanged；
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
