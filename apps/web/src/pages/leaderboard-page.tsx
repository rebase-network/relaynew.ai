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

export function LeaderboardPage() {
  const { modelKey = DEFAULT_LEADERBOARD_MODEL_KEY } = useParams();
  const directory = useLoadable<Shared.LeaderboardDirectoryResponse>(
    "/public/leaderboard-directory",
    () => fetchJson("/public/leaderboard-directory"),
    [],
  );
  const leaderboardCacheKey = `/public/leaderboard/${modelKey}?limit=50`;
  const { data, loading, error } = useLoadable<Shared.LeaderboardResponse>(
    leaderboardCacheKey,
    () => fetchJson(leaderboardCacheKey),
    [modelKey],
  );
  const rows = data?.rows ?? [];
  const trackedRelayCount = rows.length;
  const healthyRelayCount = rows.filter((row) => row.healthStatus === "healthy").length;
  const degradedRelayCount = rows.filter((row) => row.healthStatus === "degraded").length;
  const modelName = data?.model.name ?? "Relay";
  usePageMetadata({
    title: `${modelName} 站点榜单｜relaynew.ai`,
    description:
      data
        ? `查看 ${data.model.name} 模型分类下的站点评测排名，基于可用性、延迟、稳定性、价格与可信度；赞助方展示与排名严格分离。`
        : "查看站点评测排名与实测数据，理解健康状态、延迟表现与赞助方展示分离规则。",
  });

  if (loading) return <LeaderboardPageSkeleton />;
  if (error || !data) return <ErrorPanel message={error ?? "榜单加载失败。"} />;

  return (
    <div className="space-y-6">
      <section className="panel bg-[#fff0c2]">
        <p className="kicker">榜单</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl leading-[0.92] tracking-[-0.06em] md:text-5xl">{data.model.name}</h1>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-black/60">北京时间 {formatDateTime(data.measuredAt)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="signal-chip">已跟踪 {trackedRelayCount} 个站点</span>
              <span className="signal-chip">健康 {healthyRelayCount} 个</span>
              <span className="signal-chip">降级 {degradedRelayCount} 个</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link className="button-dark" to={LEADERBOARD_DIRECTORY_PATH}>全部模型</Link>
            <Link className="button-cream" to="/probe">开始测试</Link>
          </div>
        </div>
      </section>
      {directory.data?.boards.length ? (
        <section className="panel-soft border border-black/8 px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <p className="directory-filter-meta">共 {directory.data.boards.length} 个已跟踪模型</p>
            </div>
            <div className="leaderboard-model-switcher">
              {directory.data.boards.map((board) => (
                <Link
                  key={board.modelKey}
                  className={clsx(
                    "leaderboard-model-pill",
                    board.modelKey === data.model.key && "leaderboard-model-pill-active",
                  )}
                  to={getLeaderboardPath(board.modelKey)}
                >
                  {board.modelName}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface-card p-4">
          <p className="kicker">评测排名</p>
          <p className="mt-3 text-sm leading-6 text-black/72">
            下方排行榜是基于站点提供者提交的API信息进行自动化测试的结果生成，综合可用性、延迟、稳定性、价格和可信度进行评价，不接受赞助调位
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="kicker">评测方式</p>
          <p className="mt-3 text-sm leading-6 text-black/72">
            如果你想理解总分、健康状态等含义，可以先阅读评测方式，再回到榜单做比较。
          </p>
          <Link className="mt-4 inline-flex text-sm underline underline-offset-4" to="/methodology">
            查看评测方式
          </Link>
        </div>
        <div className="surface-card p-4">
          <p className="kicker">赞助分离</p>
          <p className="mt-3 text-sm leading-6 text-black/72">
            赞助方展示只会出现在独立模块，不会混入排名，也不会影响这里的实测结果。
          </p>
          <Link className="mt-4 inline-flex text-sm underline underline-offset-4" to="/policy">
            查看我们怎么做
          </Link>
        </div>
      </section>
      <Panel title="站点评测排名">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-black/68">
            本页只呈现当前模型分类下的评测结果。赞助方展示不会插入排名，理解分数口径请配合评测方式一起阅读。
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-black/48">
            当前榜单不含赞助方
          </p>
        </div>
        {rows.length ? (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <LeaderboardRowCard key={row.relay.slug} row={row} />
              ))}
            </div>
            <div className="data-table hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="pb-2.5">排名</th>
                    <th className="pb-2.5">Relay</th>
                    <th className="pb-2.5">状态</th>
                    <th className="pb-2.5">评分</th>
                    <th className="pb-2.5">24h 可用性</th>
                    <th className="pb-2.5">P50 延迟</th>
                    <th className="pb-2.5">输入价格</th>
                    <th className="pb-2.5">输出价格</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.relay.slug} className="align-top">
                      <td className="py-3 text-2xl tracking-[-0.04em]">#{row.rank}</td>
                      <td className="py-3">
                        <Link to={`/relay/${row.relay.slug}`} className="text-[1.08rem] tracking-[-0.03em] hover:underline">{row.relay.name}</Link>
                        <CompactBadgeList badges={row.badges.map(formatBadgeLabel)} className="mt-2" />
                      </td>
                      <td className="py-3 text-sm uppercase tracking-[0.14em]"><span className="inline-flex items-center gap-2"><StatusDot status={row.healthStatus} /> {formatHealthStatusLabel(row.healthStatus)}</span></td>
                      <td className="py-3 text-[1.08rem] tracking-[-0.03em]">{row.score.toFixed(1)}</td>
                      <td className="py-3">{formatAvailability(row.availability24h)}</td>
                      <td className="py-3">{formatLatency(row.latencyP50Ms)}</td>
                      <td className="py-3">{row.inputPricePer1M ?? "-"}</td>
                      <td className="py-3">{row.outputPricePer1M ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="directory-empty-state">
            <p className="kicker">暂无排名</p>
            <h2 className="text-3xl leading-[0.96] tracking-[-0.04em]">这个模型分类暂时还没有站点进入排名。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/68">
              可在下一轮评测完成后再来查看，或从上方切换到其他模型。
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

