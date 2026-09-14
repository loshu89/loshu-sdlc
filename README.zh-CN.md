# loshu-sdlc

> 面向 Claude Code 的 AI-Native 软件开发生命周期插件。

[![CI](https://github.com/loshu89/loshu-sdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/loshu89/loshu-sdlc/actions/workflows/ci.yml)
[![Publish](https://github.com/loshu89/loshu-sdlc/actions/workflows/publish-ghcr.yml/badge.svg)](https://github.com/loshu89/loshu-sdlc/actions/workflows/publish-ghcr.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-@loshu89-blue)](https://github.com/orgs/loshu89/packages)

[English](README.md) · [简体中文](README.zh-CN.md)

loshu-sdlc 实现了 [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)（2026 年 8 月）中描述的**六阶段 AI-Native 软件开发生命周期**，并以 Claude Code 插件的形式提供。

插件把每一次改动都转成版本受控、Schema 校验、Hook 强制的制品（`intent.md → spec.md → plan.md → CLAUDE.md → REVIEW.md → bands.yaml`），并通过把生产事故回写成新的 `intent.md` 来闭合循环。

---

## 目录

- [设计思路](#设计思路)
- [快速上手](#快速上手)
- [安装方法](#安装方法)
- [使用方法](#使用方法)
  - [斜杠命令](#斜杠命令)
  - [CLI 命令](#cli-命令)
  - [Hook 脚本](#hook-脚本)
  - [制品链](#制品链)
- [项目结构](#项目结构)
- [外部依赖](#外部依赖)
- [开发](#开发)
- [故障排查](#故障排查)
- [许可证](#许可证)

---

## 设计思路

三个核心原则贯穿整个项目：

1. **保持精薄**。loshu-sdlc 是个编排者，组合外部成熟技能（`superpowers:*`、`ui-ux-pro-max`、`ecc:*`）来提供智能；只自研真正属于 SDLC 的部分：制品链、JSON Schema、分层 Hook、统计区间评估、闭环反馈。
2. **制品优先于对话**。每个阶段都产出版本受控的文件（`intent.md`、`spec.md` 等）。决策可审计、可回顾、可重放——不会消失在聊天滚动条里。
3. **治理而非把关**。Hook 只在关键违规时阻止（exit 2），软警告只记录不强制。人始终掌控全局；插件只是补漏。

**闭环是最大卖点**。3σ 生产事故（任何指标超出 `bands.yaml` 阈值）会自动生成新的 `intent.md`，SDLC 循环重启，修复走和其他改动一样的关卡。不需要单独的 hot-fix 流程。

**三层依赖关系：**

| 层级 | 必需 | 缺失时后果 |
|---|---|---|
| **Tier 1（必需）** | `superpowers:{using-superpowers, brainstorming, writing-plans, tdd, systematic-debugging}` | 硬失败——loshu-sdlc 拒绝运行 |
| **Tier 2（推荐）** | `ui-ux-pro-max`、`ecc:{architect, code-reviewer, security-reviewer}`、`superpowers:{verification-before-completion, receiving-code-review}` | 警告——质量降级但可用 |
| **Tier 3（机会）** | 其他 `ecc:*` 技能和前端/后端模式 | 静默——装了才用 |

---

## 快速上手

最快的方式：

```bash
# 1. 用脚手架建一个新项目
npx create-loshu-sdlc-app my-app
cd my-app

# 2. 捕获你的第一个 intent（与 Claude 头脑风暴后写入 intent.md）
/sdlc-plan

# 3. 继续走完各阶段
/sdlc-design    # → spec.md
/sdlc-build     # → plan.md + CLAUDE.md
/sdlc-test      # → verification block + evals
/sdlc-deploy    # → REVIEW.md
/sdlc-maintain  # → bands.yaml + 监控

# 随时查看进度
/sdlc-status
```

5 个命令走完整个 happy path。

---

## 安装方法

### 方式 A：从插件市场安装到 Claude Code

```bash
claude plugin marketplace add loshu89/loshu-sdlc
claude plugin install loshu-sdlc@loshu-sdlc
```

然后在任意 Claude Code 会话里使用斜杠命令（`/sdlc-plan`、`/sdlc-design` 等）。

### 方式 B：用脚手架新建项目

```bash
npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc] [--template full]
```

参数：

| 参数 | 作用 |
|---|---|
| `--with-ux` | 同时安装 `ui-ux-pro-max` |
| `--with-ecc` | 同时安装 `ecc`（Everything Claude Code） |
| `--with-all` | `--with-ux --with-ecc` 的简写 |
| `--template full` | 使用完整的 SDLC 模板（默认：minimal） |
| `--existing` | 装到现有仓库（不脚手架） |
| `--coverage 80` | 行覆盖率阈值（默认 80） |
| `--branch 75` | 分支覆盖率阈值（默认 75） |
| `--no-git` | 跳过 `git init` 和首次提交 |
| `--yes` / `-y` | 跳过交互式提示 |
| `--strict` | 启用严格 eval 模式 |
| `--help` / `-h` | 显示帮助 |

### 方式 C：全局安装脚手架 CLI

npm 包发布到 **GitHub Packages**，scope 为 `@loshu89`。

```bash
# 1. 告诉 npm 对 @loshu89 scope 使用 GitHub Packages
echo "@loshu89:registry=https://npm.pkg.github.com" >> ~/.npmrc

# 2. 用一个有 read:packages 权限的 GitHub token 鉴权
echo "//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxx" >> ~/.npmrc

# 3. 全局安装 CLI
npm install -g @loshu89/cli

# 4. 使用
create-loshu-sdlc-app my-app
```

> **注意**：GitHub Packages 即便是公开包也需要鉴权——和 `npmjs.com` 不同，匿名下载不被允许。在 <https://github.com/settings/tokens/new> 创建一个带 `read:packages` 权限的 Personal Access Token。

### 必需的外部技能

要完整功能，至少要装 Tier-1 的 superpowers 插件（唯一的硬性依赖）：

```bash
claude plugin marketplace add superpowers/superpowers
claude plugin install superpowers@superpowers
```

没有它 loshu-sdlc 拒绝运行。Tier-2 和 Tier-3 是可选的——插件会警告或静默跳过。

---

## 使用方法

### 斜杠命令

装好插件后，你会得到 9 个斜杠命令：

| 命令 | 阶段 | 用途 |
|---|---|---|
| `/sdlc-plan` | Plan | 与 Claude 头脑风暴并写入 `intent.md` |
| `/sdlc-design` | Design | 把 intent 转译为 `spec.md` |
| `/sdlc-build` | Build | 生成 `plan.md` 并脚手架 `CLAUDE.md` |
| `/sdlc-test` | Test | 跑 TDD 流程和 verification block |
| `/sdlc-deploy` | Deploy | 填充 `REVIEW.md`（含安全和合规检查） |
| `/sdlc-maintain` | Maintain | 评估 `bands.yaml`；3σ 事故时自动生成事故驱动的 `intent.md` |
| `/sdlc-status` | (meta) | 显示当前 cycle 的状态 |
| `/sdlc-init` | (meta) | 按顺序跑 plan → design → build |
| `/sdlc-help` | (meta) | 显示命令参考 |

### CLI 命令

`loshu-sdlc` CLI 还提供维护命令：

```
loshu-sdlc create    [path]      脚手架新建 SDLC 项目
loshu-sdlc validate  <artifact> <file>
                                校验制品（intent、spec、plan 等）是否符合 schema
loshu-sdlc doctor    [path]      SDLC 项目健康检查
loshu-sdlc bands     evaluate <file>
                                评估 bands.yaml 与当前指标
loshu-sdlc lint      [path]      检查借用的插件技能（带 --fix）
loshu-sdlc rules     list|check  查看规则注册表
loshu-sdlc status    [path]      渲染分阶段状态表
loshu-sdlc coverage  [path]      跑覆盖率并输出 JSON 报告
loshu-sdlc logs                  读取 ~/.loshu-sdlc/logs/*.log
loshu-sdlc upgrade   [path]      升级项目中的 loshu-sdlc 版本
loshu-sdlc telemetry             在 ~/.loshu-sdlc/config.json 切换遥测
loshu-sdlc help      [command]   显示帮助
```

### Hook 脚本

Hook 在阶段之间触发，强制制品链：

| Hook | 触发时机 | 作用 |
|---|---|---|
| `plan-exit` | `/sdlc-plan` 写入 `intent.md` 后 | 按 `intent.schema.json` 校验文件 |
| `design-exit` | `/sdlc-design` 写入 `spec.md` 后 | 校验 `spec.md`；确保 `intent.md` 是 `accepted` |
| `build-exit` | `/sdlc-build` 写入 `plan.md` 后 | 校验 `plan.md`；确保 `CLAUDE.md` 有 verification block |
| `test-exit` | `/sdlc-test` 后 | 跑 verification block（build / test / lint / typecheck 必须全部退出 0） |
| `deploy-exit` | `/sdlc-deploy` 写入 `REVIEW.md` 后 | 校验 `REVIEW.md`；任何 section `status: fail` 则阻止 |
| `maintain-exit` | `/sdlc-maintain` 后 | 校验 `bands.yaml`；3σ 事故时要求新的 `intent.md` |
| `protect-artifacts` | 任何 Write/Edit 工具调用 | 全部放行的占位；预留给将来的制品保护 |

所有 Hook 使用 Claude Code 的 `exit 0`（允许）/ `exit 2`（阻止）语义。

### 制品链

每个阶段都产出版本受控的制品。它们一起构成可审计的决策链：

```
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐
   │ intent  │ ─▶ │  spec   │ ─▶ │  plan   │ ─▶ │ CLAUDE   │ ─▶ │  REVIEW   │ ─▶ │  bands    │
   │   .md   │    │   .md   │    │   .md   │    │   .md    │    │   .md     │    │   .yaml   │
   └─────────┘    └─────────┘    └─────────┘    └──────────┘    └───────────┘    └────────────┘
        │               │              │              │               │               │
        └───────────────┴──────────────┴──────────────┴───────────────┘               │
                                  ▼                                                   │
                          项目历史                                                  │
                          （全部 git 受控）                                          │
                                                                                      │
                                  ◀────────── 3σ 事故 ────────────────────────────────┘
                                          （自动生成新的 intent.md）
```

每个制品在 `packages/plugin/schemas/` 下都有对应的 JSON Schema。`loshu-sdlc validate <artifact> <file>` 跑的就是这个 schema 校验。

---

## 项目结构

本仓库是 npm-workspaces 单仓多包结构，包含三个包：

```
loshu-sdlc/
├── packages/
│   ├── plugin/                     # Claude Code 插件（仅 markdown + JSON）
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json         # 插件清单
│   │   ├── commands/               # 9 个斜杠命令
│   │   │   ├── sdlc-plan.md
│   │   │   ├── sdlc-design.md
│   │   │   ├── sdlc-build.md
│   │   │   ├── sdlc-test.md
│   │   │   ├── sdlc-deploy.md
│   │   │   ├── sdlc-maintain.md
│   │   │   ├── sdlc-status.md
│   │   │   ├── sdlc-init.md
│   │   │   └── sdlc-help.md
│   │   ├── agents/                 # 5 个 SDLC 专用子代理
│   │   ├── skills/                 # 编写指南技能 + 策略默认值 + UI 基线
│   │   ├── hooks/                  # 6 个分层执行脚本
│   │   └── schemas/                # 7 个制品 JSON Schema
│   │
│   ├── cli/                        # 脚手架 + 维护 CLI（Node + TypeScript）
│   │   ├── src/
│   │   │   ├── bin/                # create-loshu-sdlc-app + loshu-sdlc 入口
│   │   │   ├── commands/           # create, validate, doctor, bands, lint, rules,
│   │   │   │                       #   status, coverage, logs, upgrade, telemetry
│   │   │   └── lib/                # render, git, plugin-bundler, prompts,
│   │   │                           #   validate (Ajv), bands (统计), attribution
│   │   ├── tests/                  # vitest 单元测试
│   │   └── plugin/                 # 内嵌的插件副本（.gitignore，build 时重新生成）
│   │
│   └── templates/                  # 起始项目模板
│       ├── minimal/                 # 极简：README + intent.md + .loshu-sdlc/config.yaml
│       └── full/                    # 完整：6 个制品 + 2 个 CI workflow 模板
│
├── tests/
│   └── evals/                      # ~30 个 golden-file eval 故事，覆盖 6 个阶段
│       ├── plan/, design/, build/, test/, deploy/, maintain/
│       └── run.ts                  # eval 跑分器（loose + strict 模式）
│
├── scripts/                        # release.mjs + copy-plugin.mjs
├── docs/                           # 用户文档
│   ├── getting-started.md
│   └── installation.md
├── .github/workflows/              # ci.yml + publish-ghcr.yml
├── .changeset/                     # changesets 配置 + 条目
├── package.json                    # workspace 根（pnpm）
├── tsconfig.base.json              # 共享 TS 配置
├── vitest.config.ts                # 多项目 vitest 配置
└── README.md (本文件) / README.zh-CN.md
```

**包用途：**

| 包 | 用途 | 发布为 |
|---|---|---|
| `@loshu89/plugin` | Claude Code 插件——斜杠命令、agents、skills、hooks、schemas | GitHub Packages |
| `@loshu89/cli` | 脚手架（`create-loshu-sdlc-app`）+ 维护 CLI（`loshu-sdlc`） | GitHub Packages |
| `@loshu89/templates` | 脚手架消费的起始模板 | GitHub Packages |

---

## 外部依赖

loshu-sdlc 编排外部技能。Tier-1 是必需的；Tier-2/3 是可选的。

**Tier 1（必需）：**
- `superpowers:using-superpowers`、`superpowers:brainstorming`、`superpowers:writing-plans`、`superpowers:tdd`、`superpowers:systematic-debugging`

**Tier 2（推荐）：**
- `ui-ux-pro-max`（UI/UX 设计智能）
- `ecc:architect`、`ecc:code-reviewer`、`ecc:security-reviewer`
- `superpowers:verification-before-completion`、`superpowers:receiving-code-review`

**Tier 3（机会）：**
- 其他 `ecc:*` 技能（frontend-patterns、backend-patterns、api-design、database-migrations 等）

用 `claude plugin install <name>@<marketplace>` 安装。

---

## 开发

### 前置条件

- Node.js ≥ 20
- pnpm ≥ 9

### 初始化

```bash
git clone https://github.com/loshu89/loshu-sdlc.git
cd loshu-sdlc
pnpm install
```

### 常用脚本

```bash
pnpm typecheck                    # 全包 TypeScript 检查
pnpm test                         # Vitest 单元 + 集成测试（46 个测试）
pnpm build                        # 构建 CLI + 打包插件
pnpm lint                         # ESLint
pnpm test:eval                    # Eval 套件（~30 故事，loose 模式，cosine ≥ 0.85）
pnpm test:eval:strict             # Eval 套件（strict 模式，CI gate）
pnpm test:eval:json               # JSON 输出，供工具消费
pnpm test:eval:record             # 用当前输出覆盖 .expected 文件
```

### 发布

```bash
# 本地发布（升级三个包版本、跑全检查、提交、打 tag）
node scripts/release.mjs 0.2.1

# 推送 tag 触发 publish-ghcr.yml
git push origin main v0.2.1
```

CI workflow（`publish-ghcr.yml`）会跑 `tests/eval:strict` 和完整检查，然后发布到 GitHub Packages。

---

## 故障排查

**"Tier-1 dep missing"**
安装 superpowers（见[必需的外部技能](#必需的外部技能)）。没有它 loshu-sdlc 拒绝运行。

**Hook 阻止了我的编辑**
Hook 用 `exit 2` 阻止并在 stderr 给出具体原因。读消息、修复、然后重试。

**Claude Code 里看不到插件命令**
通过 `claude plugin install loshu-sdlc@loshu-sdlc` 安装后，重启 Claude Code 会话。斜杠命令在会话开始时发现。

**脚手架创建了项目但 Hook 不触发**
`create` 命令会创建符号链接 `.claude/hooks → .claude/plugins/loshu-sdlc/hooks/`。如果文件系统不支持符号链接（某些 Windows 配置），Hook 不会触发。解决方案：脚手架完成后手动复制 `hooks/` 目录。

**Fresh clone 上测试失败**
跑 `pnpm install --frozen-lockfile` 确保 lockfile 一致，然后 `pnpm test`。

**Eval 套件出现意外失败**
跑 `pnpm test:eval --loose`（默认）或 `pnpm test:eval --strict`。Loose 模式允许 shingle cosine ≥ 0.85；Strict 要求精确匹配。要重新生成 golden 文件，用 `pnpm test:eval:record`。

**GitHub Packages 发布失败 E401**
几乎总是组织的第三方应用限制。两种解决方法：
1. 在组织设置 → 第三方访问 → 批准 GitHub Actions 应用
2. 或使用 PAT（作为 `GHCR_TOKEN` secret 添加）——见 workflow 文件了解当前鉴权方式

---

## 许可证

MIT © loshu-sdlc contributors

第三方内容（配色、排版、可访问性、编码标准、安全基线）借用自 `ui-ux-pro-max` 和 `ecc`，遵循各自的许可证——见 [`LICENSE-THIRD-PARTY.md`](LICENSE-THIRD-PARTY.md)。

---

[Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) · [GitHub Packages](https://github.com/orgs/loshu89/packages) · [Issues](https://github.com/loshu89/loshu-sdlc/issues)
