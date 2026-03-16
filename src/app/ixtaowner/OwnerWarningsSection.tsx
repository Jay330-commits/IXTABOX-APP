"use client";

export type WarningItem = {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  actionTab?: string;
};

const typeStyles = {
  error: "border-l-red-500 bg-red-500/5 text-red-200",
  warning: "border-l-amber-500 bg-amber-500/5 text-amber-200",
  info: "border-l-cyan-500 bg-cyan-500/5 text-cyan-200",
};

export default function OwnerWarningsSection({
  warnings,
  onActionTab,
}: {
  warnings: WarningItem[];
  onActionTab?: (tab: string) => void;
}) {
  if (warnings.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-white mb-6">Warnings & alerts</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-slate-500">No warnings. You're all set.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-white">Warnings & alerts</h2>
        <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
          {warnings.length} alert{warnings.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ul className="divide-y divide-slate-800">
        {warnings.map((w) => (
          <li key={w.id} className={`border-l-4 py-4 pl-4 ${typeStyles[w.type]}`}>
            <p className="font-medium">{w.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{w.message}</p>
            {(w.actionLabel && (w.actionHref || w.actionTab)) && (
              <div className="mt-3">
                {w.actionHref ? (
                  <a href={w.actionHref} className="text-sm font-medium underline hover:no-underline opacity-90">
                    {w.actionLabel}
                  </a>
                ) : w.actionTab && onActionTab ? (
                  <button
                    type="button"
                    onClick={() => onActionTab(w.actionTab!)}
                    className="text-sm font-medium underline hover:no-underline opacity-90"
                  >
                    {w.actionLabel}
                  </button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
