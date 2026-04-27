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

export function NotFoundPage() {
  usePageMetadata({
    title: "页面不存在｜relaynew.ai",
    description: "你访问的页面不存在，可以返回首页、查看站点目录或开始站点测试。",
    canonicalPath: null,
    robots: "noindex,follow",
  });

  return (
    <section className="panel not-found-panel">
      <p className="kicker">404</p>
      <h1 className="not-found-title">页面不存在</h1>
      <p className="not-found-copy">
        这个地址没有对应的公开页面。你可以回到首页，查看当前模型目录，或者直接测试一个 Relay 站点。
      </p>
      <div className="not-found-actions">
        <Link className="button-dark" to="/">返回首页</Link>
        <Link className="button-cream" to="/leaderboard">查看目录</Link>
        <Link className="button-cream" to="/probe">开始测试</Link>
      </div>
    </section>
  );
}
