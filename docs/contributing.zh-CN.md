# 为 loshu-sdlc 做贡献

> [English](contributing.md) · [简体中文](contributing.zh-CN.md)

感谢你的关注！loshu-sdlc 是一款实现 AI-Native SDLC 的 Claude Code 插件。本页面面向**在 loshu-sdlc 本身之上工作**的人——不是插件的使用者（那部分请看 [usage-guide.zh-CN.md](usage-guide.zh-CN.md)）。

## 开发环境配置

1. 克隆仓库：`git clone https://github.com/loshu89/loshu-sdlc.git`
2. 安装 Node 20+ 和 pnpm 9+
3. `pnpm install`（使用 npm workspaces）
4. `pnpm typecheck` —— TypeScript strict 模式覆盖所有包
5. `pnpm test` —— 238 个单元 + 集成测试
6. `pnpm build` —— CLI 编译完成；把插件打包进 CLI 包
7. `pnpm test:eval` —— 跨 6 个 SDLC 阶段的 30 个 golden 文件 eval 故事
8. `pnpm lint` —— ESLint

## 仓库结构

```
loshu-sdlc/
├── packages/
│   ├── plugin/                     # Claude Code 插件（markdown + JSON，无需 build）
│   │   ├── commands/               # 9 个斜杠命令（sdlc-*.md）
│   │   ├── agents/                 # SDLC 专属的子代理
│   │   ├── skills/                 # 创作型技能 + 策略默认值
│   │   ├── hooks/                  # 7 个强制脚本
│   │   └── schemas/                # 6 个制品对应的 JSON schema
│   ├── cli/                        # Node/TS 脚手架 + 维护 CLI
│   │   ├── src/
│   │   │   ├── bin/                # create-loshu-sdlc-app + loshu-sdlc 入口
│   │   │   ├── commands/           # CLI 子命令（create、validate、doctor、……）
│   │   │   └── lib/                # render、git、plugin-bundler、prompts、validate、bands
│   │   └── tests/                  # vitest 单元 + 集成测试
│   └── templates/                  # 起始项目模板（minimal、full）
├── tests/
│   └── evals/                      # 跨 6 个阶段的 30 个 golden 文件 eval 故事
├── docs/
│   ├── installation.md             # 安装路径
│   ├── getting-started.md          # 教程
│   ├── usage-guide.md              # 参考手册
│   ├── contributing.md             # 本文件
│   └── maintenance.md              # 面向维护者
├── scripts/                        # release.mjs + copy-plugin.mjs
└── .github/workflows/              # ci.yml + publish-ghcr.yml
```

> 设计规范、实施计划和内部回顾位于 `docs/superpowers/` 和 `docs/internal/`。这些目录保留在维护者的本地磁盘上，但被排除在公共仓库之外（见 `.gitignore`）。贡献者无需编写或阅读它们——维护者会为每个版本驱动规范和计划。

## 提交规范

Conventional Commits。Scope：`feat:` / `fix:` / `refactor:` / `test:` / `docs:` / `chore:` / `style:`。

- 一次提交只对应一个逻辑改动
- 提交信息正文解释**为什么**，而不是做了什么
- 破坏性变更使用 `BREAKING CHANGE:` footer
- 永远不要提交 `.superpowers/sdd/`（已在 .gitignore 中）

## 新增一个斜杠命令

1. 在 `packages/plugin/commands/sdlc-<name>.md` 编写命令
2. 同时镜像到 `packages/cli/plugin/commands/sdlc-<name>.md`（打包副本；`pnpm build` 时重新生成）
3. 如果该命令产出新的制品类型，在 `packages/plugin/schemas/<artifact>.schema.json` 添加对应的 JSON schema
4. 更新 `packages/plugin/skills/` 中相关的创作型技能
5. 在 `tests/evals/<stage>/` 下添加 eval 故事
6. 如果命令需要读写状态，在 `packages/cli/src/lib/` 中新增代码
7. 更新 `docs/usage-guide.md` 中的斜杠命令表格
8. 如果命令会触发 Hook，更新 `packages/plugin/.claude-plugin/hooks.json` 中的斜杠命令派发配置

## 新增一个 CLI 子命令

1. 在 `packages/cli/src/commands/<name>.ts` 实现
2. 在 `packages/cli/src/bin/loshu-sdlc.ts` 添加派发分支
3. 在 `packages/cli/tests/` 添加单元 + 集成测试
4. 更新 `docs/usage-guide.md` 中的 CLI 命令表格
5. 如果它会产出制品，在一个样例上跑 `loshu-sdlc test --fix` 并验证断言全部通过

## 新增一个 eval 故事

1. 选择阶段目录：`tests/evals/{plan,design,build,test,deploy,maintain}/`
2. 新建一个目录，放置输入 fixture 和一个 `.expected.md` golden 文件
3. 运行 `pnpm test:eval --loose` 看自己距离目标还有多远
4. 满意之后，运行 `pnpm test:eval:record` 写入 golden 文件

## 新增一个 Hook

1. 把 shell 脚本加到 `packages/plugin/hooks/<name>.sh`
2. 在 `packages/plugin/hooks/hooks.json` 注册（`PostToolUse` 或 `PreToolUse` 匹配器）
3. 在 `packages/plugin/hooks/tests/<name>.test.sh` 添加 shell 测试
4. 如果该 Hook 由某个斜杠命令触发，更新对应的 `commands/sdlc-*.md` 注明这一行为
5. 更新 `docs/usage-guide.md` 中的 Hook 表格

## 代码风格

- TypeScript strict 模式（`tsconfig.base.json` 在所有包中启用）
- ESLint 在 CI 中运行；提交前执行 `pnpm lint`
- 优先小而专注的函数；可读性胜过巧妙
- 注释解释**为什么**，而不是做了什么
- 与已有代码风格保持一致

## 测试纪律

- 新行为必须有测试。没有测试的 PR 会被打回修改。
- 使用 vitest。测试文件位于 `packages/cli/tests/**` 和 `tests/**`。
- CLI 的 `vitest.config.ts` 使用 `pool: 'forks'`，因为部分测试（尤其是 `git.test.ts`）需要调用 `process.chdir()`。在没有逐一审查所有 git / process-cwd 测试之前，不要把它改成 `threads`。
- 验收测试配置位于 `tests/integration/vitest.config.ts`。
- 每次任务的回归：提交前重跑 `pnpm test`；不要每次微调都重跑完整套件。

## Pull Request 流程

1. 从 `main` 拉分支。分支命名格式：`<scope>/<short-topic>`（例如 `fix/lint-prompts-ts`、`feat/bands-monotonic`）。
2. 本地实现 + 测试（`pnpm typecheck && pnpm test && pnpm lint`）
3. 推送分支；开一个 PR
4. CI 工作流会跑 build、typecheck、test、lint 和验收
5. 由维护者评审——预计会有几轮反馈
6. 通过后 squash-merge

如果你的改动比小修更大，先开一个 issue 讨论——维护者会为任何重要改动驱动设计规范和实施计划。见 [maintenance.zh-CN.md](maintenance.zh-CN.md) 的发布工作流。

## 上报 Bug

在 <https://github.com/loshu89/loshu-sdlc/issues> 提一个 Issue，附上：

- 复现步骤
- 期望 vs 实际行为
- `loshu-sdlc doctor` 的输出
- 版本信息：`pnpm ls --depth=0` 的输出

## 许可证

提交贡献即表示你同意你的贡献将按本项目的 MIT 许可证授权。
