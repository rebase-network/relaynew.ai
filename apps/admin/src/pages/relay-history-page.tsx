import * as Shared from "../shared";
import { InfoTip } from "../components/info-tip";
import { RelayInspectorDrawer } from "../components/relay-inspector-drawer";
import { RelayListCard } from "../components/relay-list-card";

const {
  Card,
  ErrorCard,
  LoadingCard,
  useEffect,
  useLoadable,
  useState,
} = Shared;

export function RelayHistoryPage() {
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => Shared.fetchJson("/admin/relays"), []);
  const [selectedRelayId, setSelectedRelayId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"detail" | "edit">("detail");

  const archivedRelays = (relays.data?.rows ?? []).filter((relay) => relay.catalogStatus === "archived");
  const selectedRelay = archivedRelays.find((relay) => relay.id === selectedRelayId) ?? null;

  useEffect(() => {
    if (!selectedRelayId || relays.loading) {
      return;
    }

    if (!selectedRelay) {
      setSelectedRelayId(null);
      setSelectedMode("detail");
    }
  }, [relays.loading, selectedRelay, selectedRelayId]);

  function openRelayDrawer(relayId: string, mode: "detail" | "edit") {
    setSelectedRelayId(relayId);
    setSelectedMode(mode);
  }

  function closeRelayDrawer() {
    setSelectedRelayId(null);
    setSelectedMode("detail");
  }

  if (relays.loading) return <LoadingCard />;
  if (relays.error || !relays.data) return <ErrorCard message={relays.error ?? "无法加载 Relay 历史。"} />;

  return (
    <>
      <Card title="Relay 历史">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-2.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
            共 {archivedRelays.length} 条
          </span>
          <div className="ml-auto">
            <InfoTip content="归档后的 Relay 不会参与自动测试，也不会出现在公开目录和榜单中" />
          </div>
        </div>

        <div className="mt-2.5 space-y-2.5">
          {archivedRelays.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前没有已归档的 Relay。
            </div>
          ) : archivedRelays.map((relay) => (
            <RelayListCard
              key={relay.id}
              onSelect={() => openRelayDrawer(relay.id, "detail")}
              selected={relay.id === selectedRelayId}
              variant="history"
              relay={relay}
            />
          ))}
        </div>
      </Card>

      <RelayInspectorDrawer open={Boolean(selectedRelay)} relay={selectedRelay} initialMode={selectedMode} onClose={closeRelayDrawer} onReload={relays.reload} />
    </>
  );
}
