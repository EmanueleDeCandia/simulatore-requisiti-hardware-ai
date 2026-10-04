const FORMULAS = `VRAM_pesi    = checkpoint_GB × 1,05
d_head       = hidden_size / attention_heads
KV_cache     = 2 · layers · kv_heads · d_head · ctx · conc
               × bytes(dtype) × fill_factor × 1,15  /  2³⁰
overhead     = base(runtime) × f(parametri) × f(context) × f(conc)
VRAM_totale  = pesi + KV (o activations) + overhead

MINIMO       = VRAM_totale × 1,05      (margine minimo)
MEDIO        = VRAM_totale × 1,20      (uso regolare)
IDEALE       = VRAM_totale × 1,40      (margine operativo)

training     = pesi + pesi×5 (Adam FP32, full) | pesi×0,25 (LoRA)
             + activations × (0,35 se grad-checkpointing) + overhead`;

const GUIDE = [
  { k: "GPU / memoria", v: "Nessun modello commerciale prescritto: confronta la VRAM (o memoria unificata) disponibile con il valore calcolato per classe." },
  { k: "CPU", v: "Il numero di core è una classe indicativa. In inference il collo di bottiglia è la memoria dell'acceleratore; in training/preprocessing la CPU pesa di più." },
  { k: "RAM", v: "Deve essere disponibile oltre alla VRAM: la RAM di sistema non sostituisce la VRAM quando il runtime richiede che il modello risieda sull'acceleratore." },
  { k: "SSD", v: "Valore da intendersi come spazio LIBERO consigliato (checkpoint + cache runtime + spazio operativo), non come disco totale." },
  { k: "MINIMO", v: "Configurazione che può funzionare ma con poco margine: context o concorrenza extra possono mandarla fuori budget." },
  { k: "MEDIO", v: "Configurazione consigliata per sviluppo e uso regolare del caso d'uso così come simulato." },
  { k: "IDEALE", v: "Margine per context più lunghi, concorrenza maggiore e futuri esperimenti sulla stessa macchina." },
];

const NOTES = [
  {
    t: "Backend come parametro",
    v: "Il simulatore non hard-coda NVIDIA: il backend (CUDA, ROCm, MPS, CPU) è un input. Su Apple Silicon il confronto avviene sulla memoria unificata — coerente con i test MPS documentati anche nel repository CLM (Mac 24 GB).",
  },
  {
    t: "Inference ≠ training",
    v: "In inference dominano pesi + KV cache. In training entrano gradienti, stati ottimizzatore e activations: il fabbisogno può crescere di un ordine di grandezza. Per questo il workload è un input esplicito.",
  },
  {
    t: "Perché MIN / MED / IDEALE",
    v: "Dire «serve una RTX 4090» fotografa un prodotto; dire «servono X GB effettivi per questo workload» resta valido nel tempo e confrontabile con qualunque macchina, presente o futura.",
  },
];

export function Methodology() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="panel p-4 md:p-5 panel-hover">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="tick-label text-amber">M·01</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Modello di calcolo
          </h3>
        </div>
        <pre className="font-mono text-[11.5px] leading-[1.75] text-mut overflow-x-auto whitespace-pre">{FORMULAS}</pre>
        <p className="tick-label text-dim mt-3 leading-relaxed">
          Il fill_factor modella la KV cache paginata (vLLM): le sequenze raramente occupano tutte il
          context massimo contemporaneamente. gpu_memory_utilization entra nel decision engine come
          budget effettivamente allocabile dal runtime.
        </p>
      </div>

      <div className="panel p-4 md:p-5 panel-hover">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="tick-label text-amber">M·02</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Guida all'interpretazione
          </h3>
        </div>
        <dl className="space-y-2.5">
          {GUIDE.map((g) => (
            <div key={g.k} className="grid grid-cols-[110px_1fr] gap-3 items-baseline">
              <dt className="tick-label text-amber pt-0.5">{g.k.toUpperCase()}</dt>
              <dd className="text-[12.5px] text-mut leading-relaxed">{g.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel p-4 md:p-5 lg:col-span-2">
        <div className="flex items-baseline gap-2.5 mb-4">
          <span className="tick-label text-amber">M·03</span>
          <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
            Note di progetto
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {NOTES.map((n) => (
            <div key={n.t} className="inset-box p-3.5 hover:border-line2 transition-colors">
              <div className="font-display font-semibold text-[13px] text-ink tracking-wide">{n.t}</div>
              <p className="text-[12.5px] text-mut leading-relaxed mt-1.5">{n.v}</p>
            </div>
          ))}
        </div>
        <p className="tick-label text-dim mt-4 leading-relaxed">
          Le stime sono conservative e a scopo decisionale: il comportamento reale varia con driver,
          versione del runtime, efficienza del paging e pattern di traffico. Validare sempre con un
          benchmark sul caso d'uso concreto.
        </p>
      </div>
    </div>
  );
}
