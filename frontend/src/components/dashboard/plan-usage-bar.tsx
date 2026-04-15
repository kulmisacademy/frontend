"use client";

type PlanUsageBarProps = {
  label: string;
  used: number;
  max: number | null;
};

export function PlanUsageBar({ label, used, max }: PlanUsageBarProps) {
  if (max == null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used} used · <span className="text-primary">Unlimited</span>
        </span>
      </div>
    );
  }
  const pct = max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const atLimit = used >= max;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            atLimit ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
