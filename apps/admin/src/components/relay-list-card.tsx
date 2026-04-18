import * as Shared from "../shared";
import { StatusBadge } from "./status-badge";

type RelayRow = Shared.AdminRelaysResponse["rows"][number];

export function RelayListCard({
  relay,
  variant,
  selected = false,
  highlighted = false,
  actionPending = false,
  onSelect,
  onEdit,
  onToggleStatus,
  onArchive,
}: {
  relay: RelayRow;
  variant: "catalog" | "history";
  selected?: boolean;
  highlighted?: boolean;
  actionPending?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onArchive?: () => void;
}) {
  const isCatalog = variant === "catalog";

  return (
    <div
      className={Shared.clsx(
        "admin-list-card cursor-pointer border bg-white/5 p-3",
        selected ? "border-[#ffd06a]/45 bg-white/[0.07]" : "border-white/10",
        highlighted && "shadow-[rgba(255,208,106,0.16)_0_0_0_1px]",
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={Shared.clsx("grid gap-3", isCatalog ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.88fr)_auto] xl:items-center" : "xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-center")}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg tracking-[-0.03em]">{relay.name}</p>
            <StatusBadge tone={Shared.statusToneForCatalogStatus(isCatalog ? relay.catalogStatus : "archived")}>
              {Shared.formatCatalogStatus(isCatalog ? relay.catalogStatus : "archived")}
            </StatusBadge>
            {highlighted ? <span className="pill pill-ghost !bg-[#ffd06a]/14 !text-[#ffe6a7]">刚创建</span> : null}
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{relay.slug}</p>
          <p className="mt-1.5 truncate text-sm text-white/62">{relay.baseUrl}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/58">
            <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">模型 {relay.modelPrices.length}</span>
            {isCatalog ? (
              <>
                {relay.contactInfo ? <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">{relay.contactInfo}</span> : null}
                {relay.websiteUrl ? <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">已填写网站</span> : null}
              </>
            ) : (
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">
                {relay.contactInfo ? "已填联系方式" : "未填联系方式"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{isCatalog ? "测试状态" : "归档信息"}</p>
          {isCatalog ? (
            relay.probeCredential ? (
              <>
                <p className="mt-1.5 text-sm text-white/72">
                  {Shared.formatCredentialStatus(relay.probeCredential.status)} · {Shared.formatHealthStatus(relay.probeCredential.lastHealthStatus)}
                </p>
                <p className="mt-1 truncate text-xs text-white/54">{relay.probeCredential.testModel}</p>
                <p className="mt-1 text-xs text-white/42">
                  {relay.probeCredential.lastVerifiedAt ? Shared.formatDateTime(relay.probeCredential.lastVerifiedAt) : "尚未完成验证"}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-[#ffd892]">没有可用测试 Key</p>
            )
          ) : (
            <>
              <p className="mt-1.5 text-sm text-white/72">最近更新 {Shared.formatDateTime(relay.updatedAt)}</p>
              <p className="mt-1 text-sm text-white/58">{relay.contactInfo ?? "未填写联系方式"}</p>
            </>
          )}
        </div>

        {isCatalog ? (
          <div className="flex flex-wrap gap-2 xl:flex-col xl:items-end">
            {onEdit ? (
              <button
                className="pill pill-active"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                type="button"
              >
                编辑
              </button>
            ) : null}
            {onToggleStatus ? (
              <button
                className="pill pill-idle"
                disabled={actionPending}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleStatus();
                }}
                type="button"
              >
                {relay.catalogStatus === "active" ? "暂停" : "重新激活"}
              </button>
            ) : null}
            {onArchive ? (
              <button
                className="pill pill-ghost"
                disabled={actionPending}
                onClick={(event) => {
                  event.stopPropagation();
                  onArchive();
                }}
                type="button"
              >
                归档
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
