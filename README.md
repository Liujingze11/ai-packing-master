# 📦 AI Packing Master（AI 打包大师）

An AI-assisted mixed-packing desktop demo with a food-ordering-style UI: pick parts like menu items, choose a box, chat to start — then watch a 3D mixed-loading simulation. Electron + React + TypeScript + Three.js.

---

## ✨ v2 交互（点外卖式）

- **🍜 零件菜单（左）**：已保存的零件像菜品一样陈列，点「＋」加入订单（购物车），可加减
- **🧺 订单（左下）**：混装订单（多种零件 × 各自数量）
- **📦 箱子管理（右）**：点选要用的箱子；「＋ 新建箱子」输入名称/长宽高/承重即存即用；不选时自动挑总箱数最少的箱
- **💬 AI 沟通区（中下）**：可留言（如「易碎需缓冲」）；**有货自动点亮发送**；AI 回复推荐理由与装箱策略
- **🧊 3D 混装模拟（主视觉）**：多种零件按颜色分层飞入箱体，可旋转/缩放/重播
- **⚙️ 设置**：DeepSeek API Key、模型、冗余系数、mock 演示模式（**默认开启**，离线可玩）

## 🚀 运行

```bash
npm install
npm run dev
```

首次使用：点「**载入示例数据**」（5 种零件 × 3 种箱型），菜单有货后即可点单演示。

## 📐 混装规则（数字全部由算法精确计算）

- 零件按体积降序装箱，每种零件独占若干水平层，逐层叠放
- 高度预算 = 箱内高 × 冗余系数；承重预算 = 最大承重 × 冗余系数
- 单箱模拟装入 → 循环装箱 → 总箱数；AI 只输出文字策略
- 单件超出箱内尺寸/承重会明确报错

## 📂 目录管理

- **逐个录入**：「＋ 添加零件」「＋ 新建箱子」，保存到本地（重启仍在）
- **导入 CSV**：批量录入（UTF-8，中文表头）
  - 零件表：`零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料`
  - 箱型表：`箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)`
- 系统不预填任何零件/箱型——保持通用

## 🔑 使用真实 DeepSeek API（可选）

⚙️ 设置 → 填 API Key → 关闭 mock 模式 → 保存。

## 🛠 开发

- `npm run typecheck` 类型检查；`npm test` 单元测试（Vitest）
- 技术栈：Electron + React 19 + TypeScript + Vite + Three.js（React Three Fiber）
