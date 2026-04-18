import * as Shared from "../../shared";

const {
  Panel,
  RelayModelsTable,
  formatPricePerMillion,
  formatSupportStatusLabel,
} = Shared;

export function RelayModelSupportSection({
  modelPricingRows,
  modelTableColumns,
  modelsLoading,
  modelsReady,
}: {
  modelPricingRows: Shared.RelayModelPricingRow[];
  modelTableColumns: Array<Array<Shared.RelayModelPricingRow | null>>;
  modelsLoading: boolean;
  modelsReady: boolean;
}) {
  return (
    <section className="grid gap-4">
      <Panel
        title="模型支持"
        kicker="当前价格"
        headerClassName="mb-3"
        titleClassName="text-[1.9rem] md:text-[2.1rem]"
      >
        {modelsLoading || !modelsReady ? <p className="text-sm text-black/60">正在加载模型...</p> : (
          modelPricingRows.length === 0 ? <p className="text-sm text-black/60">这个站点还没有公开模型信息。</p> : (
            <>
              <div className="space-y-2.5 lg:hidden">
                {modelPricingRows.map((row) => (
                  <div key={row.modelKey} className="surface-card p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg tracking-[-0.03em]">{row.modelName}</p>
                        <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-black/44">{row.vendor}</p>
                      </div>
                      <p className="text-[0.64rem] uppercase tracking-[0.18em] text-black/50">{formatSupportStatusLabel(row.supportStatus)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="border border-black/8 bg-white/72 px-3 py-2.5">
                        <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-black/46">输入 / 1M</p>
                        <p className="mt-2 text-sm leading-5 text-black/78">
                          {formatPricePerMillion(row.currentPrice?.inputPricePer1M ?? null, row.currentPrice?.currency ?? "USD")}
                        </p>
                      </div>
                      <div className="border border-black/8 bg-white/72 px-3 py-2.5">
                        <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-black/46">输出 / 1M</p>
                        <p className="mt-2 text-sm leading-5 text-black/78">
                          {formatPricePerMillion(row.currentPrice?.outputPricePer1M ?? null, row.currentPrice?.currency ?? "USD")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3 xl:gap-4">
                {modelTableColumns.map((rows, index) => (
                  <RelayModelsTable key={index} rows={rows} />
                ))}
              </div>
            </>
          )
        )}
      </Panel>
    </section>
  );
}
