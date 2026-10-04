import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PRESET,
  buildReport,
  decide,
  fmt,
  fmtInt,
  simulate,
  type ModelInput,
  type Preset,
  type UserHardware,
} from "./lib/engine";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { DecisionPanel } from "./components/DecisionPanel";
import { Methodology } from "./components/Methodology";
import { SensitivityChart, type Series } from "./components/Charts";
import { IconChip, Reveal, SectionHead } from "./components/ui";

const LS_KEY = "reqsim-v2";

interface SavedState {
  input: ModelInput;
  hw: UserHardware;
  presetId: string | null;
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as SavedState;
      if (p && p.input && p.hw && typeof p.input.paramsB === "number") return p;
    }
  } catch {
    /* stato non valido: si riparte dal preset */
  }
  return { input: DEFAULT_PRESET.input, hw: DEFAULT_PRESET.hw, presetId: DEFAULT_PRESET.id };
}

/* ---------- pipeline interattiva ---------- */

function Pipeline() {
  const steps = [
    { id: "input", label: "INPUT USER", sub: "repo · HF" },
    { id: "stima", label: "COMPUTING ENGINE", sub: "pesi · KV · overhead" },
    { id: "requisiti", label: "STANDARD OUTPUT", sub: "min · med · ideale" },
    { id: "decisione", label: "DECISION", sub: "ok · limite · no" },
  ];
  return (
    <div className="panel p-4">
      <div className="tick-label text-dim mb-3">PIPELINE · CLICCA UNA FASE PER RAGGIUNGERLA</div>
      <div className="flex items-stretch">
        {steps.map((st, i) => (
          <div key={st.id} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => document.getElementById(st.id)?.scrollIntoView({ behavior: "smooth" })}
              className="flex-1 min-w-0 inset-box px-2.5 py-2.5 text-left hover:border-amber/50 hover:-translate-y-[2px] transition-all cursor-pointer group"
            >
              <div className="tick-label text-amber">{String(i + 1).padStart(2, "0")}</div>
              <div className="font-display text-[11px] font-semibold text-ink leading-tight mt-0.5 group-hover:text-amber transition-colors">
                {st.label}
              </div>
              <div className="tick-label text-dim mt-0.5 truncate">{st.sub}</div>
            </button>
            {i < steps.length - 1 && (
              <svg width="24" height="12" viewBox="0 0 24 12" className="shrink-0 mx-0.5">
                <line x1="0" y1="6" x2="17" y2="6" stroke="#2b4750" strokeWidth="1.5" className="dashline" />
                <path d="M16 2.5 21.5 6 16 9.5" fill="none" stroke="#f2b34c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- app ---------- */

export default function App() {
  const init = useMemo(loadState, []);
  const [m, setM] = useState<ModelInput>(init.input);
  const [hw, setHw] = useState<UserHardware>(init.hw);
  const [presetId, setPresetId] = useState<string | null>(init.presetId);
  const [flashKey, setFlashKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const firstRun = useRef(true);

  // persistenza
  useEffect(() => {
    try {
      const saved: SavedState = { input: m, hw, presetId };
      localStorage.setItem(LS_KEY, JSON.stringify(saved));
    } catch {
      /* storage pieno o non disponibile */
    }
  }, [m, hw, presetId]);

  // feedback di ricalcolo
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => setFlashKey((k) => k + 1), 30);
    return () => clearTimeout(t);
  }, [m, hw]);

  const s = useMemo(() => simulate(m), [m]);
  const d = useMemo(() => decide(m, s, hw), [m, s, hw]);

  /* serie di sensitività ricalcolate dal vivo sul caso attuale */
  const ctxValues = [512, 1024, 2048, 4096, 8192, 16384, 32768];
  const ctxSeries: Series[] = useMemo(
    () =>
      [8, 16, 32].map((c, i) => ({
        name: `conc ${c}`,
        color: ["#56c8e8", "#f2b34c", "#3ad6a4"][i],
        values: ctxValues.map((x) => simulate({ ...m, contextLength: x, concurrency: c }).totalGB),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m],
  );
  const concValues = [1, 4, 8, 16, 32, 64, 128];
  const concSeries: Series[] = useMemo(
    () =>
      [1024, 2048, 8192].map((c, i) => ({
        name: `ctx ${c >= 1024 ? `${c / 1024}k` : c}`,
        color: ["#56c8e8", "#f2b34c", "#3ad6a4"][i],
        values: concValues.map((x) => simulate({ ...m, contextLength: c, concurrency: x }).totalGB),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m],
  );

  const doubleCtx = Math.min(131072, (Number.isFinite(m.contextLength) ? m.contextLength : 2048) * 2);
  const ctxDelta = useMemo(
    () => simulate({ ...m, contextLength: doubleCtx }).totalGB - s.totalGB,
    [m, s.totalGB, doubleCtx],
  );

  const onModel = (patch: Partial<ModelInput>) => {
    setM((prev) => ({ ...prev, ...patch }));
    setPresetId(null);
  };
  const onHw = (patch: Partial<UserHardware>) => setHw((prev) => ({ ...prev, ...patch }));
  const onPreset = (p: Preset) => {
    setM(p.input);
    setHw(p.hw);
    setPresetId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReport(m, s, d));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-[58px] flex items-center gap-3">
          <span className="text-amber">
            <IconChip size={24} />
          </span>
          <div className="leading-none">
            <div className="font-display font-bold tracking-[0.16em] text-[16px] text-ink">
              REQ·SIM
            </div>
            <div className="tick-label text-dim mt-1">DECISION SUPPORT · REQUISITI HW AI LOCALI</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 tick-label text-mut">
              <span className="led w-2 h-2 rounded-full bg-teal inline-block" />
              ENGINE ATTIVO
            </span>
            <span className="tick-label border border-line rounded px-2 py-1 text-dim hidden md:inline">
              v2.0 · GENERAL PURPOSE
            </span>
          </div>
        </div>
      </header>

      {/* ================= INTRO + PIPELINE ================= */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-7">
        <div className="grid lg:grid-cols-[1fr_480px] gap-7 items-end">
          <Reveal>
            <div className="tick-label text-amber mb-3">
              SIMULATORE PARAMETRICO · DA REPOSITORY/HUGGING FACE ALLA DECISIONE
            </div>
            <h1 className="font-display font-bold text-[28px] sm:text-[36px] md:text-[44px] leading-[1.05] text-ink max-w-[660px]">
              Quanta macchina serve <span className="text-amber">davvero</span> al tuo modello?
            </h1>
            <p className="text-mut text-[13.5px] md:text-[14.5px] mt-3.5 max-w-[580px] leading-relaxed">
              Il caso guida <strong className="text-ink font-semibold">Contrastive-LM · Qwen3-8B</strong> è
              già caricato con i dati del repository (BF16, 36 layer, context 2048, head 75 MB). Modifica
              un input e il motore ricalcola all'istante requisiti{" "}
              <strong className="text-ink font-semibold">MINIMO / MEDIO / IDEALE</strong> per classi
              hardware — poi il decision engine li confronta con la tua macchina.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <Pipeline />
          </Reveal>
        </div>
      </section>

      {/* ================= SIMULATORE ================= */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-6">
        <Reveal>
          <SectionHead
            index="01"
            title="Configura il caso d'uso"
            sub="Input tecnici a sinistra, motore e output standardizzato a destra. Ogni campo indica dove recuperare il dato nel repository o su Hugging Face."
          />
        </Reveal>
        <section id="input" className="grid lg:grid-cols-[400px_1fr] gap-5 items-start">
          <Reveal className="min-w-0">
            <InputPanel
              m={m}
              hw={hw}
              activePresetId={presetId}
              onModel={onModel}
              onHw={onHw}
              onPreset={onPreset}
            />
          </Reveal>
          <div className="min-w-0">
            <Reveal delay={90}>
              <ResultsPanel m={m} s={s} hw={hw} d={d} flashKey={flashKey} copied={copied} onCopy={onCopy} />
            </Reveal>
            <Reveal delay={130} className="mt-5">
              <DecisionPanel d={d} />
            </Reveal>
          </div>
        </section>

        {/* ================= SENSITIVITÀ ================= */}
        <section id="sensitivita" className="mt-14">
          <Reveal>
            <SectionHead
              index="02"
              title="Analisi di sensitività"
              sub="Come cambierebbe il fabbisogno totale al variare di context length e concorrenza, mantenendo il resto della configurazione attuale. Passa il cursore sui grafici per leggere i valori."
            />
          </Reveal>
          <div className="grid lg:grid-cols-2 gap-4">
            <Reveal delay={60}>
              <SensitivityChart
                title="Memoria vs context length"
                xLabel="context"
                xValues={ctxValues}
                xFormat={(n) => (n >= 1024 ? `${n / 1024}k` : `${n}`)}
                series={ctxSeries}
                currentValue={Number.isFinite(m.contextLength) ? m.contextLength : 2048}
              />
            </Reveal>
            <Reveal delay={120}>
              <SensitivityChart
                title="Memoria vs concorrenza"
                xLabel="sequenze"
                xValues={concValues}
                xFormat={(n) => `${n}`}
                series={concSeries}
                currentValue={Number.isFinite(m.concurrency) ? m.concurrency : 16}
              />
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p className="tick-label text-dim mt-3 leading-relaxed">
              ↳ Raddoppiando il context ({fmtInt(Number.isFinite(m.contextLength) ? m.contextLength : 0)} →{" "}
              {fmtInt(doubleCtx)} tok) la stima passa a{" "}
              <span className="text-amber font-semibold">{fmt(s.totalGB + ctxDelta)} GB</span> (+
              {fmt(Math.max(0, ctxDelta))} GB): la KV cache cresce linearmente con context × concorrenza.
            </p>
          </Reveal>
        </section>

        {/* ================= METODOLOGIA ================= */}
        <section id="metodo" className="mt-14">
          <Reveal>
            <SectionHead
              index="03"
              title="Metodologia & interpretazione"
              sub="Formule del motore di calcolo, guida alla lettura dei tre livelli e note sul perché il simulatore ragioni su classi e backend anziché su prodotti."
            />
          </Reveal>
          <Reveal delay={80}>
            <Methodology />
          </Reveal>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-line mt-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 flex flex-wrap items-center gap-3 justify-between">
          <span className="tick-label text-dim flex items-center gap-2">
            <span className="text-amber">
              <IconChip size={14} />
            </span>
            REQ·SIM v2.0 · caso guida Contrastive-LM (Qwen3-8B) · generalizzato per ogni caso d'uso
          </span>
          <span className="tick-label text-dim">
            Nessun modello commerciale prescritto · stime conservative a scopo decisionale
          </span>
        </div>
      </footer>
    </div>
  );
}
