# AI_PackingEngine 桌面演示版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把装箱推荐工具改造成 Electron 桌面演示程序：输入零件号+数量 → DeepSeek 结构化推荐 → 结果卡片 + 3D 装箱模拟动画。

**Architecture:** 纯 TS 一体（Electron 主进程负责 LLM HTTP 调用与设置持久化，渲染进程 React UI + R3F 3D）。核心计算（CSV 解析、装箱容量、网格布局）为纯函数并配单测；LLM 输出经钳制后与 3D 共用同一组数字。

**Tech Stack:** Electron + React 19 + TypeScript + Vite；Three.js + @react-three/fiber + @react-three/drei；papaparse；Vitest（核心逻辑单测）。

**Spec:** `docs/superpowers/specs/2026-11-11-packing-desktop-demo-design.md`

## Global Constraints

- 纯 TypeScript，不引入 Python；不打包（无 electron-builder），`npm run dev` 运行
- 依赖白名单：electron、react、react-dom、three、@react-three/fiber、@react-three/drei、papaparse、typescript、vite、vitest、@types/*（不引 Redux/Zustand/组件库）
- 中文 UI 文案
- 冗余系数 margin 默认 `0.8`；数量输入上限 `999`；数量必须为正整数
- 不提交任何真实 API key；Settings 默认 `mockMode: true`（开箱即能演示）
- 每箱数量上限公式（全项目唯一定义）：
  `maxPerBox = min(gridCapacity, floor(boxVol × margin / itemVol), floor(box.maxLoad × margin / item.weight))`
  其中 `gridCapacity = floor(innerL/itemL) × floor(innerW/itemW) × floor(innerH/itemH)`（任一方向为 0 则整体为 0）
- 候选箱型 = `maxPerBox ≥ 1` 的箱型；总箱数 = `ceil(quantity / perBoxCount)`
- LLM 建议的每箱数量钳制到 `[1, maxPerBox]`；结果卡片与 3D 场景必须使用同一组（perBoxCount, totalBoxes）
- 3D 只演代表性一箱；坐标约定：长→x、高→y、宽→z；箱内底面 y=0；item 中心 = `((i+0.5)×itemL − innerL/2, (k+0.5)×itemH, (j+0.5)×itemW − innerW/2)`，填充顺序 k 层(y)→j 排(z)→i 列(x)，取前 N 个

## Review Focus

1. **LLM 返回坏数据**（非 JSON / markdown 围栏 / 字段缺失 / 每箱数量越界）→ 必须钳制或友好报错，绝不能让卡片与 3D 数字不一致 — Task 4 测试 `parseRecommendation 围栏 JSON / 越界钳制 / 非 JSON 抛错`
2. **零件放不进任何箱**（单方向尺寸超限 → gridCapacity=0）→ 候选为空的友好提示，不崩、不出除零 — Task 3 测试 `filterCandidates 超大零件返回空数组`
3. **输入非法**（数量 0/负数/小数/非数字/超 999，或零件号不存在）→ 拦截并提示，不发请求 — Task 6 测试 `parseQuantity 各非法输入` + `findItem 未命中返回 null`
4. **无 key / 断网 / API 报错** → mock 模式照常演示；正式模式显示错误+重试按钮 — Task 5 mock 默认开 + Task 6 错误 UI
5. **大量零件动画卡顿**（如 A005 999 件）→ 分批飞入，动画不阻塞 UI — Task 7 手动冒烟（A005×999）

---

### Task 1: 项目脚手架（Electron + Vite + React 空窗口）

**Files:**
- Create: `package.json`、`tsconfig.json`、`tsconfig.electron.json`、`vite.config.ts`、`index.html`
- Create: `electron/main.ts`、`electron/preload.ts`
- Create: `src/main.tsx`、`src/App.tsx`、`src/styles.css`
- Create: `.gitignore`

**Interfaces:**
- Consumes: 无
- Produces: `package.json` scripts：`dev: npm run build && electron .`、`build: tsc -p tsconfig.electron.json && vite build`、`typecheck: tsc --noEmit`、`test: vitest run`；`main.ts` 加载 `dist/index.html`；preload 暴露 `window.packingAPI`（本任务先给空实现，Task 4/5 填充）

- [ ] **Step 1: 初始化工程文件**（按 Files 清单与 SIA_Agent 惯例：`main: dist-electron/main.js`，vite `outDir: dist`；`window.packingAPI` 类型声明放 `src/packing-api.d.ts`）
- [ ] **Step 2: 安装依赖并跑通构建**

Run: `npm install && npm run build`
Expected: 构建成功，无 TS 错误

- [ ] **Step 3: 手动冒烟——打开窗口**

Run: `npm run dev`
Expected: 弹出 800×600 中文标题窗口，显示「AI 装箱引擎」占位页

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Electron+React+Vite desktop app"
```

---

### Task 2: 数据类型 + CSV 解析 + 内置仿真数据

**Files:**
- Create: `src/lib/types.ts`、`src/lib/csv.ts`
- Create: `src/data/items.csv`、`src/data/boxes.csv`、`src/data/history.csv`
- Test: `tests/csv.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Item{id:string; length:number; width:number; height:number; weight:number; material:string}`（单位 mm/kg）、`BoxType{id:string; innerLength:number; innerWidth:number; innerHeight:number; maxLoad:number}`、`HistoryRecord{planId:string; itemId:string; quantity:number; boxId:string; note:string}`
  - `csv.ts`: `parseItems(csv:string): Item[]`、`parseBoxes(csv:string): BoxType[]`、`parseHistory(csv:string): HistoryRecord[]`
  - CSV 中文表头（与旧版一致，导入自定义 CSV 同样适用）：items=`零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料`；boxes=`箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)`；history=`方案ID,零件号,数量,使用箱型,备注`
  - 内置数据（演示主角）：A001 齿轮箱 100×50×30 2.0 铝合金 / A002 轴承座 200×100×80 5.5 铸铁 / A003 密封盖 60×60×20 0.4 塑料 / A004 支架 150×120×90 3.2 钢 / A005 垫片 40×40×5 0.05 不锈钢；B01 小箱 300×200×150 maxLoad 20 / B02 中箱 400×300×250 maxLoad 50 / B03 大箱 600×400×300 maxLoad 80；history 6 行（**含 A001→B02 两行**，其余零件各一行，note 为演示文案）

- [ ] **Step 1: 写失败测试**（`tests/csv.test.ts`：三段 CSV 字符串 → 解析断言；含表头中文列名；空行/缺列抛 `CsvParseError`）
- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/csv.test.ts` → FAIL（模块不存在）

- [ ] **Step 3: 实现 `types.ts` + `csv.ts`**（papaparse 解析，列名按上表中文表头映射；数字列 `Number()` 转换，NaN 抛 `CsvParseError`）
- [ ] **Step 4: 跑测试确认通过** → PASS
- [ ] **Step 5: 写入三个内置 CSV 文件**（数值严格按 Interfaces 清单）
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: csv parsing, types, and synthetic sample data"
```

---

### Task 3: 装箱计算（候选过滤 + 每箱数量 + 总箱数 + 网格布局）

**Files:**
- Create: `src/lib/packing.ts`
- Test: `tests/packing.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Item` / `BoxType`
- Produces（`packing.ts`）:
  - `gridCapacity(item: Item, box: BoxType): number`
  - `maxPerBox(item: Item, box: BoxType, margin: number): number`（公式见 Global Constraints）
  - `filterCandidates(item: Item, boxes: BoxType[], margin: number): {box: BoxType; maxPerBox: number}[]`
  - `totalBoxes(quantity: number, perBoxCount: number): number`
  - `computeLayout(item: Item, box: BoxType, perBoxCount: number): {boxSize:[number,number,number]; itemSize:[number,number,number]; positions:[number,number,number][]}`（坐标与填充顺序见 Global Constraints）

- [ ] **Step 1: 写失败测试**（关键断言，margin=0.8）：
  - `maxPerBox(A001, B02, 0.8) === 20`（grid=192、volCap=160、wtCap=20，取最小）
  - `maxPerBox(A001, B01, 0.8) === 8`（grid=3×4×5=60、volCap=floor(300×200×150×0.8/150000)=48、wtCap=floor(20×0.8/2)=8，取最小）
  - `filterCandidates(A002, [B01], 0.8)` → `[]`（A002 高 80 > B01 内高 150？否——断言改为超大件：构造 item 500×500×500 → 空数组）
  - `totalBoxes(200, 20) === 10`
  - `computeLayout(A001, B02, 20)` → `positions.length === 20`，`positions[0] === [-150, 15, -125]`
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 `packing.ts`**（纯函数，公式严格按 Global Constraints）
- [ ] **Step 4: 跑测试确认通过** → PASS
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: packing capacity and grid layout math"
```

---

### Task 4: LLM 层（prompt + 主进程 HTTP + JSON 钳制 + mock）

**Files:**
- Create: `src/lib/llm.ts`、`electron/llm-client.ts`
- Modify: `electron/main.ts`（注册 IPC `llm:recommend`）、`electron/preload.ts`（`packingAPI.recommend`）
- Test: `tests/llm.test.ts`

**Interfaces:**
- Consumes: Task 2 `types.ts`、Task 3 `packing.ts`
- Produces:
  - `llm.ts`: `buildPrompt(item: Item, quantity: number, candidates: {box: BoxType; maxPerBox:number}[], history: HistoryRecord[]): string`；`parseRecommendation(raw: string, candidates: {box:BoxType; maxPerBox:number}[], quantity: number): PackingRecommendation`；`mockRecommendation(item: Item, quantity: number, candidates: {box:BoxType; maxPerBox:number}[], history: HistoryRecord[]): PackingRecommendation`（确定性规则：该零件历史中出现过的箱型若在候选中 → 取历史出现最多者；否则取总箱数最少的候选，并列取列表首个；`perBoxCount = maxPerBox`；reason/strategy 用固定演示文案）
  - `PackingRecommendation{boxId: string; reason: string; perBoxCount: number; strategy: string; totalBoxes: number}`
  - LLM JSON 约定字段：`{"推荐箱型": "B02", "推荐理由": "...", "每箱数量": 20, "策略建议": "..."}`
  - preload：`packingAPI.recommend(payload: {item: Item; quantity: number; candidates: {box:BoxType; maxPerBox:number}[]; history: HistoryRecord[]}): Promise<string>`（返回 LLM 原文，**仅真实 HTTP 调用**；mock 判断在渲染层：`settings.mockMode` 为真时直接用 `mockRecommendation`，不发 IPC）

- [ ] **Step 1: 写失败测试**（`tests/llm.test.ts`）：
  - `parseRecommendation` 吃带 ```json 围栏的文本 → 正常解析
  - `每箱数量: 25`（maxPerBox=20）→ 钳制为 20；`每箱数量: 0` → 钳制为 1
  - `推荐箱型: "B99"`（不在候选）→ 回退为第一个候选箱
  - 非 JSON 文本 → 抛 `LlmParseError`
  - `mockRecommendation` 返回 `totalBoxes === ceil(quantity/perBoxCount)`
  - mock 历史规则：A001 历史含两行 A001→B02、候选 [B01,B02,B03] → `mockRecommendation(...).boxId === "B02"`
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 `llm.ts`**（buildPrompt 含候选表+历史+输出格式说明；parseRecommendation 容错围栏并钳制，`totalBoxes` 用 Task 3 的 `totalBoxes()` 计算）
- [ ] **Step 4: 实现 `electron/llm-client.ts` + IPC**（主进程 `fetch(settings.baseUrl + "/chat/completions")`，Bearer key，body 用 OpenAI 兼容格式，model 用 settings.model）
- [ ] **Step 5: 跑测试确认通过** → PASS
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: LLM prompt/parse/clamp with mock fallback"
```

---

### Task 5: 设置面板（key/base/model/margin/mock 持久化）

**Files:**
- Create: `electron/settings.ts`、`src/components/SettingsPanel.tsx`
- Modify: `electron/main.ts`、`electron/preload.ts`、`src/App.tsx`
- Test: `tests/settings-merge.test.ts`（仅纯函数 `mergeSettings`）

**Interfaces:**
- Produces:
  - `Settings{apiKey: string; baseUrl: string; model: string; margin: number; mockMode: boolean}`；默认 `{apiKey:"", baseUrl:"https://api.deepseek.com", model:"deepseek-chat", margin:0.8, mockMode:true}`
  - `electron/settings.ts`: `loadSettings(userDataPath: string): Settings`、`saveSettings(userDataPath: string, s: Settings): void`、`mergeSettings(raw: unknown): Settings`（脏数据/缺字段回默认）
  - preload：`packingAPI.getSettings(): Promise<Settings>`、`packingAPI.setSettings(s: Settings): Promise<void>`
- Consumes: Task 4 的 IPC（读 settings 发请求）

- [ ] **Step 1: 写失败测试**（`mergeSettings({margin: 0.5})` → 其余字段为默认；`margin: "x"` → 回 0.8）
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 settings.ts（JSON 文件存 userData）+ SettingsPanel**（抽屉/弹层表单：API Key（密码框）、Base URL、模型、冗余系数滑杆 0.5–1.0、mock 开关；保存即持久化）
- [ ] **Step 4: 跑测试确认通过** + `npm run typecheck` 干净
- [ ] **Step 5: 手动冒烟**：改 margin 保存 → 重启后仍生效
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: settings panel with persisted LLM and margin config"
```

---

### Task 6: 主界面（输入区 + 结果卡片 + 流程接线）

**Files:**
- Create: `src/components/InputPanel.tsx`、`src/components/ResultCards.tsx`、`src/lib/input.ts`
- Modify: `src/App.tsx`、`src/styles.css`
- Test: `tests/input.test.ts`

**Interfaces:**
- Consumes: Task 2 `csv.ts`（内置 CSV 以 Vite `?raw` 导入后解析）、Task 3 `packing.ts`、Task 4 `packingAPI.recommend` + `parseRecommendation`、Task 5 `getSettings`
- Produces:
  - `input.ts`: `parseQuantity(raw: string): {ok: true; value: number} | {ok: false; error: string}`（正整数、≤999）；`findItem(items: Item[], id: string): Item | null`
  - 导入自定义 CSV：preload `packingAPI.importCsv(): Promise<{items: Item[]; boxes: BoxType[]; history: HistoryRecord[]} | null>`（主进程多选 3 个文件，用 Task 2 解析器解析，取消返回 null）；`InputPanel` 提供「导入 CSV」按钮，导入后替换当前数据集
  - `App.tsx` 状态流：输入 → `findItem`（未命中提示「未找到该零件号」）→ `filterCandidates` → 空则提示「无可用箱型」→ `settings.mockMode ? mockRecommendation : recommend+parseRecommendation` → 结果 `{recommendation, item, layout}` 传给卡片与 Task 7 的场景
  - `ResultCards`: 三张卡（推荐箱型 / 推荐理由 / 装箱方案：每箱数量、总箱数、策略建议），数字来自 `PackingRecommendation`

- [ ] **Step 1: 写失败测试**（`parseQuantity`: "200"→ok 200；"0"/"-3"/"3.5"/"abc"/"1000"/"" → 各带中文 error；`findItem(items,"A001")` 非空、`findItem(items,"X999")` 为 null）
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 input.ts + InputPanel + ResultCards + App 接线**（loading 态、LlmParseError/网络错误 → 错误条 +「重试」按钮；「导入 CSV」按钮调 `importCsv` 替换数据集；零件号未命中 → 「未找到该零件号」）
- [ ] **Step 4: 跑测试确认通过** + `npm run typecheck` 干净
- [ ] **Step 5: 手动冒烟（mock 开）**：A001 + 200 → 卡片显示 B02、每箱 20、共 10 箱；零件号 X999 → 「未找到该零件号」
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: input validation and result cards wired to recommendation flow"
```

---

### Task 7: 3D 装箱模拟（R3F 场景 + 飞入动画 + 徽标）

**Files:**
- Create: `src/components/PackingScene.tsx`
- Modify: `src/App.tsx`（右侧画布区）、`src/styles.css`

**Interfaces:**
- Consumes: Task 3 `computeLayout` 的 `Layout`（Task 6 的结果流已产出）
- Produces: `<PackingScene layout={Layout} perBoxCount={number} totalBoxes={number} />`；箱体半透明线框 + 零件长方体按 `positions` 逐个飞入（**分批**：每帧/每批 8–12 个，全部到位后可重播）；OrbitControls 旋转缩放；画布角标「共需 N 箱 · 每箱 M 件」；配色/光照以醒目流畅为准

- [ ] **Step 1: 实现 PackingScene**（R3F Canvas + drei OrbitControls/Lights；飞入动画用 `useFrame` 插值，起始位置在箱上方偏移，缓动落位）
- [ ] **Step 2: 接入 App**（推荐完成 → 场景按 layout 播放；重新推荐 → 重置重播）
- [ ] **Step 3: `npm run typecheck` 干净**
- [ ] **Step 4: 手动冒烟**：A001×200 → 20 件飞入 B02；A005×999 → 分批动画流畅不卡（Review Focus #5）
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 3D packing simulation with staggered fly-in animation"
```

---

### Task 8: 收尾（README、文案、完整流程走查）

**Files:**
- Modify: `README.md`、`src/styles.css`（统一中文文案/视觉）

- [ ] **Step 1: 重写 README**（桌面演示版说明：功能、`npm install && npm run dev`、mock 模式开箱即玩、设置真实 key 步骤、CSV 导入说明；保留英文简介一段）
- [ ] **Step 2: 全流程手动走查**（mock 模式完整演示一遍 + 各错误路径：非法输入、无可用箱型、坏 JSON）
- [ ] **Step 3: `npm run typecheck && npm test` 全绿**
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: README and polish for desktop demo"
```
