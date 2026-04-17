import * as Shared from "../shared";

const {
  clsx,
  useEffect,
  useMemo,
  useNavigate,
  useParams,
  useSearchParams,
  useState,
  BADGE_COPY,
  DEFAULT_LEADERBOARD_MODEL_KEY,
  DEFAULT_PROBE_STATE,
  ErrorPanel,
  HEALTH_STATUS_COPY,
  HOME_LEADERBOARD_ROW_LIMIT,
  HomeIncidentCard,
  HomePageSkeleton,
  InlineProbeSummary,
  LEADERBOARD_DIRECTORY_PATH,
  LeaderboardDirectorySkeleton,
  LeaderboardPageSkeleton,
  LeaderboardPreviewCard,
  LeaderboardRowCard,
  CompactBadgeList,
  Link,
  LoadingPanel,
  MetricGrid,
  MethodologyPageSkeleton,
  NavLink,
  Panel,
  POLICY_PILLARS,
  ProbeFormFields,
  PROBE_COMPATIBILITY_OPTIONS,
  PROBE_OUTPUT_CARDS,
  RelayIncidentTimeline,
  RelayLatencyChart,
  RelayLatencyLegend,
  RelayModelsTable,
  RelayPageSkeleton,
  RelayPricingHistoryPanel,
  ScorePopover,
  StatusDot,
  StatusHistoryPanel,
  buildDailyHistorySlots,
  createSubmitModelPriceRow,
  fetchJson,
  formatAvailability,
  formatBadgeLabel,
  formatDate,
  formatDateTime,
  formatHealthStatusLabel,
  formatIncidentSeverityLabel,
  formatLatency,
  formatPricePerMillion,
  formatPricingSourceLabel,
  formatProbeCompatibilityMode,
  formatProbeDetectionMode,
  formatProbeHttpStatus,
  formatProbeMeasuredAt,
  formatScoreMetricLabel,
  formatSupportStatusLabel,
  getConnectivityCardTone,
  getIncidentToneClasses,
  getLeaderboardPath,
  getModelVendorKey,
  getModelVendorLabel,
  getProbeStateFromSearchParams,
  getProtocolCardTone,
  getTraceCardTone,
  isValidHttpUrl,
  useLoadable,
  usePageMetadata,
  useProbeController,
  validateSubmitForm,
} = Shared;

export function PolicyPage() {
  usePageMetadata({
    title: "我们怎么做｜relaynew.ai",
    description: "说明站点收录与评测边界、赞助方展示规则，以及运营者纠错申诉与复核流程。",
    canonicalPath: "/policy",
  });

  return (
    <div className="space-y-6">
      <section className="panel bg-[#fff0c2]">
        <p className="kicker">我们怎么做</p>
        <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <div>
            <h1 className="max-w-3xl text-4xl leading-[0.92] tracking-[-0.06em] md:text-5xl">
              目录保持中立、可观测，并支持运营者申诉与复核。
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-black/72">
              这里会解释哪些决策由测量结果驱动，哪些属于运营或编辑判断，以及运营者如何修正收录信息。
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link className="button-dark" to="/submit">提交站点</Link>
              <Link className="button-cream" to="/methodology">查看评测方式</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {POLICY_PILLARS.map((pillar) => (
              <div key={pillar.title} className="surface-card p-4">
                <p className="kicker">{pillar.title}</p>
                <p className="text-sm leading-6 text-black/68">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="哪些因素会影响榜单顺序" kicker="测量输入">
          <div className="space-y-3 text-sm leading-6 text-black/72">
            <div className="surface-card p-3.5">实测可用性，以及请求成功的连续性表现。</div>
            <div className="surface-card p-3.5">特定模型分类下的延迟分布与近期一致性。</div>
            <div className="surface-card p-3.5">相对同类站点的价格效率与性价比。</div>
            <div className="surface-card p-3.5">稳定性信号、事故新鲜度，以及样本量带来的置信度。</div>
          </div>
        </Panel>
        <Panel title="哪些因素不会改变评测排名" kicker="边界说明">
          <div className="space-y-3 text-sm leading-6 text-black/72">
            <div className="surface-card p-3.5">赞助套餐、合作露出或其他推广展示。</div>
            <div className="surface-card p-3.5">缺乏测量变化支撑的人工调位请求。</div>
            <div className="surface-card p-3.5">无法复现、也没有最新证据支撑的单次 anecdote。</div>
            <div className="surface-card p-3.5">单独一次测试成功本身；公开测试用于诊断连通性，不直接定义排名。</div>
          </div>
        </Panel>
      </section>
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="运营者复核路径" kicker="纠错与申诉">
          <div className="space-y-3 text-sm leading-6 text-black/72">
            <p className="surface-card p-3.5">
              如果你的站点端点、支持模型或公开信息发生变化，请使用最新的基础 URL 与运营者联系方式重新提交更新。
            </p>
            <p className="surface-card p-3.5">
              如果你认为公开状态不准确，请提供可复现的测试数据、受影响模型与需要复查的时间窗口。
            </p>
            <p className="surface-card p-3.5">
              在补充证据期间，条目可能会被暂停或标记为观察中，但赞助方展示与评测排名的分离不会因此改变。
            </p>
          </div>
        </Panel>
        <Panel title="建议的运营动作顺序" kicker="实践流程">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-card p-3.5">
              <p className="kicker !text-black/52">1. 测试</p>
              <p className="text-sm leading-6 text-black/68">先用受限测试验证公开路由、API 协议族和模型行为是否正常。</p>
            </div>
            <div className="surface-card p-3.5">
              <p className="kicker !text-black/52">2. 提交</p>
              <p className="text-sm leading-6 text-black/68">提交规范的 URL 与运营者联系信息，让站点带着上下文进入审核队列。</p>
            </div>
            <div className="surface-card p-3.5">
              <p className="kicker !text-black/52">3. 观察</p>
              <p className="text-sm leading-6 text-black/68">随着观测窗口逐渐填满，持续关注公开榜单、事故记录与备注说明。</p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

