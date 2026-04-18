import * as Shared from "../shared";
import { RelayHeroSection } from "../features/relay/relay-hero-section";
import { RelayHistorySection } from "../features/relay/relay-history-section";
import { RelayModelSupportSection } from "../features/relay/relay-model-support-section";

const {
  ErrorPanel,
  RelayPageSkeleton,
  buildDailyHistorySlots,
  fetchJson,
  formatAvailability,
  formatLatency,
  useLoadable,
  usePageMetadata,
  useParams,
} = Shared;

export function RelayPage() {
  const { slug = "aurora-relay" } = useParams();
  const overview = useLoadable<Shared.RelayOverviewResponse>(
    `/public/relay/${slug}/overview`,
    () => fetchJson(`/public/relay/${slug}/overview`),
    [slug],
  );
  const history = useLoadable<Shared.RelayHistoryResponse>(
    `/public/relay/${slug}/history?window=30d`,
    () => fetchJson(`/public/relay/${slug}/history?window=30d`),
    [slug],
  );
  const models = useLoadable<Shared.RelayModelsResponse>(
    `/public/relay/${slug}/models`,
    () => fetchJson(`/public/relay/${slug}/models`),
    [slug],
  );
  const pricing = useLoadable<Shared.RelayPricingHistoryResponse>(
    `/public/relay/${slug}/pricing-history`,
    () => fetchJson(`/public/relay/${slug}/pricing-history`),
    [slug],
  );
  const relayName = overview.data?.relay.name ?? slug;

  usePageMetadata({
    title: `${relayName} Relay 详情｜relaynew.ai`,
    description:
      overview.data
        ? `查看 ${overview.data.relay.name} 的 24h 可用性、延迟走势、模型支持与当前价格。`
        : "查看站点的 24h 可用性、延迟走势、模型支持与当前价格。",
  });

  if (overview.loading) return <RelayPageSkeleton />;
  if (overview.error || !overview.data) return <ErrorPanel message={overview.error ?? "Relay 详情加载失败。"} />;

  const snapshotMetrics = [
    { label: "24h 可用性", value: formatAvailability(overview.data.availability24h) },
    { label: "P50 延迟", value: formatLatency(overview.data.latencyP50Ms) },
    { label: "P95 延迟", value: formatLatency(overview.data.latencyP95Ms) },
    { label: "模型数", value: overview.data.supportedModelsCount },
  ];

  const latestPricingByModelKey = new Map<string, Shared.RelayPricingHistoryResponse["rows"][number]>();
  if (pricing.data) {
    for (const row of pricing.data.rows) {
      if (!latestPricingByModelKey.has(row.modelKey)) {
        latestPricingByModelKey.set(row.modelKey, row);
      }
    }
  }

  const modelPricingRows: Shared.RelayModelPricingRow[] = models.data?.rows.map((row) => ({
    ...row,
    currentPrice: latestPricingByModelKey.get(row.modelKey) ?? null,
  })) ?? [];
  const modelRowsPerColumn = Math.ceil(modelPricingRows.length / 2);
  const modelTableColumns: Array<Array<Shared.RelayModelPricingRow | null>> = [
    modelPricingRows.slice(0, modelRowsPerColumn),
    modelPricingRows.slice(modelRowsPerColumn),
  ]
    .filter((rows) => rows.length > 0)
    .map((rows) => [...rows, ...Array.from({ length: Math.max(0, modelRowsPerColumn - rows.length) }, () => null)]);
  const historySlots = history.data ? buildDailyHistorySlots(history.data.points, history.data.measuredAt) : [];
  const measuredHistorySlotCount = historySlots.filter((slot) => slot.point).length;
  const latestMeasuredHistoryPoint = [...historySlots].reverse().find((slot) => slot.point?.latencyP95Ms !== null)?.point ?? null;

  return (
    <div className="space-y-4">
      <RelayHeroSection overview={overview.data} snapshotMetrics={snapshotMetrics} />
      <RelayHistorySection
        historyError={history.error}
        historyLoading={history.loading}
        historyReady={Boolean(history.data)}
        historySlots={historySlots}
        latestMeasuredLatency={latestMeasuredHistoryPoint?.latencyP95Ms ?? null}
        measuredHistorySlotCount={measuredHistorySlotCount}
      />
      <RelayModelSupportSection
        modelPricingRows={modelPricingRows}
        modelTableColumns={modelTableColumns}
        modelsLoading={models.loading}
        modelsReady={Boolean(models.data)}
      />
    </div>
  );
}
