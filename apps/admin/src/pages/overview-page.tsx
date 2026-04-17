import * as Shared from "../shared";

const {
  clsx,
  Link,
  useEffect,
  useMemo,
  useSearchParams,
  useState,
  Card,
  ConfirmDialog,
  ErrorCard,
  FieldError,
  LoadingCard,
  Notice,
  PROBE_COMPATIBILITY_OPTIONS,
  PUBLIC_SITE_URL,
  buildCredentialRoute,
  buildPriceModelOptions,
  buildRelayFormState,
  buildRelaySelectOptions,
  createDefaultModelFormState,
  createDefaultPriceFormState,
  createDefaultSponsorFormState,
  createRelayPriceRowFormState,
  fetchJson,
  formatCatalogStatus,
  formatCompatibilityMode,
  formatCredentialStatus,
  formatDate,
  formatDateTime,
  formatHealthStatus,
  formatModelStatus,
  formatOverviewMetricLabel,
  formatSubmissionStatus,
  formatSponsorStatus,
  formatTime,
  getModelOptionLabel,
  getRelayOptionLabel,
  matchesSearchQuery,
  pickPreferredCredential,
  trimString,
  useLoadable,
  useMutationState,
  validateModelForm,
  validatePriceForm,
  validateProbeCredentialForm,
  validateRelayForm,
  validateSponsorForm,
  withoutFieldError,
} = Shared;

export function OverviewPage() {
  const { data, loading, error } = useLoadable<Shared.AdminOverviewResponse>(() => fetchJson("/admin/overview"), []);
  const [refreshMutation, setRefreshMutation] = useMutationState();

  async function refreshPublicSnapshot() {
    setRefreshMutation({ pending: true, error: null, success: null });
    try {
      const response = await fetchJson<Shared.AdminRefreshPublicResponse>("/admin/refresh-public", {
        method: "POST",
      });
      setRefreshMutation({
        pending: false,
        error: null,
        success: `公开快照已刷新：${formatDateTime(response.measuredAt)}。`,
      });
    } catch (reason) {
      setRefreshMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : "无法刷新公开快照。",
        success: null,
      });
    }
  }

  if (loading) return <LoadingCard />;
  if (error || !data) return <ErrorCard message={error ?? "无法加载管理概览。"} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.totals).map(([label, value]) => (
          <Card key={label} title={String(value)} kicker={formatOverviewMetricLabel(label)}>
            <p className="text-sm text-white/60">统计时间：{formatTime(data.measuredAt)}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="核心流程" kicker="运营日常路径">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "先看提交记录",
                text: "当前待审核提交会先停留在提交记录中，附带初始测试快照和站点填写信息。",
                action: { href: "/intake", label: "打开提交记录" },
              },
              {
                step: "2",
                title: "批准并启用",
                text: "批准后提交会进入提交历史，同时 Relay 会直接进入当前列表并开始参与后续测试。",
                action: { href: "/intake", label: "处理待审核项" },
              },
              {
                step: "3",
                title: "后续运营维护",
                text: "日常维护集中在 Relay 列表和 Relay 历史；只有 active Relay 会出现在目录和榜单中。",
                action: { href: "/relays", label: "打开 Relay 列表" },
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">步骤 {item.step}</p>
                <p className="mt-2 text-lg tracking-[-0.03em]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/62">{item.text}</p>
                <Link className="pill pill-idle mt-4 inline-flex" to={item.action.href}>
                  {item.action.label}
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card title="快捷入口" kicker="常用页面">
          <div className="grid gap-3">
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/8" to="/intake">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">提交记录</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">优先处理待审核提交</p>
            </Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/8" to="/relays">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">Relay 列表</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">查看 Relay 状态与元数据</p>
            </Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/8" to="/intake/history">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">提交历史</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">追溯已处理记录</p>
            </Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/8" to="/models">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">模型目录</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">新增模型并维护启停状态</p>
            </Link>
            <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/8" to="/relays/history">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">Relay 历史</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">查看已归档站点</p>
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm uppercase tracking-[0.16em] text-white/42">公开快照</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">手动触发一次公开数据刷新</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                审核、价格和赞助位写操作通常会自动刷新；如需人工确认同步结果，可在这里强制刷新一次。
              </p>
              <button
                className="pill pill-active mt-4"
                disabled={refreshMutation.pending}
                onClick={() => {
                  void refreshPublicSnapshot();
                }}
                type="button"
              >
                {refreshMutation.pending ? "刷新中..." : "手动刷新公开快照"}
              </button>
              <div className="mt-3">
                <Notice state={refreshMutation} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

