# 星陨战纪 Starfall 1:1 复刻

## 项目目标

将原站 https://sanwan.online/games/xingyun-moba/ 做成 1:1 能玩的复刻版。

## 复刻原则

抄原版代码优先；抄不到再重写。

## 用途说明

本项目仅用于学习研究，不用于商业用途。

## P1-1 渲染骨架

本阶段接入 Three.js r180，提供最小 3D 场景、透视相机、方向光与半球光、程序化地面网格，以及两个纯色立方体占位单位。

### 本地运行

```bash
npm install
npm run dev
```

执行 `npm run build` 可进行 TypeScript 检查并生成 Vite 生产构建；执行 `npm run check` 可单独进行 TypeScript 检查。

### 验收标准

- 页面启动后显示全屏 WebGL 画布。
- 场景包含 terrain、units、fx 三个分组。
- 透视相机、方向光和半球光均已创建。
- 地面显示程序化网格，场景中显示两个纯色立方体占位单位。
- 窗口尺寸变化时画布和相机宽高比同步调整。
- 渲染由 `requestAnimationFrame` 循环驱动。

### 本批未做的事

本批没有游戏逻辑，也没有英雄、小兵、技能、装备、商店、AI、HUD、音效或原版美术资源；占位立方体仅用于验证渲染链。
