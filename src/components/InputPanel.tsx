import { cn } from "../utils/cn";
import {
  BACKEND_IDS,
  BACKENDS,
  DTYPE_OPTIONS,
  OS_LABEL,
  PRESETS,
  RUNTIMES,
  RUNTIME_IDS,
  fmtInt,
  type ModelInput,
  type OsId,
  type Preset,
  type RuntimeId,
  type UserHardware,
} from "../lib/engine";
import { Field, Segmented, SelectField, SliderField, Toggle } from "./ui";

export function InputPanel({
  m,
  hw,
  activePresetId,
  onModel,
  onHw,
  onPreset,
}: {
  m: ModelInput;
  hw: UserHardware;
  activePresetId: string | null;
  onModel: (patch: Partial<ModelInput>) => void;
  onHw: (patch: Partial<UserHardware>) => void;
  onPreset: (p: Preset) => void;
}) {
  const rt = RUNTIMES[m.runtime];
  const be = BACKENDS[m.backend];
  const isTrain = m.workload !== "inference";
  const rtBackendOk = rt.backends.includes(m.backend);

  return (
    <div className="space-y-4">
      {/* ---- Casi d'uso ---- */}
      <div className="panel p-3.5">
        <div className="tick-label text-dim mb-2.5">CASI D'USO · PRESET</div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const active = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPreset(p)}
                className={cn(
                  "text-left inset-box px-2.5 py-2 transition-all cursor-pointer",
                  active
                    ? "border-amber/70 bg-amber/[0.08] shadow-[0_0_0_1px_rgba(242,179,76,0.25)]"
                    : "hover:border-line2 hover:bg-white/[0.03] hover:-translate-y-[1px]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink leading-tight">{p.name}</span>
                  <span
                    className={cn(
                      "tick-label px-1.5 py-px rounded-[3px] border shrink-0",
                      active ? "text-amber border-amber/50" : "text-dim border-line",
                    )}
                  >
                    {p.tag}
                  </span>
                </div>
                <p className="tick-label text-dim mt-1 leading-snug">{p.note}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- 01 · Modello ---- */}
      <div className="panel p-4">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="tick-label text-amber">01</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Modello
          </h3>
          <span className="tick-label text-dim ml-auto">da repository / HF</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <label className="block col-span-2 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-medium text-mut">Nome modello</span>
              <span className="tick-label text-dim">model card</span>
            </div>
            <input
              type="text"
              value={m.modelName}
              onChange={(e) => onModel({ modelName: e.target.value })}
              className="mt-1 w-full inset-box bg-transparent px-2.5 py-[7px] font-mono text-[13px] text-ink outline-none focus:border-amber/60 transition-colors"
            />
          </label>
          <Field label="Parametri" hint="model card" value={m.paramsB} step={0.1} min={0.1} suffix="B" onChange={(v) => onModel({ paramsB: v })} />
          <Field label="Checkpoint" hint="file HF" value={m.modelSizeGB} step={0.1} min={0.1} suffix="GB" onChange={(v) => onModel({ modelSizeGB: v })} />
          <SelectField
            label="Dtype"
            hint="config.json"
            value={m.dtype}
            onChange={(v) => onModel({ dtype: v as ModelInput["dtype"] })}
            options={DTYPE_OPTIONS.map((d) => ({ value: d, label: d.toUpperCase() }))}
          />
          <Field label="Head / projection" hint="repository" value={m.headSizeMB} step={1} min={0} suffix="MB" onChange={(v) => onModel({ headSizeMB: v })} />
          <Field label="Hidden size" hint="config.json" value={m.hiddenSize} step={64} min={64} onChange={(v) => onModel({ hiddenSize: v })} />
          <Field label="Layer" hint="num_hidden_layers" value={m.numLayers} min={1} onChange={(v) => onModel({ numLayers: v })} />
          <Field label="Attention heads" hint="config.json" value={m.numAttentionHeads} min={1} onChange={(v) => onModel({ numAttentionHeads: v })} />
          <Field label="KV heads" hint="num_key_value_heads" value={m.numKvHeads} min={1} onChange={(v) => onModel({ numKvHeads: v })} />
          <div className="col-span-2 pt-1 border-t border-line/70">
            <Toggle
              label="Modello quantizzato"
              hint="GGUF / AWQ / GPTQ / NF4"
              checked={m.quantized}
              onChange={(v) => onModel({ quantized: v })}
            />
          </div>
        </div>
      </div>

      {/* ---- 02 · Runtime & workload ---- */}
      <div className="panel p-4">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="tick-label text-amber">02</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Runtime &amp; workload
          </h3>
          <span className="tick-label text-dim ml-auto">script / README</span>
        </div>
        <div className="space-y-3.5">
          <div>
            <div className="text-[12px] font-medium text-mut mb-1">Workload</div>
            <Segmented
              options={[
                { value: "inference", label: "Inference" },
                { value: "finetuning", label: "Fine-tuning" },
                { value: "training", label: "Training" },
              ]}
              value={m.workload}
              onChange={(v) => onModel({ workload: v })}
            />
          </div>
          {isTrain && (
            <div className="inset-box p-3 space-y-3 border-amber/25">
              <Segmented
                options={[
                  { value: "full", label: "Full (Adam FP32)" },
                  { value: "lora", label: "LoRA / PEFT" },
                ]}
                value={m.finetuneMethod}
                onChange={(v) => onModel({ finetuneMethod: v })}
              />
              <Toggle
                label="Gradient checkpointing"
                hint="riduce le activations ~3×"
                checked={m.gradientCheckpointing}
                onChange={(v) => onModel({ gradientCheckpointing: v })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Runtime"
              hint="repository"
              value={m.runtime}
              onChange={(v) => onModel({ runtime: v as RuntimeId })}
              options={RUNTIME_IDS.map((r) => ({ value: r, label: RUNTIMES[r].label }))}
            />
            <div>
              <div className="text-[12px] font-medium text-mut mb-1">Backend</div>
              <Segmented
                options={BACKEND_IDS.map((b) => ({ value: b, label: BACKENDS[b].short }))}
                value={m.backend}
                onChange={(v) => onModel({ backend: v })}
              />
            </div>
          </div>
          {!rtBackendOk && (
            <p className="tick-label text-coral leading-relaxed">
              ATTENZIONE — {rt.label} non supporta {be.short}: backend validi {rt.backends.map((b) => BACKENDS[b].short).join(", ")}.
            </p>
          )}
          <SliderField
            label={isTrain ? "Sequence length" : "Context length"}
            hint="--max-model-len"
            value={m.contextLength}
            min={256}
            max={32768}
            step={256}
            onChange={(v) => onModel({ contextLength: v })}
            format={(v) => `${fmtInt(v)} tok`}
          />
          <SliderField
            label={isTrain ? "Batch size" : "Concorrenza · sequenze attive"}
            hint={isTrain ? "micro-batch di training" : "max_num_seqs / richieste"}
            value={m.concurrency}
            min={1}
            max={128}
            onChange={(v) => onModel({ concurrency: v })}
          />
          {rt.servesUtil && !isTrain && (
            <SliderField
              label="GPU memory utilization"
              hint="frazione di memoria allocata dal runtime"
              value={m.gpuMemoryUtilization}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => onModel({ gpuMemoryUtilization: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          )}
          {!isTrain && (
            <SliderField
              label="KV cache · fattore di riempimento"
              hint="occupazione media con paging (vLLM)"
              value={m.kvFillFactor}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => onModel({ kvFillFactor: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          )}
        </div>
      </div>

      {/* ---- 03 · Hardware utente ---- */}
      <div className="panel p-4">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="tick-label text-amber">03</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Il mio hardware
          </h3>
          <span className="tick-label text-dim ml-auto">per la decisione</span>
        </div>
        {m.backend === "mps" && (
          <p className="tick-label text-cyan border border-cyan/30 bg-cyan/[0.07] rounded-[6px] px-2.5 py-2 leading-relaxed mb-3">
            Apple Silicon: la memoria è unificata. Il confronto usa la RAM di sistema come pool unico.
          </p>
        )}
        {m.backend === "cpu" && (
          <p className="tick-label text-cyan border border-cyan/30 bg-cyan/[0.07] rounded-[6px] px-2.5 py-2 leading-relaxed mb-3">
            CPU-only: nessuna GPU richiesta, i pesi risiedono in RAM.
          </p>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {(m.backend === "cuda" || m.backend === "rocm") && (
            <Field label="GPU · VRAM" hint={BACKENDS[m.backend].short} value={hw.gpuVramGB} step={1} min={0} suffix="GB" onChange={(v) => onHw({ gpuVramGB: v })} />
          )}
          <Field label="RAM di sistema" value={hw.ramGB} step={1} min={1} suffix="GB" onChange={(v) => onHw({ ramGB: v })} />
          <Field label="CPU · core" value={hw.cpuCores} min={1} onChange={(v) => onHw({ cpuCores: v })} />
          <Field label="SSD · spazio libero" value={hw.ssdFreeGB} step={10} min={0} suffix="GB" onChange={(v) => onHw({ ssdFreeGB: v })} />
          <SelectField
            label="Sistema operativo"
            value={hw.os}
            onChange={(v) => onHw({ os: v as OsId })}
            options={(Object.keys(OS_LABEL) as OsId[]).map((o) => ({ value: o, label: OS_LABEL[o] }))}
          />
        </div>
        <p className="tick-label text-dim mt-3 leading-relaxed">
          Nessun modello commerciale prescritto: confronta i valori con la classe della tua macchina.
        </p>
      </div>
    </div>
  );
}
