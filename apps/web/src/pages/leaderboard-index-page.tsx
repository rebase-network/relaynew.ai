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

export function LeaderboardIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useLoadable<Shared.LeaderboardDirectoryResponse>(
    "/public/leaderboard-directory",
    () => fetchJson("/public/leaderboard-directory"),
    [],
  );
  usePageMetadata({
    title: "站点榜单目录｜relaynew.ai",
    description: "按主流模型分类查看已跟踪站点榜单目录，快速进入单榜单详情，对比健康状态、延迟与价格信息。",
    canonicalPath: LEADERBOARD_DIRECTORY_PATH,
  });
  const boards = data?.boards ?? [];
  const vendorFilter = searchParams.get("vendor") ?? "all";
  const vendorOptions = useMemo(
    () =>
      Array.from(
        new Map(
          boards.map((board) => {
            const vendorKey = getModelVendorKey(board.modelKey);
            return [vendorKey, { key: vendorKey, label: getModelVendorLabel(board.modelKey) }];
          }),
        ).values(),
      ),
    [boards],
  );
  const filteredBoards = useMemo(
    () =>
      boards.filter((board) => {
        const vendorKey = getModelVendorKey(board.modelKey);
        return vendorFilter === "all" || vendorKey === vendorFilter;
      }),
    [boards, vendorFilter],
  );

  if (loading) return <LeaderboardDirectorySkeleton />;
  if (error || !data) return <ErrorPanel message={error ?? "榜单目录加载失败。"} />;

  function updateDirectorySearch(next: { vendor?: string }) {
    const params = new URLSearchParams(searchParams);

    if (next.vendor !== undefined) {
      if (next.vendor === "all") {
        params.delete("vendor");
      } else {
        params.set("vendor", next.vendor);
      }
    }

    setSearchParams(params);
  }

  return (
    <div className="space-y-5">
      <section className="panel leaderboard-directory-hero bg-[#fff0c2]">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="kicker !mb-2">榜单目录</p>
            <h1 className="max-w-3xl text-[2.7rem] leading-[0.94] tracking-[-0.05em] md:text-[3.45rem]">
              浏览全部模型榜单，直接进入你关心的分类。
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-black/70">
              每个模型分类都聚合了当前已跟踪站点的实时排名快照，适合先定位模型，再进入单榜单比较站点表现。
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 xl:justify-end">
            <Link className="button-dark" to="/leaderboard">打开实时榜单</Link>
            <Link className="button-cream" to="/probe">开始测试</Link>
          </div>
        </div>
      </section>

      <section className="directory-filters directory-filters-compact">
        <div className="directory-filter-head">
          <p className="kicker !mb-0">按服务商筛选</p>
          <p className="directory-filter-meta">
            {filteredBoards.length === data.boards.length
              ? `${data.boards.length} 个模型`
              : `${filteredBoards.length} / ${data.boards.length} 个模型`}
          </p>
        </div>
        <div className="directory-vendor-row">
          <button
            className={clsx("directory-filter-chip", vendorFilter === "all" && "directory-filter-chip-active")}
            onClick={() => updateDirectorySearch({ vendor: "all" })}
            type="button"
          >
            全部
          </button>
          {vendorOptions.map((vendor) => (
            <button
              key={vendor.key}
              className={clsx(
                "directory-filter-chip",
                vendorFilter === vendor.key && "directory-filter-chip-active",
              )}
              onClick={() => updateDirectorySearch({ vendor: vendor.key })}
              type="button"
            >
              {vendor.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredBoards.map((board) => (
          <LeaderboardPreviewCard key={board.modelKey} board={board} />
        ))}
      </div>
      {filteredBoards.length === 0 ? (
        <section className="directory-empty-state">
          <p className="kicker">没有匹配项</p>
          <h2 className="text-3xl leading-[0.96] tracking-[-0.04em]">当前筛选条件下没有匹配的模型榜单。</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/68">
            请切换服务商筛选条件，恢复完整目录视图。
          </p>
          <button
            className="button-cream mt-5"
            onClick={() => setSearchParams(new URLSearchParams())}
            type="button"
          >
            重置筛选
          </button>
        </section>
      ) : null}
    </div>
  );
}
