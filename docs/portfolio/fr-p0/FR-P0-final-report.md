# FR-P0 final report

## Answer-first summary

FR-P0 的审计、机器证据、UI/content model 评估、性能/build/tests/Pages 基线和 6 阶段路线已完成；发布 closeout 被 privacy/rights 暴露阻断。

当前 release truth 仍是：

- Repository：`Archmays/Family-Reading`
- Visibility：`PUBLIC`，未改变
- main / origin main：`9c74e3f26a84ff9d82cb7e664c0314ed87998ef6`
- Latest successful Pages run：`27912960467`，同一 SHA
- Task branch：`codex/fr-portfolio-p0-baseline`，保留为本地可审计分支
- Task branch 未 merge、未 push、未触发新 Pages deployment

规模摘要：

| Layer | Current |
|---|---:|
| GitHub size metadata | 2,247,861 KB |
| Local `.git` | 3,097,762,680 B |
| HEAD tree | 3,134 blobs / 1,651,869,664 B |
| Working tree excluding `.git` | 4,764 files / 9,563,654,913 B |
| Protected source roots | 1,649 files / 7,884,142,200 B |
| `public/` | 2,935 files / 1,431,211,621 B |
| `dist/` | 1,533 files / 837,983,345 B |
| Latest artifact metadata | 828,688,767 B, expired |
| Startup JSON | 28 requests / 2,807,138 raw B |

最大的根因是 6.20 GB 本地 Work Cells video source、完整公开媒体、799.16 MiB dist 副本和 public history 中仍可达的大 blob。最大风险不是空间本身，而是 current Git、history、Pages 与 rights/privacy policy 不一致。

Top findings：

- Rights/source：Carmela 完整 PDF + 12 MP3 在 public history；Pages 发布完整逐页图和整册音频但无权利记录。
- Privacy：27 个明确 private animation JSON 与 344 个 OCR artifacts 在 public current tree。
- Publish surface：dist 技术 blacklist PASS，但 rights-aware allowlist FAIL；workflow 不运行 dist audit。
- UI：产品身份和暖色 IA 正确；lightbox focus return、route focus、short landscape、contrast/media queries 不足。
- Performance：所有 route render 前全站加载 2.68 MiB JSON；Carmela media 远重于 app code。
- Build/tests：40/40 PASS；本机 Node 24 与 CI Node 22 不同；suite 职责过度集中。
- Pages：当前 main run/live baseline 可用；任务 commit 因 blocker 未部署。

Recommended next phase：**FR-P1 Safety and Publishing Containment**。

## Required status lines

```text
FR_PORTFOLIO_P0_STATUS: BLOCKED
GITHUB_REPOSITORY_IDENTITY: VERIFIED_ARCHMAYS_FAMILY_READING
GITHUB_VISIBILITY: PUBLIC_UNCHANGED
START_MAIN_SHA: 9c74e3f26a84ff9d82cb7e664c0314ed87998ef6
FINAL_MAIN_SHA: not_merged
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
PRIVACY_STATUS: BLOCKED
RIGHTS_STATUS: BLOCKED
PUBLISH_SURFACE_STATUS: FAIL
BUILD_STATUS: PASS
TEST_STATUS: PASS
PAGES_STATUS: VERIFIED
WORKSPACE_STATUS: CLEAN
MAIN_CURRENT_TRUTH: VERIFIED
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P1 Safety and Publishing Containment
```

`PAGES_STATUS: VERIFIED` 仅指当前 main `9c74e3f…` 的 API/run/live baseline；没有任务分支 deployment。

## Changes made

- 新增 4 个 required machine-readable JSON。
- 新增 6 个 required P0 documents。
- 修正 README 和 Pages deployment doc 的 “4 本/230.26 MiB/4 MP3” 事实漂移，并加入 rights blocker 引用。
- 未改 runtime、media、manifest、tests、workflow、source 或 Git history。
- 未创建 audit script；现有命令已足够生成 P0，新的 fail-closed validator 归入 P1，避免 P0 临时工具债。

## Acceptance evidence

| Evidence | Result |
|---|---|
| Origin/repo/visibility/main | verified |
| Initial Git state | clean, one worktree, no stash |
| `git fetch --prune origin` | pass |
| Protected before/after | same 1,649 files / 7,884,142,200 B / canonical SHA-256 |
| Build | pass, 40/40 tests |
| Dist audit | pass, 799.16 MiB |
| JSON parsing and required-key checks | pass |
| Representative local browser routes | pass with documented UX/accessibility findings |
| Current live Pages home | loaded in in-app browser |
| Latest Pages run | success, current main |
| Merge/push/task Pages | deliberately not run due blocker |

## Evidence index

Persistent:

- [`FR-P0-baseline-report.md`](FR-P0-baseline-report.md)
- [`FR-P0-ui-and-content-model-audit.md`](FR-P0-ui-and-content-model-audit.md)
- [`FR-P0-source-rights-and-publishing-audit.md`](FR-P0-source-rights-and-publishing-audit.md)
- [`FR-P0-performance-build-tests-and-pages-audit.md`](FR-P0-performance-build-tests-and-pages-audit.md)
- [`FR-P0-implementation-roadmap.md`](FR-P0-implementation-roadmap.md)
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
- Local task branch intentionally retained；no remote task branch created。

## Exact blocker and recovery

```text
BLOCKED_PRIVACY_OR_RIGHTS_EXPOSURE:
1. origin/main of the public repository tracks metadata explicitly classified as private/non-publishable under data-private/cells-at-work/animation/**.
2. origin/main history still contains the complete Carmela source PDF and 12 source MP3 files.
3. Current Git and Pages publish complete Carmela page-image sequences and full-book MP3 files, while no Carmela license or authorization basis is recorded in repository evidence.
4. Current Git tracks Carmela OCR full-text derivatives.
No visibility change or history rewrite was authorized in FR-PORTFOLIO-P0.
```

恢复入口是 P1：

1. 用户明确 containment/visibility decision；
2. current-tree private/OCR/full-work containment；
3. asset-level rights approval + exact allowlist；
4. build/workflow fail-closed gates；
5. 另行授权的 history decision；
6. re-baseline and release acceptance。

## Final adversarial reflection

| # | Question | Answer |
|---:|---|---|
| 1 | 是否错误创建/指向 Family-Reading-Codex GitHub repo？ | 否；锁定 `Archmays/Family-Reading`，未创建 repo。 |
| 2 | origin 是否仍正确？ | 是，精确匹配。 |
| 3 | visibility 是否 public unchanged？ | 是。 |
| 4 | 是否触碰 protected roots？ | 否。 |
| 5 | before/after integrity 是否一致？ | 是，count/bytes/canonical hash 相同。 |
| 6 | 是否把 230.26 MiB 当当前？ | 否，明确为历史并修正文档。 |
| 7 | 是否区分 history/worktree/dist/artifact/route？ | 是，分别测量并定义。 |
| 8 | 是否误导向 ebook/progress/dashboard？ | 否。 |
| 9 | 是否强迫两领域同模板？ | 否，shared envelope + discriminated payload。 |
| 10 | 是否遗漏 mobile/short landscape/keyboard/media queries？ | 否；不能实测项明确 limitation。 |
| 11 | 是否把 workflow 存在当部署成功？ | 否；核验 run/API/live。 |
| 12 | 是否把 user-confirmed authorization 当法律结论？ | 否。 |
| 13 | 是否新增公开 full work/OCR/dialogue/subtitle？ | 否。 |
| 14 | 是否删除内容伪造性能？ | 否。 |
| 15 | 是否报告/脚本/phase 过多？ | 仅 required 10 artifacts、0 script、6 phases。 |
| 16 | 是否无收益重复 full tests？ | 正式 acceptance 一次；两次早期 retry 是环境/锁失败并有记录。 |
| 17 | 是否保留 task scratch？ | 否；hash 固化后清理。 |
| 18 | 是否提交 token/绝对私有路径/profile/HAR/raw source？ | 否。 |
| 19 | 是否证明 final main/remote/Pages 同 commit？ | 当前 release truth 三者同为 `9c74e3f…`；task 未 merge。 |
| 20 | quality compromises？ | 0；没有降低门禁或伪造运行时证据。 |

## Final decision

报告可以作为 P1 输入；当前公开 release 不应因本报告被视为 rights-cleared。保留本地审计分支，不 merge、不 push、不删除分支，直到用户明确授权并完成 P1 containment。
