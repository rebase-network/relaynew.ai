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

export function HomePage() {
  const { data, loading, error } = useLoadable<Shared.HomeSummaryResponse>(
    "/public/home-summary",
    () => fetchJson("/public/home-summary"),
    [],
  );
  const quickProbe = useProbeController(DEFAULT_PROBE_STATE);
  usePageMetadata({
    title: "relaynew.ai｜中转站监控、榜单与测试",
    description: "面向中国用户的中转站点目录与评测平台，提供站点榜单、API 测试与站点提交入口。",
  });

  if (loading) return <HomePageSkeleton />;
  if (error || !data) return <ErrorPanel message={error ?? "首页加载失败。"} />;

  return (
    <div className="space-y-5">
      <section className="panel hero-panel min-h-0">
        <div className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr] xl:items-start">
          <div className="order-2 md:order-1">
            <h1 className="max-w-4xl text-[3rem] leading-[0.92] tracking-[-0.07em] md:text-5xl xl:text-[4rem]">
              发现优质中转站点，快速测试API可用性，建立公开站点目录
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/72 md:mt-4 md:text-base md:leading-7">
              你可以查看各模型站点榜单、快速检测站点，或在需要更深入诊断时进入完整测试工作台。
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link className="button-dark" to="/leaderboard">查看榜单</Link>
              <Link className="button-cream" to="/probe">开始测试</Link>
              <Link className="button-cream" to="/submit">提交站点</Link>
            </div>
          </div>
          <div className="order-1 space-y-3 md:order-2">
            <form className="quick-probe-card quick-probe-form" onSubmit={quickProbe.handleSubmit}>
              <div className="quick-probe-header">
                <div>
                  <p className="quick-probe-heading">快速测试</p>
                </div>
                <Link
                  aria-label="打开完整测试页"
                  className="quick-probe-link"
                  title="打开完整测试页"
                  to="/probe"
                >
                  完整测试
                </Link>
              </div>
              <ProbeFormFields
                compact
                setState={quickProbe.setState}
                showHelpers={false}
                state={quickProbe.state}
              />
              <div className="quick-probe-footer">
                <InlineProbeSummary
                  error={quickProbe.error}
                  result={quickProbe.result}
                  resultTone={quickProbe.resultTone}
                />
                <button className="button-dark quick-probe-action" disabled={quickProbe.submitting} type="submit">
                  {quickProbe.submitting ? "检测中..." : "立即测试"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Panel className="home-leaderboard-panel">
        <div className="mb-3 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-xs uppercase tracking-[0.16em] text-black/48">
            展示按照主流模型分类的榜单，每个模型分类取评分前五的站点，每天会根据测试数据重新排行
          </p>
          <Link className="button-cream" to={LEADERBOARD_DIRECTORY_PATH}>
            查看全部站点
          </Link>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.leaderboards.map((board) => (
            <LeaderboardPreviewCard
              key={board.modelKey}
              board={board}
              rowLimit={HOME_LEADERBOARD_ROW_LIMIT}
            />
          ))}
        </div>
      </Panel>

      <section className="home-bridge">
        <p className="home-bridge-copy">
          评测是基于多个维度对站点服务质量进行自动化测试，赞助并不影响评测，会有单独的赞助方展示，力求评测公开公正
        </p>
        <div className="home-bridge-actions">
          <Link className="home-bridge-link" to="/methodology">
            评测方式
          </Link>
          <Link className="home-bridge-link" to="/policy">
            我们怎么做
          </Link>
        </div>
      </section>

      {data.highlights.length > 0 ? (
        <section className="panel">
          <div className="mb-4">
            <p className="kicker">赞助商</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.highlights.map((relay) => (
              <Link
                key={relay.slug}
                to={`/relay/${relay.slug}`}
                className="surface-link flex h-full items-center justify-between gap-4 p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-[1.22rem] tracking-[-0.03em]">{relay.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="signal-chip">{formatBadgeLabel(relay.badge)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-2 text-sm uppercase tracking-[0.12em]">
                    <StatusDot status={relay.healthStatus} /> {formatHealthStatusLabel(relay.healthStatus)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

