# Installation

> [English](installation.md) · [简体中文](installation.zh-CN.md)

三种安装路径。挑一个符合你场景的。

| 路径 | 适用场景 |
|---|---|
| **[脚手架新建项目](#脚手架新建项目)** | 从零起步。脚手架一次性把项目、插件、制品全部装好。 |
| **[添加到已有仓库](#添加到已有仓库)** | 已有代码库，想就地引入 loshu-sdlc。 |
| **[仅插件](#仅插件)** | 只需要斜杠命令和 Hook——项目结构自己搞定。 |

所有路径都需要下方的 **[必需的外部插件](#必需的外部插件)**。

---

## 脚手架新建项目

```bash
npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc]
cd my-app
```

这会创建一个新目录，里面包含：

- `@loshu89/plugin` 插件已安装到 `.claude/`
- 斜杠命令（`/sdlc-plan`、`/sdlc-design` 等）和 Hook 已接线
- 一份起步用的 `intent.md` 和 `.loshu-sdlc/config.yaml`
- 一个 git 仓库，初始脚手架作为第一个 commit

### Flags

| Flag | 作用 |
|---|---|
| `--with-ux` | 同时安装 `ui-ux-pro-max`（UI/UX 设计智能） |
| `--with-ecc` | 同时安装 `ecc`（Everything Claude Code） |
| `--with-all` | `--with-ux --with-ecc` 的简写 |
| `--template full` | 使用完整 SDLC 模板——全部 6 个制品 + 2 个 CI workflow（默认：`minimal`） |
| `--existing` | 安装到已有仓库而非新建（见[下一节](#添加到已有仓库)） |
| `--coverage 80` | verification block 的行覆盖率阈值（默认：80） |
| `--branch 75` | 分支覆盖率阈值（默认：75） |
| `--no-git` | 跳过 `git init` 和初始 commit |
| `--yes` / `-y` | 跳过交互式提问（使用默认值） |
| `--strict` | 启用严格 eval 模式 |
| `--help` / `-h` | 显示完整帮助 |

---

## 添加到已有仓库

```bash
cd ~/projects/legacy-app
npx create-loshu-sdlc-app . --existing
```

这会在你已有仓库里装好插件并写入 `.claude/` + `.loshu-sdlc/config.yaml`，不动你的代码。下次改动时跑一次 `/sdlc-plan` 即可开启 SDLC 循环。

如果你用了非典型的文件系统（部分 Windows 配置不支持符号链接），参见本页底部对应的 **[故障排查条目](#脚手架完成后-hook-不触发)**。

---

## 仅插件

如果只想要插件、不要脚手架——比如你在做实验，或者你的项目布局非标准：

```bash
claude plugin marketplace add loshu89/loshu-sdlc
claude plugin install loshu-sdlc@loshu-sdlc
```

你会拿到全部 9 个斜杠命令和 7 个 Hook。不过制品文件（`intent.md` 等）得自己建——schema 要求见 [`docs/usage-guide.zh-CN.md`](usage-guide.zh-CN.md)。

---

## 从 GitHub Packages 安装（高级）

`@loshu89/*` 包发布到 **GitHub Packages**，而不是 npm。想通过 npm 直接安装它们：

```bash
# 1. 告诉 npm 对 @loshu89 scope 使用 GitHub Packages
echo "@loshu89:registry=https://npm.pkg.github.com" >> ~/.npmrc

# 2. 用 GitHub Personal Access Token 登录（需要 `read:packages` 权限）
npm login --registry=https://npm.pkg.github.com
```

然后：

```bash
npm install -g @loshu89/cli     # 脚手架 + 维护 CLI
# 或
npx --yes @loshu89/cli --help   # 一次性使用，无需安装
```

> **注意：** GitHub Packages 即便是公开包也需要认证——不像 `npmjs.com`，不允许匿名下载。在 <https://github.com/settings/tokens/new> 创建一个带 `read:packages` scope 的 token。

大多数用户应该走上面的脚手架或插件路径。直接通过 GitHub Packages 安装只用于插件作者或特殊部署场景。

---

## 必需的外部插件

loshu-sdlc 依赖两组外部插件。**Tier 1 是必需的**——没有它 loshu-sdlc 拒绝运行。**Tier 2 推荐安装**以获得完整功能。

### Tier 1——必需

```bash
claude plugin marketplace add superpowers/superpowers
claude plugin install superpowers@superpowers
```

提供驱动每个 `/sdlc-*` 命令的 brainstorming、writing-plans、TDD 和 verification 技能。

### Tier 2——推荐

```bash
# UI/UX 设计智能
claude plugin marketplace add <ui-ux-pro-max-marketplace>
claude plugin install ui-ux-pro-max

# Everything Claude Code（架构师、code-reviewer、security-reviewer）
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin install ecc@ecc
```

没有 Tier 2 时 loshu-sdlc 仍可运行，但设计和评审质量会下降。

### Tier 3——可选

任何其他 `ecc:*` 技能（frontend-patterns、backend-patterns、api-design、database-migrations 等），装了就会被自动识别。

---

## 验证安装

```bash
loshu-sdlc doctor
```

应该输出 `✔ All checks passed`。如果它报告插件或技能缺失，错误信息会明确告诉你需要跑哪条 `claude plugin install`。

---

## Git 生命周期凭证（v0.6.0+）

`loshu-sdlc git` 命令族（被 `/sdlc-deploy` 和 `/sdlc-maintain` 用来跨仓库同步）需要平台凭证：

| 变量 | 用途 | 示例 |
|---|---|---|
| `GHCR_TOKEN`（或 `GITLAB_TOKEN`） | 带 `repo` + `write:packages` 权限的平台 token | `ghp_xxx…`（不要粘贴到聊天里） |
| `LOSHU_REPO` | 目标仓库的 `owner/name` | `loshu89/loshu-sdlc` |

`loshu-sdlc git status` 和 `loshu-sdlc git sync --dry-run` 不需要 token（只读）。

---

## 故障排查

**脚手架完成后 Hook 不触发。** 脚手架会创建符号链接 `.claude/hooks → .claude/plugins/loshu-sdlc/hooks/`。如果文件系统不支持符号链接（部分 Windows 配置），Hook 不会触发。解决办法：脚手架完成后手动复制 `hooks/` 目录。

**Claude Code 里看不到插件命令。** `claude plugin install` 之后，重启 Claude Code 会话——斜杠命令在会话开始时才被发现。

**GitHub Packages 安装失败，提示 E401。** 通常是组织级的第三方应用限制。两种解决方法：在组织设置中批准 GitHub Actions 应用，或者用 PAT 作为 `GHCR_TOKEN` secret 添加。详见 [README 里的故障排查条目](../README.md#故障排查)。
