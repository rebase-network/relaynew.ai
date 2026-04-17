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

export function SponsorsPage() {
  const sponsors = useLoadable<Shared.AdminSponsorsResponse>(() => fetchJson("/admin/sponsors"), []);
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sponsorDeleteTarget, setSponsorDeleteTarget] = useState<Shared.AdminSponsorsResponse["rows"][number] | null>(null);
  const [form, setForm] = useState<Shared.SponsorFormState>(createDefaultSponsorFormState);
  const [fieldErrors, setFieldErrors] = useState<Shared.SponsorFormErrors>({});
  const [mutation, setMutation] = useMutationState();
  const relayOptions = buildRelaySelectOptions(relays.data?.rows ?? [], form.relayId);

  function resetForm() {
    setEditingId(null);
    setBulkDeleteOpen(false);
    setSponsorDeleteTarget(null);
    setForm(createDefaultSponsorFormState());
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }

  function toggleSponsorSelection(id: string, checked: boolean) {
    setSelectedSponsorIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((value) => value !== id);
    });
  }

  function beginEditingSponsor(row: Shared.AdminSponsorsResponse["rows"][number]) {
    setEditingId(row.id);
    setSponsorDeleteTarget(null);
    setForm({
      relayId: row.relayId ?? "",
      name: row.name,
      placement: row.placement,
      status: row.status,
      startAt: row.startAt,
      endAt: row.endAt,
    });
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }

  async function submitSponsor() {
    const { errors, payload } = validateSponsorForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMutation({ pending: false, error: "请先修正高亮字段，再保存赞助位。", success: null });
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(editingId ? `/admin/sponsors/${editingId}` : "/admin/sponsors", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMutation({ pending: false, error: null, success: editingId ? "赞助位已更新。" : "赞助位已创建。" });
      setEditingId(null);
      setForm(createDefaultSponsorFormState());
      setFieldErrors({});
      await sponsors.reload();
    } catch (reason) {
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : editingId ? "无法更新赞助位。" : "无法创建赞助位。",
        success: null,
      });
    }
  }

  async function deleteSponsor(row: Shared.AdminSponsorsResponse["rows"][number]) {
    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson<{ ok: true }>(`/admin/sponsors/${row.id}`, {
        method: "DELETE",
      });
      setSponsorDeleteTarget(null);
      if (editingId === row.id) {
        setEditingId(null);
        setForm(createDefaultSponsorFormState());
        setFieldErrors({});
      }
      setMutation({ pending: false, error: null, success: "赞助位已删除。" });
      await sponsors.reload();
    } catch (reason) {
      setSponsorDeleteTarget(null);
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : "无法删除赞助位。",
        success: null,
      });
    }
  }

  async function bulkUpdateSponsorStatus(status: Shared.SponsorFormState["status"]) {
    const selectedRows = sponsors.data?.rows.filter((row) => selectedSponsorIds.includes(row.id)) ?? [];

    if (selectedRows.length === 0) {
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      for (const row of selectedRows) {
        await fetchJson(`/admin/sponsors/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            relayId: row.relayId,
            name: row.name,
            placement: row.placement,
            status,
            startAt: row.startAt,
            endAt: row.endAt,
          }),
        });
      }

      if (editingId && selectedSponsorIds.includes(editingId)) {
        setEditingId(null);
        setForm(createDefaultSponsorFormState());
        setFieldErrors({});
        setSponsorDeleteTarget(null);
      }

      setSelectedSponsorIds([]);
      setMutation({
        pending: false,
        error: null,
        success: `已批量更新 ${selectedRows.length} 条赞助位状态。`,
      });
      await sponsors.reload();
    } catch (reason) {
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : "无法批量更新赞助位状态。",
        success: null,
      });
    }
  }

  async function bulkDeleteSponsors() {
    const selectedRows = sponsors.data?.rows.filter((row) => selectedSponsorIds.includes(row.id)) ?? [];

    if (selectedRows.length === 0) {
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      for (const row of selectedRows) {
        await fetchJson<{ ok: true }>(`/admin/sponsors/${row.id}`, {
          method: "DELETE",
        });
      }

      if (editingId && selectedSponsorIds.includes(editingId)) {
        setEditingId(null);
        setForm(createDefaultSponsorFormState());
        setFieldErrors({});
      }

      setBulkDeleteOpen(false);
      setSelectedSponsorIds([]);
      setSponsorDeleteTarget(null);
      setMutation({
        pending: false,
        error: null,
        success: `已批量删除 ${selectedRows.length} 条赞助位。`,
      });
      await sponsors.reload();
    } catch (reason) {
      setBulkDeleteOpen(false);
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : "无法批量删除赞助位。",
        success: null,
      });
    }
  }

  if (sponsors.loading || relays.loading) return <LoadingCard />;
  if (sponsors.error || !sponsors.data || relays.error || !relays.data) return <ErrorCard message={sponsors.error ?? relays.error ?? "无法加载赞助位。"} />;

  const sponsorRows = sponsors.data.rows;
  const allSelected = sponsorRows.length > 0 && selectedSponsorIds.length === sponsorRows.length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card title="赞助位列表" kicker="投放时间窗口">
        <div className="space-y-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
            支持勾选多条记录后批量调整投放状态，适合活动结束、统一暂停或重新启用时集中处理。
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">批量操作</p>
              <p className="mt-1 text-sm text-white/62">
                已选择 {selectedSponsorIds.length} 条 / 共 {sponsorRows.length} 条
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-white/70">
                <input
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedSponsorIds(event.target.checked ? sponsorRows.map((row) => row.id) : [])
                  }
                  type="checkbox"
                />
                全选本页
              </label>
              <button
                className="pill pill-idle"
                disabled={mutation.pending || selectedSponsorIds.length === 0}
                onClick={() => {
                  void bulkUpdateSponsorStatus("active");
                }}
                type="button"
              >
                批量设为投放中
              </button>
              <button
                className="pill pill-idle"
                disabled={mutation.pending || selectedSponsorIds.length === 0}
                onClick={() => {
                  void bulkUpdateSponsorStatus("paused");
                }}
                type="button"
              >
                批量暂停
              </button>
              <button
                className="pill pill-idle"
                disabled={mutation.pending || selectedSponsorIds.length === 0}
                onClick={() => {
                  void bulkUpdateSponsorStatus("ended");
                }}
                type="button"
              >
                批量结束
              </button>
              <button
                className="pill pill-ghost"
                disabled={mutation.pending || selectedSponsorIds.length === 0}
                onClick={() => setBulkDeleteOpen(true)}
                type="button"
              >
                批量删除
              </button>
            </div>
          </div>
          {sponsorRows.map((row) => (
            <div
              key={row.id}
              className={clsx(
                "admin-list-card border p-3.5",
                row.id === editingId ? "border-[#ffd06a]/70 bg-white/10" : "border-white/10 bg-white/5",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <label className="inline-flex items-center gap-2 pt-1 text-sm text-white/70">
                  <input
                    aria-label={`选择赞助位 ${row.name}`}
                    checked={selectedSponsorIds.includes(row.id)}
                    onChange={(event) => toggleSponsorSelection(row.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span className="sr-only">{row.name}</span>
                </label>
                <div>
                  <p className="text-xl tracking-[-0.03em]">{row.name}</p>
                  <p className="mt-1 text-sm text-white/60">{row.placement}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">{formatSponsorStatus(row.status)}</p>
              </div>
              <p className="mt-2 text-sm text-white/60">{row.relay ? `${row.relay.name} · ` : "未绑定中转站 · "}{formatDate(row.startAt)} 至 {formatDate(row.endAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="pill pill-idle" onClick={() => beginEditingSponsor(row)} type="button">
                  编辑赞助位
                </button>
                <button className="pill pill-ghost" disabled={mutation.pending} onClick={() => setSponsorDeleteTarget(row)} type="button">
                  删除赞助位
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title={editingId ? "编辑赞助位" : "创建赞助位"} kicker={editingId ? "商务调整" : "商务操作"}>
        {editingId ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
            你正在编辑已有赞助位。保存后会刷新公开快照；如果只是想放弃本次修改，点击“取消编辑”即可恢复创建模式。
          </div>
        ) : null}
        <div className="grid gap-2.5">
          <label className="field-label">名称<input className="field-input" placeholder="首页焦点位" value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setFieldErrors((current) => withoutFieldError(current, "name")); setMutation((current) => ({ ...current, error: null })); }} /><FieldError message={fieldErrors.name} /></label>
          <label className="field-label">投放位标识<input className="field-input" placeholder="homepage-spotlight" value={form.placement} onChange={(event) => { setForm((current) => ({ ...current, placement: event.target.value })); setFieldErrors((current) => withoutFieldError(current, "placement")); setMutation((current) => ({ ...current, error: null })); }} /><FieldError message={fieldErrors.placement} /></label>
          <label className="field-label">关联中转站<select className="field-input" value={form.relayId} onChange={(event) => setForm((current) => ({ ...current, relayId: event.target.value }))}><option value="">不绑定中转站</option>{relayOptions.map((relay) => <option key={relay.id} value={relay.id}>{getRelayOptionLabel(relay)}</option>)}</select></label>
          <label className="field-label">状态<select className="field-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Shared.SponsorFormState["status"] }))}><option value="active">投放中</option><option value="draft">草稿</option><option value="paused">已暂停</option><option value="ended">已结束</option></select></label>
          <label className="field-label">开始时间<input className="field-input" placeholder="2026-04-16T00:00:00.000Z" value={form.startAt} onChange={(event) => { setForm((current) => ({ ...current, startAt: event.target.value })); setFieldErrors((current) => withoutFieldError(current, "startAt")); setMutation((current) => ({ ...current, error: null })); }} /><FieldError message={fieldErrors.startAt} /></label>
          <label className="field-label">结束时间<input className="field-input" placeholder="2026-05-16T00:00:00.000Z" value={form.endAt} onChange={(event) => { setForm((current) => ({ ...current, endAt: event.target.value })); setFieldErrors((current) => withoutFieldError(current, "endAt")); setMutation((current) => ({ ...current, error: null })); }} /><FieldError message={fieldErrors.endAt} /></label>
          <div className="flex flex-wrap gap-2.5">
            <button className="pill pill-active" disabled={mutation.pending} onClick={submitSponsor} type="button">{mutation.pending ? "保存中..." : editingId ? "保存修改" : "创建赞助位"}</button>
            {editingId ? <button className="pill pill-idle" type="button" onClick={resetForm}>取消编辑</button> : null}
          </div>
          <Notice state={mutation} />
        </div>
      </Card>
      <ConfirmDialog
        confirmLabel="删除赞助位"
        confirmPendingLabel="删除中..."
        message={
          sponsorDeleteTarget
            ? `${sponsorDeleteTarget.name} 将从赞助位列表中移除。只有在确认是误建或重复记录时才建议删除。`
            : ""
        }
        onCancel={() => setSponsorDeleteTarget(null)}
        onConfirm={() => {
          if (sponsorDeleteTarget) {
            void deleteSponsor(sponsorDeleteTarget);
          }
        }}
        open={Boolean(sponsorDeleteTarget)}
        pending={mutation.pending}
        title={sponsorDeleteTarget ? `确认删除 ${sponsorDeleteTarget.name}？` : ""}
      />
      <ConfirmDialog
        confirmLabel="批量删除"
        confirmPendingLabel="删除中..."
        message={
          selectedSponsorIds.length > 0
            ? `将删除当前勾选的 ${selectedSponsorIds.length} 条赞助位记录。只有在确认是误建、重复或应彻底移除时才建议使用批量删除。`
            : ""
        }
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          void bulkDeleteSponsors();
        }}
        open={bulkDeleteOpen}
        pending={mutation.pending}
        title="确认批量删除选中的赞助位？"
      />
    </div>
  );
}

