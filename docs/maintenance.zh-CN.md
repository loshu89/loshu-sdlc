# Maintenance guide

> [English](maintenance.md) · [简体中文](maintenance.zh-CN.md)

本页面面向日常维护 loshu-sdlc 的人——发布版本、管理依赖、重生成 eval golden 文件、处理偶发事故。如果你是插件的使用者（而非维护者），请参阅 [usage-guide.zh-CN.md](usage-guide.zh-CN.md)。

## 发布流程

发布流程是**机械化的**——跑一个脚本、推送、搞定。脚本会处理版本号升级、lockfile 更新、完整测试关卡以及发布 commit。

```bash
# 1. 本地发布：升级三个包、跑完测试关卡、提交、打 tag
node scripts/release.mjs 0.9.1

# 2. 推送 tag 触发 publish-ghcr.yml
git push origin main v0.9.1
```

`scripts/release.mjs` 会做这些事：

1. 升级 `packages/cli/package.json`、`packages/plugin/package.json`、`packages/templates/package.json` 里的 `version`
2. 运行 `pnpm install --no-frozen-lockfile` 更新 lockfile
3. 跑完整套测试关卡：`pnpm typecheck && pnpm test && pnpm build && pnpm lint && pnpm test:eval:strict`
4. 写发布 commit：`chore: release vX.Y.Z`
5. 创建本地 git tag `vX.Y.Z`

然后 `git push origin main vX.Y.Z` 会触发 `.github/workflows/publish-ghcr.yml`，它在干净的环境里重新跑一遍测试关卡，并把三个包发布到 GitHub Packages。

运行 release.mjs 之前的**起飞前检查清单**：

- [ ] `CHANGELOG.md` 里已经为新版本写好条目，覆盖所有 fix / feature
- [ ] `.superpowers/sdd/<plan>/progress.md` 中所有 SDD 任务都是 DONE
- [ ] 工作树是干净的（否则脚本拒绝执行）
- [ ] 本地分支与 `origin/main` 同步

如果版本号升级之后测试关卡挂了，**不要 amend**。先排查、修问题、提交修复 commit，然后重新跑 `release.mjs` 做新的发布 commit。Tag 清理见下文。

### Tag 清理

如果你过早打了 tag（在 SDD 任务落地之前），那个 tag 会落在不包含所有 fix 的发布 commit 上。按下面方式干净地重新打 tag：

```bash
git tag -d v0.9.1                     # 删除本地 tag
# ... 做修复工作 ...
git tag -a v0.9.1 -m "..." HEAD      # 在新 HEAD 上重新打 tag
git push origin :refs/tags/v0.9.1     # 删除远端 tag（如果已经推送过）
git push origin v0.9.1                # 推送修正后的 tag
```

## Dependabot workflow

仓库自带一份 Dependabot 配置，位于 `.github/dependabot.yml`，同时覆盖 npm 与 GitHub Actions。Dependabot 每周运行一次，把 PR 分组成 `production-dependencies` 和 `development-dependencies`。

### 周节奏

Dependabot 每周一开 PR。默认规则：
- **补丁版本与小版本升级**会以 PR 形式发出，**CI 通过后即可放心合并**
- 一份精选清单里的**大版本升级**默认被**忽略**——这些包在团队准备就绪时各自会有专属的迁移计划

### 大版本封顶清单

当前 `.github/dependabot.yml` 中的条目：

| Package | Capped because |
|---|---|
| `typescript` | Major 版本迁移需要专门规划 |
| `eslint` | 同上 |
| `vitest` | 同上 |
| `@typescript-eslint/eslint-plugin` | 同上 |
| `@typescript-eslint/parser` | 同上 |
| `@changesets/cli` | 同上 |
| `execa` | v10 通过 `TEXT_ENCODINGS.union` API 变更破坏了 `closed-loop.test.ts` |
| `chalk` | v6 要求 Node 22；我们目标是 `engines.node >=20` |
| `ejs` | v6 移除了 `client` 选项；跨 3 个大版本的跳跃需要审计 |
| `inquirer` | v14 是 umbrella 包的重写；跨 5 个大版本的跳跃需要审计 |
| `ulid` | v3 移除了 `factory`/`detectPrng`；需要审计使用方式 |

### 新增封顶条目

当你遇到某个包的大版本升级风险过大、不适合放进每周自动升级时：

```yaml
# 在 .github/dependabot.yml 的 npm update 下：
ignore:
  - dependency-name: "<package>"
    update-types: ["version-update:semver-major"]
```

务必附上注释说明**为什么**要封顶——未来的维护者会需要它。

### 移除封顶条目（迁移完成之后）

一旦你完成了新大版本的迁移：

1. 在对应的 `package.json` 里升级依赖
2. 更新 `.github/dependabot.yml` 中的封顶条目，移除该包
3. 跑完整套测试关卡，确认没有回归
4. 一起提交这两处改动

### 关闭有问题的周 PR

如果 dependabot 开出的 PR 合并起来风险较大：

```bash
gh pr close <num> --comment "Closing — <reason>"
```

未来的周循环不会重新生成它（底层封顶或不封顶的状态决定这一点）。

## Eval 套件

`tests/evals/` 下的 eval 套件是 golden 文件 harness——每个阶段都有故事，它们对 fixture 输入运行 SDLC，再把输出与录制的 `.expected.md` 文件做比对。

### 运行

```bash
pnpm test:eval                # 宽松模式（默认）：shingle cosine ≥ 0.85
pnpm test:eval:strict         # 严格模式（CI 关卡）：精确匹配
pnpm test:eval --story <name> # 单个 story
pnpm test:eval:json            # 输出 JSON，供工具使用
pnpm test:eval:record         # 用当前输出覆盖 .expected 文件
```

宽松模式比较宽容，会放过小幅措辞改动。严格模式是 CI 关卡，能抓出非预期的漂移。

### 新增 story

1. 选好阶段目录：`tests/evals/{plan,design,build,test,deploy,maintain}/`
2. 新建目录 `tests/evals/<stage>/<NN>-<topic>/`
3. 加入输入 fixture（`input.md` 或类似文件）以及 `.expected.md` golden 文件
4. 跑 `pnpm test:eval --story <your-story>` 看看有多接近
5. 满意之后跑 `pnpm test:eval:record --story <your-story>` 写入 golden

### 在有意变更后重生成 golden

如果你改了会合法地影响 eval 结果的行为（例如 `intent.md` 多了新章节）：

```bash
# 只更新应当变化的那些 story —— 提交前仔细 review diff
pnpm test:eval:record --story <affected-stories>
git diff tests/evals/   # 仔细 review —— 非预期的 diff = bug
```

永远不要不 review diff 就跑 `pnpm test:eval:record`。每个被修改的 golden 都应当对应一项你刻意做的行为变更。

## CHANGELOG 规范

`CHANGELOG.md` 遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 格式。

添加条目时：

- 在顶部新增版本章节（`## [X.Y.Z] - YYYY-MM-DD`）
- 子章节：`### Added`、`### Changed`、`### Deprecated`、`### Removed`、`### Fixed`、`### Security`
- 每条都是一行 bullet，只对应一项逻辑变更
- 每条 bullet 末尾附上 commit SHA，便于追溯
- 每个版本末尾的 `### Notes` 子章节用来收集超出本次范围的事项以及已知的后续工作

CHANGELOG 在发布 commit 之前写好（属于每次发布的 SDD 计划的一部分）。发布脚本会把新章节一起塞进发布 commit。

## 依赖管理策略

- **生产依赖：** 仅通过 SDD 计划引入；每一项都需要在计划中给出引入理由
- **开发依赖：** 相对宽松；为工具链临时添加是 OK 的
- **Node 版本：** `package.json` 中声明 `engines.node >=20.0.0`。Node 大版本升级需要专门的迁移计划，因为它会影响脚手架的使用者
- **pnpm 版本：** 由 `packageManager` 字段管理；绝不要通过 dependabot 升级（在 `.github/dependabot.yml` 中被封顶）

## 事故处理

当 `main` 上的 CI 挂掉时：

1. 查看失败的 workflow 日志
2. 如果原因是最近一次合并，用 `git revert <sha>` 回退那次合并，并开一个 issue
3. 如果原因是 flaky 测试，用 `gh run rerun` 重跑——不要靠改代码掩盖
4. 如果原因是真实 bug，在 hotfix 分支上修复，按正常 PR 流程合并

对于以非平凡方式挂掉 CI 的 dependabot PR，比起强推合并，更推荐关掉并附上说明——下个周循环可能产出更小、更安全的 PR。

## Where to find things

| Resource | Path |
|---|---|
| Current spec | `docs/superpowers/specs/loshu-sdlc/spec.md` |
| Version-specific designs (v0.7.0+) | `docs/superpowers/specs/2026-09-*.md` |
| Implementation plans | `docs/superpowers/plans/2026-09-*.md` |
| Internal reports + retros | `docs/internal/` |
| In-flight SDD ledger | `.superpowers/sdd/<plan>/progress.md` (gitignored) |
| CI workflow | `.github/workflows/ci.yml` |
| Publish workflow | `.github/workflows/publish-ghcr.yml` |
| Release script | `scripts/release.mjs` |