# DESIGN.md — 冰冰快答小助手 设计体系

> 由 2026-08-30 前端重设计确立。事实记录：两前端（server/public/admin.html 网页管理后台、miniprogram/ 微信小程序）共用一套品牌 token；数值分别以 px（admin）与 rpx（小程序）表达。

## 品牌

- 品牌名：冰冰快答小助手（FreshmanQA），品牌符号为「冰」字方瓦（青绿渐变底 + 白字）。
- 主色：**冰青绿** `#0d7a68`（hover/strong `#075f52`，soft 底 `#dff2ee`）。全产品唯一 accent，紫色（历史 admin 配色）已退役。

## 色彩 token

| 语义 | 值 | 说明 |
| --- | --- | --- |
| primary | `#0d7a68` / hover `#075f52` / soft-bg `#dff2ee` / soft-border `#b5ded4` | 主操作、选中态、链接 |
| success | `#15803d` / soft-bg `#e8f6ed` | 通过、已认证 |
| warning | `#b45309` / soft-bg `#fff3df` | 待处理、低分 |
| danger | `#cf2c37` / soft-bg `#fdeceb` | 删除、拒绝、角标 |
| info | `#0e7490` / soft-bg `#e0f2f5` | 中性提示标签 |
| ink | `#111827`（主）/ `#4b5563`（次）/ `#79818c`（弱） | 文字三级 |
| surface | `#ffffff` / `#f5f8f8`（页面底）/ line `#e5eaec` | 面两级 + 分隔线 |
| disabled | 底 `#eceff0` / 字 `#a1a7af` | 全局唯一一对 |
| mask | `rgba(15,42,40,.45)` | 全部遮罩统一 |
| frosted | `rgba(255,255,255,.96)` + blur | 唯一毛玻璃参数 |

规则：Restrained 策略（中性底 + 单 accent）；accent 只用于主操作/选中/状态指示；阴影一律带偏移、色调偏向青灰 `rgba(15,42,40,…)`，禁止纯黑影与零偏移彩色光晕。

## 形状 / 字阶 / 动效

- 圆角刻度：控件 8、卡片/输入 10-14、标签 6、胶囊 999。全站按此规则，不混用。
- 字阶（admin, px）：12 / 13 / 14 / 16 / 18 / 22 / 28，比例 ~1.15-1.25；数字一律 `font-variant-numeric: tabular-nums`。小程序对应 rpx 值按 2 倍换算。
- 动效（Operate 模式，150-250ms）：进出场 ease-out `cubic-bezier(0.23,1,0.32,1)`；弹窗进入 scale(0.95)+opacity；按压 `:active scale(0.97)`；列表进入 stagger 30-80ms；toast/抽屉等高频中断场景用 transition 不用 keyframes；`prefers-reduced-motion: reduce` 时全部退化为静态。
- 图标：admin 使用内联 SVG（Tabler 图标语法，24 viewBox、stroke 1.75、round cap/join），禁止 emoji 充当图标；小程序保留中文字符瓦片的品牌语言（冰/答/认），功能性符号（×、←、☰）以 SVG data-URI 绘制。

## 组件状态底线（craft-floor）

每个可交互组件必须具备：default / hover / focus-visible / active / disabled / loading（骨架，而非内容区中央转圈）/ error（行内或横幅 + 重试）/ empty（说明如何产生数据）。表单 label 在上、错误在下；占位符不充当 label。

## 平台边界

- admin.html：单文件、零依赖、无构建；保留 `X-Admin-Key` 静态 token 机制（认证改造为独立议题）；全部接口契约与函数名保持兼容。
- 小程序：WXSS token 定义于 `app.wxss` 的 `page` 选择器；不新增 tabBar 与暗色模式（后续议题）。
