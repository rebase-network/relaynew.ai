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

export function RelayHistoryPage() {
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), []);
  const [mutation, setMutation] = useMutationState();

  async function reactivate(relay: Shared.AdminRelaysResponse["rows"][number]) {
    const nextForm = buildRelayFormState(relay);
    nextForm.catalogStatus = "active";
    const { payload } = validateRelayForm(nextForm, { editing: true });

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMutation({ pending: false, error: null, success: `${relay.name} 已重新激活并回到当前 Relay 列表。` });
      await relays.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法重新激活 Relay。", success: null });
    }
  }

  if (relays.loading) return <LoadingCard />;
  if (relays.error || !relays.data) return <ErrorCard message={relays.error ?? "无法加载 Relay 历史。"} />;

  const archivedRelays = relays.data.rows.filter((relay) => relay.catalogStatus === "archived");

  return (
    <Card title="Relay 历史" kicker="已归档站点">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
        归档后的 Relay 不会参与自动测试，也不会出现在公开目录和榜单中。必要时可以在这里重新激活。
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">已归档 Relay</p>
            <p className="mt-1 text-lg tracking-[-0.03em]">历史记录</p>
          </div>
          <p className="text-sm text-white/48">共 {archivedRelays.length} 条</p>
        </div>
        {archivedRelays.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
            当前没有已归档的 Relay。
          </div>
        ) : archivedRelays.map((relay) => (
          <div key={relay.id} className="admin-list-card border border-white/10 bg-white/5 p-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xl tracking-[-0.03em]">{relay.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{relay.slug} · 已归档</p>
                <p className="mt-2 text-sm text-white/60 break-all">{relay.baseUrl}</p>
                {relay.description ? <p className="mt-3 text-sm leading-6 text-white/66">{relay.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="pill pill-ghost" to={`/relays/${relay.id}`}>
                  查看 / 编辑
                </Link>
                <button className="pill pill-active" disabled={mutation.pending} onClick={() => void reactivate(relay)} type="button">
                  重新激活
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4"><Notice state={mutation} /></div>
    </Card>
  );
}
