# VISUAL-REPORT — A–E 逐项对照（BRIEF-CL-01）

request-id：`starfall-claude-fable-01` ｜ 日期：2026-11-22
截图：`docs/shots/*.png`（本轮实拍，Chromium Headless Shell + SwiftShader 软件 WebGL2，1280×720，另有 844×390、720×680）。
视觉基线：`tests/visual-baseline/*.png`（960×540）。

**先说明一条影响全篇的限制**：参考帧图（`video-frames/frame-XX.png`）和用户手机截图在本次运行里**没能以图像方式打开**——读图工具对工作区以外的路径没有获得授权，而简报又规定这些素材不许复制进游戏目录，所以我没有绕过去。实际依据是：`VISUAL-REF.md` 的文字描述、简报正文与「补充」一节的文字、以及用脚本对 frame-00/30/42/71 和手机截图做的 32×15 粗网格取色（只得到大致配色：石面暖灰米色、草地中绿、水面青蓝）。因此下面所有「已落实」都是**对照文字描述**的落实；「取景与 frame-00 / frame-30 一致」这类需要看图比对的结论，我没有做，列在未落实里。原站单文件参考（`orig-ref/index.html`）全程没有打开。

图例：✅ 已落实并有证据 ｜ ◐ 部分落实 ｜ ❌ 未落实

## A. 审计缺口

详见 `AUDIT.md`。

| 项 | 状态 | 证据 |
|---|---|---|
| 装备 4 件改名改价（破军 2950 / 无尽战刃 2140 / 贤者之书 2090 / 影刃 2070） | ✅ | `AUDIT.md` 1.1 映射表；测试 `audit: four items carry the original names and prices…` |
| 英雄成长数值逐项核对 | ✅（核对 80 项全部一致，无改动） | `AUDIT.md` 1.2；测试 `audit: hero base stats and per-level growth match…` |
| 时长 12–20 分钟、水晶摧毁结束、建筑血量不动 | ✅ | 全 AI 15:26（蓝 38 : 红 25）、挂机 15:23（蓝 40 : 红 27），均为蓝方水晶被摧毁；测试 `pacing: …inside 12-20 minutes` |
| 开局金币 50 | ✅ | 测试 `audit: every hero starts with 50 gold`；HUD 截图开局显示 5x 金 |
| 其他缺口列清单 | ✅ | `AUDIT.md` 第 2 节共 14 条：10 条已修，4 条未修并说明原因 |

## B. 视觉 3D

| 项 | 状态 | 说明 / 证据 |
|---|---|---|
| 原生 WebGL2 + 程序化几何，无 CDN、无外网 | ✅ | `dist/render3d.js` + `glkit.js` + `models3d.js`，全部顶点、贴图（噪声、石板、法阵图集、地形掩码）启动时生成；`dist/` 内无任何图片/模型文件 |
| 建不出 WebGL2 时回退 Canvas2D | ✅ | `makeRenderer()`；`?renderer=2d` 可强制；`docs/shots/11-canvas2d-fallback.png`；视觉测试末段断言 `renderer=canvas2d` 且无报错 |
| 标题页：藏青星空 + 金色宋体标题 | ✅ | `01-title.png`：星空、流星、顶部金色四角星、宋体金字「星陨战纪」、`STARFALL`、金色「开始对战」、三枚藏青金边按钮、底部三层山峦、左右方尖碑嵌金色菱形 |
| 标题页按钮「留言板」 | ❌ | 仍是「对战记录」；留言板要原站后端 |
| 选人页：左列 5 卡、中央 Q 版 3D 英雄立于紫金圆台、右侧技能/数值面板 | ✅ | `02-select.png`：左列五卡（选中金边）、中央 WebGL2 英雄 + 紫面金边金星台座、头顶金字名 + 橙色「战士」、左右切换箭头、右侧定位/路线/近战/难度、技能圆标、`拦腰一斧 Q 一技能`、标签、`冷却 6.5~5 秒 / 消耗 40~60 / 距离 5.5 米`、伤害数值串、雷达图、生命 3450 等六格、底部难度「简单/普通/困难」+「开始对战」 |
| 对局斜 45° 俯视 | ✅ | 见 D 节 |
| 出生点圆形灰石台（金环 + 蓝环 + 星纹）+ 蓝色发光水晶 | ✅ | `03-spawn.png`：灰石圆台、外金环、蓝环、八角与五角星纹、刻度；后方金边底座上的蓝色多面体发光水晶 |
| 鲜绿草地、灰石墙、圆顶树 | ✅ | `05-river.png`、`06-jungle.png`、`12-tower.png`：草地明暗斑驳，石墙分块砌筑带侧面，圆顶树（绿冠 + 褐干） |
| 野怪营地：深褐圆地 + 红色五角星轮廓 | ✅ | `06-jungle.png`：深褐地面、红圈、红五角星、外圈红色刻度点 |
| HUD 布局：顶中比分条、左上方形小地图、右上战绩/金币、底部中央英雄卡、右下技能簇 | ✅ | `03-spawn.png`；视觉测试对各元素包围盒做了位置断言 |
| 英雄约小兵 1.5–2 倍高，野怪约英雄一半高 | ✅ | 英雄 2.8 单位，近战/远程兵约 1.5 单位（约 1.9 倍）；小野怪约 1.0–1.3 单位。`07-fight.png`、`06-jungle.png`。注意：红/蓝 buff 巨怪与河道两只首领按设定更大，不在「一半高」之列 |
| 路面不规则灰石板 | ✅ | `12-tower.png`：周期 Voronoi 石板 + 深色勾缝，边缘带青苔过渡 |
| 野区高草丛（竖直草叶簇）、灰色岩石、红蘑菇、圆顶树 | ✅ | `05-river.png`、`06-jungle.png` |
| 河道亮蓝色水面带睡莲叶与涟漪 | ✅ | `05-river.png`：亮蓝水面、流动高光、扩散涟漪圈、岸边浅色泡沫、睡莲叶（部分带花） |
| 水晶台金环 + 蓝水晶 | ✅ | `03-spawn.png` |
| 程咬金：红披风、红顶缨头盔、铠甲板、双手大斧 | ✅ | `02-select.png`、`07-fight.png` |
| 走动起伏摆动、转向平滑 | ✅（代码与实机，未录视频） | 行走相位驱动腿/臂摆动与身体起伏、前倾，披风后摆；朝向按指数平滑追随 `facing`。静帧无法体现，属自述 |
| 脚下绿色选中光环 | ✅ | 各对局截图；队友蓝环、敌方红环 |
| 头顶血条 + 名字 | ✅ | 血条（玩家绿、友方蓝、敌方红）、每 1000 血刻度、蓝条、等级圆标、名字 |
| 普攻挥斧动作 | ✅ | `07-fight.png` 斧举过头顶的一帧；举起→劈下→收回共 0.42 秒 |
| 伤害数字从目标头顶飘起 | ✅ | `07-fight.png` 中的「317」「49」 |
| 施法地面大圆形法阵（金色星形环 + 刻度纹，紫色变体），约 1 秒消散 | ✅ | `07-fight.png` 金色法阵；紫色变体用于王昭君与荆轲（`05-river.png` 拍的是技能光束，紫色法阵由视觉测试断言 `purple=true, life=1`） |
| 技能按钮：冷却大号倒计时、未解锁挂锁、金边圆形、下方中文标签 | ✅ | `05-river.png`（Q 显示「7」并变暗）、`03-spawn.png`（位移/大招挂锁）；标签 闪现/治疗/回城/位移/大招/爆发 |
| 小兵：灰蓝铠甲小士兵带武器，红/蓝血条，成群推进，死亡倒地 + 消失 | ✅ | `07-fight.png`；近战持剑盾、远程持标枪、炮车为轮式炮、超级兵持锤披披风；死亡 0.3 秒倒地后下沉淡出 |
| 顶部比分条带计时与波次倒计时 | ✅ | 「⚔ 蓝 0 ｜ 00:02 ｜ 0 红 ⚔」，下挂「8秒」小字 |
| 目标横幅「当前目标 …」 | ✅ | 开局「小兵 8 秒后出发，先去上路一塔等着」，离线后「回到上路，跟著小兵打」；测试 `objective banner follows the match state` |
| 阵亡画面：灰色遮罩 + 「你已阵亡 N 秒后复活」+ 首杀横幅 | ✅ | `08-dead.png` |
| 右边缘队友头像竖排 | ✅ | 四名队友头像 + 血条，阵亡显示复活秒数 |
| 取景与 frame-00 / frame-30 一致 | ❌ 未核对 | 没能看图，见篇首说明 |
| 其余四名英雄造型 | ◐ | 简报只描述了程咬金。樊哙（钢甲、角盔、塔盾、短锤）、王昭君（靛蓝长袍、长发、琵琶）、李广（青衣、长弓、箭袋）、荆轲（黑衣、白发、白巾、双匕）是我按 sim 里的配色与技能名自定的，没有原版依据 |
| 新手引导 | ◐ | 改成顶部药丸条（步数 + 标题 + 文案 + 下一步 + 跳过引导），共 5 步；VISUAL-REF 里原版是 6 步，第 6 步内容不详 |

## C. 小地图

| 项 | 状态 | 证据 |
|---|---|---|
| 方形带圆角、约屏宽 1/5、深蓝近黑底、金色细边框，不是菱形、不是深绿稀疏版 | ✅ | 各对局截图左上；测试断言：宽高相等、宽度占屏 17%–23%、圆角 ≥ 6px、边框 `rgb(226,182,78)` ≤ 2px、无旋转 |
| 地形全画：绿色野区、斜对角蓝色河道、米黄色三路、灰色石墙轮廓、河道两端野怪营地小圆点 | ✅ | 测试逐点取色：河道蓝、路面米黄、野区绿、墙灰、外框近黑；14 个营地全部画点，河道两只首领用更大的金点 |
| 防御塔红/蓝小方块、英雄红/蓝小圆点（己方白边）、小兵更小的点、水晶红/蓝菱形 | ✅ | 同上；玩家自己另加一圈绿环 |
| 位置与 sim 状态实时对应 | ✅ | 每 0.1 秒按 `world.entities` 重画；敌方单位遵守视野 |
| 刷新倒计时小字（如 1:56、4:26） | ✅ | `03-spawn.png` 开局 2 秒显示 1:58 / 4:28；测试 `camp timers…(1:56 / 4:26 at 4 seconds)` |
| 小地图下方金色钱袋按钮（商店入口） | ✅ | 金色钱袋 + 当前金币，点开商店 |
| 点小地图跳转视角，按住显示对应位置 | ✅（未写自动化用例） | 按住：镜头停在该处，松开回英雄；轻点（< 0.26 秒）：跳过去停约 3.5 秒，期间一移动就回英雄。小地图上的白色梯形是当前视野 |

## D. 45° 镜头

| 项 | 状态 | 证据 |
|---|---|---|
| 俯仰角定为 45° | ✅ | `CAMERA_PITCH = π/4` 常量；测试断言 `pitchDegrees` 与 45 相差 < 0.01（实测 45.000） |
| 英雄约占屏高 1/6 | ✅ | 相机距离按「英雄脚底到盔缨顶的投影 = 视口高 1/6」二分求解；实测 0.16667（1280×720、844×390、720×680 三种视口一致） |
| 能看到石墙、岩石侧面，英雄全身，地面明显向远处收 | ✅ | 透视投影，纵向视场角 40°；测试断言 6 个单位外的 1 单位屏幕长度 < 近处的 82% |
| 镜头跟随英雄 | ✅ | 测试断言英雄投影落在屏幕水平中线、垂直居中 ±12% |
| 标题/选人页不受影响 | ✅ | 标题页是 DOM + 星空画布；选人台座用独立的小画布和独立相机 |
| 低端机帧率不崩 | ◐ 仅软件渲染实测 | 见下方性能一节；**没有真机数据** |
| 取景与 frame-00 / frame-30 一致 | ❌ 未核对 | 同上 |

关于 1/6 的提醒：`VISUAL-REF.md` 自己量的是「英雄约 60px 高（960×600 视口）」，即 1/10；简报 D 节定的是 1/6，我按简报做。1/6 下 16:9 屏幕能看到的地面约 22×18 单位，射手 8.2 的射程和塔 8.5 的攻击范围在纵向已接近屏幕边缘。若实玩觉得太近，只需改 `render3d.js` 里的 `HERO_SCREEN_FRACTION` 一个常量（并重生成视觉基线）。

## E. 触屏多点触控

| 项 | 状态 | 证据 |
|---|---|---|
| 全部触屏控件改用 Pointer Events，按 pointerId 分流 | ✅ | `dist/touch.js`：`createJoystick` 独占一个 pointerId；`bindPress` 每个按钮只跟踪按下自己的那个 pointerId |
| 摇杆按住期间，另一指点 闪现/治疗/回城/技能 立即触发 | ✅ | 闪现/治疗/回城/普攻在 `pointerdown` 当场触发；技能轻点在抬手时施放（保留拖动瞄准） |
| 按住方向再按闪现要有效果 | ✅ | 闪现改为朝当前移动方向；测试断言位移 > 3.5 单位且方向与摇杆一致 |
| 处理 pointercancel / pointerup 释放 | ✅ | 另含 `lostpointercapture`、窗口失焦复位 |
| `touch-action: none` | ✅ | 摇杆、六个技能键、普攻键、战场画布、小地图；测试逐个断言 |
| 冷却中点按不触发、不影响摇杆 | ✅ | 测试第 4 步：冷却中的闪现与 Q、未解锁的大招都不触发，摇杆 pointerId 不变且英雄继续移动 |
| Playwright 多点触控用例留进 tests/ | ✅ | `tests/touch.test.mjs`，用 CDP `Input.dispatchTouchEvent` 注入真实多触点 |
| 摇杆外观：左下大半透明深色圆盘 + 4 刻度 + 蓝色渐变旋钮，随推偏移、松手回中 | ✅ | `06-jungle.png`、`09-phone-landscape.png`；测试断言旋钮 `transform` 偏移与回零 |
| 技能簇排布：最右下最大普攻（金色剑）、其上大招、左列自上而下 闪现/治疗/回城/位移/爆发 | ✅ | `03-spawn.png`；测试对七个按钮的大小与上下左右关系逐条断言 |
| 矮屏手机（高 < 530px）排布 | ◐ | 左列放不下五个，折成两列（闪现/治疗/回城 ｜ 位移/爆发），`09-phone-landscape.png`。与「单列自上而下」不同，是为了不超出屏幕 |
| 真机多点触控 | ❌ 未测 | 只在无头 Chromium 里用 CDP 注入触点验证 |

多点触控用例覆盖的 7 步：① 手指 A 按住摇杆推向右上，英雄移动、旋钮偏移；② 手指 B 点闪现，立即进冷却、位移 > 3.5、方向正确、摇杆 pointerId 不变、之后继续行走；③ 手指 B 依次点治疗、Q 技能、回城，均到达 sim；④ 冷却/未解锁按钮不触发且不影响摇杆；⑤ 三指同时（摇杆 + 按住普攻 + 点治疗）；⑥ A 抬起，摇杆回中、输入归零、英雄停下；⑦ 别的手指先抬不会复位后按下的摇杆，`touchCancel` 能正确释放。

## 性能（仅软件渲染）

环境：无头 Chromium + SwiftShader（CPU 软件光栅），4 核，机器内存吃紧。静态场景约 8.9 万三角形，按 24 单位分块做视锥外剔除，一帧 28–132 个 draw call。

- 1280×720 稳定后帧间隔约 17 ms（rAF 实测）；首次进对局约 3–7 秒（建几何 + 着色器首次编译）。
- 过程中修掉两处性能坑：地面着色器原先逐像素算噪声和 Voronoi，改为采样两张启动时烘焙的平铺小贴图；地形掩码原先用 Canvas `filter: blur`，在软件 GPU 上积压了约 56 秒，改为无滤镜的两级缩小。
- 画质「低」档：关抗锯齿（需在进第一局前选）、不画草叶簇、石板用纯色、DPR 取 1。

没有任何真实手机或独显/核显数据，「低端机帧率不崩」只能说在软件渲染这个下限上成立。

## 命令输出

`npm run check`：

```text
> node --check dist/app.js && node --check dist/sim.js && node --check dist/render.js && node --check dist/render3d.js && node --check dist/glkit.js && node --check dist/models3d.js && node --check dist/minimap.js && node --check dist/hud.js && node --check dist/touch.js && node --check dist/portraits.js && node --check dist/audio.js && node --check dist/controls.js
（退出码 0）
```

`npm test`（`node --test --test-concurrency=1 tests/*.test.mjs`，完整逐条输出存于 `docs/test-output.txt`）：

```text
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 142169.851139
```

`npm run sim`（`node tests/tools-fullsim.mjs both 1122 mage`）：

```text
{"kind":"ai","seed":1122,"heroId":"mage","winner":"red","time":926.53,"mmss":"15:26","score":"38:25","cores":{"blue":0,"red":16169},"towersLost":{"blue":6,"red":6},"levels":{"blue":"15/14/15/15/15","red":"15/14/13/14/15"},"peak":77}
{"kind":"afk","seed":1122,"heroId":"mage","winner":"red","time":923.13,"mmss":"15:23","score":"40:27","cores":{"blue":0,"red":19000},"towersLost":{"blue":6,"red":5},"levels":{"blue":"1/13/12/15/15","red":"15/14/15/14/15"},"peak":80}
```

（`score` 为击杀比分 蓝:红；`cores` 为结束时水晶剩余血量；`towersLost` 为各方被摧毁的塔数。）

视觉基线比对（同一环境复跑）：

```text
ℹ title: mean diff 0.022, changed pixels 0.00%
ℹ select: mean diff 0, changed pixels 0.00%
ℹ spawn: mean diff 0, changed pixels 0.00%
ℹ river: mean diff 0.05, changed pixels 0.00%
ℹ dead: mean diff 0.143, changed pixels 0.00%
```

截图工具 `npm run shots` 的输出（每张图的渲染器、俯仰角、英雄屏占比、页面报错）：

```text
[8s] 01-title {"errors":[],"info":null}
[20s] 02-select {"errors":[],"info":null}
[41s] 03-spawn {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.1666666737018762,"tris":88664,"draws":58}}
[61s] 05-river {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666667032557847,"tris":88664,"draws":38}}
[79s] 06-jungle {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666667323541462,"tris":88664,"draws":107}}
[99s] 07-fight {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666666906454447,"tris":88664,"draws":72}}
[124s] 08-dead {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666666987577475,"tris":88664,"draws":132}}
[140s] 09-phone-landscape {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666666656426243,"tris":88664,"draws":117}}
[150s] 10-phone-squarish {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666667370187624,"tris":88664,"draws":54}}
[168s] 11-canvas2d-fallback {"errors":[],"info":{"is3D":false}}
[219s] 12-tower {"errors":[],"info":{"is3D":true,"pitch":45,"hero":0.16666667501981827,"tris":88664,"draws":56}}
```

## 截图索引

| 文件 | 内容 |
|---|---|
| `docs/shots/01-title.png` | 标题页 |
| `docs/shots/02-select.png` | 选人页（程咬金） |
| `docs/shots/03-spawn.png` | 开局 00:02 出生点 |
| `docs/shots/05-river.png` | 河道 + 王昭君一技能光束 + Q 冷却数字 |
| `docs/shots/06-jungle.png` | 野区营地（荆轲），含摇杆 |
| `docs/shots/07-fight.png` | 上路兵线：金色法阵、挥斧、伤害数字、首杀横幅 |
| `docs/shots/08-dead.png` | 阵亡画面 |
| `docs/shots/09-phone-landscape.png` | 844×390 手机横屏 |
| `docs/shots/10-phone-squarish.png` | 720×680（与录屏帧同比例） |
| `docs/shots/11-canvas2d-fallback.png` | `?renderer=2d` 回退渲染 |
| `docs/shots/12-tower.png` | 上路一塔与石板路 |

全部截图与视觉基线都拍自最终代码（03/05/06/07 四张在石墙高度从 1.45 降到 1.15 之后重拍过，上面的工具输出是重拍前那一次完整运行的记录，数值相同）。
