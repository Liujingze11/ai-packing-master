# 📦 AI 装箱引擎（SmartPackingEngine Desktop Demo）

An AI-assisted packaging recommendation desktop demo: enter a part number and quantity, get an LLM-recommended box type and packing strategy, then watch a 3D box-loading simulation. Built with Electron + React + TypeScript + Three.js.

---

## ✨ 功能

- 输入「零件号 + 数量」，智能校验（正整数、≤999、零件存在性）
- AI 推荐（DeepSeek / OpenAI 兼容接口）：推荐箱型、理由、装箱方案（每箱数量 / 总箱数 / 策略建议），结构化 JSON 输出
- **3D 装箱模拟**：半透明箱体 + 零件逐个飞入动画，鼠标旋转缩放，可重播
- 内置仿真数据（5 零件 × 3 箱型 × 6 历史方案），开箱即玩
- 支持导入自定义 CSV 三件套（零件表 / 箱型表 / 历史方案表）
- 设置面板：API Key、Base URL、模型、冗余系数、mock 演示模式（**默认开启**，无需联网）

## 🚀 运行

```bash
npm install
npm run dev
```

> 默认 **mock 模式**：不调用真实 API，直接给出演示推荐，适合无网络 / 无 key 场景。

## 🔑 使用真实 DeepSeek API（可选）

1. 打开应用 → 右上角「⚙️ 设置」
2. 填入 API Key（`sk-…`）、Base URL（默认 `https://api.deepseek.com`）、模型（默认 `deepseek-chat`）
3. 关闭「mock 演示模式」→ 保存

## 📂 CSV 数据格式（导入自定义数据）

三张表均为 UTF-8 CSV，含中文表头：

| 文件 | 表头 |
|---|---|
| 零件表 | `零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料` |
| 箱型表 | `箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)` |
| 历史方案表 | `方案ID,零件号,数量,使用箱型,备注` |

在输入区点「📂 导入 CSV 三件套」，多选 3 个文件即可替换内置数据。

## 📐 装箱计算规则

- 每箱数量上限 = min(网格容量, 体积上限 × 冗余系数, 承重上限 × 冗余系数)
- 候选箱型 = 单箱至少装得下 1 件；总箱数 = ceil(数量 ÷ 每箱数量)
- 3D 布局由算法精确计算（长→x、高→y、宽→z，逐层填充），AI 只出策略

## 🛠 开发

- `npm run typecheck` 类型检查；`npm test` 单元测试（Vitest）
- 技术栈：Electron + React 19 + TypeScript + Vite + Three.js（React Three Fiber）
