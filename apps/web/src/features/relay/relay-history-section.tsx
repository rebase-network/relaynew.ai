import * as Shared from "../../shared";

const {
  Panel,
  RelayLatencyChart,
  RelayLatencyLegend,
  StatusHistoryPanel,
  formatLatency,
} = Shared;

export function RelayHistorySection({
  historyError,
  historyLoading,
  historyReady,
  historySlots,
  latestMeasuredLatency,
  measuredHistorySlotCount,
}: {
  historyError: string | null;
  historyLoading: boolean;
  historyReady: boolean;
  historySlots: Shared.DailyHistorySlot[];
  latestMeasuredLatency: number | null;
  measuredHistorySlotCount: number;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Panel
        className="h-full"
        title="延迟"
        kicker="近 30 天走势"
        headerClassName="mb-3"
        titleClassName="text-[1.9rem] md:text-[2.1rem]"
      >
        {historyError ? (
          <p className="text-sm text-[#b42318]">{historyError}</p>
        ) : historyLoading || !historyReady ? (
          <p className="text-sm text-black/60">正在加载趋势...</p>
        ) : (
          <div className="space-y-3">
            <RelayLatencyChart slots={historySlots} />
            <RelayLatencyLegend />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="surface-card px-3 py-2.5 text-sm">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-black/46">窗口</p>
                <p className="mt-2 text-black/76">30d</p>
              </div>
              <div className="surface-card px-3 py-2.5 text-sm">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-black/46">覆盖度</p>
                <p className="mt-2 text-black/76">{measuredHistorySlotCount} / 30 天</p>
              </div>
              <div className="surface-card px-3 py-2.5 text-sm">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-black/46">最新 P95</p>
                <p className="mt-2 text-black/76">{formatLatency(latestMeasuredLatency)}</p>
              </div>
            </div>
          </div>
        )}
      </Panel>
      <Panel
        className="h-full"
        title="状态"
        kicker="近 30 天可用性"
        headerClassName="mb-3"
        titleClassName="text-[1.9rem] md:text-[2.1rem]"
      >
        {historyError ? (
          <p className="text-sm text-[#b42318]">{historyError}</p>
        ) : historyLoading || !historyReady ? (
          <p className="text-sm text-black/60">正在加载状态...</p>
        ) : (
          <StatusHistoryPanel slots={historySlots} />
        )}
      </Panel>
    </section>
  );
}
