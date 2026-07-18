# FR-P0R1 authorization and privacy correction

## Answer first

FR-P0R1 撤销了原 FR-P0 基于旧规则作出的版权/许可阻断结论，并把 `FR-P1 Safety and Publishing Containment` 纠正为本次执行的 `FR-P1 Privacy and Publishing Hygiene`。用户资源的权利状态已经由全局规则确定为 `PASS_BY_USER_AUTHORIZATION`；本次只处理独立成立的 private/current-tree、OCR processing、本机路径和发布工程问题。

27 个明确 private 的 JSON 与 344 个 processing-only OCR artifacts 已从公开 Git index 取消跟踪，但本地原文件和内容全部保留。Node 22 的唯一 full acceptance 为 63/63，public validator、build、dist audit 和 Source 复核均 PASS。本记录为 `COMPLETE_WITH_DOCUMENTED_LIMITATIONS`：tracked report 无法包含产生自身的 commit SHA 或随后才产生的 Pages run ID，精确 main/run/live/clean-closeout immutable evidence 由同一任务的 post-commit final handoff 提供；FR-P2 不在本任务中启动。

```text
FR_P0R1_STATUS: COMPLETE_WITH_DOCUMENTED_LIMITATIONS
GLOBAL_RESOURCE_AUTHORIZATION_POLICY: INSTALLED_AND_VERIFIED
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
PUBLISH_SURFACE_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
BUILD_STATUS: PASS
TEST_STATUS: PASS
FINAL_TEST_COUNT: 63/63
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
WORKSPACE_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P2 Design System and Core IA
```

## Global authorization policy

| Item | Evidence |
|---|---|
| Active global file | `C:\Users\mays-\.codex\AGENTS.md` |
| Before size | 3,948 B |
| Before SHA-256 | `143ABA59F15DBAF8F0BE3F263BA0B97FE1F53439BC77696758E4133FF9C6F228` |
| After size | 4,589 B |
| After SHA-256 | `B39392ADA206E539F2F086480CCAE20ACDD66B4E49DE9DC71833230B13A17229` |
| Verified headings | `# Global AGENTS.md`; `## Scope and decisions`; `## User-Authorized Project Resources`; `## Changes`; `## Verification`; `## Tools and skills`; `## Communication and side effects` |
| Section verification | exact seven bullets present; section unique; no conflicting global copyright gate |

Exact installed section:

```md
## User-Authorized Project Resources

- Treat every resource that the user places in, supplies to, references from, or explicitly designates for any Codex project as fully authorized by the user for all intended project uses and all usage contexts. This authorization includes inspection, access, copying, extraction, OCR, transcription, transformation, adaptation, editing, generation of derivatives, integration, publication, public or private deployment, redistribution, presentation, archiving, and cross-media use.
- Do not request additional copyright, license, ownership, provenance, or permission evidence for these resources. Do not run copyright or licensing clearance, and do not block, delay, downgrade, redact, remove, replace, omit, restrict, or redesign project work because of copyright or licensing concerns, unless the user explicitly requests a rights audit or explicitly states a narrower restriction for a specific resource or project.
- Missing, incomplete, draft, historical, or project-local rights metadata must not become a blocker. Labels or fields such as `draft`, `licensed-media`, `copyrightMode`, `licenseBasis`, `user_confirmed_authorization`, missing license manifests, full-work assets, or historical full-work Git blobs do not override this authorization.
- When a report requires a rights status, use `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION` or an equivalent passing status. Do not use `BLOCKED`, `FAIL`, or a release hold solely because of copyright, licensing, provenance, attribution, full-work publication, or missing rights records.
- Do not change repository visibility, remove project resources, narrow the publishing surface, rewrite Git history, migrate assets, or force-push solely for copyright, licensing, or rights-clearance reasons.
- Continue to enforce independent non-copyright safeguards: secrets and credentials, personal or confidential information, explicit privacy classifications, accidental publication of task scratch or local absolute paths, source-file immutability, repository identity, destructive Git operations, platform technical restrictions, product boundaries, and user-specified exclusions.
- This global authorization supersedes generic project-local copyright or rights gates, reports, templates, validators, and prior conclusions. A narrower project-specific rule applies only when the user explicitly creates that exception.
```

## P0R1 Authorization Correction

原始 FR-P0 按旧规则把以下事实标成版权 blocker 或 release hold：

- 完整 Carmela PDF 与 12 个源 MP3 曾进入 public main history；
- Pages 发布 320 张 Carmela 页面图与 12 个整册 MP3；
- Carmela 没有 repository-local license/authorization manifest；
- Carmela OCR、companion text 和 generated images 是派生内容或缺少 asset-level rights record；
- Work Cells full-page/derived media 只有 `user_confirmed_authorization`；
- 发布需要 asset-level rights approval。

用户随后明确给出所有 Codex 项目资源的永久、完整、全场景授权，并把规则安装到当前生效的全局 `AGENTS.md`。因此上述事实继续作为 history、体积、来源定位和发布面测量保留，但不再阻断使用、派生、公开发布、Pages、merge 或 push。缺少 rights manifest、完整作品、页序列、音频长度、OCR 内容和历史 full-work blob 都不得重新包装成 provenance blocker。

纠正后的统一结论是：

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
```

## Privacy files disposition

- 原 P0 记录的 27 个 tracked JSON、284,928 Git blob bytes 全部位于明确 private/non-publishable 的 animation authoring 范围。
- 这些文件已从 Git index 取消跟踪；没有删除、移动、截断或覆盖本地文件。
- runtime 继续使用既有 27-topic reduced `draft-manifest` projection；其中 23 topics / 51 scenes 使用 reduced animation references。
- public runtime 不读取 private scene notes、raw source locator、完整 transcript/dialogue 或 authoring-only notes。
- `.gitignore` 已取消对这些 private JSON 的反向放行，并阻止同类文件重新进入 public current tree。

## OCR disposition and absolute-path cleanup

- 原 P0 记录的 344 个 tracked OCR artifacts 保留原测量：864,508 Git blob bytes / 900,400 working bytes。
- 构成为 320 个页面 OCR artifacts、12 个 `full-text.txt` 和 12 个 OCR reports；其中 3 个 report 含本机绝对路径。
- 344 个 processing-only artifacts 已从 Git index 取消跟踪，但全部本地文件保留。
- 13 个 runtime JSON 中的 48 个 stale OCR locator fields，以及 content template 中的 3 个同类字段，均已移除；runtime/build 不依赖 processing-only OCR。
- `.gitignore` 已覆盖 OCR directories、`full-text.txt` 和准确的 processing-report 模式。
- 有界扫描未发现 secret、credential 或 PII。OCR 中的作品正文属于用户已授权资源内容，不是个人信息或隐私 finding。
- 本机绝对路径不再位于 tracked current tree；最终全树复核由统一 acceptance 确认。

## Public repository validator and release gates

已接入的门禁只检查 tracked/public repository 与发布工程边界：明确 private roots、OCR processing intermediates、本机绝对路径、secret patterns、task scratch、HAR、trace、browser profile、logs，以及 dist 中的 source/private/raw processing classes。它不检查 copyright/license、不要求 rights manifest、不限制 full-work/page sequence/audio length，也不要求清理历史 PDF/MP3。

validator、build、dist audit、focused tests 和 Pages workflow 的统一结果为：

```text
LOCAL_RELEASE_ACCEPTANCE: PASS
NODE_VERSION: 22.23.1
TESTS: 63/63 PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
BUILD: PASS
DIST_AUDIT: PASS (1,534 files / 837,981,919 B)
PAGES_WORKFLOW_GATE: verify:release before artifact upload
PAGES_RUN: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
```

`verify:release` 只调用一次共享 test entrypoint，再运行含 pre-copy validator 与 post-copy dist audit 的 build。最终 SHA 与远端 Pages run 是 post-commit 事实，由 final handoff 机械记录，避免在 tracked report 中伪造自引用 SHA。

本地 Playwright CLI representative smoke 覆盖 homepage、Carmela series/book、answer toggle、lightbox、audio metadata、Work Cells series、heavy topic direct hash/reload 和 390×844 mobile。首轮发现的唯一网络错误是缺少 favicon 导致的 404；加入 project-relative static SVG 后只重跑受影响 test/build/smoke，最终 console error、失败请求、private/OCR 请求和 broken image 均为 0。

## Preserved P0 evidence

P0R1 不重跑完整仓库体积审计，也不重生成全部 UI 截图。以下 P0 测量继续有效并保留：

- GitHub size metadata、`.git`、HEAD tree、working tree、protected roots、public、dist 和 Pages artifact 分层数字；
- 320 个 Carmela 页面、12 个音频、344 个 OCR、27 个 private JSON；
- startup 28 JSON / 2,807,138 raw B；
- Work Cells manifest 2,445,765 B、52,214 行、27 topics、991 annotations；
- 40/40 原 P0 test baseline；
- UI/focus/short-landscape/contrast/media-query/test-coupling findings；
- 原 main Pages run `27912960467` 与 SHA `9c74e3f26a84ff9d82cb7e664c0314ed87998ef6`；
- 原 Source before/after count、bytes 和 canonical SHA-256。

## Source integrity

本次没有以版权、隐私或性能为由删除、移动、重命名、压缩、覆盖或重编码 `source/**`、`source-private/**` 或其他 protected roots。P0R1 before/after 结果：

```text
FILES: 1,649
BYTES: 7,884,142,200
P0R1_COMPACT_JSON_SHA256_BEFORE: 444a3a11c2507608504678aaaeb7a9ca43a2238a0d19f8762e92e7d5f423b9db
P0R1_COMPACT_JSON_SHA256_AFTER: 444a3a11c2507608504678aaaeb7a9ca43a2238a0d19f8762e92e7d5f423b9db
STATUS: VERIFIED_UNCHANGED
```

## Git and Pages closeout

本任务禁止 history rewrite、filter-repo、BFG、LFS migrate、force push、reflog purge 和 visibility change。main、Pages 与 branch/worktree/stash/scratch 是 commit 后才能完成的外部状态，因此 tracked report 使用明确 handoff 指针：

```text
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
PAGES_RUN: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
GIT_CLOSEOUT: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
```

FR-P1 Privacy and Publishing Hygiene 已完成 privacy disposition、绝对路径净化、public repository validator、build/Pages fail-closed integration 和本地 acceptance。下一阶段是 `FR-P2 Design System and Core IA`；本任务不自动开始 FR-P2。
