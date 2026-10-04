import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { fmt, type CheckStatus } from "../lib/engine";

/* ---------- scroll reveal ---------- */

export function Reveal({
  children,
  className,
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      id={id}
      ref={ref}
      className={cn("reveal", inView && "is-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- section head ---------- */

export function SectionHead({
  index,
  title,
  sub,
  right,
}: {
  index: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="tick-label text-amber">{index}</span>
          <h2 className="font-display text-lg md:text-xl font-semibold tracking-[0.06em] text-ink uppercase">
            {title}
          </h2>
        </div>
        {sub && <p className="mt-1 text-[13px] text-mut max-w-2xl leading-relaxed">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- animated number ---------- */

export function AnimatedNumber({
  value,
  digits = 1,
  className,
}: {
  value: number;
  digits?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (!Number.isFinite(to)) return;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const dur = 450;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{fmt(Number.isFinite(display) ? display : 0, digits)}</span>;
}

/* ---------- numeric field ---------- */

export function Field({
  label,
  hint,
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("block min-w-0", disabled && "opacity-35 pointer-events-none")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-mut">{label}</span>
        {hint && <span className="tick-label text-dim truncate">{hint}</span>}
      </div>
      <div className="mt-1 flex items-center inset-box focus-within:border-amber/60 transition-colors">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : parseFloat(e.target.value))}
          className="w-full min-w-0 bg-transparent px-2.5 py-[7px] font-mono text-[13px] text-ink outline-none"
        />
        {suffix && <span className="pr-2.5 tick-label text-dim shrink-0">{suffix}</span>}
      </div>
    </label>
  );
}

/* ---------- slider field ---------- */

export function SliderField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const v = Number.isFinite(value) ? value : min;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-mut">{label}</span>
        <span className="font-mono text-[13px] font-semibold text-amber">
          {format ? format(v) : v}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1"
      />
      {hint && <div className="tick-label text-dim -mt-0.5">{hint}</div>}
    </div>
  );
}

/* ---------- segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex inset-box p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 px-2 py-[7px] rounded-[5px] text-[12px] transition-all cursor-pointer",
            value === o.value
              ? "bg-amber text-deep font-semibold shadow-[0_2px_10px_rgba(242,179,76,0.25)]"
              : "text-mut hover:text-ink hover:bg-white/5",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- select ---------- */

export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-mut">{label}</span>
        {hint && <span className="tick-label text-dim truncate">{hint}</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full inset-box bg-inset px-2.5 py-[7px] pr-7 font-mono text-[13px] text-ink outline-none focus:border-amber/60 transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- toggle ---------- */

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full gap-3 group cursor-pointer"
    >
      <span className="text-[12px] font-medium text-mut group-hover:text-ink transition-colors text-left">
        {label}
        {hint && <span className="block tick-label text-dim mt-0.5">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative w-9 h-5 rounded-full border transition-colors shrink-0",
          checked ? "bg-amber border-amber" : "bg-inset border-line2",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] w-3 h-3 rounded-full transition-all",
            checked ? "left-[19px] bg-deep" : "left-[3px] bg-mut",
          )}
        />
      </span>
    </button>
  );
}

/* ---------- status pill ---------- */

export function StatusPill({ status, className }: { status: CheckStatus; className?: string }) {
  const map: Record<CheckStatus, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "text-teal border-teal/50 bg-teal/10" },
    borderline: { label: "LIMITE", cls: "text-amber border-amber/50 bg-amber/10" },
    no: { label: "NO", cls: "text-coral border-coral/50 bg-coral/10" },
  };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-[3px] border rounded font-mono text-[10.5px] font-semibold tracking-[0.12em]",
        map[status].cls,
        className,
      )}
    >
      {map[status].label}
    </span>
  );
}

/* ---------- inline SVG icons ---------- */

type IconProps = { size?: number; className?: string };

export const IconChip = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <rect x="10" y="10" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" />
    <path d="M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3M7 9H4M7 12H4M7 15H4M20 9h-3M20 12h-3M20 15h-3" strokeLinecap="round" />
  </svg>
);

export const IconWarn = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3.5 22 20H2L12 3.5Z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17.2" r="0.4" fill="currentColor" />
  </svg>
);

export const IconCheck = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconX = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconCopy = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconArrow = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);
