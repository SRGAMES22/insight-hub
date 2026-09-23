import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  delay = 0,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "brand";
  delay?: number;
  children?: ReactNode;
}) {
  return (
    <div className="glass-panel rise p-4" style={{ animationDelay: `${delay}s` }}>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={
          tone === "brand"
            ? "num mt-2 text-3xl leading-none font-semibold text-brand"
            : "num mt-2 text-3xl leading-none font-semibold"
        }
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}
