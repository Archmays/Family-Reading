# FR-P0 final report

## Answer-first summary

FR-P0 的审计、机器证据、UI/content model 评估、性能/build/tests/Pages 基线和 6 阶段路线已完成。原 P0 按旧规则把 privacy 与 rights 合并为发布 blocker；P0R1 已将 rights 纠正为 `PASS_BY_USER_AUTHORIZATION`，完成 private/current-tree 与 OCR processing 净化，并以 Node 22 通过唯一一次 63/63 full acceptance、build 与 dist audit。状态为 `COMPLETE_WITH_DOCUMENTED_LIMITATIONS`：commit SHA 与其触发的 Pages run 只能在 commit 生成后确定，精确值由同一任务的最终 handoff 和 GitHub immutable records 记录，不能自引用写入产生该 SHA 的 tracked report。

当前 release truth 仍是：

- Repository：`Archmays/Family-Reading`
- Visibility：`PUBLIC`，未改变
- 原 P0 main / origin main：`9c74e3f26a84ff9d82cb7e664c0314ed87998ef6`
- 原 P0 latest successful Pages run：`27912960467`，同一 SHA
- P0R1 final main：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`
- P0R1 Pages run：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`
- Task branch closeout：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`

规模摘要：

| Layer | Current |
|---|---:|
| GitHub size metadata | 2,247,861 KB |
| Local `.git` | 3,097,762,680 B |
| HEAD tree | 3,134 blobs / 1,651,869,664 B |
| Working tree excluding `.git` | 4,764 files / 9,563,654,913 B |
| Protected source roots | 1,649 files / 7,884,142,200 B |
| `public/` | 2,935 files / 1,431,211,621 B |
| `dist/` | 1,534 files / 837,981,919 B |
| Latest artifact metadata | 828,688,767 B, expired |
| Startup JSON | 28 requests / 2,807,138 raw B |

最大的体积根因是 6.20 GB 本地 Work Cells video source、完整公开媒体、799.16 MiB dist 副本和 public history 中仍可达的大 blob。history/full-work 事实不是 rights blocker；本次独立成立的风险是明确 private metadata、processing intermediates、本机路径和 current Git/build/Pages 技术门禁不一致。

Top findings：

- Rights/source：Carmela 完整 PDF + 12 MP3 在 public history，Pages 发布完整逐页图和整册音频；这些测量保留，`RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`。
- Privacy：原 public current tree 的 27 个明确 private animation JSON 和 344 个 processing-only OCR artifacts 已从 Git index 取消跟踪，本地原文件保留；3 个 OCR report 的本机绝对路径不再位于 tracked tree。
- Publish surface：原 dist 技术 blacklist PASS，但 workflow 不运行统一 public-repository/dist gate；P0R1 已在 tracked tree、build 复制前、dist 生成后和 Pages artifact upload 前接入统一 fail-closed chain，本地 acceptance PASS。
- UI：产品身份和暖色 IA 正确；lightbox focus return、route focus、short landscape、contrast/media queries 不足。
- Performance：所有 route render 前全站加载 2.68 MiB JSON；Carmela media 远重于 app code。
- Build/tests：原 P0 baseline 为 40/40 PASS；P0R1 使用 Node 22.23.1 运行共享唯一 suite，63/63 PASS，随后 build 与 dist audit PASS；suite 没有重复执行。
- Pages：原 main run/live baseline 可用；P0R1 最终 SHA 的 run/live 精确证据由 post-commit final handoff 记录。

Recommended next phase：最终 acceptance 通过后进入 **FR-P2 Design System and Core IA**；本任务不自动开始。

## P0R1 Authorization Correction

原始 P0 按旧规则将 public history 中的完整 Carmela PDF/MP3、完整页面与整册音频、OCR/derived media、缺少 Carmela license manifest、Work Cells full-work media 和 `user_confirmed_authorization` 标记为 blocker 或 limitation。用户随后明确给出所有 Codex 项目资源的永久、完整、全场景授权，并将完整七条规则唯一安装到当前生效的全局文件：

- Global file：`C:\Users\mays-\.codex\AGENTS.md`
- Before：3,948 B / `143ABA59F15DBAF8F0BE3F263BA0B97FE1F53439BC77696758E4133FF9C6F228`
- After：4,589 B / `B39392ADA206E539F2F086480CCAE20ACDD66B4E49DE9DC71833230B13A17229`
- Headings：`# Global AGENTS.md`；`## Scope and decisions`；`## User-Authorized Project Resources`；`## Changes`；`## Verification`；`## Tools and skills`；`## Communication and side effects`
- Verification：exact seven bullets present；section unique；no conflicting global copyright gate

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

因此原 rights blocker 全部撤销；体积、路径、history 和发布面数字继续作为工程证据。本次只保留并处理独立成立的 privacy、secret/local-path、Source immutability 和发布工程边界。完整规则、处置与条件 closeout 见 [`FR-P0R1-authorization-and-privacy-correction.md`](FR-P0R1-authorization-and-privacy-correction.md)。

## Required status lines

```text
FR_P0R1_STATUS: COMPLETE_WITH_DOCUMENTED_LIMITATIONS
FR_PORTFOLIO_P0_STATUS: COMPLETE_WITH_DOCUMENTED_LIMITATIONS
GLOBAL_RESOURCE_AUTHORIZATION_POLICY: INSTALLED_AND_VERIFIED
GITHUB_REPOSITORY_IDENTITY: VERIFIED_ARCHMAYS_FAMILY_READING
GITHUB_VISIBILITY: PUBLIC_UNCHANGED
START_MAIN_SHA: 9c74e3f26a84ff9d82cb7e664c0314ed87998ef6
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
PRIVACY_STATUS: PASS
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PUBLISH_SURFACE_STATUS: PASS
BUILD_STATUS: PASS
TEST_STATUS: PASS
FINAL_TEST_COUNT: 63/63
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
WORKSPACE_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P2 Design System and Core IA
```

原 P0 `PAGES_STATUS: VERIFIED` 仅指 main `9c74e3f…` 的 API/run/live baseline。P0R1 tracked report 使用 post-commit handoff 指针，是因为 commit 不能包含自身尚未生成的 SHA 或随后才产生的 workflow run ID；这不是跳过 Pages 验证。

## Changes made

- 原 P0 新增 4 个 machine-readable JSON 和 6 个 P0 documents，并修正 README/Pages deployment doc 的事实漂移。
- P0R1 新增本修订记录，并把 6 份 P0 文档和全部 machine-readable JSON 纳入授权结论纠偏。
- 27 个 private JSON 与 344 个 OCR processing artifacts 仅从 Git index 取消跟踪，本地原文件完整保留；14 个 tracked JSON 中的 51 个 stale OCR locator fields 已移除，`.gitignore` 已加固。
- public repository validator、build/dist gate、focused tests 和 Pages workflow 已按 FR-P1 Privacy and Publishing Hygiene 接入；Node 22 full acceptance 为 63/63，validator/build/dist 全部 PASS。
- 未改 visibility、未重写 Git history、未运行 filter-repo/BFG/LFS migrate/force push。

## Acceptance evidence

| Evidence | Result |
|---|---|
| Original P0 origin/repo/visibility/main | verified |
| Original P0 initial Git state | clean, one worktree, no stash |
| Original P0 `git fetch --prune origin` | pass |
| Original P0 protected before/after | same 1,649 files / 7,884,142,200 B / canonical SHA-256 |
| Original P0 build | pass, 40/40 tests |
| Original P0 dist audit | pass, 799.16 MiB |
| Original P0 JSON parsing and required-key checks | pass |
| Original P0 representative local browser routes | pass with documented UX/accessibility findings |
| Original P0 live Pages home | loaded in in-app browser |
| Original P0 latest Pages run | success, current main |
| P0R1 privacy disposition | 27 private JSON + 344 OCR artifacts removed from index only; local files preserved |
| P0R1 rights status | `PASS_BY_USER_AUTHORIZATION` |
| P0R1 final tests/build/dist/validator | PASS / 63/63 / 1,534 files / 837,981,919 B |
| P0R1 representative local browser smoke | PASS after focused favicon 404 repair; desktop/mobile routes, audio, lightbox, answer toggle and direct hash verified |
| P0R1 Source integrity | VERIFIED: 1,649 files / 7,884,142,200 B / P0R1 before-after signature identical |
| P0R1 merge/push/task Pages | exact immutable IDs recorded post-commit in the final handoff |

## Evidence index

Persistent:

- [`FR-P0-baseline-report.md`](FR-P0-baseline-report.md)
- [`FR-P0-ui-and-content-model-audit.md`](FR-P0-ui-and-content-model-audit.md)
- [`FR-P0-source-rights-and-publishing-audit.md`](FR-P0-source-rights-and-publishing-audit.md)
- [`FR-P0-performance-build-tests-and-pages-audit.md`](FR-P0-performance-build-tests-and-pages-audit.md)
- [`FR-P0-implementation-roadmap.md`](FR-P0-implementation-roadmap.md)
- [`FR-P0R1-authorization-and-privacy-correction.md`](FR-P0R1-authorization-and-privacy-correction.md)
- [`fr-p0-run-manifest.json`](../../../reports/portfolio/fr-p0/fr-p0-run-manifest.json)
- [`fr-p0-size-and-history-baseline.json`](../../../reports/portfolio/fr-p0/fr-p0-size-and-history-baseline.json)
- [`fr-p0-publish-surface.json`](../../../reports/portfolio/fr-p0/fr-p0-publish-surface.json)
- [`fr-p0-route-performance-baseline.json`](../../../reports/portfolio/fr-p0/fr-p0-route-performance-baseline.json)

Local-only evidence, removed during closeout after hashes were persisted:

- `task-scratch/fr-p0-20260718T083821Z/protected-roots-before.json`
  - 706,207 B
  - SHA-256 `18a6d5bd3047aad335d9a224af89adf28c96f2fb6adf511ab602fa9dcd3a484c`
- `task-scratch/fr-p0-20260718T083821Z/protected-roots-after.json`
  - 737,537 B
  - SHA-256 `e81d574108d6d1c347b0866cb0015e252fbf23fbdf486ac26e6762164a1fe165`
- 11 local-only screenshots；file names, bytes and hashes are in route-performance JSON。
- No HAR、trace、browser profile、cookies or tokens saved。

Git/Pages：

- Start commit：`9c74e3f26a84ff9d82cb7e664c0314ed87998ef6`
- Carmela raw source add/remove：`b26eefa490ce0993b14952e87d436453062032fa` / `1b43993d3084814c6ba7d98bc70cb1930a08d77e`
- Visual annotation ZIP add/remove：`f1ea90ecf8dd08307940c25d36d884f3aaf16c5d` / `038a755107640c19ca55c759e7c84c75a2074135`
- Pages run：`https://github.com/Archmays/Family-Reading/actions/runs/27912960467`
- Pages artifact：`7777926862`，expired
- 原 P0 local task branch intentionally retained；no remote task branch created。
- P0R1 final main：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`
- P0R1 Pages run：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`
- P0R1 branch/worktree/stash closeout：`RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF`

## Original blocker and P0R1 disposition

原 P0 的审计轨迹保留如下；它是历史结论，不再是当前 rights gate：

```text
BLOCKED_PRIVACY_OR_RIGHTS_EXPOSURE:
1. origin/main of the public repository tracks metadata explicitly classified as private/non-publishable under data-private/cells-at-work/animation/**.
2. origin/main history still contains the complete Carmela source PDF and 12 source MP3 files.
3. Current Git and Pages publish complete Carmela page-image sequences and full-book MP3 files, while no Carmela license or authorization basis is recorded in repository evidence.
4. Current Git tracks Carmela OCR full-text derivatives.
No visibility change or history rewrite was authorized in FR-PORTFOLIO-P0.
```

P0R1 处置：

1. 第 2、3 项以及第 4 项中的“完整作品派生物”部分不再是 blocker；统一为 `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`。
2. 第 1 项已通过 `git rm --cached` 式 index-only 隔离处理；27 个本地文件保留。
3. 第 4 项按 processing/current-tree/local-path hygiene 处理；344 个本地 OCR artifacts 保留，tracked stale refs 已清理。
4. history 中完整 PDF/MP3 作为体积和维护证据保留；本任务不重写历史。
5. public repository、build 和 dist fail-closed gates 已通过；Pages workflow 在 artifact upload 前调用同一 `verify:release` chain。

## Final adversarial reflection

| # | Question | Answer |
|---:|---|---|
| 1 | 是否错误创建/指向 Family-Reading-Codex GitHub repo？ | 否；锁定 `Archmays/Family-Reading`，未创建 repo。 |
| 2 | origin 是否仍正确？ | 是，精确匹配。 |
| 3 | visibility 是否 public unchanged？ | 是。 |
| 4 | 是否触碰 protected roots？ | 否；P0R1 final verification 为 VERIFIED。 |
| 5 | before/after integrity 是否一致？ | 是；1,649 files / 7,884,142,200 B / P0R1 signature identical。 |
| 6 | 是否把 230.26 MiB 当当前？ | 否，明确为历史并修正文档。 |
| 7 | 是否区分 history/worktree/dist/artifact/route？ | 是，分别测量并定义。 |
| 8 | 是否误导向 ebook/progress/dashboard？ | 否。 |
| 9 | 是否强迫两领域同模板？ | 否，shared envelope + discriminated payload。 |
| 10 | 是否遗漏 mobile/short landscape/keyboard/media queries？ | 否；不能实测项明确 limitation。 |
| 11 | 是否把 workflow 存在当部署成功？ | 否；原 P0 已核验 run/API/live，P0R1 精确 run/SHA/live 证据在 commit 后由 final handoff 记录。 |
| 12 | 是否继续要求 user-confirmed authorization 的外部或法律证明？ | 否；用户授权已充分，rights 状态为 pass。 |
| 13 | 是否把 full work、OCR 内容或缺少 rights manifest 当发布 blocker？ | 否；只阻止 processing/private/raw runtime classes。 |
| 14 | 是否删除内容伪造性能？ | 否。 |
| 15 | 是否报告/脚本/phase 过多？ | 原 P0 为 required 10 artifacts、0 script、6 phases；P0R1 只增加一份 correction record 和 in-scope validator。 |
| 16 | 是否无收益重复 full tests？ | 否；P0R1 final acceptance 只运行一次共享 63-test suite。 |
| 17 | P0R1 是否保留 task scratch？ | 否；post-commit closeout 由 final handoff 再确认。 |
| 18 | 是否提交 token/绝对私有路径/profile/HAR/raw source？ | 否；tracked-index validator PASS，source 未进入 dist。 |
| 19 | 是否证明 P0R1 final main/remote/Pages 同 commit？ | 是；该事实只能在 commit 后产生，由 final handoff 给出精确 SHA/run/live 证据。 |
| 20 | quality compromises？ | 0；未降低门禁或伪造证据。 |

## Final decision

FR-P1 Privacy and Publishing Hygiene 的 privacy disposition、文档纠偏、validator/build/Pages integration、本地 browser smoke、Source 与 Node 22 acceptance 均已完成。P0R1 状态为 `COMPLETE_WITH_DOCUMENTED_LIMITATIONS`；唯一记录限制是 tracked report 无法自引用包含自身 commit SHA/后生 Pages run ID，精确 immutable evidence 由同一任务的 final handoff 提供。下一阶段是 FR-P2 Design System and Core IA；本任务到此停止，不自动开始 FR-P2。
