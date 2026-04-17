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

export function RelaysPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Shared.AdminRelaysResponse["rows"][number] | null>(null);
  const [form, setForm] = useState<Shared.RelayFormState>(() => buildRelayFormState());
  const [fieldErrors, setFieldErrors] = useState<Shared.RelayFormErrors>({});
  const [mutation, setMutation] = useMutationState();
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), []);

  function beginEditingRelay(relay: Shared.AdminRelaysResponse["rows"][number]) {
    setEditingId(relay.id);
    setForm(buildRelayFormState(relay));
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
    setArchiveTarget(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(buildRelayFormState());
    setFieldErrors({});
    setArchiveTarget(null);
  }

  function updateForm<Key extends keyof Shared.RelayFormState>(key: Key, value: Shared.RelayFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setMutation((current) => ({ ...current, error: null }));
  }

  function updatePriceRow(rowId: string, key: keyof Shared.RelayPriceRowFormState, value: string) {
    setForm((current) => ({
      ...current,
      modelPrices: current.modelPrices.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
    setMutation((current) => ({ ...current, error: null }));
  }

  function addPriceRow() {
    setForm((current) => ({
      ...current,
      modelPrices: [...current.modelPrices, createRelayPriceRowFormState(current.modelPrices.length)],
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
  }

  function removePriceRow(rowId: string) {
    setForm((current) => ({
      ...current,
      modelPrices:
        current.modelPrices.length > 1
          ? current.modelPrices.filter((row) => row.id !== rowId)
          : [createRelayPriceRowFormState()],
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
  }

  async function updateRelayStatus(relay: Shared.AdminRelaysResponse["rows"][number], status: Shared.RelayFormState["catalogStatus"]) {
    const nextForm = buildRelayFormState(relay);
    nextForm.catalogStatus = status;
    const { payload } = validateRelayForm(nextForm, { editing: true });

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setArchiveTarget(null);
      setMutation({
        pending: false,
        error: null,
        success:
          status === "archived"
            ? `${relay.name} 已归档到 Relay 历史。`
            : status === "paused"
              ? `${relay.name} 已暂停，后续不会参与自动测试和公开展示。`
              : `${relay.name} 已重新激活。`,
      });
      await relays.reload();
      if (editingId === relay.id && status === "archived") {
        resetForm();
      }
    } catch (reason) {
      setArchiveTarget(null);
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : "无法更新 Relay 状态。",
        success: null,
      });
    }
  }

  async function submitRelay() {
    const { errors, payload } = validateRelayForm(form, { editing: Boolean(editingId) });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMutation({ pending: false, error: "请先修正高亮字段，再保存 Relay。", success: null });
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      const path = editingId ? `/admin/relays/${editingId}` : "/admin/relays";
      await fetchJson(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMutation({
        pending: false,
        error: null,
        success: editingId ? "Relay 已更新。" : "Relay 已创建并加入当前列表。",
      });
      resetForm();
      await relays.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法保存 Relay。", success: null });
    }
  }

  if (relays.loading) return <LoadingCard />;
  if (relays.error || !relays.data) {
    return <ErrorCard message={relays.error ?? "无法加载 Relay 列表。"} />;
  }

  const currentRelays = relays.data.rows.filter((relay) => relay.catalogStatus === "active" || relay.catalogStatus === "paused");

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card title="Relay 列表" kicker="当前运营中的站点">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
          审核通过后的 Relay 会直接进入这里。只有 <span className="text-white/82">active</span> 状态的 Relay 才参与自动测试、目录展示和榜单排行；
          <span className="text-white/82">paused</span> 可继续编辑并随时重新激活。
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">当前 Relay</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">active / paused</p>
            </div>
            <p className="text-sm text-white/48">共 {currentRelays.length} 条</p>
          </div>
          {currentRelays.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有 Relay。你可以先通过右侧表单手动新增，或去提交记录中批准一个待审核站点。
            </div>
          ) : currentRelays.map((relay) => (
            <div key={relay.id} className="admin-list-card border border-white/10 bg-white/5 p-3.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xl tracking-[-0.03em]">{relay.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{relay.slug} · {formatCatalogStatus(relay.catalogStatus)}</p>
                  <p className="mt-2 text-sm text-white/60 break-all">{relay.baseUrl}</p>
                  {relay.description ? <p className="mt-3 text-sm leading-6 text-white/68">{relay.description}</p> : null}
                  {relay.contactInfo ? (
                    <p className="mt-2 text-sm text-white/58">联系方式：{relay.contactInfo}</p>
                  ) : null}
                  {relay.websiteUrl ? (
                    <a className="mt-3 inline-flex text-sm underline underline-offset-4 text-white/78" href={relay.websiteUrl} rel="noreferrer" target="_blank">
                      打开站点首页
                    </a>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relay.modelPrices.slice(0, 4).map((row) => (
                      <span key={`${relay.id}-${row.modelKey}`} className="pill pill-ghost">
                        {row.modelName} · {row.inputPricePer1M ?? "-"} / {row.outputPricePer1M ?? "-"}
                      </span>
                    ))}
                    {relay.modelPrices.length > 4 ? <span className="pill pill-ghost">+{relay.modelPrices.length - 4}</span> : null}
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white/62">
                    {relay.probeCredential ? (
                      <>
                        <p>测试 Key · {relay.probeCredential.apiKeyPreview} · {formatCredentialStatus(relay.probeCredential.status)}</p>
                        <p className="mt-1">
                          测试模型 · {relay.probeCredential.testModel} · {formatHealthStatus(relay.probeCredential.lastHealthStatus)}
                          {relay.probeCredential.lastHttpStatus ? ` · ${relay.probeCredential.lastHttpStatus}` : ""}
                          {relay.probeCredential.lastVerifiedAt ? ` · ${formatDateTime(relay.probeCredential.lastVerifiedAt)}` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-[#ffd06a]">当前没有可用的测试 Key，Relay 无法参与自动测试。</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="pill pill-active" onClick={() => beginEditingRelay(relay)} type="button">
                    编辑 Relay
                  </button>
                  {relay.catalogStatus === "active" ? (
                    <button className="pill pill-idle" disabled={mutation.pending} onClick={() => void updateRelayStatus(relay, "paused")} type="button">
                      暂停
                    </button>
                  ) : (
                    <button className="pill pill-idle" disabled={mutation.pending} onClick={() => void updateRelayStatus(relay, "active")} type="button">
                      重新激活
                    </button>
                  )}
                  <a className="pill pill-ghost" href={`${PUBLIC_SITE_URL}/relay/${relay.slug}`} rel="noreferrer" target="_blank">
                    前台详情页
                  </a>
                  <button className="pill pill-ghost" disabled={mutation.pending} onClick={() => setArchiveTarget(relay)} type="button">
                    归档
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ConfirmDialog
          confirmLabel="归档 Relay"
          confirmPendingLabel="归档中..."
          message={
            archiveTarget
              ? `${archiveTarget.name} 将移出当前 Relay 列表，只保留在 Relay 历史中。`
              : ""
          }
          onCancel={() => setArchiveTarget(null)}
          onConfirm={() => {
            if (archiveTarget) {
              void updateRelayStatus(archiveTarget, "archived");
            }
          }}
          open={Boolean(archiveTarget)}
          pending={mutation.pending}
          title={archiveTarget ? `确认归档 ${archiveTarget.name}？` : ""}
        />
      </Card>
      <Card title={editingId ? "编辑 Relay" : "手动新增 Relay"} kicker="Relay 编辑器">
        {editingId ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
            如不填写新的测试API Key，则保留当前已绑定的 Key；如果填写新的 Key，会直接替换为新的测试凭据。
          </div>
        ) : null}
        <div className="grid gap-2.5">
          <label className="field-label">
            站点名字
            <input className="field-input" placeholder="北风中转站" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            <FieldError message={fieldErrors.name} />
          </label>
          <label className="field-label">
            Base URL
            <input className="field-input" placeholder="https://northwind.example.ai/v1" value={form.baseUrl} onChange={(event) => updateForm("baseUrl", event.target.value)} />
            <FieldError message={fieldErrors.baseUrl} />
          </label>
          <label className="field-label">
            站点网站
            <input className="field-input" placeholder="https://northwind.example.ai" value={form.websiteUrl} onChange={(event) => updateForm("websiteUrl", event.target.value)} />
            <FieldError message={fieldErrors.websiteUrl} />
          </label>
          <label className="field-label">
            联系方式
            <input className="field-input" placeholder="Telegram / 邮箱 / 微信" value={form.contactInfo} onChange={(event) => updateForm("contactInfo", event.target.value)} />
            <FieldError message={fieldErrors.contactInfo} />
          </label>
          <label className="field-label">
            站点简介
            <textarea className="field-input min-h-28" placeholder="请介绍站点适合的场景、主要模型、价格策略和服务特点。" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
            <FieldError message={fieldErrors.description} />
          </label>
          <label className="field-label">
            Relay 状态
            <select className="field-input" value={form.catalogStatus} onChange={(event) => updateForm("catalogStatus", event.target.value as Shared.RelayFormState["catalogStatus"])}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">支持模型及价格表</p>
                <p className="mt-1 text-sm text-white/62">每行包含 模型 / Input价格 / Output价格。</p>
              </div>
              <button className="pill pill-idle" type="button" onClick={addPriceRow}>添加一行</button>
            </div>
            <div className="mt-3 space-y-2.5">
              {form.modelPrices.map((row, index) => (
                <div key={row.id} className="grid gap-2.5 rounded-2xl border border-white/10 bg-black/10 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                  <label className="field-label">
                    模型
                    <input className="field-input" placeholder="openai-gpt-5.4" value={row.modelKey} onChange={(event) => updatePriceRow(row.id, "modelKey", event.target.value)} />
                  </label>
                  <label className="field-label">
                    Input价格
                    <input className="field-input" type="number" min="0" step="0.0001" placeholder="4.6" value={row.inputPricePer1M} onChange={(event) => updatePriceRow(row.id, "inputPricePer1M", event.target.value)} />
                  </label>
                  <label className="field-label">
                    Output价格
                    <input className="field-input" type="number" min="0" step="0.0001" placeholder="13.2" value={row.outputPricePer1M} onChange={(event) => updatePriceRow(row.id, "outputPricePer1M", event.target.value)} />
                  </label>
                  <div className="flex items-end justify-end">
                    <button className="pill pill-ghost" type="button" onClick={() => removePriceRow(row.id)}>
                      {form.modelPrices.length === 1 && index === 0 ? "清空" : "删除"}
                    </button>
                  </div>
                </div>
              ))}
              <FieldError message={fieldErrors.modelPrices} />
            </div>
          </div>
          <label className="field-label">
            测试API Key
            <input className="field-input" type="password" placeholder={editingId ? "留空则保持当前 Key 不变" : "sk-monitoring-or-relay-key"} value={form.testApiKey} onChange={(event) => updateForm("testApiKey", event.target.value)} />
            <FieldError message={fieldErrors.testApiKey} />
          </label>
          <label className="field-label">
            兼容模式
            <select className="field-input" value={form.compatibilityMode} onChange={(event) => updateForm("compatibilityMode", event.target.value as Shared.ProbeCompatibilityMode)}>
              {PROBE_COMPATIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button className="pill pill-active" disabled={mutation.pending} onClick={submitRelay} type="button">
              {mutation.pending ? "保存中..." : editingId ? "保存修改" : "创建 Relay"}
            </button>
            {(editingId || form.name || form.baseUrl || form.contactInfo || form.description) ? (
              <button className="pill pill-idle" type="button" onClick={resetForm}>清空表单</button>
            ) : null}
          </div>
          <Notice state={mutation} />
        </div>
      </Card>
    </div>
  );
}

