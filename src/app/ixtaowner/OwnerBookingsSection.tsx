"use client";

import { useState, useMemo } from "react";

export type OwnerBookingItem = {
  id: string;
  displayId: string;
  renterName: string;
  renterEmail?: string;
  startDate: string;
  endDate: string;
  boxModel: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  paymentStatus: "Pending" | "Completed" | "Refunded" | "Failed";
  amount: number;
  currency: string;
  lockPin?: number;
};

const STATUS_TABS: { id: "all" | "upcoming" | "active" | "completed" | "cancelled"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Reserved" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "upcoming":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "completed":
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    case "cancelled":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

function paymentColor(status: string) {
  switch (status) {
    case "Completed":
      return "text-emerald-400";
    case "Refunded":
      return "text-amber-400";
    case "Pending":
      return "text-amber-400";
    case "Failed":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export default function OwnerBookingsSection({ bookings }: { bookings: OwnerBookingItem[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "active" | "completed" | "cancelled">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <section>
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-sm font-semibold text-white">Bookings</h2>
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500 md:px-6">
            No bookings in this category.
          </div>
        ) : (
          filtered.map((b) => {
            const isExpanded = expandedId === b.id;
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            return (
              <div
                key={b.id}
                className={`py-4 transition-colors ${
                  b.status === "cancelled" ? "bg-red-500/5" : b.status === "active" ? "bg-emerald-500/5" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-cyan-400">{b.displayId}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusColor(b.status)}`}>
                        {b.status === "upcoming" ? "Reserved" : b.status}
                      </span>
                      <span className={`text-xs font-medium ${paymentColor(b.paymentStatus)}`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-white">{b.renterName}</p>
                    <p className="text-sm text-slate-500">
                      {start.toLocaleDateString()} – {end.toLocaleDateString()} · {b.boxModel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-white">
                      {b.currency} {b.amount.toLocaleString()}
                    </p>
                    <svg
                      className={`mt-1 h-4 w-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2 text-sm">
                    {b.renterEmail && (
                      <p><span className="text-slate-500">Email</span> <span className="text-slate-200">{b.renterEmail}</span></p>
                    )}
                    {b.lockPin != null && (
                      <p><span className="text-slate-500">Lock PIN</span> <span className="font-mono text-slate-200">{b.lockPin}</span></p>
                    )}
                    <p><span className="text-slate-500">Payment</span> <span className={paymentColor(b.paymentStatus)}>{b.paymentStatus}</span></p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
