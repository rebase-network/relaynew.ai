import type { ReactNode } from "react";
import * as Shared from "../shared";
import { WorkflowSection } from "./relay-workflow";

const {
  FieldError,
  Notice,
  PROBE_COMPATIBILITY_OPTIONS,
} = Shared;

export function RelayEditorForm({
  mode,
  form,
  fieldErrors,
  mutation,
  headerNotice,
  submitLabel,
  submittingLabel,
  resetLabel,
  extraActions,
  onSubmit,
  onReset,
  onUpdateForm,
  onUpdatePriceRow,
  onAddPriceRow,
  onRemovePriceRow,
}: {
  mode: "create" | "edit";
  form: Shared.RelayFormState;
  fieldErrors: Shared.RelayFormErrors;
  mutation: Shared.MutationState;
  headerNotice?: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  resetLabel?: string;
  extraActions?: ReactNode;
  onSubmit: () => void;
  onReset?: () => void;
  onUpdateForm: <Key extends keyof Shared.RelayFormState>(key: Key, value: Shared.RelayFormState[Key]) => void;
  onUpdatePriceRow: (rowId: string, key: keyof Shared.RelayPriceRowFormState, value: string) => void;
  onAddPriceRow: () => void;
  onRemovePriceRow: (rowId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {headerNotice ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
          {headerNotice}
        </div>
      ) : null}

      <WorkflowSection title="站点资料" description="这些信息会进入目录展示、运营审核与后续编辑流程。">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field-label">
            站点名字
            <input className="field-input" placeholder="北风中转站" value={form.name} onChange={(event) => onUpdateForm("name", event.target.value)} />
            <FieldError message={fieldErrors.name} />
          </label>
          <label className="field-label">
            Base URL
            <input className="field-input" placeholder="https://northwind.example.ai/v1" value={form.baseUrl} onChange={(event) => onUpdateForm("baseUrl", event.target.value)} />
            <FieldError message={fieldErrors.baseUrl} />
          </label>
          <label className="field-label">
            站点网站
            <input className="field-input" placeholder="https://northwind.example.ai" value={form.websiteUrl} onChange={(event) => onUpdateForm("websiteUrl", event.target.value)} />
            <FieldError message={fieldErrors.websiteUrl} />
          </label>
          <label className="field-label">
            联系方式
            <input className="field-input" placeholder="Telegram / 邮箱 / 微信" value={form.contactInfo} onChange={(event) => onUpdateForm("contactInfo", event.target.value)} />
            <FieldError message={fieldErrors.contactInfo} />
          </label>
        </div>
        <label className="field-label mt-3 block">
          站点简介
          <textarea className="field-input min-h-32" placeholder="请介绍站点适合的场景、主要模型、价格策略和服务特点。" value={form.description} onChange={(event) => onUpdateForm("description", event.target.value)} />
          <FieldError message={fieldErrors.description} />
        </label>
      </WorkflowSection>

      <WorkflowSection title="运营设置" description="active Relay 会进入自动测试、目录展示和排行榜；paused 与 archived 不会公开展示。">
        <label className="field-label">
          Relay 状态
          <select className="field-input" value={form.catalogStatus} onChange={(event) => onUpdateForm("catalogStatus", event.target.value as Shared.RelayFormState["catalogStatus"])}>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </WorkflowSection>

      <WorkflowSection
        title="支持模型及价格表"
        description="每行包含 模型 / Input价格 / Output价格，建议与站点对外公开说明保持一致。"
        actions={<button className="pill pill-idle" type="button" onClick={onAddPriceRow}>添加一行</button>}
      >
        <div className="space-y-2.5">
          {form.modelPrices.map((row, index) => (
            <div key={row.id} className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.78fr))_auto]">
              <label className="field-label">
                模型
                <input className="field-input" placeholder="openai-gpt-5.4" value={row.modelKey} onChange={(event) => onUpdatePriceRow(row.id, "modelKey", event.target.value)} />
              </label>
              <label className="field-label">
                Input价格
                <input className="field-input" type="number" min="0" step="0.0001" placeholder="4.6" value={row.inputPricePer1M} onChange={(event) => onUpdatePriceRow(row.id, "inputPricePer1M", event.target.value)} />
              </label>
              <label className="field-label">
                Output价格
                <input className="field-input" type="number" min="0" step="0.0001" placeholder="13.2" value={row.outputPricePer1M} onChange={(event) => onUpdatePriceRow(row.id, "outputPricePer1M", event.target.value)} />
              </label>
              <div className="flex items-end justify-end">
                <button className="pill pill-ghost" type="button" onClick={() => onRemovePriceRow(row.id)}>
                  {form.modelPrices.length === 1 && index === 0 ? "清空" : "删除"}
                </button>
              </div>
            </div>
          ))}
          <FieldError message={fieldErrors.modelPrices} />
        </div>
      </WorkflowSection>

      <WorkflowSection title="测试信息" description={mode === "create" ? "手动新增时需要提供测试API Key，方便系统立即接入自动测试。" : "留空新的测试API Key 时，会继续沿用当前已绑定的 Key。"}>
        <label className="field-label">
          测试API Key
          <input className="field-input" type="password" placeholder={mode === "edit" ? "留空则保持当前 Key 不变" : "sk-monitoring-or-relay-key"} value={form.testApiKey} onChange={(event) => onUpdateForm("testApiKey", event.target.value)} />
          <FieldError message={fieldErrors.testApiKey} />
        </label>
        <label className="field-label mt-3 block">
          兼容模式
          <select className="field-input" value={form.compatibilityMode} onChange={(event) => onUpdateForm("compatibilityMode", event.target.value as Shared.ProbeCompatibilityMode)}>
            {PROBE_COMPATIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </WorkflowSection>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
        <div className="flex flex-wrap gap-2.5">
          <button className="pill pill-active" disabled={mutation.pending} onClick={onSubmit} type="button">
            {mutation.pending ? submittingLabel : submitLabel}
          </button>
          {onReset ? (
            <button className="pill pill-idle" disabled={mutation.pending} onClick={onReset} type="button">
              {resetLabel ?? "恢复默认"}
            </button>
          ) : null}
          {extraActions}
        </div>
        <div className="mt-3">
          <Notice state={mutation} />
        </div>
      </div>
    </div>
  );
}
