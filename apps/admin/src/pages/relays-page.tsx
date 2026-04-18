import * as Shared from "../shared";
import { AdminDrawer } from "../components/admin-drawer";
import { RelayEditorForm } from "../components/relay-editor-form";
import { RelayInspectorDrawer } from "../components/relay-inspector-drawer";
import { RelayListCard } from "../components/relay-list-card";
import { useRelayFormController } from "../hooks/use-relay-form-controller";

const {
  Card,
  ConfirmDialog,
  ErrorCard,
  LoadingCard,
  buildRelayFormState,
  fetchJson,
  useEffect,
  useLoadable,
  useMutationState,
  useState,
  validateRelayForm,
} = Shared;

export function RelaysPage() {
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRelayId, setSelectedRelayId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"detail" | "edit">("detail");
  const [archiveTarget, setArchiveTarget] = useState<Shared.AdminRelaysResponse["rows"][number] | null>(null);
  const [actionMutation, setActionMutation] = useMutationState();
  const [createMutation, setCreateMutation] = useMutationState();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [highlightedRelayId, setHighlightedRelayId] = useState<string | null>(null);
  const createController = useRelayFormController(null, () => setCreateMutation((current) => ({ ...current, error: null })));

  const currentRelays = (relays.data?.rows ?? []).filter((relay) => relay.catalogStatus === "active" || relay.catalogStatus === "paused");
  const selectedRelay = currentRelays.find((relay) => relay.id === selectedRelayId) ?? null;
  const activeCount = currentRelays.filter((relay) => relay.catalogStatus === "active").length;
  const pausedCount = currentRelays.filter((relay) => relay.catalogStatus === "paused").length;
  const filteredRelays = currentRelays.filter((relay) => statusFilter === "all" || relay.catalogStatus === statusFilter);

  useEffect(() => {
    if (!selectedRelayId || relays.loading) {
      return;
    }

    if (!selectedRelay) {
      setSelectedRelayId(null);
    }
  }, [relays.loading, selectedRelay, selectedRelayId]);

  function resetCreateForm() {
    createController.loadRelay(null);
    setCreateMutation({ pending: false, error: null, success: null });
  }

  function openCreateDrawer() {
    resetCreateForm();
    setCreateOpen(true);
  }

  function closeCreateDrawer() {
    setCreateOpen(false);
    resetCreateForm();
  }

  function openRelayDrawer(relayId: string, mode: "detail" | "edit") {
    setSelectedRelayId(relayId);
    setSelectedMode(mode);
  }

  function closeRelayDrawer() {
    setSelectedRelayId(null);
    setSelectedMode("detail");
  }

  async function createRelay() {
    const { errors, payload } = validateRelayForm(createController.form, { editing: false });
    createController.setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCreateMutation({ pending: false, error: "请先修正高亮字段，再创建 Relay。", success: null });
      return;
    }

    setCreateMutation({ pending: true, error: null, success: null });
    try {
      const response = await fetchJson<{ ok: true; id: string }>("/admin/relays", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatusFilter("all");
      setHighlightedRelayId(response.id);
      await relays.reload();
      closeCreateDrawer();
      setActionMutation({ pending: false, error: null, success: "Relay 已创建并加入当前列表。" });
    } catch (reason) {
      setCreateMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法创建 Relay。", success: null });
    }
  }

  async function updateRelayStatus(relay: Shared.AdminRelaysResponse["rows"][number], status: Shared.RelayFormState["catalogStatus"]) {
    const nextForm = buildRelayFormState(relay);
    nextForm.catalogStatus = status;
    const { payload } = validateRelayForm(nextForm, { editing: true });

    setActionMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setArchiveTarget(null);
      await relays.reload();
      setActionMutation({
        pending: false,
        error: null,
        success:
          status === "archived"
            ? `${relay.name} 已归档到 Relay 历史。`
            : status === "paused"
              ? `${relay.name} 已暂停。`
              : `${relay.name} 已重新激活。`,
      });
    } catch (reason) {
      setArchiveTarget(null);
      setActionMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法更新 Relay 状态。", success: null });
    }
  }

  if (relays.loading) {
    return <LoadingCard />;
  }

  if (relays.error || !relays.data) {
    return <ErrorCard message={relays.error ?? "无法加载 Relay 列表。"} />;
  }

  return (
    <>
      <Card title="Relay 列表">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs text-white/68">共 {currentRelays.length} 条</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">启用中 {activeCount}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">已暂停 {pausedCount}</span>
            {statusFilter !== "all" ? (
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] text-white/55">
                当前显示 {filteredRelays.length} / {currentRelays.length}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/52">
              <span>状态</span>
              <select
                className="field-input field-input-compact w-[8rem]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "paused")}
              >
                <option value="all">全部</option>
                <option value="active">启用中</option>
                <option value="paused">已暂停</option>
                </select>
            </label>
            <button className="pill pill-active" type="button" onClick={openCreateDrawer}>
              手动添加 Relay
            </button>
          </div>
        </div>

        <div className="mt-2.5 space-y-2">
          {currentRelays.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有 Relay。你可以先手动添加 Relay，或去提交记录中批准一个待审核站点。
            </div>
          ) : filteredRelays.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-white/56">
              当前筛选条件下没有匹配的 Relay。
            </div>
          ) : filteredRelays.map((relay) => (
            <RelayListCard
              key={relay.id}
              actionPending={actionMutation.pending}
              highlighted={relay.id === highlightedRelayId}
              onArchive={() => setArchiveTarget(relay)}
              onEdit={() => openRelayDrawer(relay.id, "edit")}
              onSelect={() => openRelayDrawer(relay.id, "detail")}
              onToggleStatus={() => void updateRelayStatus(relay, relay.catalogStatus === "active" ? "paused" : "active")}
              selected={relay.id === selectedRelayId}
              variant="catalog"
              relay={relay}
            />
          ))}
        </div>

        <div className="mt-3">
          <Shared.Notice state={actionMutation} />
        </div>
      </Card>

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
        pending={actionMutation.pending}
        title={archiveTarget ? `确认归档 ${archiveTarget.name}？` : ""}
      />

      <AdminDrawer open={createOpen} title="手动添加 Relay" onClose={closeCreateDrawer}>
        <RelayEditorForm
          mode="create"
          form={createController.form}
          fieldErrors={createController.fieldErrors}
          mutation={createMutation}
          submitLabel="创建 Relay"
          submittingLabel="创建中..."
          resetLabel="清空表单"
          onSubmit={() => void createRelay()}
          onReset={resetCreateForm}
          onUpdateForm={createController.updateForm}
          onUpdatePriceRow={createController.updatePriceRow}
          onAddPriceRow={createController.addPriceRow}
          onRemovePriceRow={createController.removePriceRow}
        />
      </AdminDrawer>

      <RelayInspectorDrawer open={Boolean(selectedRelay)} relay={selectedRelay} initialMode={selectedMode} onClose={closeRelayDrawer} onReload={relays.reload} />
    </>
  );
}
