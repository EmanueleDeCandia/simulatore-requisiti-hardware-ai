/* ================================================================
   REQ·SIM — COMPUTING ENGINE
   ----------------------------------------------------------------
   Separazione netta:
     1. INPUT (dati da repository / Hugging Face)  → ModelInput
     2. COMPUTING ENGINE                           → simulate()
     3. OUTPUT STANDARDIZZATO MIN/MED/IDEALE       → SimResult
     4. DECISION ENGINE (vs hardware utente)       → decide()

   Il motore ragiona su CLASSI hardware e BACKEND, mai su modelli
   commerciali specifici.
   ================================================================ */

export type Dtype = "bf16" | "fp16" | "fp32" | "int8" | "int4" | "nf4";
export type Workload = "inference" | "finetuning" | "training";
export type BackendId = "cuda" | "rocm" | "mps" | "cpu";
export type RuntimeId = "vllm" | "ollama" | "pytorch" | "llamacpp" | "mlx";
export type OsId = "linux" | "windows" | "macos";
export type FinetuneMethod = "full" | "lora";

/* ---------------- INPUT (raccolti da repo / HF) ---------------- */

export interface ModelInput {
  modelName: string;
  paramsB: number; //           miliardi di parametri (model card)
  modelSizeGB: number; //       dimensione checkpoint (Hugging Face)
  dtype: Dtype; //              config.json · torch_dtype
  hiddenSize: number; //        config.json
  numLayers: number; //         config.json · num_hidden_layers
  numAttentionHeads: number; // config.json
  numKvHeads: number; //        config.json · num_key_value_heads
  contextLength: number; //     README / script (--max-model-len)
  concurrency: number; //       script/runtime (batch in training)
  gpuMemoryUtilization: number; // script vLLM (frazione allocabile)
  kvFillFactor: number; //      occupazione media KV cache (paged)
  headSizeMB: number; //        projection/CLM head (repository)
  workload: Workload;
  finetuneMethod: FinetuneMethod;
  gradientCheckpointing: boolean;
  quantized: boolean;
  backend: BackendId; //        CUDA / ROCm / MPS / CPU — parametrico
  runtime: RuntimeId;
}

export interface UserHardware {
  gpuVramGB: number;
  ramGB: number;
  cpuCores: number;
  ssdFreeGB: number;
  os: OsId;
}

/* ---------------- OUTPUT standardizzato ---------------- */

export interface RequirementLevel {
  vramGB: number;
  ramGB: number;
  storageGB: number;
  cpuCores: number;
}

export interface MemSegment {
  key: string;
  label: string;
  gb: number;
  color: string;
}

export interface SimResult {
  weightsGB: number;
  kvGB: number;
  actGB: number;
  gradOptGB: number;
  overheadGB: number;
  totalGB: number;
  ramGB: number;
  storageGB: number;
  cpuCores: number;
  min: RequirementLevel;
  med: RequirementLevel;
  ideal: RequirementLevel;
  gpuClassIdx: number;
  cpuClassIdx: number;
  segments: MemSegment[];
  warnings: string[];
}

/* ---------------- Decision engine ---------------- */

export type CheckStatus = "ok" | "borderline" | "no";

export interface ResourceCheck {
  key: string;
  label: string;
  requiredLabel: string;
  availableLabel: string;
  status: CheckStatus;
  ratio: number;
  note?: string;
}

export type Verdict = "COMPATIBILE" | "BORDERLINE" | "NON COMPATIBILE";

export interface Decision {
  checks: ResourceCheck[];
  verdict: Verdict;
  detail: string;
  demandGB: number;
  budgetGB: number;
}

/* ---------------- Costanti e cataloghi ---------------- */

export const DTYPE_BYTES: Record<Dtype, number> = {
  fp32: 4,
  fp16: 2,
  bf16: 2,
  int8: 1,
  int4: 0.5,
  nf4: 0.5,
};

export const DTYPE_OPTIONS: Dtype[] = ["bf16", "fp16", "fp32", "int8", "int4", "nf4"];

export const OS_LABEL: Record<OsId, string> = {
  linux: "Linux",
  windows: "Windows",
  macos: "macOS",
};

export interface BackendInfo {
  label: string;
  short: string;
  memLabel: string;
  os: OsId[];
}

export const BACKENDS: Record<BackendId, BackendInfo> = {
  cuda: { label: "NVIDIA · CUDA", short: "CUDA", memLabel: "VRAM", os: ["linux", "windows"] },
  rocm: { label: "AMD · ROCm", short: "ROCm", memLabel: "VRAM", os: ["linux"] },
  mps: { label: "Apple Silicon · MPS", short: "MPS", memLabel: "Memoria unificata", os: ["macos"] },
  cpu: { label: "CPU only", short: "CPU", memLabel: "RAM", os: ["linux", "windows", "macos"] },
};

export const BACKEND_IDS: BackendId[] = ["cuda", "rocm", "mps", "cpu"];

export interface RuntimeInfo {
  label: string;
  backends: BackendId[];
  overheadGB: number;
  servesUtil: boolean; // applica gpu_memory_utilization
  trains: boolean; // supporta training/fine-tuning
}

export const RUNTIMES: Record<RuntimeId, RuntimeInfo> = {
  vllm: { label: "vLLM", backends: ["cuda", "rocm"], overheadGB: 0.8, servesUtil: true, trains: false },
  ollama: { label: "Ollama", backends: ["cuda", "rocm", "mps", "cpu"], overheadGB: 0.35, servesUtil: true, trains: false },
  pytorch: { label: "PyTorch · Transformers", backends: ["cuda", "rocm", "mps", "cpu"], overheadGB: 0.7, servesUtil: false, trains: true },
  llamacpp: { label: "llama.cpp · GGUF", backends: ["cuda", "rocm", "mps", "cpu"], overheadGB: 0.25, servesUtil: false, trains: false },
  mlx: { label: "MLX · Apple", backends: ["mps"], overheadGB: 0.4, servesUtil: false, trains: true },
};

export const RUNTIME_IDS: RuntimeId[] = ["vllm", "ollama", "pytorch", "llamacpp", "mlx"];

/* ---------------- Classi hardware (astratte) ---------------- */

export interface HwClass {
  label: string;
  max: number;
}

export const GPU_CLASSES: HwClass[] = [
  { label: "Entry · < 8 GB", max: 8 },
  { label: "Consumer · 8–12 GB", max: 12 },
  { label: "Consumer evoluta · 12–16 GB", max: 16 },
  { label: "High-end · 16–24 GB", max: 24 },
  { label: "Workstation · 24–48 GB", max: 48 },
  { label: "Server / multi-GPU · 48+ GB", max: Number.POSITIVE_INFINITY },
];

export const CPU_CLASSES: HwClass[] = [
  { label: "Insufficiente · < 4 core", max: 4 },
  { label: "Entry · 4–6 core", max: 6 },
  { label: "Mainstream · 6–8 core", max: 8 },
  { label: "Workstation · 8–16 core", max: 16 },
  { label: "High-end · 16+ core", max: Number.POSITIVE_INFINITY },
];

export const classIndex = (classes: HwClass[], v: number): number => {
  for (let i = 0; i < classes.length; i++) if (v <= classes[i].max) return i;
  return classes.length - 1;
};

/* ---------------- Helper ---------------- */

export const clampNum = (v: number, min: number, max: number): number =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

export const fmt = (n: number, digits = 1): string =>
  new Intl.NumberFormat("it-IT", { maximumFractionDigits: digits }).format(n);

export const fmtInt = (n: number): string => new Intl.NumberFormat("it-IT").format(Math.round(n));

const WEIGHT_MARGIN = 1.05; // margine rappresentazione pesi in memoria
const KV_SAFETY = 1.15; // margine sicurezza KV cache
const BASE_OS_RAM = 4; // OS + servizi

export function sanitize(m: ModelInput): ModelInput {
  return {
    ...m,
    paramsB: clampNum(m.paramsB, 0.1, 2000),
    modelSizeGB: clampNum(m.modelSizeGB, 0.1, 10000),
    hiddenSize: Math.round(clampNum(m.hiddenSize, 64, 65536)),
    numLayers: Math.round(clampNum(m.numLayers, 1, 200)),
    numAttentionHeads: Math.round(clampNum(m.numAttentionHeads, 1, 512)),
    numKvHeads: Math.round(clampNum(m.numKvHeads, 1, 512)),
    contextLength: Math.round(clampNum(m.contextLength, 64, 131072)),
    concurrency: Math.round(clampNum(m.concurrency, 1, 1024)),
    gpuMemoryUtilization: clampNum(m.gpuMemoryUtilization, 0.05, 1),
    kvFillFactor: clampNum(m.kvFillFactor, 0.05, 1),
    headSizeMB: clampNum(m.headSizeMB, 0, 10000),
  };
}

/* ================================================================
   COMPUTING ENGINE
   ================================================================ */

export function simulate(raw: ModelInput): SimResult {
  const m = sanitize(raw);
  const bytes = DTYPE_BYTES[m.dtype];
  const isTrain = m.workload !== "inference";

  // 1 · VRAM pesi
  const weightsGB = m.modelSizeGB * WEIGHT_MARGIN;

  // 2 · KV cache (inference) oppure activations (training)
  let kvGB = 0;
  let actGB = 0;
  let gradOptGB = 0;

  if (!isTrain) {
    const headDim = m.hiddenSize / Math.max(1, m.numAttentionHeads);
    const elements =
      2 * m.numLayers * m.numKvHeads * headDim * m.contextLength * m.concurrency;
    kvGB = ((elements * bytes) / 2 ** 30) * m.kvFillFactor * KV_SAFETY;
  } else {
    const batch = Math.max(1, m.concurrency);
    // Stima conservativa: ~10× intermedi per layer, ridotta da grad-checkpointing
    actGB = (bytes * m.contextLength * batch * m.hiddenSize * m.numLayers * 10) / 2 ** 30;
    if (m.gradientCheckpointing) actGB *= 0.35;
    // gradienti + stati ottimizzatore (Adam FP32: m, v + master copy)
    gradOptGB = weightsGB * (m.finetuneMethod === "full" ? 5 : 0.25);
  }

  // 3 · Overhead runtime (cresce con parametri, context, concorrenza)
  const pF = Math.min(2, Math.max(0.5, m.paramsB / 8));
  const cF = Math.min(2, Math.max(0.5, m.contextLength / 2048));
  const kF = Math.min(2, Math.max(0.5, m.concurrency / 16));
  const overheadGB = RUNTIMES[m.runtime].overheadGB * pF * cF * kF;

  // 4 · Totale memoria acceleratore
  const totalGB = weightsGB + kvGB + actGB + gradOptGB + overheadGB;

  // 5 · RAM di sistema
  let ramGB =
    BASE_OS_RAM +
    Math.max(2, m.modelSizeGB * 0.5) *
      Math.max(1, m.contextLength / 4096) *
      Math.max(1, m.concurrency / 16) +
    m.headSizeMB / 1024;
  if (isTrain) ramGB *= 2;
  if (m.backend === "cpu") ramGB += m.modelSizeGB; // pesi residenti in RAM

  // 6 · Storage
  let storageGB =
    m.modelSizeGB + m.headSizeMB / 1024 + Math.max(5, m.modelSizeGB * 0.25) + 10;
  if (isTrain) storageGB *= 1.5;

  // 7 · CPU
  const cpuCores = Math.max(
    4,
    4 + Math.min(8, Math.ceil(m.concurrency / 8)) + (isTrain ? 4 : 0),
  );

  // 8 · Tre livelli di configurazione
  const min: RequirementLevel = {
    vramGB: Math.ceil(totalGB * 1.05),
    ramGB: Math.ceil(ramGB),
    storageGB: Math.ceil(storageGB),
    cpuCores: Math.max(4, cpuCores - 2),
  };
  const med: RequirementLevel = {
    vramGB: Math.ceil(totalGB * 1.2),
    ramGB: Math.ceil(ramGB * 1.25),
    storageGB: Math.ceil(storageGB * 1.25),
    cpuCores,
  };
  const ideal: RequirementLevel = {
    vramGB: Math.ceil(totalGB * 1.4),
    ramGB: Math.ceil(ramGB * 1.5),
    storageGB: Math.ceil(storageGB * 1.5),
    cpuCores: cpuCores + 4,
  };

  const segments: MemSegment[] = [
    { key: "weights", label: "Pesi modello", gb: weightsGB, color: "#56c8e8" },
    ...(isTrain
      ? [
          { key: "act", label: "Activations", gb: actGB, color: "#f0685a" },
          { key: "opt", label: "Gradienti + ottimizz.", gb: gradOptGB, color: "#c98bde" },
        ]
      : [{ key: "kv", label: "KV cache", gb: kvGB, color: "#f2b34c" }]),
    { key: "ovh", label: "Runtime overhead", gb: overheadGB, color: "#5e7e8a" },
  ];

  // 9 · Avvertenze
  const warnings: string[] = [];
  if (m.numAttentionHeads % m.numKvHeads !== 0)
    warnings.push(
      "num_attention_heads non è divisibile per num_key_value_heads: ricontrolla config.json.",
    );
  const expectedGB = m.paramsB * bytes;
  if (Math.abs(m.modelSizeGB - expectedGB) / expectedGB > 0.35)
    warnings.push(
      `Checkpoint ${fmt(m.modelSizeGB)} GB vs ~${fmt(expectedGB)} GB attesi (parametri × ${m.dtype}): verifica la dimensione reale su Hugging Face.`,
    );
  if (totalGB > 24 && !isTrain)
    warnings.push(
      "Il fabbisogno supera la fascia 24 GB: servono GPU workstation/server, multi-GPU o memoria unificata elevata.",
    );
  if (m.contextLength > 8192)
    warnings.push("Context > 8192: la KV cache diventa componente dominante della memoria.");
  if (m.concurrency > 32 && !isTrain)
    warnings.push("Concorrenza elevata: la KV cache cresce linearmente con le sequenze attive.");
  if (isTrain && m.finetuneMethod === "full")
    warnings.push(
      "Full training: gradienti + stati Adam (FP32) moltiplicano il fabbisogno. Con memoria limitata valuta LoRA/QLoRA.",
    );
  if (isTrain && !RUNTIMES[m.runtime].trains)
    warnings.push(
      `${RUNTIMES[m.runtime].label} è un runtime di serving: per training/fine-tuning usa PyTorch o MLX.`,
    );
  if (m.quantized)
    warnings.push("Modello quantizzato: verifica che il runtime supporti il formato (GGUF/AWQ/GPTQ/NF4).");

  return {
    weightsGB,
    kvGB,
    actGB,
    gradOptGB,
    overheadGB,
    totalGB,
    ramGB,
    storageGB,
    cpuCores,
    min,
    med,
    ideal,
    gpuClassIdx: classIndex(GPU_CLASSES, ideal.vramGB),
    cpuClassIdx: classIndex(CPU_CLASSES, ideal.cpuCores),
    segments,
    warnings,
  };
}

/* ================================================================
   DECISION ENGINE — requisito vs hardware utente
   ================================================================ */

export function decide(m: ModelInput, s: SimResult, rawHw: UserHardware): Decision {
  const num = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  const hw: UserHardware = {
    gpuVramGB: num(rawHw.gpuVramGB),
    ramGB: num(rawHw.ramGB),
    cpuCores: Math.max(num(rawHw.cpuCores), 1),
    ssdFreeGB: num(rawHw.ssdFreeGB),
    os: rawHw.os,
  };
  const rt = RUNTIMES[m.runtime];
  const be = BACKENDS[m.backend];
  const unified = m.backend === "mps" || m.backend === "cpu";
  const memAvail = unified ? hw.ramGB : hw.gpuVramGB;

  const tier = (avail: number, minV: number, medV: number): CheckStatus =>
    avail >= medV ? "ok" : avail >= minV ? "borderline" : "no";

  const checks: ResourceCheck[] = [];

  // Budget effettivamente allocabile dal runtime
  const budgetGB = unified
    ? hw.ramGB
    : rt.servesUtil
      ? hw.gpuVramGB * m.gpuMemoryUtilization
      : hw.gpuVramGB;

  let memNote: string | undefined;
  if (!unified && rt.servesUtil && hw.gpuVramGB > 0 && budgetGB < s.totalGB) {
    memNote = `Con gpu_memory_utilization = ${fmt(m.gpuMemoryUtilization, 2)}, ${rt.label} alloca solo ~${fmt(budgetGB)} GB su ${fmt(hw.gpuVramGB)} GB: meno del fabbisogno stimato (${fmt(s.totalGB)} GB). Alza il parametro o riduci context/concorrenza.`;
  }
  if (m.backend === "mps")
    memNote =
      "Apple Silicon: pesi, KV cache e applicazione condividono la memoria unificata. Il confronto avviene sulla RAM di sistema.";
  if (m.backend === "cpu")
    memNote =
      "CPU-only: i pesi risiedono in RAM. Throughput limitato (pochi token/s): adeguato per test, non per carichi continuativi.";

  checks.push({
    key: "mem",
    label: unified ? (m.backend === "mps" ? "Memoria unificata" : "RAM · pesi residenti") : "GPU · VRAM",
    requiredLabel: `${fmt(s.med.vramGB, 0)} GB (min ${fmt(s.min.vramGB, 0)})`,
    availableLabel: `${fmt(memAvail, 0)} GB`,
    status: tier(memAvail, s.min.vramGB, s.med.vramGB),
    ratio: memAvail / Math.max(1, s.med.vramGB),
    note: memNote,
  });

  checks.push({
    key: "ram",
    label: "RAM di sistema",
    requiredLabel: `${fmt(s.med.ramGB, 0)} GB (min ${fmt(s.min.ramGB, 0)})`,
    availableLabel: `${fmt(hw.ramGB, 0)} GB`,
    status: tier(hw.ramGB, s.min.ramGB, s.med.ramGB),
    ratio: hw.ramGB / Math.max(1, s.med.ramGB),
    note: unified
      ? "Stima prudenziale: su architettura unificata pesi e sistema condividono lo stesso pool."
      : undefined,
  });

  checks.push({
    key: "cpu",
    label: "CPU · core",
    requiredLabel: `${s.med.cpuCores} core (min ${s.min.cpuCores})`,
    availableLabel: `${hw.cpuCores} core`,
    status: tier(hw.cpuCores, s.min.cpuCores, s.med.cpuCores),
    ratio: hw.cpuCores / Math.max(1, s.med.cpuCores),
  });

  checks.push({
    key: "ssd",
    label: "SSD · spazio libero",
    requiredLabel: `${fmt(s.med.storageGB, 0)} GB (min ${fmt(s.min.storageGB, 0)})`,
    availableLabel: `${fmt(hw.ssdFreeGB, 0)} GB`,
    status: tier(hw.ssdFreeGB, s.min.storageGB, s.med.storageGB),
    ratio: hw.ssdFreeGB / Math.max(1, s.med.storageGB),
  });

  // Runtime / backend / OS
  const rtOk = rt.backends.includes(m.backend);
  const osOk = be.os.includes(hw.os);
  let swStatus: CheckStatus = "ok";
  let swNote: string | undefined;
  if (!rtOk) {
    swStatus = "no";
    swNote = `${rt.label} non supporta il backend ${be.label}. Backend supportati: ${rt.backends
      .map((b) => BACKENDS[b].short)
      .join(", ")} — oppure cambia runtime.`;
  } else if (!osOk) {
    swStatus = "no";
    swNote = `Il backend ${be.label} richiede ${be.os.map((o) => OS_LABEL[o]).join(" o ")}; il sistema dichiarato è ${OS_LABEL[hw.os]}.`;
  }
  checks.push({
    key: "sw",
    label: "Runtime / Backend / OS",
    requiredLabel: `${rt.label} · ${be.short}`,
    availableLabel: OS_LABEL[hw.os],
    status: swStatus,
    ratio: swStatus === "ok" ? 1 : 0,
    note: swNote,
  });

  const verdict: Verdict = checks.some((c) => c.status === "no")
    ? "NON COMPATIBILE"
    : checks.some((c) => c.status === "borderline")
      ? "BORDERLINE"
      : "COMPATIBILE";

  const detail =
    verdict === "COMPATIBILE"
      ? "La configurazione dichiarata copre tutti i requisiti con margine operativo: adatta anche a context o concorrenza superiori ai valori simulati."
      : verdict === "BORDERLINE"
        ? "La configurazione esegue il workload ma resta prossima al limite minimo su almeno una risorsa. Per uso regolare è consigliata la fascia MEDIA."
        : "Almeno una risorsa è sotto il requisito minimo: il workload non è eseguibile così com'è. Riduci il fabbisogno (dtype, context, concorrenza) o sali di classe hardware.";

  return { checks, verdict, detail, demandGB: s.totalGB, budgetGB };
}

/* ================================================================
   PRESET — il caso guida CLM + scenari per generalizzare
   ================================================================ */

export interface Preset {
  id: string;
  name: string;
  tag: string;
  note: string;
  input: ModelInput;
  hw: UserHardware;
}

export const PRESETS: Preset[] = [
  {
    id: "clm",
    name: "CLM · Qwen3-8B",
    tag: "CASO GUIDA",
    note: "Contrastive-LM · encoder Qwen3-8B BF16 via vLLM · --max-model-len 2048 · head CLM 75 MB · Python ≥ 3.10",
    input: {
      modelName: "Qwen/Qwen3-8B",
      paramsB: 8.2,
      modelSizeGB: 16.5,
      dtype: "bf16",
      hiddenSize: 4096,
      numLayers: 36,
      numAttentionHeads: 32,
      numKvHeads: 8,
      contextLength: 2048,
      concurrency: 32,
      gpuMemoryUtilization: 0.9,
      kvFillFactor: 0.3,
      headSizeMB: 75,
      workload: "inference",
      finetuneMethod: "lora",
      gradientCheckpointing: true,
      quantized: false,
      backend: "cuda",
      runtime: "vllm",
    },
    hw: { gpuVramGB: 24, ramGB: 32, cpuCores: 12, ssdFreeGB: 500, os: "linux" },
  },
  {
    id: "clm-mps",
    name: "CLM · Mac 24 GB",
    tag: "MPS",
    note: "Stesso encoder su Apple Silicon · memoria unificata · runtime MLX · concorrenza ridotta",
    input: {
      modelName: "Qwen/Qwen3-8B",
      paramsB: 8.2,
      modelSizeGB: 16.5,
      dtype: "bf16",
      hiddenSize: 4096,
      numLayers: 36,
      numAttentionHeads: 32,
      numKvHeads: 8,
      contextLength: 2048,
      concurrency: 8,
      gpuMemoryUtilization: 0.9,
      kvFillFactor: 0.4,
      headSizeMB: 75,
      workload: "inference",
      finetuneMethod: "lora",
      gradientCheckpointing: true,
      quantized: false,
      backend: "mps",
      runtime: "mlx",
    },
    hw: { gpuVramGB: 0, ramGB: 24, cpuCores: 10, ssdFreeGB: 256, os: "macos" },
  },
  {
    id: "edge-q4",
    name: "7B · Q4 edge",
    tag: "GGUF",
    note: "Modello 7B quantizzato Q4_K_M · llama.cpp · laptop senza GPU dedicata",
    input: {
      modelName: "7B-Instruct · Q4_K_M",
      paramsB: 7.2,
      modelSizeGB: 4.4,
      dtype: "int4",
      hiddenSize: 4096,
      numLayers: 32,
      numAttentionHeads: 32,
      numKvHeads: 8,
      contextLength: 4096,
      concurrency: 4,
      gpuMemoryUtilization: 0.9,
      kvFillFactor: 0.5,
      headSizeMB: 0,
      workload: "inference",
      finetuneMethod: "lora",
      gradientCheckpointing: true,
      quantized: true,
      backend: "cpu",
      runtime: "llamacpp",
    },
    hw: { gpuVramGB: 0, ramGB: 16, cpuCores: 8, ssdFreeGB: 120, os: "windows" },
  },
  {
    id: "server-70b",
    name: "70B · BF16 serving",
    tag: "SERVER",
    note: "Modello 70B BF16 · vLLM · context 8k · 16 sequenze concorrenti",
    input: {
      modelName: "70B-Instruct · BF16",
      paramsB: 70.6,
      modelSizeGB: 141,
      dtype: "bf16",
      hiddenSize: 8192,
      numLayers: 80,
      numAttentionHeads: 64,
      numKvHeads: 8,
      contextLength: 8192,
      concurrency: 16,
      gpuMemoryUtilization: 0.9,
      kvFillFactor: 0.5,
      headSizeMB: 0,
      workload: "inference",
      finetuneMethod: "lora",
      gradientCheckpointing: true,
      quantized: false,
      backend: "cuda",
      runtime: "vllm",
    },
    hw: { gpuVramGB: 24, ramGB: 64, cpuCores: 16, ssdFreeGB: 1000, os: "linux" },
  },
];

export const DEFAULT_PRESET = PRESETS[0];

/* ================================================================
   REPORT testuale (esportazione clipboard)
   ================================================================ */

export function buildReport(m: ModelInput, s: SimResult, d: Decision): string {
  const be = BACKENDS[m.backend];
  const L = (l: RequirementLevel) =>
    `  ${be.memLabel.padEnd(20)}: ${fmt(l.vramGB, 0)} GB\n` +
    `  ${"RAM sistema".padEnd(20)}: ${fmt(l.ramGB, 0)} GB\n` +
    `  ${"CPU".padEnd(20)}: almeno ${l.cpuCores} core\n` +
    `  ${"SSD libero".padEnd(20)}: ${fmt(l.storageGB, 0)} GB`;

  return [
    "================================================================",
    "  REQ·SIM — REPORT REQUISITI HARDWARE (generato dal simulatore)",
    "================================================================",
    "",
    "MODELLO",
    `  Nome                  : ${m.modelName}`,
    `  Parametri             : ${fmt(m.paramsB)} B`,
    `  Checkpoint            : ${fmt(m.modelSizeGB)} GB (${m.dtype})`,
    `  Architettura          : hidden ${fmtInt(m.hiddenSize)} · ${m.numLayers} layer · ${m.numAttentionHeads} heads · ${m.numKvHeads} KV heads`,
    `  Context / concorrenza : ${fmtInt(m.contextLength)} token · ${m.concurrency}`,
    `  Workload              : ${m.workload} · runtime ${RUNTIMES[m.runtime].label} · backend ${be.label}`,
    "",
    "STIMA INTERNA",
    `  VRAM totale stimata   : ${fmt(s.totalGB)} GB`,
    ...s.segments.map((g) => `    · ${g.label.padEnd(22)} ${fmt(g.gb)} GB`),
    `  RAM sistema stimata   : ${fmt(s.ramGB)} GB`,
    `  Storage stimato       : ${fmt(s.storageGB)} GB`,
    "",
    "REQUISITI STANDARDIZZATI",
    "MINIMO",
    L(s.min),
    "MEDIO / CONSIGLIATO",
    L(s.med),
    "IDEALE",
    L(s.ideal),
    "",
    "CLASSI HARDWARE",
    `  GPU  : ${GPU_CLASSES[s.gpuClassIdx].label}`,
    `  CPU  : ${CPU_CLASSES[s.cpuClassIdx].label}`,
    "",
    "DECISIONE (vs hardware dichiarato)",
    ...d.checks.map((c) => `  ${c.label.padEnd(26)} ${c.status === "ok" ? "OK" : c.status === "borderline" ? "LIMITE" : "NO"}  (richiesto ${c.requiredLabel} · disponibile ${c.availableLabel})`),
    "",
    `  VERDETTO              : ${d.verdict}`,
    `  ${d.detail}`,
    ...(s.warnings.length ? ["", "AVVERTENZE", ...s.warnings.map((w) => `  - ${w}`)] : []),
    "",
    "Nota: il simulatore non prescrive modelli commerciali.",
    "Confronta i valori con la classe della tua macchina.",
  ].join("\n");
}
