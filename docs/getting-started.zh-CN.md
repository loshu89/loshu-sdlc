# Getting started

> [English](getting-started.md) · [简体中文](getting-started.zh-CN.md)

本教程大约 15 分钟,带你从全新安装走到第一个完整的 SDLC 周期。我们会用一个极简 `todos` CLI 作为贯穿示例——足够小,一次能完成;又足够真实,能把每个阶段都跑一遍。

如果你只想要清单而不需要跑示例,跳到本页底部的 [Quickstart checklist](#quickstart-checklist) 即可。

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Claude Code 已安装并登录
- 已安装 Tier-1 的 superpowers 插件(见 [installation.zh-CN.md](installation.zh-CN.md#tier-1--required))

---

## 1. Scaffold the project

```bash
npx create-loshu-sdlc-app todos-cli --yes
cd todos-cli
loshu-sdlc doctor
```

`loshu-sdlc doctor` 应该打印 `✔ All checks passed`。如果有任何缺失项,请先修好再继续——在残缺的安装上,Hook 会拒绝触发。

## 2. Stage 1 — Plan (`/sdlc-plan`)

运行:

```
/sdlc-plan
```

Claude 会驱动一场头脑风暴对话。对于我们的 `todos` CLI,预计会被问到:

- **What problem are you solving?** —— "用户想要一个快速、键盘友好的 CLI 来管理个人待办;现有工具(Taskwarrior、todo.txt)功能强大,但学习曲线太高。"
- **What's the proposed outcome?** —— "一个单独的 `todos` 可执行文件,带 `add`、`list`、`done`、`rm` 四个子命令。状态存储在 `~/.todos.json` 的 JSON 文件里。"
- **What's out of scope?** —— "不做同步、不做共享、不做 GUI、不做插件系统。"
- **Open questions?** —— "`add` 接受 stdin 还是只接受 flag?`list` 的默认排序顺序?"

头脑风暴之后,Claude 会写 `intent.md`。它大致长这样:

```yaml
---
id: plan-c01-todos-cli-7f3a-01HXYZABCDEFGHJKMNPQRSTWX
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: captured
created_by: human:you
created_at: 2026-09-30T10:00:00Z
parent_ids: []
---

# todos CLI

## Problem
Powerful CLI todo tools have a learning curve. New users want a fast,
keyboard-friendly way to track personal tasks without reading docs first.

## Proposed outcome
A `todos` binary with `add`, `list`, `done`, `rm` subcommands.
State in `~/.todos.json`. Zero config.

## Out of scope
Sync, sharing, GUI, plugin system.

## Open questions
- Should `add` accept stdin or only flags? — Default: flags only.
- Default sort order for `list`? — Default: insertion order.
```

当你满意之后,接受这个 intent——Claude 会把 frontmatter 中的 `state` 置为 `accepted`,然后 `plan-exit` Hook 会做校验。

## 3. Stage 2 — Design (`/sdlc-design`)

```
/sdlc-design
```

Claude 读取 `intent.md`,然后产出 `spec.md`——一份更形式化的规范,包含:

- 每个命令的 **Inputs / outputs**
- **Data model** —— `~/.todos.json` 的 JSON schema
- **Error handling** —— 文件缺失、JSON 损坏等情况下每个命令的行为
- **Acceptance criteria** —— 给后面 `/sdlc-test` 用的可测试条目

你阅读它,对与你心智模型不符的地方提出异议,然后接受。`design-exit` Hook 会校验 `spec.md`,并检查 `intent.md` 是否为 `accepted`。

## 4. Stage 3 — Build (`/sdlc-build`)

```
/sdlc-build
```

这里是真正写代码的地方。Claude:

1. 读取 `spec.md`
2. 写出包含实现步骤的 `plan.md`
3. 按 plan 实现代码——TDD 风格,先写测试,再写代码
4. 为项目写一个 `CLAUDE.md`(项目级的 AI 指南,与同名 SDLC 制品不同)

对于我们的 `todos` CLI,最终你会得到:

```
todos-cli/
├── src/
│   ├── cli.ts        # argument parsing
│   ├── store.ts      # ~/.todos.json read/write
│   └── commands/
│       ├── add.ts
│       ├── list.ts
│       ├── done.ts
│       └── rm.ts
├── tests/
│   └── ...           # one test file per command
├── intent.md
├── spec.md
├── plan.md
└── CLAUDE.md
```

`build-exit` Hook 校验 `plan.md`,并核实 `CLAUDE.md` 包含 verification block。

## 5. Stage 4 — Test (`/sdlc-test`)

```
/sdlc-test
```

Claude 运行 `CLAUDE.md` 中的 verification block:

- `pnpm build` —— TypeScript 编译通过
- `pnpm typecheck` —— 严格 TS 通过
- `pnpm test` —— 所有单元 + 集成测试全绿
- `pnpm lint` —— ESLint 干净

任何一步失败,Claude 都会迭代直到全部通过。`test-exit` Hook 会独立地重新跑一遍同样的 block,作为 CI 关卡。

你也可以在 SDLC 制品本身上跑那套 4 层 acceptance:

```bash
loshu-sdlc test                 # 所有制品,所有 4 层
loshu-sdlc test intent.md       # 单个制品
loshu-sdlc test --strict        # 任一断言失败即 exit 1
loshu-sdlc test --fix           # 自动应用可修复项
```

层级:field-level、per-artifact schema、cross-artifact refs、end-to-end bands。

## 6. Stage 5 — Deploy (`/sdlc-deploy`)

```
/sdlc-deploy
```

Claude 写出 `REVIEW.md`,包含:

- **Security review** —— 依赖已审计,仓库中无密钥
- **Compliance** —— license header、第三方归属
- **Performance** —— 小小的 `todos` CLI 没什么好测的,但仍记录以保证完整性
- **Acceptance summary** —— 反向链接到 eval 结果

你阅读它,签收(或提出异议),`deploy-exit` Hook 就会做校验。任何标记为 `status: fail` 的章节都会阻断 deploy。

## 7. Stage 6 — Maintain (`/sdlc-maintain`)

```
/sdlc-maintain
```

这是循环收口的阶段。它读取 `bands.yaml`(如果你有的话)和指标 sidecar;一旦任何指标突破 3σ,它会自动为这次事故周期生成一份新的 `intent.md`。对于我们的 `todos` CLI 现在还没什么可维护的——但当你发布了二进制并拿到使用遥测数据后,循环就是在这里收口的。

现在你可以先写一个 stub `bands.yaml` 来跑一遍流程:

```bash
loshu-sdlc bands record todos-cli --metric invocations --value 100
loshu-sdlc bands evaluate bands.yaml
```

完整说明见 [`usage-guide.zh-CN.md`](usage-guide.zh-CN.md#maintain)。

## 8. Status anytime

```
/sdlc-status
```

展示六个阶段上的当前周期状态——哪些制品已存在、它们的状态(`captured` / `accepted` / `deployed`),以及下一步是什么。

---

## Quickstart checklist

如果你不需要那个跑起来的示例,这就是最小清单:

- [ ] `npx create-loshu-sdlc-app my-app --yes`(已有仓库则用 `--existing`)
- [ ] `loshu-sdlc doctor` → `✔ All checks passed`
- [ ] `/sdlc-plan` —— 头脑风暴并接受 `intent.md`
- [ ] `/sdlc-design` —— 审阅并接受 `spec.md`
- [ ] `/sdlc-build` —— Claude 实现代码,写出 `plan.md` + `CLAUDE.md`
- [ ] `/sdlc-test` —— verification block(build / typecheck / test / lint)全部通过
- [ ] `/sdlc-deploy` —— 审阅 `REVIEW.md` 并签收
- [ ] `/sdlc-maintain` —— 配置 `bands.yaml`,循环收口

---

## Where to go from here

- **[usage-guide.zh-CN.md](usage-guide.zh-CN.md)** —— 每个斜杠命令、CLI 子命令、Hook、制品的完整参考
- **[contributing.zh-CN.md](contributing.zh-CN.md)** —— 用于为 loshu-sdlc 本身做开发
- **[maintenance.zh-CN.md](maintenance.zh-CN.md)** —— 给维护者用(release、dependabot、eval 套件)