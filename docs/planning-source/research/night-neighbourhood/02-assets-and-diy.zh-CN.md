# 夜间居民区：资源复用、有限 DIY 与长期目录设计

研究日期：2026-10-06。图形路线见 [01-graphics-and-tools.zh-CN.md](01-graphics-and-tools.zh-CN.md)。本文首先回答“现成模型能省多少工作”，再说明怎样把 DIY 做成有表达力、可以持续添加、又可维护的产品能力。

## 1. 首选资源组合

建议用 **KayKit Furniture Bits 的免费 CC0 家具作为室内基础，Tiny Treats 作为同一尺寸与技术家族的后续房屋/庭院候选**。整体统一比把十个好看的素材包混到一起更重要。初始小院的地板、剖面墙、窗框、共同灯笼和简单居民可以用少量程序几何制作；椅子、桌子和落地灯直接加载模型。项目的新意应体现在朋友如何共同创造和保留东西，而不要求所有家具都由我们手工建模。

KayKit 作者页列出免费包含 50 多个低模、OBJ/FBX/glTF 格式和一张 `1024×1024` 渐变图集，CC0，可用于个人和商业项目；完整 `.blend` 源文件属于另一付费选项。免费 glTF 已足够进行网页加载实验。[KayKit Furniture Bits](https://kaylousberg.itch.io/furniture-bits)

Tiny Treats 的 Homely House 免费包列出 16 多个模型、相同格式与 CC0；作者说明其尺寸和技术规格与 KayKit 匹配。它是风格连贯的扩展来源，但本次没有下载并逐件检查这个包，不能把作者的兼容说明等同于我们已经验证所有模型的比例、材质或表现。[Tiny Treats Homely House](https://tinytreats.itch.io/homely-house)

## 2. 已实际取得的样本

这次不是只收藏素材链接。工具从作者的 GitHub 仓库取得一个锁定提交的最小样本：

`KayKit-Game-Assets/KayKit-Furniture-Bits-1.0`，提交 `96d5930a8dbdb363409bbc2d3341718b00e17c9c`。

| 已取得的内容 | 数量 / 数据 | 当前验证层次 |
| --- | --- | --- |
| `chair_A.gltf` 与其 `.bin` | 308 个三角形，1 个材质 | 文件、哈希和 glTF 数据检查；项目本次观察浏览器加载/显示 |
| `table_medium.gltf` 与其 `.bin` | 168 个三角形，1 个材质 | 同上 |
| `lamp_standing.gltf` 与其 `.bin` | 320 个三角形，1 个材质 | 同上 |
| `furniturebits_texture.png` | 15,605 bytes | 共享贴图已取得并被这些模型引用 |
| `LICENSE.txt` | 827 bytes，CC0 | 锁定版本的许可文件已保存 |
| 样本合计 | **8 个文件，62,941 bytes** | 包含 3 个 glTF、3 个 buffer、1 张纹理与 1 个许可；不含运行库/代码 |

文件、来源 URL 与 SHA-256 在 [ASSET-MANIFEST.json](../../prototypes/visual-comparison/assets/kaykit/ASSET-MANIFEST.json)；锁定版本许可见 [LICENSE.txt](../../prototypes/visual-comparison/assets/kaykit/LICENSE.txt)。获取脚本见 [fetch-prototype-assets.mjs](../../tools/fetch-prototype-assets.mjs)。下载时的 manifest 曾使用 `rendered: false` 表示当时尚未渲染；加载观察应以随后保存的 [浏览器证据与结果](../../evaluation/RESULTS.zh-CN.md) 为准，不能只靠下载清单推断显示成功。

原型实际复用三种模型，摆出两把椅子、一张桌子与一盏落地灯；盆栽、固定建筑摆设、居民和共同灯笼是程序几何。这三个模型的三角形数之和为 796，**不是整个场景的三角形数**。场景还有重复实例、装饰几何和阴影绘制；62,941 bytes 也不是用户打开页面的全部下载量。它证明了“少量现成家具可以很快进入我们的网页场景”，尚未证明完整家具目录或大量邻居的移动端容量。

## 3. 候选资源与采用条件

| 候选 | 可以帮助什么 | 本次核查到的条件 | 建议位置 |
| --- | --- | --- | --- |
| KayKit Furniture Bits | 桌椅、灯、基础室内陈设 | CC0；免费版本有 glTF；样本已下载、加载 | 首版主家具家族 |
| Tiny Treats Homely House | 房屋、围栏、树和室外布景 | CC0；作者说明与 KayKit 尺寸/规格一致；未下载检查 | 同家族庭院与后续版本 |
| Kenney Furniture Kit / Building Kit / City Kit | 另一套统一家具、建筑与街区语言 | 官方页标 CC0；Furniture Kit 当前列 140 个文件；未解压确认具体选中模型的格式与依赖 | 整体换风格时的备选，先做小房间对照 |
| Quaternius Ultimate Furniture | 简单低模家具 | 官方页列 20 个模型、CC0；当前作者页未列 glTF 格式 | 若有特定缺件，先完成格式转换与尺度检查 |
| Quaternius 模块化/基础人物 | 身体、衣物和动画资产 | 不同包免费/付费内容与格式不同；完整身体/头发/动画组合尚未渲染验证 | 后续角色扩展；首版用少量居民预设 |
| Kenney Isometric Miniature Library | 二维轴测家具图像 | CC0；当前作者页列 35 个文件；属 2D 轴测素材，不等于手绘像素风 | 二维备用视觉的开放许可起点 |
| Bongseng Isometric Apartment | 接近温暖公寓的手绘像素陈设与多方向图像 | 自定义许可允许用于项目与修改，但禁止素材包/部分素材再分发 | 视觉与交互参考；公开课程仓库使用前解决原始素材分发条件 |
| Pixel Salvaje Isometric Interiors | 丰富的像素室内、方向与动画 | 付费；自定义许可允许项目使用，禁止素材再分发；未购买 | 后续自愿采购候选，不能假定可公开提交原文件 |
| Monogon Isometric House Interior | 现成轴测室内观感 | 作者标 CC BY-ND；修改版分发有明确限制 | 构图参考，不作为可改色/组合目录的默认资产 |

资源事实依据：[Kenney 家具](https://kenney.nl/assets/furniture-kit)、[Kenney 建筑](https://kenney.nl/assets/building-kit)、[Kenney 城市](https://kenney.nl/assets/city-kit-suburban)、[Quaternius 家具](https://quaternius.com/packs/ultimatefurniture.html)、[Quaternius 模块化人物](https://quaternius.com/packs/ultimatemodularcharacters.html)、[Quaternius 基础人物](https://quaternius.com/packs/universalbasecharacters.html)、[Kenney 轴测库](https://kenney.nl/assets/isometric-miniature-library)、[Bongseng 许可](https://bongseng.itch.io/isometric-apartment-asset-pack)、[Pixel Salvaje 许可](https://pixel-salvaje.itch.io/isometric-interiors)、[Monogon 作者页](https://maxparata.itch.io/isometrichouseinterior)、[CC BY-ND 条件](https://creativecommons.org/licenses/by-nd/4.0/)。

开放许可降低了公开课程项目的资源维护成本。即使 CC0 不要求署名，仍保留作者、原包、版本、链接与许可，并在作品的资源致谢中说明。我们可以展示并讨论其他游戏或素材的机制，但不从游戏中提取人物、场景或音乐来替代授权来源。

## 4. 怎样让 DIY 有分量

DIY 的价值不只来自资源数量，而来自玩家能组合出“这像我”的空间，并看出朋友确实在这里留下过东西。首版应把自由集中在几种稳定操作上：

| 表达层次 | 首版建议 | 为什么值得做 | 扩展方式 |
| --- | --- | --- | --- |
| 空间底色 | 少量房间模板、墙/地板/窗帘主题 | 很快产生整体个性；不要求玩家从空白搭建筑 | 新主题包、更多开窗与庭院模板 |
| 家具布局 | 精选约 12 件必需品，稳定后扩到约 24 件；逻辑网格、四向旋转、移动、撤销 | 组合差异可见；现成模型能直接复用 | 同一目录继续加物件，保持旧布局 |
| 物件外观 | 每件明确支持的材质/颜色变体 | 小改动能呼应个人窗户和共同小院 | 通过预制材质槽增加可改部分 |
| 自己创作的小东西 | 一个有限色板的 `16×16` 像素牌/小海报 | 让住处出现真正由居民创造的内容 | 多个画框、贴纸、共同拼图 |
| 共同创作 | 两种模板，如分片灯笼与模块花箱；每个部分有作者 | 朋友同步或隔天加入都能留下清楚的贡献 | 新的共同物件模板、不同部件类型 |
| 居民外观 | 几个轮廓预设与有限颜色选择 | 第一眼区分居民，制作成本可控 | 服装/发型目录，最后才引入完整模块角色 |

“12→24 件目录、最多约 30 个摆放物、8×8 逻辑房间”是**初步范围估计**，不是已经测量出的引擎容量，也不是不可改变的需求。原型目前使用约 7×7 的逻辑地面与半格移动，只实现了更小的测试场景。正式规格应选定一个一致的网格、可摆区域与交互尺度，之后用目标手机和初次使用者验证。

用户第一分钟不应面对 24 个分类与空地。默认给一个已经舒服的模板，让用户改变一个颜色、移动一个物件，再完成共同物件的一部分。编辑面板区分“我自己的物件”与“这件共同物件里我的部分”，撤销和保存反馈在动作附近。高级自由度可以逐步展开，不把所有未来功能藏进一个难懂的全能编辑器。

## 5. 材质、占地与资源处理中的实际细节

### 一张图集不等于每个部位都能自由换色

KayKit 样本的一个 mesh/材质可以在同一图集中同时包含木头、布料和金属颜色。简单设置整个材质的 tint，可能把椅脚和坐垫一起染色；不能直接承诺“木框固定，只换布色”。首版可使用作者已给出的变体、少数经验证的整体配色，或者为特定物件预先整理独立材质槽。不要为整个目录临时加入任意纹理编辑器。

小海报应存为有限尺寸的颜色索引数组，由我们生成纹理；文字另外用 DOM 展示。这样能得到真实创作而不需要处理任意大图、上传路径或嵌入代码。灯笼等共同物件也优先采用有限部件与有限颜色组合，贡献内容跟模型外观分开保存。

### 视觉尺寸必须对应编辑规则

每个物件在加入目录前检查原点、坐标轴、比例、旋转后的包围范围、材质和纹理 URI。导出的网格若有隐藏尺寸或偏移，会造成“看起来有空间却放不下”或“看起来碰撞但允许保存”。仅靠模型文件能显示并不够。

本地原型为椅子、桌子、灯和盆栽记录逻辑 footprint；固定沙发、书架、墙也进入同一占地验证。以后增加墙面海报和桌面物件，应新增明确的 `surface` 与可用插槽，而不是假装所有东西都能摆在地上。首版允许桌面插槽即可，不需要物理引擎模拟把书摆到桌上。

## 6. 可持续更新的资源目录

保存的是稳定 `assetId` 和经过校验的参数，而不是第三方可变 URL、任意 JavaScript 或未受限制的资源路径。一个目录记录可有如下形状；这只是推荐契约示例，尚非生产数据库：

```json
{
  "assetId": "kaykit.chair-a",
  "assetVersion": 1,
  "sourceCommit": "96d5930a8dbdb363409bbc2d3341718b00e17c9c",
  "licence": "CC0",
  "category": "seating",
  "surface": "floor",
  "footprint": [1, 1],
  "allowedYaw": [0, 90, 180, 270],
  "variants": ["original"],
  "modelPath": "/assets/kaykit/chair-a-v1.glb",
  "sha256": "record-the-built-file-hash",
  "status": "active"
}
```

这一示例的 `.glb` 是后续打包选项，本次实际下载仍为 `.gltf + .bin + .png`。两者不要混记。源资源哈希和处理后的发布资源哈希分别保存；转换、减面、换材质、修改原点都写入处理记录。

后续发布一个家具包时，按以下顺序推进：

1. 固定作者版本和许可；取几个代表性物件检查风格与大小。
2. 整理逻辑占地、原点、surface、可旋转角度和可用变体；共享同一份目录契约给服务器与渲染器。
3. 用已摆放房间加载新目录，检查旧 ID、旧版本和未知变体；把新家具加入发现入口，而不突然改变已有房间。
4. 对选中、移动、旋转、碰撞、保存、重连与目标手机完成一轮验证；再发布目录版本与简短变更说明。

旧物件不因新 pack 上线而悄悄消失。小变化可以保留旧资源版本；改变 footprint、surface 或变体语义需要显式迁移与冲突处理。停用资源可禁止新增，同时继续显示已摆放实例。若必须移除，给出替代和恢复方式。撤回自己的共同物件部件还应更新历史/快照的显示规则，避免在“纪念版”里持续暴露已删除内容。

## 7. 制作工具与首版不必承担的工作

**Blender/Asset Forge 是开发者的内容生产工具，玩家仍使用我们提供的有限编辑面板。** 已有 Blender 经验可用于统一原点、材质与尺寸；Asset Forge 支持积木式拼搭和导出，可用来快速生产少量独有建筑或渲染二维方向图。它是可选付费工具，本次没有购买或使用。[Asset Forge](https://kenney.nl/tools/asset-forge)

若选二维，Tiled 支持等距地图与 JSON 工作流，适合开发者预先布置场景；它不会自动生成我们的作者权限、共同创作和持续保存系统。[Tiled](https://www.mapeditor.org/)

首版无需让玩家上传任意模型、编辑骨骼、修改建筑几何或编写物件脚本。更有价值的扩展顺序是：经过整理的家具与主题 → 更多共同物件模板 → 更丰富的有限创作 → 有证据支持的角色模块化。每一阶段都能增加表达力，而不要求此前的房间格式推倒重来。

## 8. 尚未确认的事项

正式目录仍需逐件实际加载；Tiny Treats、Kenney、Quaternius 的候选没有完成这次 KayKit 样本级别的文件与浏览器核查。原型家具能显示，也不代表每件纹理变体、角色动画和阴影已验证。目标手机上的资源传输、解码、内存与 GPU 表现尚需实机测试。

这些未确认事项可以通过小样本收敛：先决定一个一致的美术家族，做一个可读的房间、三至五件不同尺寸物件和一件共同物件，再决定扩充哪些目录。不要先下载大量资源再把“统一风格、合法公开提交、维护旧布局”的问题留给最后。
