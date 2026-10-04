import { cn } from "../utils/cn";
import {
  BACKENDS,
  CPU_CLASSES,
  GPU_CLASSES,
  RUNTIMES,
  fmt,
  type Decision,
  type ModelInput,
  type SimResult,
  type UserHardware,
} from "../lib/engine";
import { AnimatedNumber, IconCheck, IconCopy, IconWarn } from "./ui";
import { BudgetBar, GaugeChart, type Marker } from "./Charts";

const STATUS_COLOR: Record<string, string> = {
  ok: "#3ad6a4",
  borderline: "#f2b34c",
  no: "#f0685a",
};

export function ResultsPanel({
  m,
  s,
  hw,
  d,
  flashKey,
  copied,
  onCopy,
}: {
  m: ModelInput;
  s: SimResult;
  hw: UserHardware;
  d: Decision;
  flashKey: number;
  copied: boolean;
  onCopy: () => void;
}) {
  const be = BACKENDS[m.backend];
  const rt = RUNTIMES[m.runtime];
  const unified = m.backend === "mps" || m.backend === "cpu";
  const memAvailRaw = unified ? hw.ramGB : hw.gpuVramGB;
  const memAvail = Number.isFinite(memAvailRaw) ? Math.max(0, memAvailRaw) : 0;

  const markers: Marker[] = [
    { label: `MIN ${fmt(s.min.vramGB, 0)}`, value: s.min.vramGB, color: "#93aca8" },
    { label: `MED ${fmt(s.med.vramGB, 0)}`, value: s.med.vramGB, color: "#f2b34c" },
    { label: `IDEALE ${fmt(s.ideal.vramGB, 0)}`, value: s.ideal.vramGB, color: "#3ad6a4" },
    { label: `TUA ${fmt(memAvail, 0)}`, value: memAvail, color: "#56c8e8" },
  ];
  const scaleMax = Math.max(s.ideal.vramGB, memAvail, s.totalGB) * 1.08;

  const memStatus = d.checks[0]?.status ?? "ok";
  const gaugePct = (s.totalGB / Math.max(0.1, d.budgetGB)) * 100;

  const levels = [
    { key: "min", name: "MINIMO", desc: "funziona, margine ridotto", l: s.min, hl: false },
    { key: "med", name: "MEDIO", desc: "sviluppo e uso regolare", l: s.med, hl: true },
    { key: "ideal", name: "IDEALE", desc: "margine per esperimenti", l: s.ideal, hl: false },
  ];

  return (
    <div className="space-y-4">
      {/* ================= STIMA INTERNA ================= */}
      <div id="stima" className="panel p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2.5">
            <span className="tick-label text-amber">OUT·01</span>
            <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
              Stima interna
            </h3>
            <span key={flashKey} className="flash-once tick-label text-amber rounded px-1.5">
              ● ricalcolato
            </span>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "flex items-center gap-1.5 tick-label border rounded px-2.5 py-1.5 transition-all cursor-pointer",
              copied
                ? "text-teal border-teal/50 bg-teal/10"
                : "text-mut border-line hover:text-ink hover:border-line2",
            )}
          >
            <IconCopy size={13} />
            {copied ? "REPORT COPIATO" : "COPIA REPORT"}
          </button>
        </div>

        <div className="mt-4 flex items-end gap-3 flex-wrap">
          <AnimatedNumber
            value={s.totalGB}
            digits={1}
            className="font-display text-[52px] md:text-[62px] font-bold text-ink leading-[0.95]"
          />
          <span className="font-display text-2xl font-semibold text-amber pb-1">GB</span>
          <span className="tick-label text-mut border border-line rounded px-2 py-1 mb-2">
            {be.memLabel.toUpperCase()} · {rt.label} · {be.short}
          </span>
        </div>
        <p className="text-[12.5px] text-mut mt-1.5 max-w-xl leading-relaxed">
          Fabbisogno puntuale prima dei margini. Non presuppone che «24 GB bastino sempre»: context,
          concorrenza, dtype e configurazione del runtime modificano il risultato.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_230px] items-center">
          <BudgetBar segments={s.segments} markers={markers} scaleMax={scaleMax} />
          <GaugeChart
            pct={gaugePct}
            color={STATUS_COLOR[memStatus]}
            caption="DEL BUDGET ALLOCABILE"
            sub={`fabbisogno ${fmt(s.totalGB)} GB · budget ${fmt(d.budgetGB)} GB`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {[
            { label: "RAM sistema stimata", v: s.ramGB, unit: "GB", d: 1 },
            { label: "Storage stimato", v: s.storageGB, unit: "GB", d: 0 },
            { label: "CPU consigliata", v: s.cpuCores, unit: "core", d: 0 },
          ].map((k) => (
            <div key={k.label} className="inset-box px-3 py-2.5">
              <div className="tick-label text-dim">{k.label.toUpperCase()}</div>
              <div className="font-mono text-lg font-semibold text-ink mt-0.5">
                <AnimatedNumber value={k.v} digits={k.d} />
                <span className="text-[11px] text-mut ml-1">{k.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= REQUISITI STANDARDIZZATI ================= */}
      <div id="requisiti" className="panel p-4 md:p-5">
        <div className="flex items-baseline gap-2.5">
          <span className="tick-label text-amber">OUT·02</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Requisiti standardizzati
          </h3>
          <span className="tick-label text-dim ml-auto">MIN ×1,05 · MED ×1,20 · IDEALE ×1,40</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-2.5 mt-4">
          {levels.map((lv) => (
            <div
              key={lv.key}
              className={cn(
                "rounded-[8px] border p-3.5 transition-all relative",
                lv.hl
                  ? "border-amber/60 bg-amber/[0.06] shadow-[0_0_24px_rgba(242,179,76,0.08)]"
                  : "border-line bg-inset hover:border-line2",
              )}
            >
              {lv.hl && (
                <span className="absolute -top-2.5 right-3 tick-label bg-amber text-deep font-bold px-1.5 py-px rounded-[3px]">
                  CONSIGLIATO
                </span>
              )}
              <div className={cn("font-display font-semibold text-[13px] tracking-[0.12em]", lv.hl ? "text-amber" : "text-mut")}>
                {lv.name}
              </div>
              <div className="tick-label text-dim mt-0.5 mb-3">{lv.desc}</div>
              <dl className="space-y-2">
                {[
                  { k: be.memLabel, v: `${fmt(lv.l.vramGB, 0)} GB` },
                  { k: "RAM sistema", v: `${fmt(lv.l.ramGB, 0)} GB` },
                  { k: "CPU", v: `≥ ${lv.l.cpuCores} core` },
                  { k: "SSD libero", v: `${fmt(lv.l.storageGB, 0)} GB` },
                ].map((row) => (
                  <div key={row.k} className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1.5 last:border-0">
                    <dt className="text-[11.5px] text-mut">{row.k}</dt>
                    <dd className="font-mono text-[13px] font-semibold text-ink">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CLASSI + AVVERTENZE ================= */}
      <div id="classi" className="grid md:grid-cols-2 gap-4">
        <div className="panel p-4 md:p-5">
          <div className="flex items-baseline gap-2.5 mb-3.5">
            <span className="tick-label text-amber">OUT·03</span>
            <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
              Classi hardware
            </h3>
          </div>
          <div className="tick-label text-dim mb-1.5">GPU / MEMORIA · TARGET SULLA FASCIA IDEALE</div>
          <div className="space-y-1">
            {GPU_CLASSES.map((c, i) => (
              <div
                key={c.label}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-[7px] rounded-[5px] text-[12px] transition-all",
                  i === s.gpuClassIdx
                    ? "border border-cyan/60 bg-cyan/[0.09] text-ink font-medium"
                    : "border border-transparent text-mut",
                  i < s.gpuClassIdx && "opacity-45",
                )}
              >
                <span className="tick-label text-dim w-4">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{c.label}</span>
                {i === s.gpuClassIdx && <span className="tick-label text-cyan font-semibold">TARGET</span>}
              </div>
            ))}
          </div>
          <div className="tick-label text-dim mt-4 mb-1.5">CPU · CLASSI DI CORE</div>
          <div className="space-y-1">
            {CPU_CLASSES.map((c, i) => (
              <div
                key={c.label}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-[7px] rounded-[5px] text-[12px] transition-all",
                  i === s.cpuClassIdx
                    ? "border border-cyan/60 bg-cyan/[0.09] text-ink font-medium"
                    : "border border-transparent text-mut",
                  i < s.cpuClassIdx && "opacity-45",
                )}
              >
                <span className="tick-label text-dim w-4">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{c.label}</span>
                {i === s.cpuClassIdx && <span className="tick-label text-cyan font-semibold">TARGET</span>}
              </div>
            ))}
          </div>
          <p className="tick-label text-dim mt-3 leading-relaxed">
            Le classi restano valide anche quando i cataloghi commerciali cambiano: il requisito è
            «quanta capacità serve», non «quale scheda comprare».
          </p>
        </div>

        <div className="panel p-4 md:p-5">
          <div className="flex items-baseline gap-2.5 mb-3.5">
            <span className="tick-label text-amber">OUT·04</span>
            <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
              Avvertenze
            </h3>
            <span className="tick-label text-dim ml-auto">{s.warnings.length} attive</span>
          </div>
          {s.warnings.length === 0 ? (
            <div className="flex items-center gap-2.5 text-teal inset-box border-teal/30 bg-teal/[0.06] px-3 py-3">
              <IconCheck size={16} />
              <span className="text-[12.5px]">Nessuna criticità rilevata per questa configurazione.</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {s.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5 inset-box border-amber/25 bg-amber/[0.05] px-3 py-2.5 transition-colors hover:border-amber/50">
                  <span className="text-amber shrink-0 mt-px">
                    <IconWarn size={15} />
                  </span>
                  <span className="text-[12.5px] text-mut leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 inset-box px-3 py-3">
            <div className="tick-label text-dim mb-1.5">SOFTWARE DICHIARATO DAL CASO D'USO</div>
            <div className="flex flex-wrap gap-1.5">
              {[rt.label, be.label, m.workload === "inference" ? "Python ≥ 3.10" : "Python ≥ 3.10 + stack training", m.quantized ? "Quantizzazione attiva" : `Dtype ${m.dtype.toUpperCase()}`].map((t) => (
                <span key={t} className="tick-label border border-line rounded px-2 py-1 text-mut">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
