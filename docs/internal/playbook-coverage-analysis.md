# AI-Native SDLC Playbook 覆盖率分析

**日期:** 2026-09-18
**资料来源:** [The AI-Native SDLC playbook (Anthropic, 2026-08-21)](https://claude.com/blog/the-ai-native-sdlc-playbook)
**项目基线:** `loshu-sdlc` 在 commit `8d06e4d`(刚发布的 v0.7.1)

## 摘要

项目从 v0.7.1 起已经实现了 AI-Native SDLC 的**产物链**(Plan → Design → Build → Test → Deploy → Maintain)端到端。横向贯穿的概念(**Skills**、**CLAUDE.md** 制度知识、**Hooks**、**持续评估**)部分已落地。唯一实质性的缺口是 **Maintain → Plan 闭环自动化**——agent 还不能自动把触线控制带写回新的 `intent.md`。`maintain-exit` hook 在 3σ 事件上*确实*会分叉新 cycle(v0.6.4),但 playbook 描述的更广义的"agent 监控生产,把失控带写回循环"还没建。

## 详细覆盖

### 各阶段覆盖

| 阶段 | Playbook 产物 | 我们的实现 | 覆盖 |
|---|---|---|---|
| **Plan** | 从源头合成 `intent.md` | `packages/plugin/schemas/intent.schema.json`(v0.6.0)+ `assertions/identity.ts` A1–A8(v0.6.4) | **完整** |
| **Design** | 与 agent 一次工作会话产出 `spec.md`,由 skills 引导 | `packages/plugin/schemas/spec.schema.json`(v0.6.0)+ `assertions/versioning.ts` V1–V4(v0.6.4/v0.7.0) | **完整** |
| **Build** | 代码 + 测试 + `plan.md` | `packages/plugin/schemas/plan.schema.json`(v0.6.0)+ plan-exit hook(v0.6.4) | **完整** |
| **Test** | 持续评估贯穿实现 | `pnpm test`(vitest)+ `pnpm test:eval:strict`(30/30 通过) | **完整** |
| **Deploy** | agent 评审 + 受监管/关键代码人审;**hooks** 当治理关卡 | `loshu-sdlc git sync`(v0.7.0)——真正的 branch/commit/push/PR open + cycle.json 写入;`loshu-sdlc rules check`(v0.7.0)——eslint + 3 个 schema runner;stage-exit hooks(v0.6.4) | **完整** |
| **Maintain** | agent 监控生产,触线控制带 → 新的 `intent.md` | `loshu-sdlc bands record`(v0.6.4)——3σ 度量产出;maintain-exit hook 在 3σ 分叉 incident cycle(v0.6.4) | **部分**——incident cycle 在 3σ 触发 fork,但 playbook 描述的"诊断并写回 intent"的自动化未实现;没有定时 agent 循环监控生产 |

### 横向贯穿概念

| 概念 | Playbook 意图 | 我们的实现 | 覆盖 |
|---|---|---|---|
| **Skills**(制度知识,版本化) | "standards encoded as skills, versioned in git" | `packages/plugin/skills/policy-default/` + `superpowers:*` skills 打包在 `.superpowers/sdd/` | **完整**(项目本身大量使用 skills——包括构建 v0.6.4 和 v0.7.0 时用的 `superpowers:subagent-driven-development`) |
| **CLAUDE.md**(制度知识) | "institutional knowledge is maintained as versioned machine-readable CLAUDE.md files" | **缺失**——项目根和 `packages/cli/` 都没有 `CLAUDE.md` | **无** |
| **Hooks**(治理关卡,as approval gates) | "Governance is enforced as the AI acts, with hooks as approval gates" | `packages/plugin/hooks/{plan,design,build,deploy,maintain}-exit.sh` + `protect-artifacts.sh`(PreToolUse) | **完整**——5 个 stage-exit hooks 通过 `packages/cli/hooks.json` 接线 |
| **持续评估**(贯穿实现) | "Continuous evals woven through implementation" | `pnpm test:eval:strict`(30/30)+ `pnpm test`(229 单元 + 集成测试) | **完整** |

### 审计跟踪(commit 链)

按 playbook:"The chain of commits is also the audit trail: who asked for what, what the agent produced, and who approved it. Humans remain accountable for every decision that requires judgment."

| Playbook 产物 | 在仓库里的位置 | 版本化? |
|---|---|---|
| `intent.md` | `packages/templates/minimal/` 等,通过 `loshu-sdlc cycle new` 每个 cycle 创建 → `cycle.json` | ✅ |
| `spec.md` | 同 templates | ✅ |
| `plan.md` | 同 templates | ✅ |
| Diff + 测试 | git commit 历史(v0.6.0 → v0.7.1 = main 上 5 个 release) | ✅ |
| PR 及其评审意见 | GitHub PR(不在本地)——项目外部 | ✅(经 GitHub)|
| 事件记录 | `events.jsonl`(append-only, chmod 0444)+ `gates.jsonl`(v0.6.4) | ✅ |

### 人机协同检查点

按 playbook:"Every stage commits an artifact the next stage can read. Together, the intent, the spec, the plan, the diff and the review findings are the audit trail."

我们的 hooks 是人审关卡:
- `plan-exit.sh` ——校验 `intent.md` schema(Plan → Design 关卡)
- `design-exit.sh` ——校验 `spec.md` schema + 状态机(Design → Build 关卡)
- `build-exit.sh` ——schema-校验 `plan.md` + 验证 `CLAUDE.md` 有 Verification block(Build → Test 关卡)
- `deploy-exit.sh` ——schema-校验 `REVIEW.md`(Test → Deploy 关卡)
- `maintain-exit.sh` ——`bands.yaml` schema + 3σ 分叉(Deploy → Maintain → Plan 循环)

全部 5 个关卡都是真的,通过 execa 调 git/gh(v0.7.0)。`loshu-sdlc git sync --execute` 是 **Deploy 关卡的自动执行器**——它 commit、push、当所有阶段 accepted 时通过 GitHub adapter 开 PR。

## 缺口总结

1. **CLAUDE.md**——playbook 明确点名的制度知识文件,**项目里没有**。这是一个真正缺口,适用于一个大规模使用 skills 的 AI-native SDLC 项目。修法是在项目根加一个 CLAUDE.md,~30 分钟。

2. **Maintain → Plan 闭环**——`maintain-exit.sh` 在 3σ 事件上分叉 incident cycle(v0.6.4 Task 4),但 playbook 描述的更广义的自动化("Agents monitor live deployments. Any breached control band is diagnosed and written back into the loop as a new intent.md")没建。我们有 **fork** 原语但没有 **agent-driven diagnose** 原语。

3. **Maintain 监控是操作员驱动,不是 agent 驱动**——`bands record` 写度量;`loshu-sdlc logs` 读。没有定时 agent 循环监控活动控制带并写到 `intent.md`。这是 playbook 的 "Maintain" 阶段在精神上(度量存在)但在自动化上没有(not continuous monitoring)。

## 建议的后续(按优先级)

1. **项目根 `CLAUDE.md`**——~30 分钟。捕获规范:pnpm install、`node scripts/release.mjs`、测试命令、superpowers 工作流、`.superpowers/sdd/` 目录用法。这是 playbook 明确点名的、性价比最高的缺口。

2. **设计 Maintain 闭环的设计文档**——只做 spec,不做代码。生产控制带的 agent 什么时候跑?"诊断"对一个发布 plugin 的 SDLC 项目意味着什么?这是未来 v0.7.x 还是 v1.0 的 feature?

3. **对照 spec §6.1.2 deferred items**——webhook receiver、branch protection enforcement、auto-revert on failed merge。其中 **auto-revert** 最直接对应 playbook 的 "Any breached control band is diagnosed and written back into the loop"。playbook 的 framing 支持用户早先的判断(v0.7.0 brainstorm 时)——webhook 可选,"Polling + push trigger sufficient"匹配我们的模型。

## 交叉引用

- v0.7.0 design §5——已记录 v0.6.4 审计的 carryover 项(v0.7.0 deferred backlog 的源头)
- `.superpowers/sdd/v0.7.0-real-stubs/progress.md`——final review 的 parked Minor,全部在 v0.7.1 修完
- `docs/superpowers/specs/loshu-sdlc/spec.md`——项目的权威 spec(起源:"the playbook this plugin implements")
- `docs/superpowers/specs/loshu-sdlc/12-references.md`——引用 playbook + Claude Academy 课程 + skills 模块

## 结论

项目实现了**产物链** + **skill/hook 治理** + **持续评估**。唯一具体的缺口是 **`CLAUDE.md`**。**Maintain 自动化**是部分的,但 playbook 的 spec 并不*要求*为 SDLC plugin 做完全自主的监控(用户可以选择自己监控 `bands record` 的输出)。两个缺口都是 1-2 天的工作,不是架构性阻塞。
