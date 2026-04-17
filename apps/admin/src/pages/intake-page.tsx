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

export function IntakePage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => fetchJson("/admin/submissions"), []);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mutation, setMutation] = useMutationState();

  async function review(id: string, status: "approved" | "rejected" | "archived") {
    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/submissions/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reviewNotes: notes[id] ?? null }),
      });
      setMutation({
        pending: false,
        error: null,
        success:
          status === "approved"
            ? "提交已通过，记录已进入提交历史，同时 Relay 已进入当前列表。"
            : `提交已标记为${formatSubmissionStatus(status)}，并移入提交历史。`,
      });
      await submissions.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法处理提交记录。", success: null });
    }
  }

  if (submissions.loading) return <LoadingCard />;
  if (submissions.error || !submissions.data) {
    return <ErrorCard message={submissions.error ?? "无法加载提交记录。"} />;
  }

  const pendingRows = submissions.data.rows.filter((row) => row.status === "pending");
  const needsAttention = pendingRows.filter((row) => row.probeCredential?.lastProbeOk === false).length;

  return (
    <Card title="提交记录" kicker="当前待审核">
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white/68">
          这里只保留当前待处理的提交。审批通过后会直接进入 Relay 列表；未通过的提交会进入提交历史，不再停留在当前队列。
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">待审核</p>
            <p className="mt-2 text-3xl tracking-[-0.04em]">{pendingRows.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">需关注</p>
            <p className="mt-2 text-3xl tracking-[-0.04em]">{needsAttention}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">当前队列</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">等待审批的提交</p>
            </div>
            <p className="text-sm text-white/48">共 {pendingRows.length} 条</p>
          </div>

          {pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前没有待审核提交。
            </div>
          ) : pendingRows.map((row) => (
            <div key={row.id} className="admin-list-card border border-white/10 bg-white/5 p-3.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xl tracking-[-0.03em]">{row.relayName}</p>
                  <p className="mt-1 text-sm text-white/60 break-all">{row.baseUrl}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/40">{formatDateTime(row.createdAt)}</p>
                  {row.websiteUrl ? (
                    <a className="mt-2 inline-flex text-sm underline underline-offset-4 text-white/78" href={row.websiteUrl} rel="noreferrer" target="_blank">
                      打开站点首页
                    </a>
                  ) : null}
                  {row.contactInfo ? <p className="mt-2 text-sm text-white/58">联系方式：{row.contactInfo}</p> : null}
                  {row.description ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">站点简介</p>
                      <p className="mt-2 text-sm leading-6 text-white/72">{row.description}</p>
                    </div>
                  ) : null}
                  {row.modelPrices.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">支持模型及价格表</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {row.modelPrices.map((priceRow) => (
                          <span key={`${row.id}-${priceRow.modelKey}`} className="pill pill-ghost">
                            {priceRow.modelKey} · {priceRow.inputPricePer1M ?? "-"} / {priceRow.outputPricePer1M ?? "-"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {row.probeCredential ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white/65">
                      <p>测试 Key · {row.probeCredential.apiKeyPreview} · {formatCredentialStatus(row.probeCredential.status)}</p>
                      <p className="mt-1">
                        初始测试 · {row.probeCredential.testModel} · {formatHealthStatus(row.probeCredential.lastHealthStatus)}
                        {row.probeCredential.lastHttpStatus ? ` · ${row.probeCredential.lastHttpStatus}` : ""}
                        {row.probeCredential.lastVerifiedAt ? ` · ${formatDateTime(row.probeCredential.lastVerifiedAt)}` : ""}
                      </p>
                      {row.probeCredential.lastMessage ? <p className="mt-1 text-white/48">{row.probeCredential.lastMessage}</p> : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="pill pill-active" type="button" onClick={() => review(row.id, "approved")}>批准</button>
                  <button className="pill pill-idle" type="button" onClick={() => review(row.id, "rejected")}>拒绝</button>
                  <button className="pill pill-ghost" type="button" onClick={() => review(row.id, "archived")}>归档</button>
                </div>
              </div>
              <textarea className="field-input mt-3 min-h-24" placeholder="审核备注" value={notes[row.id] ?? row.reviewNotes ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4"><Notice state={mutation} /></div>
    </Card>
  );
}

