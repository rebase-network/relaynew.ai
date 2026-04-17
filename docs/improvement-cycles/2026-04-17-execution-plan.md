# 2026-04-17 自动改进实施方案（5 轮）

## 目标

围绕以下总目标推进至少 5 轮自动改进：

- 面向中国用户与运营团队，完成核心界面中文化
- 提升公共页面的信息完整度与解释性
- 收紧 `public / admin` 代码边界与公共缓存策略
- 改善 SEO 基础能力与页面级 metadata
- 通过 Playwright、API 验证和代码复审形成新的中文验收基线

## 总体执行原则

- 每一轮都遵循：审阅 -> 方案 -> 实施 -> 复审 -> 测试 -> 提交
- 每一轮至少明确覆盖以下三类用户中的一类：
  - 运营人员
  - 普通用户
  - 中转站节点运营者
- 每轮优先做小而明确、可以独立提交的功能切片
- 文档、测试与实现同步推进，避免再次漂移

## 第 1 轮：建立审阅与执行基线

### 目标

- 将首轮问题审阅正式写入仓库文档
- 明确 5 轮迭代的执行顺序与验收目标

### 主要用户

- 运营人员
- 产品维护者

### 拟修改文件

- `docs/improvement-cycles/2026-04-17-audit-round-01.md`
- `docs/improvement-cycles/2026-04-17-execution-plan.md`

### 风险

- 风险较低，重点是确保问题描述与实际实现一致

### 验证方式

- 人工校对文档内容
- 确认问题、优先级、用户视角与后续迭代顺序一致

## 第 2 轮：前后台中文化与中国用户展示规则

### 目标

- 将前台和后台的核心导航、按钮、表单、帮助信息、状态提示改为中文
- 统一 `zh-CN`、时间与数字展示策略
- 让运营人员、普通用户、中转站节点运营者的主要操作路径都可以中文完成

### 主要用户

- 运营人员
- 普通用户
- 中转站节点运营者

### 拟修改文件

- `apps/web/index.html`
- `apps/admin/index.html`
- `apps/web/src/app.tsx`
- `apps/admin/src/app.tsx`
- `docs/LOCALIZATION_ZH_CN.md`

### 风险

- 文案修改量较大，容易导致 Playwright 断言失效
- 部分状态文案需兼顾产品准确性与中文易懂性

### 验证方式

- `pnpm typecheck`
- 重点运行公共站与后台的 Playwright 场景
- 人工检查移动端导航、表单标签、操作反馈、时间格式

## 第 3 轮：补齐公共页的信息完整度

### 目标

- 首页补齐最近异常 / 事故模块与更明确的信任说明
- 榜单页补齐自然排名解释、赞助分层说明、面向普通用户的阅读提示
- Relay 详情页补齐事故时间线与价格历史展示

### 主要用户

- 普通用户
- 中转站节点运营者

### 拟修改文件

- `apps/web/src/app.tsx`
- `apps/api/src/routes/public.ts`
- `packages/shared/src/public.ts`
- `e2e/public.spec.ts`
- `docs/ROUTES.md`

### 风险

- 公共页模块变多后，移动端布局可能需要重新调整
- Relay 页面新增模块后，加载与空状态逻辑需要补齐

### 验证方式

- `pnpm test:e2e --grep public`
- 人工检查桌面端与移动端布局
- 确认 sponsor 与自然排序始终分离

## 第 4 轮：收紧 API 边界与公共缓存策略

### 目标

- 为 `/public/*` 统一补充缓存头策略
- 将 `/public/submissions` 及其 schema 从 admin 组织中拆分出去
- 明确 `public / admin / internal` 代码责任边界

### 主要用户

- 运营人员
- 平台维护者

### 拟修改文件

- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/admin.ts`
- `packages/shared/src/public.ts`
- `packages/shared/src/admin.ts`
- `packages/shared/src/index.ts`
- 新增 `apps/api/src/routes/public-submissions.ts` 或等价拆分文件
- `docs/ARCHITECTURE.md`
- `docs/INTERNAL_API_NOTES.md`

### 风险

- 路由拆分后容易引入类型导出或导入回归
- 缓存头策略需要避免误作用于 admin 接口

### 验证方式

- `pnpm test`
- 针对 `/public/*` 做响应头检查
- 核对 admin 接口不被缓存

## 第 5 轮：SEO 基础能力、测试升级与复审修复

### 目标

- 补齐首页、榜单页、Relay 详情页、提交页、Probe 页的 route-level title / description / canonical 基础能力
- 将 Playwright 断言与产品基线切换为中文
- 增补公共 API 缓存头与中文 UI 的测试
- 做一轮代码复审并修复发现的问题

### 主要用户

- 普通用户
- 运营人员
- 平台维护者

### 拟修改文件

- `apps/web/index.html`
- `apps/web/src/app.tsx`
- `e2e/public.spec.ts`
- `e2e/admin.spec.ts`
- `apps/api/src/**/*.test.ts`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/TESTING_STRATEGY.md`

### 风险

- SEO 能力在纯 CSR 前提下只能做到过渡优化，无法完全替代 SSR / pre-render
- 中文断言切换后，测试容易暴露已有但未显现的页面问题

### 验证方式

- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- 对失败项进行复审与补丁修复

## 收口标准

完成 5 轮后，至少应满足以下结果：

- 公共站和后台的核心路径为中文
- 首页、榜单、Relay 详情页信息完整度较当前版本明显提升
- `/public/*` 具备明确缓存头策略
- `public / admin` 路由组织比当前更清晰
- Playwright 中文验收基线建立完成
- 相关文档已同步更新，可支持继续迭代
