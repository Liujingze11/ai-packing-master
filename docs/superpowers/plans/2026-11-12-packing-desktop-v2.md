# AI 装箱引擎 v2（外卖式混装交互）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把交互重构为外卖式点单（零件菜单+购物车、箱管、AI 对话区），只做**混装**场景，3D 主视觉展示多种零件分层装箱。

**Architecture:** 沿用 v1 的 Electron+React+TS 一体架构与全部纯函数库；新增目录持久化（零件/箱型 CRUD）、混装分层算法（数字全由算法产出）、订单语义 LLM 层（只出文案）。旧的单零件流程（recommend-flow/InputPanel/ResultCards）由订单流程替换。

**Tech Stack:** 不变（Electron + React 19 + TS + Vite + Three.js/R3F + Vitest）

**Spec:** `docs/superpowers/specs/2026-11-12-packing-desktop-v2-design.md`

## Global Constraints

- **只做混装**（多种零件进同一箱子）；分箱场景不做
- 数字（每箱各 SKU 数量、总箱数）**一律算法产出**，LLM 只输出「推荐理由 / 策略建议」文案
- 冗余系数 margin（默认 0.8，范围 [0.5,1.0]）作用于：`heightBudget = innerHeight × margin`、`weightBudget = maxLoad × margin`；层内网格用原始内尺寸
- 混装放置规则：SKU 按体积降序；每 SKU 独占若干水平层（层高=该 SKU 件高），层内网格 `floor(内长/件长)×floor(内宽/件宽)`；逐层放满为止（受剩余高度、剩余承重、剩余数量限制）
- 零件/箱型目录由用户录入并持久化（userData JSON）；**不预填**；内置 CSV 仅作「载入示例数据」按钮的种子
- 发送键点亮条件 = 购物车有货；**未选箱子时自动挑**「totalBoxes 最小、并列取体积最小」的已保存箱型，全装不进则报错
- 依赖白名单不变；中文 UI；mock 默认开启（离线可演示）；不打包
- **视觉风格：苹果 macOS 卡片风**，色板取自 SIA_Agent：`--accent:#7351a6`、`--accent-tint:#f6f1fc`、`--bg:#f7f8fa`、卡片白 + 边框 `#e7e5ed`、正文 `#34455f`、次要 `#78869b`、阴影 `0 12px 40px #33254c14, 0 2px 8px #33254c0a`；大圆角（卡片 14px、胶囊 24px）、毛玻璃顶栏（backdrop-filter）、`-apple-system` 字体栈、克制的 hover/过渡动画；全部视觉用 `src/styles.css` 的 `:root` 令牌

## Review Focus

1. **订单含装不进箱的零件**（单件超过箱内尺寸）→ 明确报错不崩 — Task 2 测试 `单项超箱 → item_too_big`
2. **重量先满、后续 SKU 装入 0** → 装箱循环必须前进（防死循环/防漏算总箱数）— Task 2 测试 `重量受限多箱 + 循环推进`
3. **LLM 坏输出**（非 JSON/缺字段）→ 回退默认文案不崩，数字不受影响 — Task 3 测试 `非 JSON 回退文案`
4. **空目录/未选箱发送** → 点亮拦截；自动挑箱正确（最小总箱数）— Task 4 测试 `pickDefaultBox`
5. **数量/表单边界**（0、>999、尺寸≤0、重名 id）→ 表单校验中文提示 — Task 1/5 测试与冒烟

---

### Task 1: 目录类型 + 纯逻辑 + 持久化

**Files:**
- Modify: `src/lib/types.ts`、`src/packing-api.d.ts`、`electron/main.ts`、`electron/preload.ts`
- Create: `src/lib/catalog.ts`、`electron/catalog-store.ts`
- Test: `tests/catalog.test.ts`

**Interfaces:**
- Produces（`types.ts`）:
  - `Part{id:string; name:string; length:number; width:number; height:number; weight:number; material:string}`
  - `BoxSpec{id:string; name:string; innerLength:number; innerWidth:number; innerHeight:number; maxLoad:number}`
  - `Catalog{parts: Part[]; boxes: BoxSpec[]}`、`CartLine{partId:string; quantity:number}`
- Produces（`catalog.ts` 纯函数）:
  - `validatePart(raw: unknown): {ok:true; part:Part} | {ok:false; error:string}`（name 非空；长宽高/重量为正数；id 生成或取值）
  - `validateBox(raw: unknown): {ok:true; box:BoxSpec} | {ok:false; error:string}`（maxLoad 缺省 50）
  - `upsertPart(catalog: Catalog, part: Part): Catalog`、`removePart(catalog: Catalog, id: string): Catalog`、`upsertBox`、`removeBox`（不可变更新，按 id 替换/追加）
- Produces（持久化）: `electron/catalog-store.ts` `loadCatalog(userDataPath): Catalog`、`saveCatalog(userDataPath, c: Catalog): void`（缺文件→空目录）；IPC `catalog:get`/`catalog:save`；preload `packingAPI.getCatalog(): Promise<Catalog>`、`packingAPI.saveCatalog(c: Catalog): Promise<void>`

- [ ] **Step 1: 写失败测试**（`tests/catalog.test.ts`）：`validatePart` 合法/缺名/尺寸 0/重量负 → 各断言；`validateBox` 缺 maxLoad → 50；`upsertPart` 同 id 替换不同 id 追加；`removePart` 删除后长度减一
- [ ] **Step 2: 跑测试确认失败** → FAIL（模块不存在）
- [ ] **Step 3: 实现 `catalog.ts` + `catalog-store.ts` + IPC/preload/d.ts**
- [ ] **Step 4: 跑测试确认通过** + `npm run typecheck` 干净
- [ ] **Step 5: Commit** `feat: catalog types, validation, and persistence`

---

### Task 2: 混装算法（核心）

**Files:**
- Create: `src/lib/packing-mixed.ts`
- Test: `tests/packing-mixed.test.ts`

**Interfaces:**
- Consumes: `Part` / `BoxSpec`
- Produces（`packing-mixed.ts`）:
  - `MixedOrderLine{part: Part; quantity: number}`
  - `MixedLayout{boxSize:[number,number,number]; items:{size:[number,number,number]; position:[number,number,number]; colorIndex:number}[]}`（y=0 箱底；同 SKU 层从下往上叠）
  - `simulateMixedFill(order: MixedOrderLine[], box: BoxSpec, margin: number): {placed: {partId:string; count:number}[]; layout: MixedLayout}`（单箱模拟，规则见 Global Constraints）
  - `planMixedPacking(order: MixedOrderLine[], box: BoxSpec, margin: number): {ok:true; totalBoxes:number; firstBox:{placed:{partId:string; name:string; count:number}[]; layout: MixedLayout}} | {ok:false; kind:'empty_order'|'item_too_big'; message:string}`（循环装箱；`item_too_big`=某 SKU 层内网格为 0）
  - 层内位置：`x=(i+0.5)×件长−内长/2`，`z=(j+0.5)×件宽−内宽/2`，`y=已用高度+(k+0.5)×件高`；colorIndex = 该 SKU 在 order 中的下标

- [ ] **Step 1: 写失败测试**（margin=0.8，B02=400×300×250/50kg）：
  - 单箱混装：`planMixedPacking([{A001,10},{A005,100}], B02, 0.8)` → `ok`、`totalBoxes===1`、第一箱 placed 含 A001:10、A005:100、`layout.items.length===110`、A005 件的 y ≥ 30（叠在 A001 层之上）
  - 重量受限多箱：`planMixedPacking([{A001,40}], B02, 0.8)` → `totalBoxes===2`（每箱 20 件受承重预算 40kg 限制）
  - 单项超箱：500×500×500 的零件 → `{ok:false, kind:'item_too_big'}`，且**循环推进不死循环**
  - 空订单 → `kind:'empty_order'`
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 `packing-mixed.ts`**（模拟单箱 → 扣减剩余 → 循环；每箱各 SKU 至少装 1 件才计入，装 0 且仍有剩余 → 判 `item_too_big` 防死循环）
- [ ] **Step 4: 跑测试确认通过** → PASS
- [ ] **Step 5: Commit** `feat: mixed-sku packing simulation and planning`

---

### Task 3: LLM 订单语义（只出文案）

**Files:**
- Modify: `src/lib/llm.ts`、`electron/llm-client.ts`、`electron/main.ts`、`electron/preload.ts`、`src/packing-api.d.ts`
- Test: `tests/llm-mixed.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `MixedOrderLine` 数字结果
- Produces（`llm.ts` 追加）:
  - `MixedReply{reason: string; strategy: string}`
  - `buildMixedPrompt(order: MixedOrderLine[], boxName: string, placed: {partId:string; name:string; count:number}[], totalBoxes: number, userMessage: string): string`（含订单表、箱型、算法已算出的装箱数字、用户留言；要求只输出 JSON `{"推荐理由":"...","策略建议":"..."}`)
  - `parseMixedReply(raw: string): MixedReply`（容错围栏；缺字段→空串；非 JSON → 抛 `LlmParseError`）；`mockMixedReply(userMessage: string): MixedReply`（固定演示文案，userMessage 非空时附一句「已考虑您的要求：…」）
- Produces（IPC）: `llm:recommendMixed(payload): Promise<string>`（主进程 `callLlm` 复用，payload 含 buildMixedPrompt 所需数据）；preload `packingAPI.recommendMixed(payload): Promise<string>`

- [ ] **Step 1: 写失败测试**：围栏 JSON 解析、缺字段回空串、非 JSON 抛 `LlmParseError`、`mockMixedReply('易碎')` reason/strategy 非空且含「易碎」、prompt 含订单零件名/箱名/总箱数/留言
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 llm.ts 追加 + llm-client/IPC/preload/d.ts**
- [ ] **Step 4: 跑测试确认通过** → PASS
- [ ] **Step 5: Commit** `feat: order-semantics LLM prompt and reply parsing`

---

### Task 4: 订单流程（mixed-flow）

**Files:**
- Create: `src/lib/mixed-flow.ts`、`tests/mixed-flow.test.ts`
- Modify: 删除 `src/lib/recommend-flow.ts`、`tests/recommend-flow.test.ts`（被订单流程取代）

**Interfaces:**
- Consumes: Task 1/2/3
- Produces（`mixed-flow.ts`）:
  - `pickDefaultBox(order: MixedOrderLine[], boxes: BoxSpec[], margin: number): BoxSpec | null`（对每个箱跑 planMixedPacking，取 totalBoxes 最小、并列取箱体积最小；全装不进 → null）
  - `runMixedRecommendation(input: {order: MixedOrderLine[]; box: BoxSpec | null; boxes: BoxSpec[]; margin: number; userMessage: string; mockMode: boolean}, api: {recommendMixed(p: unknown): Promise<string>}): Promise<{ok:true; result:{totalBoxes:number; firstBox:{placed:{partId:string; name:string; count:number}[]; layout: MixedLayout}; reply: MixedReply; boxName: string}} | {ok:false; message:string}>`（未选箱→pickDefaultBox；mock→mockMixedReply；否则 recommendMixed+parseMixedReply；错误信息中文）

- [ ] **Step 1: 写失败测试**：`pickDefaultBox` 选 totalBoxes 最小（两箱并列取小体积）；装不进 → null；`runMixedRecommendation` mock 全链路（含数字正确）；未选箱自动挑箱；api 报错 → `{ok:false}` 中文 message
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 `mixed-flow.ts` 并移除旧 recommend-flow**
- [ ] **Step 4: 跑测试确认通过**（旧文件删除后全套件仍绿）→ PASS
- [ ] **Step 5: Commit** `feat: mixed-order recommendation flow`

---

### Task 5: 左栏外卖式（菜单 + 购物车 + 零件录入）

**Files:**
- Create: `src/components/PartsMenu.tsx`、`src/components/CartPanel.tsx`、`src/components/PartForm.tsx`
- Modify: `src/App.tsx`、`src/styles.css`
- Test: `tests/cart.test.ts`（纯函数 `adjustLine`）

**Interfaces:**
- Consumes: Task 1 catalog
- Produces:
  - `src/lib/cart.ts`: `adjustLine(lines: CartLine[], partId: string, delta: number, max?: number): CartLine[]`（+1/−1，0 删除；数量≤999）
  - `PartsMenu{parts: Part[]; onAdd(partId: string): void}`（外卖菜品卡：名称、尺寸、重量、「+」）
  - `CartPanel{lines: {part: Part; quantity: number}[]; onAdjust(partId, delta): void}`（订单行加减/删除）
  - `PartForm{open; onSubmit(part): void; onClose(): void}`（录入名称/长宽高/重量/材质，validatePart 校验）
  - App 状态：`catalog`、`cart: CartLine[]`；「载入示例数据」按钮（seed：解析内置 CSV → Catalog 合并入库）
- [ ] **Step 1: 写失败测试**（`adjustLine`：+1、−1 到 0 删除、封顶 999）
- [ ] **Step 2: 跑测试确认失败** → FAIL
- [ ] **Step 3: 实现 cart.ts + 三个组件 + App 布局左栏接线**（含「+ 添加零件」「载入示例数据」；`styles.css` 先建立 `:root` 视觉令牌——Global Constraints 色板——菜单卡按外卖菜品卡样式：图钉色块+名称+规格+胶囊「+」）
- [ ] **Step 4: 跑测试 + typecheck 干净**
- [ ] **Step 5: Commit** `feat: delivery-style parts menu and cart`

---

### Task 6: 箱子管理 + AI 对话区 + 主流程接线

**Files:**
- Create: `src/components/BoxManager.tsx`、`src/components/ChatArea.tsx`
- Modify: `src/App.tsx`、`src/styles.css`、`src/packing-api.d.ts`（如需）

**Interfaces:**
- Consumes: Task 1/4/5
- Produces:
  - `BoxManager{boxes: BoxSpec[]; selectedId: string | null; onSelect(id): void; onCreate(box): void}`（列表单选 + 新建表单：名称/长宽高/承重，validateBox）
  - `ChatArea{messages: {role:'user'|'ai'; text: string}[]; canSend: boolean; onSend(userMessage: string): void; busy: boolean}`（有货点亮发送；AI 回复气泡含 reason/strategy/每箱数字/总箱数）
  - App 主流程：发送 → `runMixedRecommendation` → 追加对话消息 + 更新 3D 场景数据（`mixedLayout` 状态）
- [ ] **Step 1: 实现 BoxManager + ChatArea + App 整合**（发送点亮条件：`cart 有货`；消息与结果渲染）
- [ ] **Step 2: `npm run typecheck` 干净 + `npm test` 全绿**
- [ ] **Step 3: 手动冒烟（启动检查）**：构建+启动无错误，窗口三栏布局呈现
- [ ] **Step 4: Commit** `feat: box manager, chat area, and mixed-order wiring`

---

### Task 7: 3D 混装场景改造

**Files:**
- Modify: `src/components/PackingScene.tsx`、`src/styles.css`
- Test: 无单测（视觉组件；逻辑数字已由 Task 2 覆盖）

**Interfaces:**
- Consumes: Task 2 `MixedLayout`
- Produces: `<PackingScene layout={MixedLayout} totalBoxes={number} skuCount={number} />`——按 `items[].colorIndex` 多色渲染（每 SKU 一色、图例）；沿用 v1 分批飞入/OrbitControls/重播；徽标「共需 N 箱 · 混装 X 种 · 本箱 Y 件」

- [ ] **Step 1: 改造 PackingScene**（instancedMesh → 按 colorIndex 分组多实例网格；图例列出 SKU 颜色；SKU 配色用 accent 紫系邻近色 `#7351a6/#538471/#b0855a/#4a7ab5/#a65a7e`，箱体保持半透明灰紫）
- [ ] **Step 2: 接入 App**（mixedLayout 驱动；新结果 → 重播）
- [ ] **Step 3: typecheck + 构建 + 启动检查**
- [ ] **Step 4: Commit** `feat: multi-color mixed-packing 3D scene`

---

### Task 8: 收尾（README、清理、全流程走查）

**Files:**
- Modify: `README.md`（v2 交互说明）、移除无引用旧组件（InputPanel/ResultCards 等）

- [ ] **Step 1: 更新 README**（外卖式流程、混装规则、目录管理、示例数据入口）
- [ ] **Step 2: 清理 v1 死代码**（typecheck+tests 仍全绿）
- [ ] **Step 3: 全流程用户走查**（点单→选箱→发送→3D 混装；错误路径：超箱零件、空车发送、坏 JSON mock 切换）
- [ ] **Step 4: Commit** `docs: v2 README and cleanup`
