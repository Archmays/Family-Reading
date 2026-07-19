# FR-PORTFOLIO-P2 final report

## Outcome

FR-P2 已把 Family Reading 的入口体验升级为 **Warm Companion Atlas / 温暖伴读图册**。首页仍只选择 Carmela 或 Work Cells；Carmela 形成成熟绘本书架，Work Cells 按 24 个真实类别形成科学主题馆。两者共享 token、shell、breadcrumb、route focus 和无障碍原语，但保留领域颜色、图像比例、metadata 和语言差异。

本阶段没有加入 dashboard、reading management、check-in、statistics、ranking、badge、account、login、admin、ebook main body 或 OCR child-facing main text，也没有提前执行 FR-P3、FR-P4 或 FR-P5。

## Delivered

### P2-A

- semantic color/type/space/radius/shadow/layout tokens；
- compact application shell、skip link、breadcrumb、main landmark 和 live region；
- route title、H1 focus、section target、Back/Forward return context；
- invalid route/series/book/topic/section 和 loading/error/empty states；
- 44 px control and focus system；
- reduced motion、forced colors、200% reflow、text spacing、short landscape；
- companion-only A4 print；
- lightbox dialog、focus trap、inert、Escape/arrows/close、restore 和 cleanup；
- answer `aria-controls` / `aria-expanded`。

### P2-B

- 首页两系列入口和纸质书优先提示；
- shared series-entry card with domain distinction；
- 12 册 Carmela shelf，one primary entry + restrained secondary links；
- 24 类 / 27 topic Work Cells IA；
- independent `topic-card`；
- mobile collapsed category navigation；
- responsive grids、fallback 和 keyboard flow。

## Acceptance evidence

| Gate | Result |
|---|---|
| design direction | WARM_COMPANION_ATLAS |
| product boundary | PASS |
| home IA | PASS |
| Carmela series | PASS |
| Work Cells series | PASS |
| route shell/focus/error | PASS |
| dialog and answer controls | PASS |
| responsive/short landscape | PASS |
| reduced motion/forced colors | PASS |
| 200% reflow/text spacing | PASS |
| companion print | PASS |
| persistent visual baseline | 6 WebP / 246,686 B |
| startup JSON | 28 requests / 2,810,496 B unchanged |
| runtime dependencies | 0 |
| external fonts/scripts | 0 |
| new JS modules | 1 |
| all JS raw | 63,738 B |
| all CSS raw | 38,624 B |
| dist | 838,027,007 B; P0 delta 45,088 B |
| targeted P2 tests | 11/11 PASS |
| final Node 22 test acceptance | effective 74/74 PASS; one full invocation plus one affected-file remediation |
| public repository validator | PASS |
| dist audit | PASS |

The final acceptance invoked `scripts/verify-release.mjs` once. Its full test pass initially reported 73/74 because one legacy source-regex still required the pre-P2 card template without addressable deep-link ids; runtime and browser evidence were already correct. Only that assertion was updated, the affected `tests/mvp.test.mjs` file then passed 40/40, and the previously unreached validated build/dist audit passed with the same Node 22 executable. The full suite was not repeated, as required; the final effective test set is 74/74.

## Source and authorization

`RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION` remains unchanged. No copyright or license re-audit was started, and no resource was removed, narrowed, replaced or withheld for rights reasons.

P2 current before/after protected-root aggregate:

```text
ROOTS: source; data-private; public/assets/cells-at-work/pages-by-volume; data/cells-at-work/source-assets; archived
FILES: 1,278
BYTES: 7,882,956,334
P2_COMPACT_JSON_SHA256_BEFORE: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
P2_COMPACT_JSON_SHA256_AFTER: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
```

Historical P0R1 archive recorded 1,649 files / 7,884,142,200 B / signature `444a3a11c2507608504678aaaeb7a9ca43a2238a0d19f8762e92e7d5f423b9db`. The 371-file / 1,185,866-byte difference already existed at FR-P2 start and corresponds to ignored/private working material absent before this task. P2 neither restores nor mutates it. This is the only documented limitation and does not weaken the current P2 before/after proof.

## Performance non-regression

| Metric | Baseline | P2 | Result |
|---|---:|---:|---|
| startup JSON requests | 28 | 28 | PASS |
| startup JSON raw bytes | 2,810,496 | 2,810,496 | PASS |
| JS warning / hard | 75 / 90 KiB | 62.24 KiB | PASS |
| CSS warning / hard | 40 / 55 KiB | 37.72 KiB | PASS |
| new JS modules | ≤2 | 1 | PASS |
| runtime dependencies | 0 | 0 | PASS |
| external fonts/scripts | 0 | 0 | PASS |
| dist delta hard gate | ≤5 MiB | 45,088 B | PASS |

No home/series image was added, lazy loading remains, no media was copied into dist by the evidence workflow, and no route-scoped loading or manifest sharding was introduced.

## Final reflection

1. 首页是否变成 dashboard？否；只有两系列入口与一条使用提示。
2. 是否加入 progress/check-in/account？否。
3. 是否错误重启版权审计？否。
4. 是否触碰 Source？否；current before/after signature identical。
5. 是否引入 framework/bundler/runtime dependency？否。
6. 是否拆分过多文件？否；只新增一个 4.8 KB a11y module。
7. 是否提前做 P3/P4/P5？否。
8. Carmela 与 Work Cells 是否仍有领域差异？是。
9. science card 是否仍错误复用 book-card？否；使用独立 `topic-card`。
10. route focus 是否真实修复？是；浏览器 route/section/back 证据通过。
11. lightbox trap/restore 是否真实通过？是。
12. reduced motion/forced colors/1024×400 是否通过？是。
13. focus/contrast/44 px 是否通过？是。
14. print 是否只打印 companion 内容？是。
15. startup JSON 是否未增加？是，28 / 2,810,496 B。
16. 是否产生过多 screenshot？否；恰为 6 张持久 WebP。
17. 是否重复 full tests？否；full suite 只运行一次，失败的旧模板断言仅做 affected-file 40/40 复验。
18. main/remote/Pages 是否同 SHA？由 post-commit final handoff 记录精确 SHA/run。
19. workspace 是否 clean？由 post-commit final handoff 验证。
20. quality compromises 是否为 0？是。

## Git and Pages resolution

Tracked artifacts cannot contain their own final commit SHA without creating a self-reference. Therefore these fields are resolved after commit in the final handoff:

```text
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_PAGES_RUN: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
WORKSPACE_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
```

The exact values are also represented in the Git commit, push and Pages evidence returned with the completed task.

## Local acceptance status

```text
FR_PORTFOLIO_P2_LOCAL_ACCEPTANCE: PASS
DESIGN_DIRECTION: WARM_COMPANION_ATLAS
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
PRODUCT_BOUNDARY_STATUS: PASS
DESIGN_SYSTEM_STATUS: PASS
HOME_IA_STATUS: PASS
CARMELA_SERIES_STATUS: PASS
WORK_CELLS_SERIES_STATUS: PASS
ACCESSIBILITY_STATUS: PASS
RESPONSIVE_STATUS: PASS
SHORT_LANDSCAPE_STATUS: PASS
REDUCED_MOTION_STATUS: PASS
FORCED_COLORS_STATUS: PASS
PRINT_STATUS: PASS
PERFORMANCE_NON_REGRESSION: PASS
FINAL_TEST_COUNT: 74/74
BUILD_STATUS: PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PASS
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P3 Carmela Companion Core
```

FR-P3 was not started.
