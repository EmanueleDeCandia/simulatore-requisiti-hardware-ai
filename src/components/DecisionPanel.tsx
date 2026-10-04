import { cn } from "../utils/cn";
import { fmt, type CheckStatus, type Decision } from "../lib/engine";
import { StatusPill } from "./ui";

const STATUS_COLOR: Record<CheckStatus, string> = {
  ok: "#3ad6a4",
  borderline: "#f2b34c",
  no: "#f0685a",
};

const VERDICT_STYLE: Record<Decision["verdict"], { text: string; border: string; bg: string }> = {
  COMPATIBILE: { text: "text-teal", border: "border-teal/45", bg: "bg-teal/[0.06]" },
  BORDERLINE: { text: "text-amber", border: "border-amber/45", bg: "bg-amber/[0.06]" },
  "NON COMPATIBILE": { text: "text-coral", border: "border-coral/45", bg: "bg-coral/[0.06]" },
};

export function DecisionPanel({ d }: { d: Decision }) {
  const vs = VERDICT_STYLE[d.verdict];

  return (
    <div id="decisione" className="panel p-4 md:p-5">
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="tick-label text-amber">OUT·05</span>
        <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
          Decision engine
        </h3>
        <span className="tick-label text-dim ml-auto">
          requisito consigliato (MED) vs hardware dichiarato
        </span>
      </div>

      <div className="mt-4 divide-y divide-line/70 border-y border-line/70">
        {d.checks.map((c) => (
          <div key={c.key} className="py-3.5 group">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink group-hover:text-amber transition-colors">
                  {c.label}
                </div>
                <div className="tick-label text-dim mt-0.5">
                  richiesto <span className="text-mut">{c.requiredLabel}</span> · disponibile{" "}
                  <span className="text-mut">{c.availableLabel}</span>
                </div>
              </div>
              <StatusPill status={c.status} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="tick-label text-dim w-5">0</span>
              <div className="relative flex-1 h-[8px] rounded-full bg-inset border border-line overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bar-anim"
                  style={{
                    width: `${Math.min(100, Math.max(2, c.ratio * 100))}%`,
                    background: STATUS_COLOR[c.status],
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="tick-label text-dim w-16 text-right shrink-0">req. MED</span>
            </div>
            {c.note && (
              <p className="tick-label text-amber mt-2 leading-relaxed border-l-2 border-amber/50 pl-2.5">
                {c.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={cn("mt-4 rounded-[8px] border p-4 flex items-center gap-5 flex-wrap", vs.border, vs.bg)}>
        <div className={cn("stamp px-5 py-2.5 text-xl md:text-[26px] font-bold", vs.text)}>
          {d.verdict}
        </div>
        <div className="flex-1 min-w-[250px]">
          <p className="text-[13px] text-mut leading-relaxed">{d.detail}</p>
          <p className="tick-label text-dim mt-2">
            fabbisogno stimato <span className="text-ink font-semibold">{fmt(d.demandGB)} GB</span>{" "}
            · budget allocabile sulla macchina{" "}
            <span className="text-ink font-semibold">{fmt(d.budgetGB)} GB</span> ·{" "}
            {fmt((d.demandGB / Math.max(0.1, d.budgetGB)) * 100, 0)}% di utilizzo teorico
          </p>
        </div>
      </div>
    </div>
  );
}
