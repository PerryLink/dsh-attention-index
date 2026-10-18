<div align="center">

# 🏆 dsh-score

**DeepSeek Harness 插件的公共证据层 —— 以及一条明确的社区注意力分配规则。**

*先验只是发现信号。质量声明需要成对结果、证据等级和独立路径。*

[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-attention-index/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-attention-index/actions)
[![Pages](https://img.shields.io/badge/evidence-live-2f855a)](https://perrylink.github.io/dsh-attention-index/)
[![API](https://img.shields.io/badge/API-v1-2f6feb)](https://perrylink.github.io/dsh-attention-index/api/v1/index.json)
[![GitCode](https://img.shields.io/badge/GitCode-mirror-2f6feb)](https://gitcode.com/PerryLink/dsh-attention-index)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

[English](README.md) · [简体中文](README-zh.md)

```sh
# 公共证据
open https://perrylink.github.io/dsh-attention-index/

# 应用内消费端
dsh plugin --profile web add dsh-community-bench
```

</div>

---

<img src="docs/assets/dsh-score-hero.png" width="100%" alt="dsh-score：公共证据，E0 未评级，E2 暂定，没有质量 #1" />

<img src="docs/assets/dsh-score-demo.gif" width="100%" alt="dsh-score 动图：先验只是发现信号，不是质量声明" />

## 为什么做这个

插件发现不该是热度比赛，下载量也不是任务效果。`dsh-score` 把四件事拆开：

1. **发现** —— 插件是否维护、是否可见；
2. **证据** —— 是否在同一任务上做过 with/without 成对运行；
3. **等级** —— 证据强度是 E0–E5 的哪一级；
4. **注意力** —— 只有 positive、样本足够的实测结果才进质量槽位。

v0.1 的答案很直接：**没有质量 #1**。

## 当前状态

| 指标 | 数值 |
|---|---:|
| 插件 | **42** |
| 能力面 | **15** |
| 任务 | **39**（24 个可执行 pilot + 15 个 draft） |
| 签名结果 | **30** |
| E0 / 未评级 | **41** |
| E2 / 暂定 | **1**（零效应 pilot） |
| E3+ / positive | **0** |
| 质量 #1 | **无** |
| 公开贡献 | **0** |

首轮 pilot 是 `dsh-memento@0.5.27`，5 个 memory 任务 × 3 runs/arm。两组都通过全部任务，因此是 **null result**；由于任务包未 review、runner 是 operator-owned、sandbox 只做了文件系统隔离，结果被压在 **E2**。`rank` 为 `null`，`top3` 为空。

## 等级含义

<img src="docs/assets/dsh-score-grades.png" width="100%" alt="dsh-score 等级：E0 未评级、E1 已筛选、E2 暂定、E3 实测、E4 复现、E5 审计" />

| 等级 | 含义 | 质量槽位？ |
|---|---|---|
| **E0** | 未评级 —— 只有 metadata，没有 outcome evidence | 否 |
| **E1** | 已筛选 —— 可执行任务 + fixture hash | 否 |
| **E2** | 暂定 —— 成对 pilot；review/sandbox/独立性不完整 | 否 |
| **E3** | 实测 —— ≥5 个已 review 任务、≥5 runs/arm、positive LCB | 是 |
| **E4** | 复现 —— ≥2 个独立 runner，方向一致 | 是 |
| **E5** | 审计 —— 独立审计 + 预注册 | 是 |

**硬闸门：** 任务包未 review，或 sandbox 只是部分隔离，最高 E2；E5 必须在 [`data/audits/index.json`](data/audits/index.json) 有独立审计。prior-only 行永远不能拿质量 rank，也不能购买槽位。

完整模型：[docs/SOE-GOE.md](docs/SOE-GOE.md) · [SCORING.md](SCORING.md)。

## 公共产物

| 产物 | 用途 |
|---|---|
| [证据站](https://perrylink.github.io/dsh-attention-index/) | 人类可读视图；E0/未评级是显式状态 |
| [`data/registry.json`](data/registry.json) | 唯一机器可读 registry |
| [`api/v1/registry.json`](api/v1/registry.json) | 版本化快照 + `etag` |
| [`integrations/market/signals.json`](integrations/market/signals.json) | 市场装饰 sidecar；不是排序输入 |
| [`badges/index.json`](badges/index.json) | 每个插件的徽章；未评级显式标注 |
| [`data/results/`](data/results) | 30 条签名 arm 结果（15 对；只有哈希，没有会话原文） |

```sh
curl https://perrylink.github.io/dsh-attention-index/api/v1/registry.json
```

## 快速开始

```sh
node scripts/aggregate.mjs --today 2026-10-18
node scripts/check-invariants.mjs
node scripts/conformance.mjs
node --test test/*.test.mjs
python3 -m http.server 8765 --directory site
```

## 管线

```
pilot 任务包（未 review）
  → with/without 成对运行
  → 签名结果 + 环境 manifest + fixture hash
  → 严格 ingest（签名、fixture、重复）
  → Newcombe 区间 + SOE/GOE 等级
  → E0/E1 无 rank · E2 暂定 · E3+ positive 质量槽位
```

- [P1 实测 runbook](docs/P1-RUNBOOK.md)
- [Sandbox 要求](docs/SANDBOX.md)
- [P2 集成契约](docs/P2-INTEGRATION.md)
- [P3 审计清单](docs/AUDIT-CHECKLIST.md)
- [P0–P3 状态](docs/P0-P3-PLAN.md)

## 还没做

- **完整** sandbox（egress allowlist + seccomp）；当前 `bwrap-fs` 只是部分隔离。
- 任务 review 和独立 runner，才能到 E3+。
- FDR/bootstrap/holdout、版本绑定、token 计量。
- 签名快照历史、第三方市场 pilot。
- E5 独立审计 —— 只有自审，自审不算 E5。
- 仓库改名 `dsh-score-index`；URL 暂时保持稳定。

不伪造结果。不给先验 #1。不卖排名。

## DSH 插件家族

| 项目 | 角色 |
|---|---|
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | 本地按需先验检查器（五维） |
| **dsh-score index**（本仓库） | 公共、版本绑定的证据层 |
| **[dsh-community-bench](https://github.com/PerryLink/dsh-community-bench)** | 应用内消费端；只读公共 registry，不在本地算分 |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | 家族一键安装包 |
| **[PerryLink](https://github.com/PerryLink)** | 40+ Apache-2.0 DSH 插件 |

## ⭐ 如果它帮到了你

这个项目是 [DSH 插件家族](https://github.com/PerryLink)的一员（40+ 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

## License

Apache-2.0. See [LICENSE](LICENSE).
