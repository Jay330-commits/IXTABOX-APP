"use client";

import { useState, useMemo } from "react";

export type DateOverride = "available" | "blocked";

export type OwnerBooking = {
  id: string;
  renterName: string;
  startDate: string;
  endDate: string;
  boxModel: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
  const startDay = first.getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, -offset + i + 1);
    days.push({ date: d, dateStr: d.toISOString().slice(0, 10), isCurrentMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({ date, dateStr: date.toISOString().slice(0, 10), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    days.push({ date, dateStr: date.toISOString().slice(0, 10), isCurrentMonth: false });
  }
  return days;
}

export default function OwnerCalendarSection({
  dateOverrides,
  onDateOverride,
  bookings,
}: {
  dateOverrides: Record<string, DateOverride>;
  onDateOverride: (dateStr: string, value: DateOverride) => void;
  bookings: OwnerBooking[];
}) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const bookingByDate = useMemo(() => {
    const map: Record<string, OwnerBooking[]> = {};
    bookings.forEach((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const s = d.toISOString().slice(0, 10);
        if (!map[s]) map[s] = [];
        map[s].push(b);
      }
    });
    return map;
  }, [bookings]);

  const toggleDate = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    const current = dateOverrides[dateStr];
    if (current === "blocked") onDateOverride(dateStr, "available");
    else onDateOverride(dateStr, "blocked");
  };

  const clearOverride = (dateStr: string) => {
    onDateOverride(dateStr, "available");
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const upcomingBookings = bookings
    .filter((b) => new Date(b.endDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Calendar & availability</h2>
            <p className="mt-0.5 text-xs text-slate-500">Click a date to block or unblock it</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                else setViewMonth((m) => m - 1);
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-slate-200">{monthName}</span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                else setViewMonth((m) => m + 1);
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-slate-500">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-2">{wd}</div>
            ))}
            {days.map(({ date, dateStr, isCurrentMonth }) => {
              const override = dateOverrides[dateStr];
              const hasBooking = bookingByDate[dateStr]?.length;
              const isToday = dateStr === today.toISOString().slice(0, 10);
              return (
                <div key={dateStr} className="relative flex min-h-[44px] items-center justify-center">
                  <button
                    type="button"
                    onClick={() => toggleDate(dateStr, isCurrentMonth)}
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-lg text-sm transition-colors touch-manipulation
                      ${!isCurrentMonth ? "text-slate-600 cursor-default" : ""}
                      ${isCurrentMonth && override === "blocked" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : ""}
                      ${isCurrentMonth && (override === "available" || !override) && hasBooking ? "bg-cyan-500/15 text-cyan-400" : ""}
                      ${isCurrentMonth && (override === "available" || !override) && !hasBooking ? "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50" : ""}
                      ${isToday ? "ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-slate-900" : ""}
                    `}
                  >
                    {date.getDate()}
                  </button>
                  {isCurrentMonth && override && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearOverride(dateStr); }}
                      className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-600 text-slate-400 hover:bg-red-500 hover:text-white text-[10px] leading-none"
                      title="Clear override"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-600" /> Available</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500/40" /> Blocked</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500/40" /> Booked</span>
          </div>
        </div>
      </section>

      {upcomingBookings.length > 0 && (
        <section className="border-t border-slate-800 pt-8">
          <h2 className="text-sm font-semibold text-white mb-4">Reserved bookings</h2>
          <ul className="divide-y divide-slate-800">
            {upcomingBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-white">{b.renterName}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()} · {b.boxModel}
                  </p>
                </div>
                <span className="rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-400">Reserved</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
