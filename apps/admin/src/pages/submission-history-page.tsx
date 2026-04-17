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

export function SubmissionHistoryPage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => fetchJson("/admin/submissions"), []);

  if (submissions.loading) return <LoadingCard />;
  if (submissions.error || !submissions.data) {
    return <ErrorCard message={submissions.error ?? "无法加载提交历史。"} />;
  }

  const historyRows = submissions.data.rows.filter((row) => row.status !== "pending");

  return (
    <Card title="提交记录历史" kicker="已处理记录">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
        这里保留所有已经处理完成的提交，包括 approved、rejected 和 archived，便于运营追溯历史决策和测试快照。
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">提交历史</p>
            <p className="mt-1 text-lg tracking-[-0.03em]">已处理完成</p>
          </div>
          <p className="text-sm text-white/48">共 {historyRows.length} 条</p>
        </div>
        {historyRows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
            当前还没有历史提交记录。
          </div>
        ) : historyRows.map((row) => (
          <div key={row.id} className="admin-list-card border border-white/10 bg-white/5 p-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xl tracking-[-0.03em]">{row.relayName}</p>
                <p className="mt-1 text-sm text-white/60 break-all">{row.baseUrl}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/40">{formatSubmissionStatus(row.status)} · {formatDateTime(row.createdAt)}</p>
                {row.contactInfo ? <p className="mt-2 text-sm text-white/58">联系方式：{row.contactInfo}</p> : null}
                {row.description ? <p className="mt-3 text-sm leading-6 text-white/66">{row.description}</p> : null}
                {row.modelPrices.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.modelPrices.map((priceRow) => (
                      <span key={`${row.id}-${priceRow.modelKey}`} className="pill pill-ghost">
                        {priceRow.modelKey} · {priceRow.inputPricePer1M ?? "-"} / {priceRow.outputPricePer1M ?? "-"}
                      </span>
                    ))}
                  </div>
                ) : null}
                {row.approvedRelay ? <p className="mt-3 text-sm text-emerald-300/80">已关联 Relay · {row.approvedRelay.name}</p> : null}
                {row.reviewNotes ? <p className="mt-2 text-sm text-white/55">审核备注：{row.reviewNotes}</p> : null}
                {row.probeCredential ? (
                  <p className="mt-2 text-sm text-white/55">
                    测试快照 · {row.probeCredential.testModel} · {formatHealthStatus(row.probeCredential.lastHealthStatus)}
                    {row.probeCredential.lastVerifiedAt ? ` · ${formatDateTime(row.probeCredential.lastVerifiedAt)}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.status === "approved" ? <Link className="pill pill-idle" to="/relays">打开 Relay 列表</Link> : null}
                {row.approvedRelay ? (
                  <a className="pill pill-ghost" href={`${PUBLIC_SITE_URL}/relay/${row.approvedRelay.slug}`} rel="noreferrer" target="_blank">
                    打开前台页面
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

