"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import OwnerAddressSection from "./OwnerAddressSection";
import type { OwnerAddress } from "./OwnerAddressSection";
import OwnerCalendarSection from "./OwnerCalendarSection";
import type { OwnerBooking } from "./OwnerCalendarSection";
import OwnerWarningsSection from "./OwnerWarningsSection";
import type { WarningItem } from "./OwnerWarningsSection";
import OwnerMessagesSection from "./OwnerMessagesSection";
import type { MessageThread, Message } from "./OwnerMessagesSection";
import OwnerBookingsSection from "./OwnerBookingsSection";
import type { OwnerBookingItem } from "./OwnerBookingsSection";
import { useOwnerNav } from "./OwnerNavContext";
import type { TabId } from "./OwnerNavContext";
import { getAddressFromLocation } from "./getAddressFromLocation";
import OwnerPostSidebar from "@/components/layouts/OwnerPostSidebar";
import OwnerPostBody from "@/components/layouts/OwnerPostBody";
import { TimePickerField } from "@/components/ui/TimePickerField";

function getDefaultFrom() {
  return new Date().toISOString().slice(0, 10);
}
function getDefaultTo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

type TimeRange = { start: string; end: string };
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekSchedule = Record<DayKey, TimeRange[]>;

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Calendar-style single letters: M T W T F S S */
const DAY_LETTER: Record<DayKey, string> = {
  mon: "M", tue: "T", wed: "W", thu: "T", fri: "F", sat: "S", sun: "S",
};

const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const EMPTY_SCHEDULE: WeekSchedule = {
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
};

const MIN_SLOT_MINUTES = 60;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
function slotDurationMinutes(slot: TimeRange): number {
  let end = timeToMinutes(slot.end);
  if (end <= timeToMinutes(slot.start)) end += 24 * 60;
  return end - timeToMinutes(slot.start);
}
function slotsOverlap(a: TimeRange, b: TimeRange): boolean {
  const aS = timeToMinutes(a.start);
  const aE = timeToMinutes(a.end);
  const bS = timeToMinutes(b.start);
  const bE = timeToMinutes(b.end);
  return aS < bE && bS < aE;
}
/** Clamp slot to at least MIN_SLOT_MINUTES duration (same day). */
function clampSlotToMinDuration(slot: TimeRange): TimeRange {
  let start = timeToMinutes(slot.start);
  let end = timeToMinutes(slot.end);
  if (end <= start) end += 24 * 60;
  if (end - start < MIN_SLOT_MINUTES) end = start + MIN_SLOT_MINUTES;
  const out: TimeRange = { start: minutesToTime(start), end: minutesToTime(end % (24 * 60)) };
  if (out.end === "00:00" && end >= 24 * 60) out.end = "23:59";
  return out;
}
/** True if slot overlaps any in the list, excluding excludeIndex. */
function overlapsAny(slot: TimeRange, slots: TimeRange[], excludeIndex: number): boolean {
  return slots.some((s, i) => i !== excludeIndex && slotsOverlap(slot, s));
}

function is24h(slot: TimeRange) {
  return (slot.start === "00:00" && slot.end === "24:00") || (slot.start === "00:00" && slot.end === "23:59");
}
function formatSlot(slot: TimeRange) {
  return is24h(slot) ? "24h" : `${slot.start}–${slot.end}`;
}
function formatScheduleForDisplay(schedule: WeekSchedule): string {
  const parts: string[] = [];
  DAY_ORDER.forEach((key) => {
    const slots = schedule[key];
    if (slots.length > 0) {
      const ranges = slots.map(formatSlot).join(", ");
      parts.push(`${DAY_LABELS[key].slice(0, 3)} ${ranges}`);
    }
  });
  return parts.length ? parts.join(" · ") : "Not set";
}

type PostedBox = {
  id: string;
  model: "Pro 175" | "Pro 190";
  availableFrom: string;
  availableTo: string;
  untilFurtherNotice: boolean;
  schedule: WeekSchedule;
  pricePerDay: number;
  status: "active" | "paused";
  address?: OwnerAddress;
};

const EMPTY_ADDRESS: OwnerAddress = { line1: "", line2: "", city: "", postalCode: "", country: "Sweden", instructions: "" };

const INITIAL_BOXES: PostedBox[] = [
  {
    id: "box-1",
    model: "Pro 175",
    availableFrom: getDefaultFrom(),
    availableTo: getDefaultTo(),
    untilFurtherNotice: false,
    schedule: { ...EMPTY_SCHEDULE },
    pricePerDay: 300,
    status: "active",
    address: undefined,
  },
];

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-3 text-base text-white placeholder-slate-500 focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors touch-manipulation min-h-[48px] md:min-h-0 md:py-2.5 md:text-sm";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

function BoxScheduleCollapse({ box, onUpdate }: { box: PostedBox; onUpdate: (p: Partial<PostedBox>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-700/60 pt-2 mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg py-2 text-left text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        aria-label={open ? "Minimise" : "Edit availability and schedule"}
      >
        <span>{open ? "" : "Edit availability & schedule"}</span>
        <span className="text-slate-500 inline-flex items-center justify-center w-6" aria-hidden>{open ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg> : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-2 min-w-0" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <div className="min-w-0">
              <label className={labelClass}>Available from</label>
              <input type="date" value={box.availableFrom} onChange={(e) => onUpdate({ availableFrom: e.target.value })} className={inputClass + " min-w-0"} />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Available to</label>
              {box.untilFurtherNotice ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-cyan-400">Until further notice</div>
              ) : (
                <input type="date" value={box.availableTo} onChange={(e) => onUpdate({ availableTo: e.target.value })} className={inputClass + " min-w-0"} />
              )}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2.5 hover:bg-slate-800/50 transition-colors">
            <input
              type="checkbox"
              checked={box.untilFurtherNotice}
              onChange={(e) => onUpdate({ untilFurtherNotice: e.target.checked })}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">No end date (until further notice)</span>
          </label>
          <WeekScheduleEditor schedule={box.schedule} onChange={(s) => onUpdate({ schedule: s })} />
        </div>
      )}
    </div>
  );
}

function boxAddressSummary(addr: OwnerAddress): string {
  const parts = [addr.line1, addr.line2, [addr.postalCode, addr.city].filter(Boolean).join(" "), addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

function BoxAddressCollapse({ box, onUpdate }: { box: PostedBox; onUpdate: (p: Partial<PostedBox>) => void }) {
  const [open, setOpen] = useState(false);
  const addr = box.address ?? EMPTY_ADDRESS;
  const hasAddress = !!(addr.line1.trim() || addr.city.trim() || addr.postalCode.trim());

  const [form, setForm] = useState<OwnerAddress>(addr);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const toggleOpen = () => {
    if (!open) setForm(box.address ? { ...box.address } : { ...EMPTY_ADDRESS });
    setOpen(!open);
  };

  const handleUseMyLocation = async () => {
    setLocationError(null);
    setLocationLoading(true);
    try {
      const partial = await getAddressFromLocation();
      setForm((prev) => ({ ...prev, ...partial }));
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Could not get location");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSave = () => {
    onUpdate({ address: { ...form } });
    setOpen(false);
  };

  return (
    <div className="border-t border-slate-700/60 pt-2 mt-2 min-w-0 max-w-full">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg py-2 text-left text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        aria-label={open ? "Minimise" : "Pickup address"}
      >
        <span className="min-w-0 truncate">{open ? <span className="inline-flex items-center justify-center w-6 text-slate-500" aria-hidden><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></span> : "Pickup address"}</span>
        <span className="flex-shrink-0 text-slate-500">{hasAddress ? "· Set" : "· Not set"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4 min-w-0">
          {!hasAddress && !form.line1 && !form.city && (
            <p className="text-sm text-slate-500">Add where renters collect and return this box.</p>
          )}
          {hasAddress && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-sm text-slate-300 break-words min-w-0">
              {boxAddressSummary(addr)}
              {addr.instructions && <p className="mt-1.5 text-slate-500">Small details: {addr.instructions}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationLoading}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors touch-manipulation disabled:opacity-50"
          >
            {locationLoading ? "Getting location…" : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Use my location
              </>
            )}
          </button>
          {locationError && <p className="text-sm text-red-400">{locationError}</p>}
          <div className="space-y-3">
            <label className={labelClass}>Street address</label>
            <input type="text" value={form.line1} onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))} placeholder="Street and number" className={inputClass} />
            <label className={labelClass}>Address line 2 (optional)</label>
            <input type="text" value={form.line2} onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))} placeholder="Apartment, floor" className={inputClass} />
            <div className="grid grid-cols-2 gap-3 min-w-0" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
              <div className="min-w-0">
                <label className={labelClass}>City</label>
                <input type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" className={inputClass + " min-w-0"} />
              </div>
              <div className="min-w-0">
                <label className={labelClass}>Postal code</label>
                <input type="text" value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} placeholder="Postal code" className={inputClass + " min-w-0"} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} placeholder="e.g. Sweden" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Small details (optional)</label>
              <textarea value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="e.g. gate code, parking, call on arrival" rows={2} className={inputClass + " resize-none"} />
              <p className="mt-1 text-xs text-slate-500">Anyone can add small details here.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(addr)} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Reset</button>
            <button type="button" onClick={handleSave} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-400 transition-colors">Save address</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Time slots editor for one day (shared by strip + calendar views) */
function DaySlotsEditor({
  dayKey,
  slots,
  onUpdate,
  onApplyToAllDays,
  onApplyToOtherDays,
}: {
  dayKey: DayKey;
  slots: TimeRange[];
  onUpdate: (slots: TimeRange[]) => void;
  onApplyToAllDays?: () => void;
  onApplyToOtherDays?: (targetDays: DayKey[]) => void;
}) {
  const [showApplyToOthers, setShowApplyToOthers] = useState(false);
  const [applyTargets, setApplyTargets] = useState<Set<DayKey>>(new Set());
  const label = DAY_LABELS[dayKey];
  const otherDays = DAY_ORDER.filter((d) => d !== dayKey);
  const canApply = slots.length > 0 && (onApplyToAllDays != null || onApplyToOtherDays != null);

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const newStart = last?.end ?? "09:00";
    const startM = timeToMinutes(newStart);
    const endM = startM + MIN_SLOT_MINUTES;
    if (endM > 24 * 60) return; // no room for 60 min same day
    const newSlot: TimeRange = { start: newStart, end: minutesToTime(endM) };
    if (overlapsAny(newSlot, [...slots, newSlot], slots.length)) return;
    onUpdate([...slots, newSlot]);
  };
  const updateSlot = (idx: number, next: TimeRange) => {
    const clamped = clampSlotToMinDuration(next);
    if (slotDurationMinutes(clamped) < MIN_SLOT_MINUTES) return;
    const nextSlots = slots.map((s, i) => (i === idx ? clamped : s));
    if (overlapsAny(clamped, nextSlots, idx)) return;
    onUpdate(nextSlots);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
      </div>
      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">Add a time window for {label}</p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot, idx) => (
            <div key={idx} className="flex flex-nowrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 p-2">
              <TimePickerField
                value={slot.start}
                onChange={(v) => updateSlot(idx, { ...slot, start: v ?? "00:00" })}
                className="time-picker-field-dark w-[5.5rem] max-w-[45%] min-w-0 shrink-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
              <span className="text-slate-500 shrink-0">–</span>
              <TimePickerField
                value={slot.end === "23:59" ? "23:00" : slot.end}
                onChange={(v) => updateSlot(idx, { ...slot, end: v === "23:00" ? "23:59" : (v ?? "23:59") })}
                className="time-picker-field-dark w-[5.5rem] max-w-[45%] min-w-0 shrink-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
              <button type="button" onClick={() => onUpdate([{ start: "00:00", end: "23:59" }])} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10">24h</button>
              <button type="button" onClick={() => onUpdate(slots.filter((_, i) => i !== idx))} className="ml-auto shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label="Remove slot">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={addSlot} className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors">+ Add time</button>
        {slots.length === 0 && (
          <button type="button" onClick={() => onUpdate([{ start: "00:00", end: "23:59" }])} className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors">24 hours</button>
        )}
      </div>

      {canApply && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700 pt-3">
          {onApplyToAllDays && (
            <button type="button" onClick={onApplyToAllDays} className="rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/25">
              Apply to all days
            </button>
          )}
          {onApplyToOtherDays && (
            <>
              <button type="button" onClick={() => setShowApplyToOthers((v) => !v)} className="rounded-md px-2.5 py-1 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 inline-flex items-center gap-1" aria-label={showApplyToOthers ? "Minimise" : "Apply to selected days"}>
                {showApplyToOthers ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg> : "Apply to selected days…"}
              </button>
              {showApplyToOthers && (
                <div className="flex w-full flex-wrap items-center gap-1.5">
                  {otherDays.map((d) => (
                    <label key={d} className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700/50">
                      <input type="checkbox" checked={applyTargets.has(d)} onChange={() => setApplyTargets((prev) => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n; })} className="rounded border-slate-500 bg-slate-800 text-cyan-500" />
                      {DAY_LABELS[d].slice(0, 3)}
                    </label>
                  ))}
                  <button type="button" onClick={() => { onApplyToOtherDays(Array.from(applyTargets)); setApplyTargets(new Set()); setShowApplyToOthers(false); }} disabled={applyTargets.size === 0} className="rounded-md bg-cyan-500/15 px-2 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/25 disabled:opacity-50">
                    Apply
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Weekly schedule: horizontal day strip on top (M T W T F S S), tap to select days and set hours */
function WeekScheduleEditor({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) {
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  const updateDay = (day: DayKey, slots: TimeRange[]) => {
    onChange({ ...schedule, [day]: slots });
  };

  const handleDayTap = (day: DayKey) => {
    const slots = schedule[day] ?? [];
    const isCurrentlySelected = selectedDay === day;
    if (slots.length > 0 && isCurrentlySelected) {
      removeDay(day);
      return;
    }
    if (slots.length === 0) {
      updateDay(day, [{ start: "09:00", end: "17:00" }]);
    }
    setSelectedDay(day);
  };

  const removeDay = (day: DayKey) => {
    updateDay(day, []);
    if (selectedDay === day) setSelectedDay(null);
  };

  const addedDays = DAY_ORDER.filter((key) => (schedule[key]?.length ?? 0) > 0);

  const applySlotsToDays = (sourceSlots: TimeRange[], targetDays: DayKey[]) => {
    const copy = sourceSlots.map((s) => ({ ...s }));
    let next = { ...schedule };
    targetDays.forEach((d) => { next = { ...next, [d]: copy.map((x) => ({ ...x })) }; });
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Select days</p>
      <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-full" role="group" aria-label="Select days of the week">
        {DAY_ORDER.map((key) => {
          const hasSlots = (schedule[key]?.length ?? 0) > 0;
          const isSelected = selectedDay === key;
          return (
            <div key={key} className="relative min-w-0">
              <button
                type="button"
                onClick={() => handleDayTap(key)}
                title={hasSlots ? `${DAY_LABELS[key]} – edit hours` : `${DAY_LABELS[key]} – add`}
                aria-pressed={hasSlots}
                aria-label={`${DAY_LABELS[key]}, ${hasSlots ? "available" : "not selected"}`}
                className={`flex h-10 w-full min-h-[44px] sm:h-12 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation ${
                  isSelected
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-105"
                    : hasSlots
                      ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                }`}
              >
                {DAY_LETTER[key]}
              </button>
              {hasSlots && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeDay(key); }}
                  title={`Remove ${DAY_LABELS[key]}`}
                  aria-label={`Remove ${DAY_LABELS[key]}`}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:bg-red-500 hover:text-white transition-colors text-xs leading-none touch-manipulation shadow"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
        {selectedDay ? (
            <>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => setSelectedDay(null)} className="rounded-md p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center" aria-label="Minimise">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
            </div>
            <DaySlotsEditor
              dayKey={selectedDay}
              slots={schedule[selectedDay] ?? []}
              onUpdate={(slots) => updateDay(selectedDay, slots)}
              onApplyToAllDays={selectedDay ? () => {
                const slots = schedule[selectedDay] ?? [];
                if (slots.length > 0) applySlotsToDays(slots, DAY_ORDER);
              } : undefined}
              onApplyToOtherDays={selectedDay ? (targetDays: DayKey[]) => {
                const slots = schedule[selectedDay] ?? [];
                if (slots.length > 0) applySlotsToDays(slots, targetDays);
              } : undefined}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500 text-center py-2">Tap a day to add or edit. Tap the × on a day to remove it.</p>
        )}
      </div>
    </div>
  );
}

const MOCK_BOOKINGS: OwnerBooking[] = [
  { id: "b1", renterName: "Anna K.", startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), boxModel: "Pro 175" },
  { id: "b2", renterName: "Erik L.", startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), boxModel: "Pro 190" },
];

function buildOwnerBookingItems(): OwnerBookingItem[] {
  const in3 = new Date(Date.now() + 3 * 86400000);
  const in6 = new Date(Date.now() + 6 * 86400000);
  const in14 = new Date(Date.now() + 14 * 86400000);
  const in18 = new Date(Date.now() + 18 * 86400000);
  const past1 = new Date(Date.now() - 10 * 86400000);
  const past2 = new Date(Date.now() - 5 * 86400000);
  const yesterday = new Date(Date.now() - 86400000);
  const in5 = new Date(Date.now() + 5 * 86400000);
  return [
    { id: "ob1", displayId: "BX-001", renterName: "Anna K.", renterEmail: "anna@example.com", startDate: in3.toISOString().slice(0, 10), endDate: in6.toISOString().slice(0, 10), boxModel: "Pro 175", status: "upcoming", paymentStatus: "Completed", amount: 1200, currency: "SEK", lockPin: 1234 },
    { id: "ob2", displayId: "BX-002", renterName: "Erik L.", renterEmail: "erik@example.com", startDate: in14.toISOString().slice(0, 10), endDate: in18.toISOString().slice(0, 10), boxModel: "Pro 190", status: "upcoming", paymentStatus: "Completed", amount: 1500, currency: "SEK", lockPin: 5678 },
    { id: "ob3", displayId: "BX-003", renterName: "Lars M.", renterEmail: "lars@example.com", startDate: yesterday.toISOString().slice(0, 10), endDate: in5.toISOString().slice(0, 10), boxModel: "Pro 175", status: "active", paymentStatus: "Completed", amount: 1800, currency: "SEK", lockPin: 9012 },
    { id: "ob4", displayId: "BX-004", renterName: "Maria S.", startDate: past2.toISOString().slice(0, 10), endDate: past1.toISOString().slice(0, 10), boxModel: "Pro 175", status: "completed", paymentStatus: "Completed", amount: 900, currency: "SEK" },
    { id: "ob5", displayId: "BX-005", renterName: "Johan P.", startDate: past1.toISOString().slice(0, 10), endDate: past2.toISOString().slice(0, 10), boxModel: "Pro 190", status: "cancelled", paymentStatus: "Refunded", amount: 0, currency: "SEK" },
  ];
}

function buildMockThreads(): MessageThread[] {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  return [
    {
      bookingId: "b1",
      renterName: "Anna K.",
      renterEmail: "anna@example.com",
      bookingDates: new Date(Date.now() + 3 * 86400000).toLocaleDateString() + " – " + new Date(Date.now() + 6 * 86400000).toLocaleDateString(),
      boxModel: "Pro 175",
      messages: [
        { id: "m1", sender: "renter", text: "Hi! I’ll pick up around 10:00 on the first day. Is that OK?", createdAt: yesterday },
        { id: "m2", sender: "owner", text: "Yes, 10:00 works. I’ll leave the box by the gate.", createdAt: now },
      ],
      unreadCount: 0,
    },
    {
      bookingId: "b2",
      renterName: "Erik L.",
      renterEmail: "erik@example.com",
      bookingDates: new Date(Date.now() + 14 * 86400000).toLocaleDateString() + " – " + new Date(Date.now() + 18 * 86400000).toLocaleDateString(),
      boxModel: "Pro 190",
      messages: [
        { id: "m3", sender: "renter", text: "Do you have a roof rack or do I need to bring my own?", createdAt: now },
      ],
      unreadCount: 1,
    },
  ];
}

export default function IxtaownerPostPage() {
  const { activeTab, setActiveTab } = useOwnerNav();
  const [boxes, setBoxes] = useState<PostedBox[]>(INITIAL_BOXES);
  const [showForm, setShowForm] = useState(false);
  const [newModel, setNewModel] = useState<"Pro 175" | "Pro 190">("Pro 175");
  const [newAvailableFrom, setNewAvailableFrom] = useState(getDefaultFrom);
  const [newAvailableTo, setNewAvailableTo] = useState(getDefaultTo);
  const [newUntilFurtherNotice, setNewUntilFurtherNotice] = useState(false);
  const [newSchedule, setNewSchedule] = useState<WeekSchedule>(() => ({ ...EMPTY_SCHEDULE }));
  const [newPrice, setNewPrice] = useState(300);
  const [newAddress, setNewAddress] = useState<OwnerAddress>({ ...EMPTY_ADDRESS });
  const [addFormLocationLoading, setAddFormLocationLoading] = useState(false);
  const [addFormLocationError, setAddFormLocationError] = useState<string | null>(null);

  const [address, setAddress] = useState<OwnerAddress>({ ...EMPTY_ADDRESS });
  const [dateOverrides, setDateOverrides] = useState<Record<string, "available" | "blocked">>({});
  const [bookings] = useState<OwnerBooking[]>(MOCK_BOOKINGS);
  const [ownerBookings] = useState<OwnerBookingItem[]>(buildOwnerBookingItems);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>(buildMockThreads);

  const handleDateOverride = (dateStr: string, value: "available" | "blocked") => {
    if (value === "available") {
      setDateOverrides((prev) => { const n = { ...prev }; delete n[dateStr]; return n; });
    } else {
      setDateOverrides((prev) => ({ ...prev, [dateStr]: value }));
    }
  };

  const handleSendMessage = (bookingId: string, text: string) => {
    const thread = messageThreads.find((t) => t.bookingId === bookingId);
    if (!thread) return;
    const newMsg: Message = { id: `msg-${Date.now()}`, sender: "owner", text, createdAt: new Date().toISOString() };
    setMessageThreads((prev) =>
      prev.map((t) => (t.bookingId === bookingId ? { ...t, messages: [...t.messages, newMsg] } : t))
    );
  };

  const handleMarkRead = (bookingId: string) => {
    setMessageThreads((prev) => prev.map((t) => (t.bookingId === bookingId ? { ...t, unreadCount: 0 } : t)));
  };

  const warnings = useMemo((): WarningItem[] => {
    const list: WarningItem[] = [];
    if (!address.line1.trim() && !address.city.trim()) {
      list.push({ id: "no-address", type: "warning", title: "Add your pickup address", message: "Renters need to know where to collect and return the box.", actionLabel: "Add address", actionTab: "address" });
    }
    const hasSchedule = boxes.some((b) => DAY_ORDER.some((d) => (b.schedule[d]?.length ?? 0) > 0));
    if (boxes.length > 0 && !hasSchedule) {
      list.push({ id: "no-schedule", type: "warning", title: "Set weekly availability", message: "You have listings but no hours set. Set when you're available in each listing.", actionLabel: "Edit listings", actionTab: "listings" });
    }
    const unread = messageThreads.reduce((acc, t) => acc + t.unreadCount, 0);
    if (unread > 0) {
      list.push({ id: "unread-msg", type: "info", title: `${unread} unread message${unread !== 1 ? "s" : ""}`, message: "Reply to renters in the Messages tab.", actionLabel: "Open Messages", actionTab: "messages" });
    }
    const soon = bookings.filter((b) => {
      const start = new Date(b.startDate).getTime();
      const inDays = (start - Date.now()) / 86400000;
      return inDays >= 0 && inDays <= 2;
    });
    if (soon.length > 0) {
      list.push({ id: "booking-soon", type: "info", title: `Booking${soon.length !== 1 ? "s" : ""} in the next 2 days`, message: `Confirm handover with ${soon.map((b) => b.renterName).join(", ")}.`, actionLabel: "View Messages", actionTab: "messages" });
    }
    return list;
  }, [address, boxes, messageThreads, bookings]);

  const handleAddBox = () => {
    const id = `box-${Date.now()}`;
    const hasNewAddress = !!(newAddress.line1.trim() || newAddress.city.trim() || newAddress.postalCode.trim());
    setBoxes([
      ...boxes,
      {
        id,
        model: newModel,
        availableFrom: newAvailableFrom,
        availableTo: newAvailableTo,
        untilFurtherNotice: newUntilFurtherNotice,
        schedule: newSchedule,
        pricePerDay: newPrice,
        status: "active",
        address: hasNewAddress ? { ...newAddress } : undefined,
      },
    ]);
    setShowForm(false);
    setNewAvailableFrom(getDefaultFrom());
    setNewAvailableTo(getDefaultTo());
    setNewUntilFurtherNotice(false);
    setNewSchedule({ ...EMPTY_SCHEDULE });
    setNewAddress({ ...EMPTY_ADDRESS });
  };

  const [boxToRemove, setBoxToRemove] = useState<string | null>(null);
  const handleRemoveBox = (id: string) => {
    setBoxes(boxes.filter((b) => b.id !== id));
    setBoxToRemove(null);
  };

  const toggleStatus = (id: string) => {
    setBoxes(boxes.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "paused" : "active" } : b)));
  };

  const updateBox = (boxId: string, patch: Partial<PostedBox>) => {
    setBoxes(boxes.map((b) => (b.id === boxId ? { ...b, ...patch } : b)));
  };

  const boxList = boxes.map((box) => (
    <article
      key={box.id}
      className={`relative border-t border-slate-800 pt-6 first:border-t-0 first:pt-0 ${box.status === "paused" ? "opacity-80" : ""}`}
    >
      {/* Full-height bracket bars surrounding all box information */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-2 rounded-r bg-cyan-500/40 md:w-3" />
      <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-2 rounded-l bg-cyan-500/40 md:w-3" />
      <div className="relative z-10 px-4 md:px-8">
        {/* Top row: title + status on left, Pause + Remove on top right */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">IXTAbox {box.model}</h3>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 ${box.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
              {box.status === "active" ? "Active" : "Paused"}
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => toggleStatus(box.id)}
              className={`flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg transition-colors ${box.status === "active" ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}
              aria-label={box.status === "active" ? "Pause" : "Activate"}
            >
              {box.status === "active" ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7L8 5z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setBoxToRemove(box.id)}
              className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              aria-label="Remove box"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-sm text-slate-400">{box.availableFrom} – {box.untilFurtherNotice ? "Until further notice" : box.availableTo}</p>
          <p className="mt-0.5 text-sm text-slate-500">{formatScheduleForDisplay(box.schedule)}</p>
          <p className="mt-3 text-base font-semibold text-white">{box.pricePerDay} <span className="font-normal text-slate-500">SEK/day</span></p>
        </div>
        {box.status === "paused" && (
          <p className="mt-3 text-xs text-amber-400/90">Not visible to renters while paused.</p>
        )}
        <BoxScheduleCollapse box={box} onUpdate={(p) => updateBox(box.id, p)} />
        <BoxAddressCollapse box={box} onUpdate={(p) => updateBox(box.id, p)} />
      </div>
    </article>
  ));

  return (
    <>
      <OwnerPostSidebar />
      <main className="flex min-h-[calc(100vh-7rem)] min-h-[calc(100dvh-7rem)] w-full min-w-0 max-w-[100vw] flex-col overflow-x-hidden md:min-h-[calc(100vh-5rem)] md:min-h-[calc(100dvh-5rem)] md:ml-56 md:w-[calc(100vw-14rem)] md:max-w-[calc(100vw-14rem)]">
      {/* Confirm remove box */}
      {boxToRemove && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" aria-hidden onClick={() => setBoxToRemove(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl" role="dialog" aria-modal aria-labelledby="remove-box-title" aria-describedby="remove-box-desc">
            <h2 id="remove-box-title" className="text-base font-semibold text-white">Remove box?</h2>
            <p id="remove-box-desc" className="mt-1 text-sm text-slate-400">This box will be removed from your listings. You can add it again later.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setBoxToRemove(null)}
                className="flex-1 min-h-[44px] touch-manipulation rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemoveBox(boxToRemove)}
                className="flex-1 min-h-[44px] touch-manipulation rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Remove
              </button>
            </div>
      </div>
    </>
  )}

      <OwnerPostBody>
      {activeTab === "listings" && (
        <>
        {showForm && (
          <section className="mb-8 border-t border-slate-800 pt-6 first:border-t-0 first:pt-0 min-w-0 max-w-full">
            <div className="flex min-w-0 items-center justify-between gap-3 mb-6">
              <h2 className="text-sm font-semibold text-white min-w-0 truncate">Add another box</h2>
              <button type="button" onClick={() => setShowForm(false)} className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors touch-manipulation -mr-2" aria-label="Minimise"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">Availability period</p>
                <div className="grid grid-cols-2 gap-2 min-w-0" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                  <div className="min-w-0">
                    <label className={labelClass}>From</label>
                    <input type="date" value={newAvailableFrom} onChange={(e) => setNewAvailableFrom(e.target.value)} className={inputClass + " min-w-0"} />
                  </div>
                  <div className="min-w-0">
                    <label className={labelClass}>To</label>
              {newUntilFurtherNotice ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-cyan-400">Until further notice</div>
              ) : (
                      <input type="date" value={newAvailableTo} onChange={(e) => setNewAvailableTo(e.target.value)} className={inputClass + " min-w-0"} />
                    )}
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2.5 hover:bg-slate-800/50 transition-colors">
                  <input type="checkbox" checked={newUntilFurtherNotice} onChange={(e) => setNewUntilFurtherNotice(e.target.checked)} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0" />
                  <span className="text-sm text-slate-300">No end date</span>
                </label>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">Listing details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Model</label>
                    <select value={newModel} onChange={(e) => setNewModel(e.target.value as "Pro 175" | "Pro 190")} className={inputClass}>
                      <option value="Pro 175">IXTAbox Pro 175</option>
                      <option value="Pro 190">IXTAbox Pro 190</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Price per day (SEK)</label>
                    <input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value) || 300)} min={100} className={inputClass} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">Weekly schedule</p>
                <WeekScheduleEditor schedule={newSchedule} onChange={setNewSchedule} />
              </div>
              <div className="border-t border-slate-800 pt-5">
                <p className="text-xs font-medium text-slate-500 mb-3">Pickup address (optional)</p>
                <p className="text-sm text-slate-500 mb-3">Where renters collect and return this box. You can also set it later on the listing.</p>
                {(address.line1.trim() || address.city.trim()) && (
                  <button type="button" onClick={() => setNewAddress({ ...address })} className="mb-3 w-full min-w-0 rounded-lg bg-slate-800 px-3 py-2 text-sm text-cyan-400 hover:bg-slate-700 transition-colors text-left break-words">
                    Use default address from Address tab
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setAddFormLocationError(null);
                    setAddFormLocationLoading(true);
                    try {
                      const partial = await getAddressFromLocation();
                      setNewAddress((p) => ({ ...p, ...partial }));
                    } catch (e) {
                      setAddFormLocationError(e instanceof Error ? e.message : "Could not get location");
                    } finally {
                      setAddFormLocationLoading(false);
                    }
                  }}
                  disabled={addFormLocationLoading}
                  className="mb-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors touch-manipulation disabled:opacity-50"
                >
                  {addFormLocationLoading ? "Getting location…" : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Use my location
                    </>
                  )}
                </button>
                {addFormLocationError && <p className="mb-3 text-sm text-red-400">{addFormLocationError}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Street address</label>
                    <input type="text" value={newAddress.line1} onChange={(e) => setNewAddress((p) => ({ ...p, line1: e.target.value }))} placeholder="Street and number" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Address line 2 (optional)</label>
                    <input type="text" value={newAddress.line2} onChange={(e) => setNewAddress((p) => ({ ...p, line2: e.target.value }))} placeholder="Apartment, floor" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" value={newAddress.city} onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))} placeholder="City" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Postal code</label>
                    <input type="text" value={newAddress.postalCode} onChange={(e) => setNewAddress((p) => ({ ...p, postalCode: e.target.value }))} placeholder="Postal code" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Country</label>
                    <input type="text" value={newAddress.country} onChange={(e) => setNewAddress((p) => ({ ...p, country: e.target.value }))} placeholder="e.g. Sweden" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Small details (optional)</label>
                    <textarea value={newAddress.instructions} onChange={(e) => setNewAddress((p) => ({ ...p, instructions: e.target.value }))} placeholder="e.g. gate code, parking, call on arrival" rows={2} className={inputClass + " resize-none"} />
                    <p className="mt-1 text-xs text-slate-500">Anyone can add small details here.</p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleAddBox} className="w-full min-h-[48px] rounded-lg bg-cyan-500 py-3 text-base font-medium text-white hover:bg-cyan-400 active:scale-[0.99] transition-colors touch-manipulation">
                Add box
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          {boxes.length === 0 && !showForm && (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-medium text-white">No boxes yet</h3>
              <p className="mt-1 text-sm text-slate-500">Add your first box to start receiving bookings.</p>
              <button type="button" onClick={() => { setAddFormLocationError(null); setShowForm(true); }} className="mt-6 inline-flex min-h-[48px] touch-manipulation items-center rounded-lg bg-cyan-500 px-5 py-3 text-base font-medium text-white hover:bg-cyan-400 active:scale-[0.99] transition-colors">
                Add another box
              </button>
            </div>
          )}
          {boxList}
          {!showForm && boxes.length > 0 && (
            <button
              type="button"
              onClick={() => { setAddFormLocationError(null); setShowForm(true); }}
              className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-4 text-base font-medium text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800/40 active:scale-[0.99] transition-colors mt-6"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add another box
            </button>
          )}
        </section>

        <p className="mt-8 text-center text-sm text-slate-500">
          Set your area on the <Link href="/ixtaowner#map" className="text-cyan-400 hover:text-cyan-300 transition-colors">IXTAowner map</Link>. Listings sync when connected to the backend.
        </p>
        </>
      )}

      {activeTab === "address" && (
        <OwnerAddressSection address={address} onSave={setAddress} />
      )}

      {activeTab === "calendar" && (
        <OwnerCalendarSection
          dateOverrides={dateOverrides}
          onDateOverride={handleDateOverride}
          bookings={bookings}
        />
      )}

      {activeTab === "bookings" && (
        <div className="space-y-6">
          <OwnerBookingsSection bookings={ownerBookings} />
        </div>
      )}

      {activeTab === "warnings" && (
        <OwnerWarningsSection warnings={warnings} onActionTab={(tab) => setActiveTab(tab as TabId)} />
      )}

      {activeTab === "messages" && (
        <OwnerMessagesSection
          threads={messageThreads}
          onSendMessage={handleSendMessage}
          onMarkRead={handleMarkRead}
        />
      )}
      </OwnerPostBody>
      </main>
    </>
  );
}
