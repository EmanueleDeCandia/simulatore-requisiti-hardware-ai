import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { fmt, type MemSegment } from "../lib/engine";

/* ================================================================
   BudgetBar — barra VRAM scomposta + marcatori MIN/MED/IDEAL/TUO
   ================================================================ */

export interface Marker {
  label: string;
  value: number;
  color: string;
}

export function BudgetBar({
  segments,
  markers,
  scaleMax,
}: {
  segments: MemSegment[];
  markers: Marker[];
  scaleMax: number;
}) {
  const max = Math.max(scaleMax, 0.5);
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  const total = segments.reduce((a, s) => a + s.gb, 0);

  return (
    <div>
      <div className="relative h-[86px]">
        {markers.map((mk, i) => (
          <div
            key={mk.label}
            className="absolute bottom-0 top-0"
            style={{ left: `${pct(mk.value)}%` }}
          >
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap tick-label font-semibold"
              style={{ color: mk.color, top: i % 2 === 0 ? 0 : 15 }}
            >
              {mk.label}
            </div>
            <div
              className="absolute w-px bottom-0"
              style={{ background: mk.color, opacity: 0.65, top: 30 }}
            />
          </div>
        ))}
        <div className="absolute left-0 right-0 bottom-0 h-8 flex rounded-[5px] overflow-hidden border border-line2 bg-inset">
          {segments.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${fmt(s.gb)} GB`}
              className="h-full bar-anim border-r border-bg/60 last:border-r-0 hover:brightness-125 cursor-help"
              style={{ width: `${pct(s.gb)}%`, background: s.color }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
        {segments.map((s) => (
          <span key={s.key} className="tick-label flex items-center gap-1.5 text-mut">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.label} · <span className="text-ink font-semibold">{fmt(s.gb)} GB</span>
          </span>
        ))}
        <span className="tick-label ml-auto text-dim">
          totale <span className="text-ink font-semibold">{fmt(total)} GB</span>
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   GaugeChart — arco semicircolare domanda/budget
   ================================================================ */

export function GaugeChart({
  pct,
  color,
  caption,
  sub,
}: {
  pct: number;
  color: string;
  caption: string;
  sub?: string;
}) {
  const R = 84;
  const C = Math.PI * R;
  const clamped = Math.max(0, Math.min(pct, 100));
  const safe = Number.isFinite(pct) ? pct : 0;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 128" className="w-full max-w-[250px]">
        <path
          d="M 26 118 A 84 84 0 0 1 194 118"
          fill="none"
          stroke="#1c3138"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M 26 118 A 84 84 0 0 1 194 118"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * C} ${C + 20}`}
          className="gauge-arc"
        />
        <text
          x="110"
          y="94"
          textAnchor="middle"
          className="fill-ink"
          style={{ font: "700 27px 'Chakra Petch', sans-serif" }}
        >
          {fmt(safe, 0)}%
        </text>
        <text
          x="110"
          y="113"
          textAnchor="middle"
          style={{
            font: "600 9.5px 'IBM Plex Mono', monospace",
            fill: "#93aca8",
            letterSpacing: "0.1em",
          }}
        >
          {caption}
        </text>
      </svg>
      {sub && <p className="tick-label text-dim text-center mt-1 leading-relaxed">{sub}</p>}
    </div>
  );
}

/* ================================================================
   SensitivityChart — linee SVG con crosshair interattivo
   ================================================================ */

export interface Series {
  name: string;
  color: string;
  values: number[];
}

export function SensitivityChart({
  title,
  xLabel,
  xValues,
  xFormat,
  series,
  currentValue,
  unit = "GB",
}: {
  title: string;
  xLabel: string;
  xValues: number[];
  xFormat: (n: number) => string;
  series: Series[];
  currentValue?: number;
  unit?: string;
}) {
  const W = 600;
  const H = 252;
  const PL = 46;
  const PR = 14;
  const PT = 18;
  const PB = 34;
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const yMax = Math.max(1, ...(all.length ? all : [1])) * 1.15;
  const n = xValues.length;
  const x = (i: number) => PL + (i / (n - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - Math.min(v, yMax) / yMax) * (H - PT - PB);

  const curIdx =
    currentValue !== undefined
      ? xValues.reduce(
          (best, xv, i) =>
            Math.abs(xv - currentValue) < Math.abs(xValues[best] - currentValue) ? i : best,
          0,
        )
      : null;

  const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((mx - PL) / (W - PL - PR)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const yTicks = [0.25, 0.5, 0.75, 1].map((t) => yMax * t);

  return (
    <div className="panel panel-hover p-4 md:p-5 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display font-semibold text-[14px] tracking-[0.08em] uppercase text-ink">
          {title}
        </h3>
        <div className="flex gap-3.5">
          {series.map((s) => (
            <span key={s.name} className="tick-label flex items-center gap-1.5 text-mut">
              <span className="w-3 h-[3px] rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#16282f" strokeWidth="1" />
              <text
                x={PL - 8}
                y={y(t) + 3.5}
                textAnchor="end"
                style={{ font: "10px 'IBM Plex Mono', monospace", fill: "#5f7b77" }}
              >
                {fmt(t, t >= 20 ? 0 : 1)}
              </text>
            </g>
          ))}
          <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke="#2b4750" strokeWidth="1" />
          {xValues.map((xv, i) => (
            <text
              key={`${xv}-${i}`}
              x={x(i)}
              y={H - PB + 17}
              textAnchor="middle"
              style={{ font: "9.5px 'IBM Plex Mono', monospace", fill: "#5f7b77" }}
            >
              {xFormat(xv)}
            </text>
          ))}
          <text
            x={PL}
            y={H - 4}
            style={{ font: "9px 'IBM Plex Mono', monospace", fill: "#5f7b77", letterSpacing: "0.1em" }}
          >
            {xLabel.toUpperCase()} →
          </text>
          {curIdx !== null && (
            <g>
              <line
                x1={x(curIdx)}
                x2={x(curIdx)}
                y1={PT - 2}
                y2={H - PB}
                stroke="#f2b34c"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity="0.7"
              />
              <text
                x={x(curIdx)}
                y={PT - 6}
                textAnchor="middle"
                style={{ font: "600 9px 'IBM Plex Mono', monospace", fill: "#f2b34c", letterSpacing: "0.1em" }}
              >
                ATTUALE
              </text>
            </g>
          )}
          {series.map((s) => (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={hover === i ? 4.2 : 2.3}
                  fill={s.color}
                  className="transition-all duration-150"
                />
              ))}
            </g>
          ))}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PT - 2}
              y2={H - PB}
              stroke="#93aca8"
              strokeWidth="1"
              opacity="0.45"
            />
          )}
        </svg>
        {hover !== null && (
          <div
            className="absolute pointer-events-none inset-box bg-panel px-3 py-2 text-[11px] font-mono shadow-[0_12px_30px_rgba(3,10,12,0.6)] z-10"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: 10,
              transform: hover > n / 2 ? "translateX(-112%)" : "translateX(14px)",
            }}
          >
            <div className="tick-label text-mut mb-1.5">
              {xLabel}: <span className="text-ink">{xFormat(xValues[hover])}</span>
            </div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-2 whitespace-nowrap py-[1px]">
                <span className="w-2 h-2 rounded-[2px]" style={{ background: s.color }} />
                <span className="text-mut">{s.name}</span>
                <span className="text-ink font-semibold ml-auto pl-4">
                  {fmt(s.values[hover])} {unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
