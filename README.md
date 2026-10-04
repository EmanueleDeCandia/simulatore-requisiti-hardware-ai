# REQ·SIM — Simulatore Parametrico Requisiti Hardware AI & Decision Support System

> **Simulatore parametrico e Decision Support System (DSS) ad alta precisione per dimensionare, stimare e verificare l'eseguibilità locale di pipeline LLM / Vision / Transformer su qualsiasi classe hardware (NVIDIA CUDA, AMD ROCm, Apple Silicon MPS e CPU).**

---

## 🌟 Panoramica & Differenza Chiave rispetto alla Skill

Questo progetto nasce ed evolve partendo dai principi definiti nella skill [`simulatore_risorse_hardware_skill.md`](skill/simulatore_risorse_hardware_skill.md), ma ne costituisce **un'evoluzione radicale e completa**:

| Aspetto | Specifiche nella Skill | Applicazione Interattiva Completa (`REQ·SIM`) |
| :--- | :--- | :--- |
| **Interfaccia & UX** | Solo specifica teorica e script CLI monolitico Python di base | **Dashboard reattiva full-featured** con design cyberpunk/industrial tech, metriche in tempo reale e micro-interazioni |
| **Separazione Pipeline** | Concetto teorico dei blocchi | **Pipeline visiva interattiva a 4 stadi**: INPUT USER → COMPUTING ENGINE → STANDARD OUTPUT → DECISION ENGINE |
| **Data Visualization** | Indicazioni descrittive | **Visualizzazioni SVG interattive dal vivo**: Scomposizione VRAM dinamica con marcatori MIN/MED/IDEALE/TUO, gauge semicircolare del budget allocabile e **grafici di sensitività bivariati interattivi** (Context vs Concorrenza) con crosshair e tooltip live |
| **Supporto Backend & HW** | Solo assunzione NVIDIA/CUDA generica | **Agnostico e parametrico al 100%**: Supporto completo e formule dedicate per **NVIDIA (CUDA)**, **AMD (ROCm)**, **Apple Silicon (MPS)** con memoria unificata, e **CPU-only** |
| **Runtime Supportati** | Esempio su vLLM | Supporto a **vLLM**, **Ollama**, **PyTorch / Hugging Face Transformers**, **llama.cpp (GGUF)** e **MLX (Apple Silicon)**, ciascuno con proprio modello di overhead e allocazione VRAM |
| **Workload Supportati** | Solo stima grezza dell'inference | **Inference pura**, **Fine-tuning LoRA/PEFT** (con gradient checkpointing opzionale) e **Full Fine-tuning (Adam FP32)** con calcolo distinto di gradienti, stati dell'ottimizzatore e activations |
| **Fattore KV Cache Realistico** | Formula KV teorica fissa | Aggiunta del **`kvFillFactor` (paged attention)** che modella il riempimento reale della KV cache nei runtime a blocchi come vLLM / Ollama |
| **Decision Engine & Verdict** | Stima numerica testuale | **Sistema di valutazione multilivello a semaforo** per ogni risorsa (VRAM, RAM di sistema, Core CPU, Spazio SSD, Compatibilità SO/Backend) con **Verdict finale** (*COMPATIBILE*, *BORDERLINE*, *NON COMPATIBILE*) e note diagnostiche specifiche |
| **Preset & Casi d'Uso** | 1 solo caso d'uso fisso (CLM Qwen3-8B) | **Preset preconfigurati**: Caso guida Contrastive-LM (Qwen3-8B BF16 + CLM Head), Apple Silicon Mac 24GB MLX, Edge Laptop 7B Q4 GGUF, e Fine-tuning LoRA |
| **Persistenza & Export** | Nessuna | **Persistenza automatica locale** (`localStorage`) e **Copia del Report Markdown standardizzato** in un click negli appunti |
| **Deploy & Portabilità** | Script locale | **Deploy universale in 1 singolo file** grazie a `vite-plugin-singlefile`: pronto per **Netlify**, GitHub Pages o hosting statico senza dipendenze server |

---

## 🧮 Modello Matematico di Calcolo

Il motore interno (`src/lib/engine.ts`) traduce i parametri architetturali del modello e del runtime nei seguenti fabbisogni:

```math
VRAM_{pesi} = DimensioneCheckpoint_{GB} \times 1.05
```

```math
head\_dim = \frac{HiddenSize}{AttentionHeads}
```

```math
KV_{cache} = \frac{2 \times Layers \times KVHeads \times head\_dim \times ContextLength \times Concurrency \times Bytes(Dtype)}{2^{30}} \times FillFactor \times 1.15
```

```math
Overhead_{runtime} = BaseOverhead(Runtime) \times f(Parametri) \times f(Context) \times f(Concurrency)
```

### Tre Livelli di Configurazione (Output Standardizzato)
- 🟢 **MINIMO (`×1.05`)**: Configurazione limite che può funzionare ma con poco margine di sicurezza contro OOM.
- 🟡 **MEDIO / CONSIGLIATO (`×1.20`)**: Configurazione ideale per sviluppo locale e uso regolare del workload simulato.
- 🔵 **IDEALE (`×1.40`)**: Configurazione robusta con ampio margine operativo per sequenze impreviste o concorrenza elevata.

---

## 🚀 Guida al Deploy su Netlify

Il progetto è configurato con `vite-plugin-singlefile`, che compila l'intera applicazione React + Tailwind CSS in un **unico file HTML autosufficiente** contenente JS, CSS e favicon SVG integrati.

### Metodo 1: Drag & Drop (Nessun server, istantaneo)
1. Esegui la build locale con:
   ```bash
   npm run build
   ```
2. Accedi alla dashboard di [Netlify](https://app.netlify.com/).
3. Vai nella sezione **"Sites"** e trascina la cartella **`dist/`** (oppure crea una cartella contenente solo **`dist/index.html`**).
4. Il tuo sito sarà immediatamente online e funzionante!

> 💡 **Nota importante**: Per Netlify basta trascinare la cartella **`dist/`** che contiene l'unico file **`index.html`** (bundle singolo autosufficiente).

### Metodo 2: Collegamento Automatico a GitHub
1. Collega il repository GitHub: `https://github.com/EmanueleDeCandia/simulatore-requisiti-hardware-ai`
2. Configura le impostazioni di build su Netlify:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Ad ogni `git push`, Netlify compilerà e distribuirà automaticamente la versione aggiornata.

---

## 💻 Installazione & Sviluppo Locale

Prerequisiti: [Node.js](https://nodejs.org/) versione 18 o superiore.

```bash
# 1. Clona il repository
git clone https://github.com/EmanueleDeCandia/simulatore-requisiti-hardware-ai.git
cd simulatore-requisiti-hardware-ai

# 2. Installa le dipendenze
npm install

# 3. Avvia il server di sviluppo locale
npm run dev

# 4. Compila per produzione (single-file distribution)
npm run build
```

---

## 🛠️ Stack Tecnologico

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 7](https://vite.dev/) + [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) con palette scura custom HSL, font Google (*Chakra Petch*, *IBM Plex Mono*, *IBM Plex Sans*)
- **Grafica & Iconografia**: Componenti SVG reattivi interni + Favicon vettoriale personalizzata (lampadina bianca su sfondo nero).

---

## 📄 Licenza

Rilasciato sotto licenza [MIT](LICENSE).
