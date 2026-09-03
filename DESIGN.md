# Design

<!-- impeccable:design-schema 1 -->

## World

**玻璃蓝（Glass Blue）** — 奶白蓝背景 + 白色玻璃拟态面板 + 单一蓝色强调色。取代此前"映光栏接触皮"深色暖调方向（该方向已废弃，见下方 Provenance）。整体基调明亮、通透，用 WebGL 极光背景（reactbits Aurora，`lightMode`）在窗口背景层铺一层柔和的浅蓝雾状氛围，玻璃面板叠加在氛围层之上，形成"浮在云雾之上的操作面板"的视觉层次。

## Color

策略：Restrained（中性背景 + 玻璃白面板 + 单一蓝色强调）。

```css
--background: 210 45% 97%;        /* #f4f7fb 奶白蓝 */
--foreground: 222 47% 11%;        /* #0f1729 深墨蓝，主文字 */
--card: 0 0% 100%;                /* #ffffff 纯白，玻璃面板基色 */
--muted: 210 40% 94%;             /* #eaf0f6 次级背景 */
--muted-foreground: 215 20% 42%;  /* #566881 次要文字 */
--primary: 217 91% 48%;           /* #0b60ea 主蓝色强调 */
--primary-foreground: 0 0% 100%;
--secondary: 210 40% 94%;
--accent: 199 89% 36%;            /* #0a7aae 深青蓝，用于文字态强调（如强调数字） */
--destructive: 0 72% 51%;         /* #dc2828 */
--success: 142 71% 31%;           /* #178740 */
--border: 214 32% 88%;            /* #d7dfea */
```

**约束（必须遵守）：**
- `--primary` 已刻意压到 48% 亮度（而非常见的 52-55%），因为它既要做按钮底色（配白字需 ≥4.5:1），又要做玻璃面板上的链接文字色（配最不利情况下的极光蓝叠加背景仍需 ≥4.5:1）。改动此值前重新核对两个方向的对比度。
- 玻璃面板 `.glass-panel` 用 `rgba(255,255,255,0.65) + backdrop-filter: blur(20px)`，不透明变体 `.glass-panel-solid` 用于需要更强遮蔽力的场景（当前未用到，预留）。
- Aurora 背景层固定挂 `opacity-70` 且 `pointer-events-none`，作为纯氛围层，不能承载任何交互或必读信息。

## Typography

- **界面文字**：Manrope（自托管于 `src/assets/fonts/`），沿用自上一版本，无衬线现代字重。
- **技术数值/等宽场景**：JetBrains Mono，用于帧率、时间码、文件路径、色度采样值等测量类信息。
- Tailwind `fontFamily.sans`/`fontFamily.mono` 已在 `tailwind.config.js` 中声明，组件默认继承，无需每处手写 `font-family`。

## Component System

**主组件库：shadcn/ui**（`src/components/ui/`），基于 Radix UI 无障碍原语手写适配（未用 CLI，因当前环境无交互终端；组件源码逐份比对 shadcn 官方仓库改写，去除 TypeScript 类型，导入路径改为项目相对路径）：

- `button.jsx` — variant: default / destructive / outline / secondary / ghost / link；size: default / sm / lg / icon。
- `card.jsx`、`input.jsx`、`label.jsx`、`switch.jsx`、`tabs.jsx`、`select.jsx`、`slider.jsx`（含原生多 thumb 支持，用于视频预览页的双滑块时间范围选择）、`progress.jsx`、`radio-group.jsx`。
- `cn()` helper（`src/lib/utils.js`）：`clsx` + `tailwind-merge`，所有组件的 `className` 合并都走这个函数。

**装饰性效果：reactbits**（改编，非 CLI 直装）：

- **`Aurora`**（`src/components/Aurora.jsx`）：WebGL 极光背景，依赖 `ogl`（轻量、无商业限制的 WebGL 库，区别于同类背景组件常依赖的 GSAP 商业插件）。`lightMode` 参数让 shader 渲染成柔和的浅色雾状覆盖层而非深色发光条带，专为亮色主题设计。尊重 `prefers-reduced-motion`（直接不启动渲染循环）。挂载在 `App.jsx` 的 `fixed inset-0` 层，覆盖全窗口。
- **`SpotlightCard`**（`src/components/SpotlightCard.jsx`）：鼠标跟随光效卡片，用于视频列表项、历史记录项。光效层用真实 DOM 节点承载（非 `::before`），避免与调用处已用的其他伪元素装饰冲突。
- **`CountUp`**（`src/components/CountUp.jsx`）：数字滚动效果，改写为纯 `requestAnimationFrame`（原版依赖未安装的 `motion/react`），用于处理结果的帧数展示（一次性揭示，不用于随参数频繁变化的实时预估值）。

不再手搓的原生 CSS 组件（已被上述组件库取代）：表单控件（原生 `<input type="radio">`/`<select>`）、进度条、Tab 切换、按钮全部迁移到 shadcn。

## Layout

四页面结构不变：左侧固定宽度玻璃质感侧边栏（240px，`w-60`）+ 右侧滚动内容区，内容区最大宽度按页面用途分别设 `max-w-6xl`（切帧/预览/记录）或 `max-w-3xl`（设置）。切帧页设置区维持左右两栏 `grid md:grid-cols-2` 布局。响应式：`md` 断点以下设置区折叠为单栏（Tailwind 默认断点，未额外定制）。

## Motion

- 极光背景持续渐变（`ogl` WebGL 渲染循环），是唯一的持续性动效，作为整体氛围。
- 交互反馈动效遵循 Tailwind 默认过渡（`transition-colors`、`transition-all`），按钮 `active:scale-[0.98]` 做按压反馈。
- Spotlight 光效跟随鼠标移动，0.25s ease-out 淡入淡出。
- CountUp 数字滚动，500ms ease-out（`1-(1-t)³`）。
- 全局尊重 `prefers-reduced-motion: reduce`（Aurora 停止渲染，CSS 过渡时长归零）。

## Accessibility

- 全部交互控件走 Radix UI 原语（shadcn 组件基座），原生支持键盘导航、焦点管理、ARIA 属性。
- 文字对比度逐一核对：正文/次要文字在最不利的玻璃叠加背景下仍 ≥4.5:1；`--primary` 色值因此从常规 52% 亮度下调到 48%。
- Aurora 背景层 `pointer-events-none`，不影响下方任何交互层的可点击性。

## Provenance

**本次为第二轮整体视觉重构**，完全推翻并取代第一轮"映光栏接触皮"深色暖调方向（该方向的实现记录已被本文件覆盖；如需查阅历史方向，可从版本控制历史或既有会话记录中检索）。

技术栈变更：新增 Tailwind CSS 3 + PostCSS + Autoprefixer；新增 shadcn/ui 组件基座（`class-variance-authority` + 多个 `@radix-ui/react-*` 原语包 + `clsx` + `tailwind-merge`）；新增 `ogl`（Aurora 背景的 WebGL 渲染依赖）。保留原有信息架构、路由结构、组件功能边界与 Electron IPC 接口不变，仅替换视觉层与所用的 UI 基础库。

构建方式：code-led（本次会话无图像生成工具，未生成 comp 效果图，直接按用户明确指定的技术选型——Shadcn/UI + Tailwind + 玻璃蓝配色 + reactbits 装饰效果——编码实现，跳过方向轮换/挑战者环节，因为方向已由用户直接指定而非从候选中挑选）。
