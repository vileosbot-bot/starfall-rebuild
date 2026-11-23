# 星陨战纪 · Web 复刻版

可独立运行的浏览器单机 MOBA，WebGL2 3D 画面（建不出 WebGL2 时自动回退 Canvas2D）。一名玩家与九名 AI，五位英雄，三路推进，摧毁敌方水晶获胜。支持电脑键鼠和手机触屏。

## 立即运行

在线版本提供完整游戏，不需要安装依赖。下载源码后，进入解压目录运行：

```sh
python3 serve.py
```

Windows 可双击 `start-game.cmd`，需要已安装 Python 3。浏览器打开 `http://127.0.0.1:8080/`。也可以用任意静态服务器提供 `dist/` 目录。ES 模块需要 HTTP 服务，直接双击 `dist/index.html` 不属于支持的运行方式。

运行游戏不需要 npm、外部 CDN、后端、账号、外部图片或音频下载。WebAudio 需要首次点击后才会发声。设置与对战记录保存在当前浏览器的 localStorage；当前对局不支持关闭页面后恢复。

## 游戏内容

- 五位可选英雄：樊哙、程咬金、王昭君、李广、荆轲。
- 十名英雄同时参与对局；三条兵线，十八座防御塔，两个水晶，十四组野区营地。
- 十五个主动技能、英雄被动、法力与冷却、十五级成长、自动技能升级。
- 首波小兵在十秒生成，后续每三十秒一波；近战兵、远程兵、炮车及超级兵。
- 十七件装备，六格装备栏，推荐出装、手动购买、鞋类升级与六折出售。
- 普攻、技能、金币、经验、击杀助攻、阵亡复活、回城、治疗、闪现。
- 每路防御塔独立逐级解锁；任一路高地塔被摧毁后，水晶可被攻击。
- 三档 AI 难度，完整胜负流程，战况表和本机对战记录。
- 键鼠、触屏摇杆、技能拖动瞄准、小地图观察、暂停和音画设置。
- 触屏多点触控：摇杆与每个技能键各占一根手指，按住摇杆时另一指点闪现/治疗/回城/技能立即生效。
- 开局金币 50；整局约 14–16 分钟（验收区间 12–20 分钟）。

## 操作

| 操作 | 电脑 | 手机 |
|---|---|---|
| 移动 | WASD / 方向键；右键点击地面 | 左侧摇杆；点击地面 |
| 锁定敌人 | 右键或左键点击可见敌人 | 点击可见敌人 |
| 普通攻击 | 空格 | 攻击键 |
| 技能 | Q / E / R，点击释放，右键取消 | 点击智能施放；拖动瞄准后松手 |
| 闪现 / 治疗 / 回城 | F / G / B | 对应通用技能键；闪现朝当前移动方向 |
| 商店 | P | 小地图下方的钱袋，或金币按钮 |
| 战况 | 按住 Tab，或战况按钮 | 战况按钮 |
| 小地图 | 点一下跳过去看几秒；按住一直看，松开回英雄 | 同左 |
| 镜头归位 | C | 小地图下方的归位按钮 |
| 暂停 | Esc | 右上角暂停按钮 |

手机建议横屏。低性能设备可在设置中降低画质。默认开启新手引导与推荐出装；关闭推荐出装仅影响玩家，AI 仍正常购买装备。

## 项目结构

```text
dist/index.html     页面与可访问控件
dist/style.css      标题、选人、商店与弹窗的基础样式
dist/hud.css        3D 版标题装饰、选人台座与对局 HUD
dist/app.js         页面流程、输入、声音与模拟接线
dist/sim.js         无 DOM 的确定性战斗模拟、规则和数据
dist/render3d.js    WebGL2 3D 战场渲染器与选人台座（45° 镜头）
dist/glkit.js       矩阵、程序化几何、着色器
dist/models3d.js    程序化英雄 / 小兵 / 野怪 / 塔 / 水晶 / 场景模型
dist/minimap.js     方形小地图（两种渲染器共用）
dist/hud.js         目标横幅、波次倒计时、阵亡与击杀横幅文案
dist/touch.js       Pointer Events 多点触控摇杆与按钮
dist/render.js      Canvas2D 2.5D 回退渲染器
dist/controls.js    可见目标拾取与触屏自动瞄准
dist/portraits.js   原创 SVG 角色立绘和图标
dist/audio.js       原创 WebAudio 音效与氛围音乐
tests/              行为测试、视觉回归、多点触控用例与截图/整局模拟工具
docs/validation.md  验证记录与已知差异
docs/shots/         本轮实拍截图
serve.py            本机静态服务启动器
```

## 验证

安装 Node.js 后可运行，无需 `npm install`：

```sh
npm run check
npm test
```

本轮测试共 42 项：基线 32 项 + 新增 10 项（审计/文案/小地图/节奏 8 项、Playwright 多点触控 1 项、Playwright 视觉回归 1 项）。两项浏览器测试需要本机能找到 Playwright 与 Chromium（`PLAYWRIGHT_MODULE`、`CHROMIUM_PATH` 可指定），找不到时会跳过并写明原因；视觉基线在 `tests/visual-baseline/`，画面有意改动后用 `UPDATE_VISUAL=1 npm test` 重生成。

其他工具：`npm run sim` 跑两局完整模拟（全 AI + 挂机），`npm run shots` 把各场景截图存进 `docs/shots/`。加 `?renderer=2d` 可强制使用 Canvas2D 回退渲染器。

## 参考与还原边界

参考页面：https://sanwan.online/games/xingyun-moba/

2026-11-22 读取了该页面公开提供的前端内容、规则数据、UI 结构和可获取的标题画面。本项目独立编写应用逻辑、人物美术、音效和渲染，没有把原站应用脚本打包进交付物。

地图坐标、英雄基础属性、技能参数、装备参数及主要胜负规则按当日可见数据重建。AI 策略、寻路、部分目标选择及冲刺/跳跃的时序为独立实现，不能保证与原版逐帧相同。

画面为自写的 WebGL2 3D 渲染：相机俯仰角固定 45°，英雄约占屏高 1/6，全部模型、贴图、特效由程序生成，不含任何原站文件。没有 WebGL2 的浏览器回退到 Canvas2D 2.5D 渲染。人物造型、光照、材质及技能特效按文字描述与抽帧取色自行实现，并非逐像素一致。原站公共留言板与访问统计未接入，本版提供真实的本机对战记录。

本版本是可玩的独立重建交付，不声称完成了像素级或帧级 1:1 验收。真实安卓/iOS 设备上的长期帧率、耗电与兼容性尚未做设备实测。

## 2026-11-22 follow-on iteration

The local follow-on delta for `starfall-gpt6pro-01` is recorded in `docs/GPT6PRO-ITERATION.md`. It includes the 1/10 camera target, revised 11-minute minion growth pacing, player-only locomotion blend stabilization, Fullscreen API controls, touch-first tutorial text and portrait/landscape HUD rules, plus procedural armor, tower, stone and spell-circle detail. See the report for the exact validation status: browser screenshots and visual baseline regeneration are still outstanding in this environment.
