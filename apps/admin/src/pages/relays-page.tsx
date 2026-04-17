import * as Shared from "../shared";
import { WorkflowDetailGrid, WorkflowMetricCard, WorkflowPriceTable, WorkflowSection } from "../components/relay-workflow";

const {
  Card,
  ConfirmDialog,
  ErrorCard,
  FieldError,
  LoadingCard,
  Notice,
  PROBE_COMPATIBILITY_OPTIONS,
  PUBLIC_SITE_URL,
  buildRelayFormState,
  createRelayPriceRowFormState,
  fetchJson,
  formatCatalogStatus,
  formatCredentialStatus,
  formatDateTime,
  formatHealthStatus,
  useLoadable,
  useMutationState,
  useState,
  validateRelayForm,
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
  const activeCount = currentRelays.filter((relay) => relay.catalogStatus === "active").length;
  const pausedCount = currentRelays.filter((relay) => relay.catalogStatus === "paused").length;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(21rem,0.82fr)]">
      <Card title="Relay 列表" kicker="当前运营中的站点">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
          审核通过后的 Relay 会直接进入这里。只有 <span className="text-white/82">active</span> 状态的 Relay 才参与自动测试、目录展示和榜单排行；
          <span className="text-white/82">paused</span> 会保留资料并停止公开展示，方便运营稍后恢复。
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <WorkflowMetricCard label="当前 Relay" value={currentRelays.length} helper="只统计 active 与 paused 状态。" />
          <WorkflowMetricCard label="激活中" value={activeCount} helper="会持续参与自动测试与前台展示。" />
          <WorkflowMetricCard label="已暂停" value={pausedCount} helper="不参与测试与公开目录，但可随时重新激活。" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">当前 Relay</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">面向运营的站点清单</p>
            </div>
            <p className="text-sm text-white/48">共 {currentRelays.length} 条</p>
          </div>

          {currentRelays.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有 Relay。你可以先通过右侧表单手动新增，或去提交记录中批准一个待审核站点。
            </div>
          ) : currentRelays.map((relay) => (
            <div key={relay.id} className="admin-list-card border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl tracking-[-0.03em]">{relay.name}</p>
                      <span className={relay.catalogStatus === "active" ? "pill pill-active !cursor-default" : "pill pill-idle !cursor-default"}>
                        {formatCatalogStatus(relay.catalogStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{relay.slug}</p>
                    <p className="mt-3 text-sm break-all text-white/64">{relay.baseUrl}</p>
                  </div>
                  <p className="text-sm text-white/42">{editingId === relay.id ? "当前正在编辑" : "可随时打开编辑器查看完整资料"}</p>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(18rem,0.96fr)]">
                  <div className="space-y-3">
                    <WorkflowSection title="站点资料" description="用于目录展示与运营复核的基础信息。">
                      {relay.description ? <p className="text-sm leading-6 text-white/72">{relay.description}</p> : <p className="text-sm text-white/48">暂未填写站点简介。</p>}
                      <div className="mt-3">
                        <WorkflowDetailGrid
                          items={[
                            {
                              label: "站点网站",
                              value: relay.websiteUrl ? (
                                <a className="underline underline-offset-4 text-white/82" href={relay.websiteUrl} rel="noreferrer" target="_blank">
                                  {relay.websiteUrl}
                                </a>
                              ) : "未填写",
                            },
                            { label: "联系方式", value: relay.contactInfo ?? "未填写" },
                          ]}
                        />
                      </div>
                    </WorkflowSection>

                    <WorkflowSection title="支持模型及价格表" description="默认展示前几项，进入编辑器可查看或修改完整列表。">
                      <WorkflowPriceTable rows={relay.modelPrices} maxRows={6} />
                    </WorkflowSection>
                  </div>

                  <div className="space-y-3">
                    <WorkflowSection title="测试状态" description="只有存在可用测试 Key 的 active Relay 才会持续参与自动测试。">
                      {relay.probeCredential ? (
                        <WorkflowDetailGrid
                          columns={1}
                          items={[
                            {
                              label: "测试凭据",
                              value: `${relay.probeCredential.apiKeyPreview} · ${formatCredentialStatus(relay.probeCredential.status)}`,
                            },
                            {
                              label: "测试模型",
                              value: `${relay.probeCredential.testModel} · ${formatHealthStatus(relay.probeCredential.lastHealthStatus)}`,
                            },
                            {
                              label: "最近验证",
                              value: relay.probeCredential.lastVerifiedAt
                                ? `${formatDateTime(relay.probeCredential.lastVerifiedAt)}${relay.probeCredential.lastHttpStatus ? ` · ${relay.probeCredential.lastHttpStatus}` : ""}`
                                : "尚未完成验证",
                            },
                          ]}
                        />
                      ) : (
                        <div className="rounded-2xl border border-[#ffd06a]/24 bg-[#ffd06a]/8 px-3 py-3 text-sm leading-6 text-[#ffd892]">
                          当前没有可用的测试 Key，Relay 无法参与自动测试。补充测试API Key 后再切回 active 更合适。
                        </div>
                      )}
                    </WorkflowSection>

                    <WorkflowSection title="公开状态" description="帮助运营快速理解当前 Relay 会不会出现在前台。">
                      <WorkflowDetailGrid
                        columns={1}
                        items={[
                          {
                            label: "当前状态说明",
                            value:
                              relay.catalogStatus === "active"
                                ? "会参与自动测试，并进入目录与排行榜。"
                                : "暂停状态不会参与自动测试，也不会出现在目录与排行榜中。",
                          },
                          {
                            label: "前台详情页",
                            value: (
                              <a className="underline underline-offset-4 text-white/82" href={`${PUBLIC_SITE_URL}/relay/${relay.slug}`} rel="noreferrer" target="_blank">
                                打开 relay/{relay.slug}
                              </a>
                            ),
                          },
                        ]}
                      />
                    </WorkflowSection>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
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
          message={archiveTarget ? `${archiveTarget.name} 将移出当前 Relay 列表，只保留在 Relay 历史中。` : ""}
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

      <div className="xl:sticky xl:top-6 xl:self-start">
        <Card title={editingId ? "编辑 Relay" : "手动新增 Relay"} kicker="Relay 编辑器">
          {editingId ? (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
              如不填写新的测试API Key，则保留当前已绑定的 Key；如果填写新的 Key，会直接替换为新的测试凭据。
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
              管理员可以直接手动创建 Relay。创建后会立即进入当前 Relay 列表，并按状态决定是否参与测试与前台展示。
            </div>
          )}

          <div className="grid gap-3">
            <WorkflowSection title="站点资料" description="这些信息会直接影响目录展示、运营判断与后续编辑。">
              <div className="grid gap-3 md:grid-cols-2">
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
              </div>
              <label className="field-label mt-3 block">
                站点简介
                <textarea className="field-input min-h-28" placeholder="请介绍站点适合的场景、主要模型、价格策略和服务特点。" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
                <FieldError message={fieldErrors.description} />
              </label>
            </WorkflowSection>

            <WorkflowSection title="运营设置" description="控制 Relay 是否参与自动测试、目录展示和排行榜。">
              <label className="field-label">
                Relay 状态
                <select className="field-input" value={form.catalogStatus} onChange={(event) => updateForm("catalogStatus", event.target.value as Shared.RelayFormState["catalogStatus"])}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="archived">archived</option>
                </select>
              </label>
            </WorkflowSection>

            <WorkflowSection
              title="支持模型及价格表"
              description="每行包含 模型 / Input价格 / Output价格，建议按站点对外公开信息填写。"
              actions={<button className="pill pill-idle" type="button" onClick={addPriceRow}>添加一行</button>}
            >
              <div className="space-y-2.5">
                {form.modelPrices.map((row, index) => (
                  <div key={row.id} className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.78fr))_auto]">
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
            </WorkflowSection>

            <WorkflowSection title="测试信息" description="只有 active Relay 且存在可用测试 Key 时，系统才会继续自动测试。">
              <label className="field-label">
                测试API Key
                <input className="field-input" type="password" placeholder={editingId ? "留空则保持当前 Key 不变" : "sk-monitoring-or-relay-key"} value={form.testApiKey} onChange={(event) => updateForm("testApiKey", event.target.value)} />
                <FieldError message={fieldErrors.testApiKey} />
              </label>
              <label className="field-label mt-3 block">
                兼容模式
                <select className="field-input" value={form.compatibilityMode} onChange={(event) => updateForm("compatibilityMode", event.target.value as Shared.ProbeCompatibilityMode)}>
                  {PROBE_COMPATIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </WorkflowSection>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex flex-wrap gap-2.5">
                <button className="pill pill-active" disabled={mutation.pending} onClick={submitRelay} type="button">
                  {mutation.pending ? "保存中..." : editingId ? "保存修改" : "创建 Relay"}
                </button>
                {(editingId || form.name || form.baseUrl || form.contactInfo || form.description || form.websiteUrl || form.testApiKey) ? (
                  <button className="pill pill-idle" type="button" onClick={resetForm}>清空表单</button>
                ) : null}
              </div>
              <div className="mt-3">
                <Notice state={mutation} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
