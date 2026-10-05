# 夜间居民区：网页图形、现成工具与实现路线研究

研究日期：2026-10-06。本文区分三类内容：**官方资料确认的能力**、**本项目本地原型已做的事情**、**尚待制作或测试的设计判断**。资源与 DIY 细节见 [02-assets-and-diy.zh-CN.md](02-assets-and-diy.zh-CN.md)。

## 1. 结论与理由

建议首版采用 **Three.js + 固定正交相机 + 小型剖面房间/小院 + 可选低分辨率放大**。这是具有真实几何、遮挡和光照的 3D，外观可以接近用户说的“假三维”：像一幅有深度的温暖插画，而不是需要学习镜头操作的开放世界。现成模型负责大部分家具，开发重点放在房间选择、物件放置和朋友共同留下的东西。

这条建议是结合项目目标、已有原型和两周制作窗口作出的判断，尚需结合独立视觉审查与目标设备测试确认；不能从“某引擎支持 3D”直接推导出“最终项目必然按时完成”。本地原型已安装并锁定 `three@0.186.1`，实际加载了三种 KayKit 家具，在同一状态下提供固定相机与有限轨道相机两条路径；二维比较使用 SVG/DOM 绘制。正式应用仓库、真实手机和 Fly 部署仍需各自验证。

浏览器负责画场景；后端负责保存和授权。服务器只需要知道某位居民的某件椅子位于哪个逻辑位置、朝哪个方向，以及共同灯笼的某个部分是什么颜色。**不需要一个替我们远程渲染房间的“3D API”**。Three、Babylon、PlayCanvas 等已有相机、模型加载、材质、灯光和拾取能力，但我们的 DIY 规则、贡献归属、持久化和重连流程仍属于产品本身。

## 2. Kind Words 2 提供什么证据

开发者在 2025-03-25 的官方更新中写明，游戏引擎由 Unity 2022 升级到 Unity 6。这支持“使用 Unity”的判断。[Kind Words 2 开发者更新](https://steamcommunity.com/app/2118120/allnews/?l=english)

本次没有找到足以确认其相机投影、几何组织、建模软件或具体渲染管线的开发者资料。因此，不把 Kind Words 2 描述为已经证实的“二维假 3D”或“正交相机游戏”。我们借鉴的是用户观察到的视觉效果：受控制的构图、可读的角色、柔和的城市灯光和有亲近感的小空间。采用固定正交 3D 是我们自己的实现选择。

正交相机不会因为物体离镜头更远就把它显示得更小；这有利于保持家具与格子的可读尺度，但它仍然可以观察一个真实的 3D 场景。固定正交也不等于严格数学意义上的等距投影，最终相机角度应以构图与遮挡测试决定。[Three.js OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html)

## 3. 三种画面路线的实际差异

| 路线 | 用户看到的体验 | DIY 与后续扩展 | 首版要处理的工作 | 当前证据 |
| --- | --- | --- | --- | --- |
| 固定正交 3D | 一个能直接读懂的剖面房间或小院；有立体物件和温暖灯光 | 同一模型可四向旋转；新增目录物件较自然；可预设几个观察角度 | 镜头构图、遮挡、拾取、灯光、几何与逻辑占地一致 | 已有 Three 本地原型，真实 glTF 已显示 |
| 有限透视/轨道 3D | 能稍微绕着自己的房间看，空间探索感更强 | 看物件背面方便，个人展示更有自由 | 手机拖动与页面滚动冲突、找回原镜头、误触与角度下的遮挡 | 已有与固定相机共用场景的 Three 原型 |
| 二维轴测场景 | 像一张可编辑的温暖室内插画；家具、灯光纹理、居民小精灵按层叠放 | 仍能移动、拼贴、颜色变体、共同做物件；旋转常需要多个方向的图像 | 图层排序、方向素材、热点、移动/旋转的二维反馈、光照绘制 | 已有 SVG/DOM 可行性草图；没有安装或测评 Phaser/Pixi 生产实现 |

二维完全可以承载一个有分量的项目。房间布置、多人编辑、作者归属、异步贡献、撤回与恢复均不取决于三维几何。它的画面可以像 Bongseng 的室内拼搭器，或者以渲染出的轴测 PNG 为底：墙角有暖色光晕，桌面有几张朋友共同完成的卡片，居民是小精灵，窗外有两三层缓慢移动的景物。其工作量往往从建模转移到了方向素材和遮挡排序，并非自动少很多。[Bongseng 房间拼搭示例](https://bongseng.itch.io/isometric-room-maker)、[Kenney 轴测素材](https://kenney.nl/assets/isometric-miniature-library)

首版保留固定镜头作为默认视图，轨道视图可作为开发对照或后续“参观”模式。若真实目标手机上的 3D 存在严重加载或交互问题，可以先保留个人窗户与共同物件的语义数据和 DOM 控件，降低阴影与像素效果，再评估二维展示；不要在最后几天才同时维护两套完整交互产品。

## 4. 哪些现成工具真正省工作

以下是截至研究日的候选核查，不代表这些工具都已安装。选择应服从正式仓库的现有栈、团队熟悉程度与导出实测。

| 工具 | 可以直接复用什么 | 对本项目的适配判断 | 需要确认的边界 |
| --- | --- | --- | --- |
| **Three.js** | 正交/透视相机、glTF 加载、灯光、射线拾取、轨道控制、后处理 | 当前推荐；原型已经走通模型加载与共同语义状态，不必引入外部编辑器工作流 | 是图形库；目录、编辑器 UI、授权与数据库需自己实现 |
| **React Three Fiber / Drei** | 在 React 中声明场景；常用控件、加载与组件复用 | 正式仓库已有 React 时值得采用；不为封装层单独改换整个应用栈 | R3F 8 配 React 18，R3F 9 配 React 19；研究日 v10 仍为 alpha；仍需要理解 Three |
| **Babylon.js** | 更完整的场景引擎、相机、glTF 导入与工具生态 | 同样可实现该视觉；已有 Babylon 经验时是合理替代 | 选择 WebGL/WebGPU 路径后实测插件兼容；不把某一个后端的能力当成全部后端通用 |
| **Babylon Editor** | 本地可视化布置、灯光材质编辑，以及网页项目模板 | 手写场景坐标变成负担、同时已选 Babylon 时可明显省工作 | 作者仓库为 Apache-2.0；它带入 Babylon 工作流，不是现有 Three 场景的透明编辑器 |
| **PlayCanvas** | 网页引擎；可视化编辑器可布置场景；可独立使用引擎或下载项目自托管 | 美术人员愿意用编辑器时能减少手写初始场景；并不强制使用其托管服务 | 编辑器账户/项目方案、导出依赖、资源许可证、编辑器与代码的版本关系要记录 |
| **Spline** | 浏览器内摆放物件、材质和简单交互；代码 API 可驱动已发布场景 | 很适合早期构图、光照草图或一个固定演示；带受控家具目录的多人 DIY 要单独做能力验证 | 普通代码导出与包含全部运行资源的 Self-Hosted ZIP 是两种承诺；当前完整离线自托管文档列为 Enterprise；glTF 不能保留全部交互与灯光 |
| **Needle Engine** | Unity/Blender 导出或纯代码工作流；已有交互、多人和物理的 Collaborative Sandbox；有 Node 网络服务器包 | 最值得认真保留的现成模板替代路线；可以自托管，不能简单说“只能用外部房间” | 默认网络服务与自行托管是不同路线；许可、账户、构建流程与自有持久化/授权需核查 |
| **Phaser** | 二维场景、输入、动画、瓦片地图；WebGL/Canvas 路径 | 如果最终选二维、居民移动和动画较多，比从头写 Canvas 更合适 | 当前 SVG 草图不能代表 Phaser 的性能与所有功能；等距排序和 DIY 规则仍需设计 |
| **PixiJS** | 高效二维精灵、文本、图形与滤镜 | 如果二维主要是展示和物件编辑，能保持较小的应用组织成本 | 2026-02 的 8.16 文档把 Canvas 回退称为实验性且功能不完全；应检查选定版本 |
| **Unity Web 构建** | 现成编辑器、场景和成熟工作流 | 已熟悉 Unity 并有可导出的场景时可进一步比较；不因 Kind Words 2 用 Unity 就自动选择它 | Unity 6 文档支持特定移动浏览器；加载、内存、网页 DOM 整合与本项目真实手机需测试 |

主要依据：[Three glTF 加载](https://threejs.org/docs/pages/GLTFLoader.html)、[Three 拾取](https://threejs.org/manual/pages/picking.html)、[R3F 版本与用途](https://r3f.docs.pmnd.rs/getting-started/introduction)、[Babylon glTF](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/)、[Babylon Editor 作者仓库](https://github.com/BabylonJS/Editor)、[Babylon Editor 模板](https://editor.babylonjs.com/)、[PlayCanvas 独立使用](https://developer.playcanvas.com/user-manual/engine/standalone/)、[PlayCanvas 自托管](https://developer.playcanvas.com/user-manual/editor/publishing/web/self-hosting/)、[Phaser 官方入门](https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game)、[Pixi Canvas 状态](https://pixijs.com/blog/8.16.0)、[Unity 6 浏览器兼容性](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-browsercompatibility.html)。

### Spline 与 Needle 的采用方式

Spline 的官方资料允许导出 Vanilla JS、React 等代码，并由网站代码控制对象；但这不等于得到一个可自由编辑家具目录的通用多人房间系统。glTF/GLB 主要保留几何、部分材质和位移/旋转/缩放动画，不保留状态事件、交互、环境灯光和全部后处理；带颜色纹理的导出还有方案条件。[Spline 代码导出](https://docs.spline.design/exporting-your-scene/web/exporting-as-code)、[Spline glTF/GLB 导出边界](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb)

若只需快速确定房间构图，可以在 Spline 中做一张草图后，回到 Three 和自己的资源清单实现。若要把它作为正式运行时，必须先导出一个包含真实家具的最小样本，检查网络请求、导出包、对象访问、手机交互与许可。官方完整自托管 ZIP 文档当前明确为 Enterprise 功能，因此它不作为本项目免费独立部署的默认前提。[Spline Self-Hosted Project](https://docs.spline.design/exporting-your-scene/web/exporting-as-self-hosted-project)

Needle 的默认网络会连接其服务，官方也提供 `@needle-tools/networking` 的 Node 自托管集成，并描述了磁盘 JSON 状态存储。它确实能省掉基础网络代码；不过“进同一个房间并同步对象”仍不能替代我们的身份恢复、逐命令授权、贡献撤回和数据库迁移。其官方 Collaborative Sandbox 是实际可复用的多人交互场景，纯代码与多种网页框架模板也已列出，不必把 Unity/Blender 当成唯一入口。[Needle 自托管网络](https://engine.needle.tools/docs/how-to-guides/networking/custom-servers)、[Needle 模板](https://engine.needle.tools/docs/reference/templates)、[Collaborative Sandbox](https://engine.needle.tools/docs/unity/getting-started)

因此可以为 Needle 安排一次有上限的采用试验：用一个模型做吸附放置与归属，让两个浏览器修改不同部分，使用自有服务器重启恢复，再拒绝越权和无效位置。若这一流程比现有 Three 实现明显节省工作，可在第一阶段改选；目前没有执行这个试验，不能把推测的优势当成结果。它是另一套主路线，避免给已运行的 Three 原型随意叠加第二个引擎。

Needle 的许可不是 Three 式的开源引擎许可。官方 EULA 允许带原有 branding 的自身教育/非商业使用，商业贡献需要对应付费许可；去 branding 的 EDU 等许可有单独条件与人工批准。采用前确认当前方案和构建账户流程，但不因此把它说成必须购买才能做任何课程实验。[Needle EULA](https://cloud.needle.tools/eula)、[Needle 许可与构建 FAQ](https://engine.needle.tools/docs/reference/faq)

这些官方示例与模板适合借用加载方法、场景结构或组件，不宜直接套一个 MMO/多人聊天室模板，再补丁式加入个人房间与共同物件。选取模板时，应确认代码许可、最后更新、依赖、客户端是否能绕过权限，以及资源目录是否能用我们的稳定 ID 接管。

## 5. 温暖的“像素 3D”怎样实现

**建模风格、纹理风格与最终屏幕像素是三件事。** KayKit 是低多边形渐变纹理资源，本身不是手绘像素精灵。可以用这些模型构建柔和房间，再把场景在较小画布上渲染并以 nearest 放大，形成像素颗粒；用户文字、按钮、署名和表单仍用清晰 DOM 绘制。原型已实现同场景的清晰/低分辨率选项，尚未采用 Three 的 `RenderPixelatedPass`。官方的该后处理 pass 是另一个可试验工具，不需要首版自写复杂 shader。[Three RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html)

推荐美术流程：先用冷色夜景背景、几种木色与小面积琥珀灯光建立构图；用有限阴影使物件落地；再加入低分辨率放大。像素尺度过大时，细长家具、贡献署名和物件轮廓容易失去可读性，应提供清晰模式，并让编辑中的选中物件有高对比轮廓与文字名称。窗户与共同灯笼可以是画面亮点，不需要每件装饰都成为实时投影灯。

低分辨率能减少像素着色工作，但不能自动减少模型数、阴影 pass 或 draw calls。高 DPR、多个投影灯、透明装饰与后处理都需要单独记录。不要把“几十个低模家具”当成已经证明的移动设备性能预算。

Three API 会变化。当前迁移指南中 r185→r186 的 `PCFSoftShadowMap` 变化**具体针对 WebGPURenderer**；本地 WebGL 原型选择 `PCFShadowMap`。升级要同时核对引擎版本、封装层和示例，而不是笼统地宣布某常量在所有渲染器中被移除。[Three 官方迁移指南](https://github.com/mrdoob/three.js/wiki/Migration-Guide)

## 6. 交互与架构必须一起设计

一次放置动作的完整路径是：选择物件 → 在逻辑地面上预览 → 检查占地和障碍物 → 提交包含物件 ID、位置、方向与版本的命令 → 服务端再次验证 → 保存并广播 → 各客户端更新自己的画面。屏幕坐标不是持久化坐标；可见家具也不能只有漂亮的 mesh、没有对应的放置规则。

本地独立审查曾发现盆栽能移入固定沙发，因为原先碰撞检查只考虑可移动家具。现在 [model.mjs](../../prototypes/visual-comparison/model.mjs) 包含沙发、书架与墙体的固定占地，回归测试覆盖这类放置。这个问题说明美术摆设也会改变可编辑空间，资源与场景设计不能独立于规则维护。

固定相机减少操作学习，但仍可能把物件遮住。编辑时可以淡化前景装饰、明确显示可放置地面，并同时提供“物件列表 → 东西南北微移 → 四分之一转”的 DOM 操作。触屏用户不必完成精确三维拖动；键盘用户不必从 Canvas 中猜测焦点。相机切换不改变房间内容，重新连接不重置镜头；拖动预览与已保存状态分开。

首版建议把渲染器组织成一个窄接口：接收语义场景快照，显示选中 ID，发出选择/放置意图，报告加载与错误，销毁自己分配的 GPU 资源。身份、事件流、历史和目录校验不放在 mesh 组件里。这样后续增加预设视角、家具包或静态二维预览，不需要重新设计数据库。

## 7. 原型证据如何读

协议先于原型声明，见 [visual-comparison-protocol.json](../../evaluation/visual-comparison-protocol.json)；运行入口及其限制见 [原型 README](../../prototypes/visual-comparison/README.md)。固定与轨道候选共用场景、模型、状态、palette 和控制面板；SVG 候选使用同一语义状态但不同的示意素材，因此只能比较实现与交互可行性，不能把画质差异全部归因于“2D 对 3D”。

目前可以依据实际文件确认模型及纹理已取得、Three 被锁定、两类相机共享实现、DOM 控制独立存在。项目本次在真实桌面浏览器中观察到三种 glTF 模型加载、跨会话更新和共同灯笼的颜色变化。正式测量与审查应以 [RESULTS.zh-CN.md](../../evaluation/RESULTS.zh-CN.md) 和 [browser-matrix.json](../../evaluation/browser-matrix.json) 为准：RAF cadence 是浏览器帧回调节奏，不是 GPU 完成耗时；renderer CPU 时间不是完整 GPU 成本；`390×844` 的桌面视口不是物理手机。SVG 采样中重叠记录不能当作独立重复试验，也不据此作未受控制的帧率优劣比较。

这次没有购买 Spline/Needle/Asset Forge 方案，没有安装全部候选引擎，没有验证 Unity Web 导出或生产 Fly 应用。正式选择前最有价值的新增检查是：在目标手机中完成一次选择、移动、旋转、保存与重连；验证资源加载失败/图形上下文丢失后的核心内容仍可访问；在真实正式仓库中确认依赖与构建管线。它们用于决定画面质量和接口修正，不必扩大成另一个开放世界项目。
