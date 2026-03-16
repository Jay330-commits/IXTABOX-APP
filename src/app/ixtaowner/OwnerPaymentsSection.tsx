"use client";

import { useState } from "react";

export type OwnerPaymentItem = {
  id: string;
  amount: number;
  currency: string;
  status: "Completed" | "Pending" | "Refunded" | "Failed";
  method: string;
  date: string;
  completedAt?: string;
  chargeId?: string;
  bookingDisplayId?: string;
  renterName?: string;
};

function paymentStatusColor(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Refunded":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Failed":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

export default function OwnerPaymentsSection({ payments }: { payments: OwnerPaymentItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white">Payments</h2>
        <p className="mt-0.5 text-xs text-slate-500">Payment history for your bookings</p>
      </div>
      <div className="divide-y divide-slate-800">
        {payments.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No payments yet.
          </div>
        ) : (
          payments.map((p) => {
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="py-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {p.currency} {p.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">{p.method}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${paymentStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                    <svg
                      className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                    <p><span className="text-slate-500">Date</span> <span className="text-slate-200">{p.date}</span></p>
                    {p.bookingDisplayId && (
                      <p><span className="text-slate-500">Booking</span> <span className="font-mono text-cyan-400">{p.bookingDisplayId}</span></p>
                    )}
                    {p.renterName && (
                      <p><span className="text-slate-500">Renter</span> <span className="text-slate-200">{p.renterName}</span></p>
                    )}
                    {p.chargeId && (
                      <p><span className="text-slate-500">Charge ID</span> <span className="font-mono text-slate-400 break-all">{p.chargeId}</span></p>
                    )}
                    {p.completedAt && (
                      <p><span className="text-slate-500">Completed</span> <span className="text-slate-200">{new Date(p.completedAt).toLocaleString()}</span></p>
                    )}
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
