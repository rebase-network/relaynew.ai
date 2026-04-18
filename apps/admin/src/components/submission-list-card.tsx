import * as Shared from "../shared";
import { StatusBadge } from "./status-badge";

type SubmissionRow = Shared.AdminSubmissionsResponse["rows"][number];

export function SubmissionListCard({
  row,
  variant,
  selected = false,
  onSelect,
}: {
  row: SubmissionRow;
  variant: "pending" | "history";
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={Shared.clsx(
        "admin-list-card cursor-pointer border bg-white/5 p-3",
        selected ? "border-[#ffd06a]/45 bg-white/[0.07]" : "border-white/10",
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
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.9fr)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg tracking-[-0.03em]">{row.relayName}</p>
            <StatusBadge tone={Shared.statusToneForSubmissionStatus(variant === "pending" ? "pending" : row.status)}>
              {variant === "pending" ? "待审核" : Shared.formatSubmissionStatus(row.status)}
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">提交于 {Shared.formatDateTime(row.createdAt)}</p>
          <p className="mt-1.5 truncate text-sm text-white/62">{row.baseUrl}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/58">
            <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">模型 {row.modelPrices.length}</span>
            {variant === "pending" ? (
              <>
                {row.contactInfo ? <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">已填联系方式</span> : null}
                {row.websiteUrl ? <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">已填网站</span> : null}
              </>
            ) : row.approvedRelay ? (
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">已关联 Relay</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{variant === "pending" ? "初始测试" : "处理概览"}</p>
          {variant === "pending" ? (
            row.probeCredential ? (
              <>
                <p className="mt-1.5 text-sm text-white/72">{Shared.formatHealthStatus(row.probeCredential.lastHealthStatus)}</p>
                <p className="mt-1 truncate text-xs text-white/54">{row.probeCredential.testModel}</p>
                <p className="mt-1 text-xs text-white/42">
                  {row.probeCredential.lastVerifiedAt ? Shared.formatDateTime(row.probeCredential.lastVerifiedAt) : "尚未完成验证"}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-white/54">等待测试快照</p>
            )
          ) : (
            <>
              <p className="mt-1.5 text-sm text-white/72">{Shared.formatSubmissionStatus(row.status)}</p>
              <p className="mt-1 line-clamp-2 text-xs text-white/54">{row.reviewNotes ?? "未填写审批备注"}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
