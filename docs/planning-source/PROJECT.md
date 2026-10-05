# COMP4020 期末项目文档

本文件是期末项目文档入口。用户已选择“夜间居民区”为主方向，以“夜里的窗”的共同在场构想为基础。研究、局部网页原型、技术/产品比较与独立评审已完成；推荐固定正交3D、温馨像素场景和“共造小院”。证据工作台继续作为备选。正式A3实现尚未开始。

记录日期：2026-10-06。推荐功能/排期属于规划；已执行的原型和检查单独记录，不等同于正式应用。

## 从这里读

1. [完整设计方案](design/night-neighbourhood/DESIGN-PLAN.zh-CN.md)：产品方向、三维/二维选择、原创性、范围和未来开发。
2. [体验与DIY规格](design/night-neighbourhood/EXPERIENCE-AND-DIY.zh-CN.md)：窗群/房间/小院、手机、素材、目录更新。
3. [系统设计](design/night-neighbourhood/SYSTEM-DESIGN.md)：Core授权SSE快照、身份、SQLite/Fly、恢复、Full扩展合同。
4. [交付与验证](design/night-neighbourhood/DELIVERY-AND-VALIDATION.zh-CN.md)：条件性50h/78h、两周切片、课程与真人验证。
5. [实际结果和评审](evaluation/RESULTS.zh-CN.md)：真实浏览器证据、15项领域测试、错误样本、修订和未验证项。
6. [A2继承记录](reference/INHERITANCE.md)：58份来源材料、已适配规则与惰性参考。

五份来源研究：[图形与工具](research/night-neighbourhood/01-graphics-and-tools.zh-CN.md)、[资产与DIY](research/night-neighbourhood/02-assets-and-diy.zh-CN.md)、[产品与新意](research/night-neighbourhood/03-product-and-originality.zh-CN.md)、[实时与存储](research/night-neighbourhood/04-realtime-and-persistence.zh-CN.md)、[small-web与共在](research/night-neighbourhood/05-small-web-and-presence.zh-CN.md)。

本地原型见[运行说明](prototypes/visual-comparison/README.md)，地址为 http://127.0.0.1:4260/（需启动本地服务），不是已发布网站。

## 已确定的项目目标

- 优先考虑非游戏项目，重视新意、实际体验和多人同时使用的意义。
- 目标是一个有完整使用流程、具有适当技术深度的中等规模项目。
- 预计投入约半个月开发。这个时间是开发预算，不是课程截止日期。
- 实时协作、权限、数据保存和历史记录应服务于核心体验。
- 主方向为夜间居民区，面向6–8位已有关系的朋友；推荐固定3D、有限房间DIY和署名部件共造。正式仓库运行配置待核验。
- 当前视觉偏好是温馨光照、像素风和类似 Kind Words 2 的空间深度感；三维、固定视角三维与二维路径需要依据研究和原型比较选择。
- DIY 应足够有表达空间，初版范围明确，并支持未来持续增加物件与互动。

## 课程要求

以下内容依据 2026 年 10 月 6 日核对的课程页面。

| 项目 | 要求 |
| --- | --- |
| 多人 | 至少两个人在各自浏览器中操作共享状态，应用能够区分参与者。 |
| 实时 | 一人的修改约一秒内出现在其他相关会话，无需观看者刷新。 |
| 持久化 | 保存的操作结果跨会话、服务器重启和重新部署仍然存在。 |
| 项目形式 | 可以是协作工具、社交空间、乐器或互动艺术；题材和技术栈由学生选择。 |
| 部署 | 使用课程提供的 Fly 应用及指定 `*.fly.dev` 地址，遵守一台小型机器和一个持久卷的约束。 |
| 项目论证 | `README.md` 说明什么算好，`CLAUDE.md` 落实为规则，`spec/` 检查可验证的承诺。 |

这是一项个人作业，占课程总成绩 40%，正式截止为 **2026 年 11 月 9 日周一中午 12:00，堪培拉时间**。参见[期末项目 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)。执行前应复核页面是否有更新。

## 选题状态与备选文档

| 方向 | 当前状态 | 文档 |
| --- | --- | --- |
| 主方案 | 夜间居民区，研究与计划已形成 | [完整设计](design/night-neighbourhood/DESIGN-PLAN.zh-CN.md) |
| 网页剧场 | 历史讨论方向 | 概念摘要保留供参考。 |
| 证据工作台 | 用户指定保留的备选，尚未选定 | [证据工作台方案](alternatives/evidence-workbench.zh-CN.md) |
| 夜里的窗 | 保留的原始方案，现作为主方向的构想基础 | [夜里的窗原始方案](alternatives/night-windows.zh-CN.md) |

备选文档记录核心体验、较完整的功能范围、开发切片、风险和待决定事项。它们是后续选题的依据。

## 网页剧场概念摘要

几个人共同导演一场二维网页演出。参与者分工控制人物、道具、布景、灯光和字幕；观众通过独立页面观看同一个实时舞台。创作者先布置场景、保存排练版本，再按提示单执行演出，结束后回看保存的演出记录。

拟议核心模块包括场景编辑、对象或图层的控制权限、场景快照、演出提示单、观众页面和演出档案。第一版可以采用少量预设道具与逐条执行的动作，让多人控制和保存流程先完整成立。主要风险在于动作排序、断线恢复和回放一致性。

这个摘要保留讨论内容。若主方案选择其他方向，应据实更新本节及后续计划。

## 两周开发计划摘要

以下是相对开发日摘要，精确范围/依赖以新[交付计划](design/night-neighbourhood/DELIVERY-AND-VALIDATION.zh-CN.md)为准。Core条件性约50h（地面DIY与共同灯），Full约78h（旗与整个纪念能力等）；估计不是保证，先通过早期产品与部署门槛。

| 阶段 | 工作 | 验收结果 |
| --- | --- | --- |
| 第 1 至 3 天 | 确定目标用户与核心流程，完成可部署的最小版本。 | 两个可区分的参与者能完成一个有意义的操作，保存后可重新访问。 |
| 第 4 至 8 天 | 实现主要协作功能、角色权限和异常处理。 | 两个浏览器能观察到同一状态变化；未获授权的修改被拒绝。 |
| 第 9 至 11 天 | 完善历史记录、恢复机制和完整使用流程。 | 可以重访成果，解释重要修改，并恢复断线会话。 |
| 第 12 至 14 天 | 邀请真实使用者试用，修复问题，整理证据。 | 桌面和手机流程可用；过程文档能对应实际提交与验证。 |

阶段计划需要对齐实际 crit：C8 是首个工作版本与初版 README，C9 推进实时多人体验，C10 增加服务器日志；三次 crit 和期末提交使用同一课程仓库。[阶段安排](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)

## 验证与提交记录

选题后，将具体承诺写成可执行检查和真人试用问题。机械检查应覆盖相关权限、并发修改、重连，以及重启和重新部署后的数据保存。真人试用用于判断核心体验是否清楚、是否值得使用。

课程评分使用 Chrome 的 **1920×1080** 和 **390×844** 两个视口。最终检查包括 `pnpm check`、`pnpm check:evidence`，并检查真实部署的关键流程。[评分环境与检查说明](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)

需要持续维护的提交材料：

- 部署应用、源代码、`CLAUDE.md`、`spec/` 和随开发形成的 Git 历史。
- `README.md`：建议 400 至 600 英文词，包含对“好”的定义和参考来源，在 `/readme/` 全文发布。
- `PROCESS.md`：随三次 crit 重写并逐步增长，最终建议 900 至 1100 英文词，说明技术栈、工作方式和重要决策，以 commit 或 compare 链接支持过程描述。
- `reflections/` 中的 `crit-8.md`、`crit-9.md`、`crit-10.md`：每篇建议 150 至 300 英文词。

上述字数是指导范围。项目评分权重为过程 50%、应用 25%、回应 brief 25%。参见[材料与字数说明](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)。

## 下一阶段

1. 确认真实A3仓库、Fly provision和有效个人工时。
2. 用现有原型做早期朋友概念检查，分别验证同时共造与隔时回访。
3. 按Core合同在真实仓库落实身份、卷内保存、授权SSE与第一条完整流程。
4. 做真实手机、重启/重部署及故障检查；据进度启用Full，不提前承诺。
5. 学生根据真实判断与commit撰写课程README/PROCESS/reflections，研究文件作为材料。
