"use client";

import { useState } from "react";
import { getAddressFromLocation } from "./getAddressFromLocation";

export type OwnerAddress = {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  instructions: string;
};

const inputClass =
  "w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-3 text-base min-h-[48px] md:min-h-0 md:py-2.5 md:text-sm text-white placeholder-slate-500 focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors touch-manipulation box-border";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

export default function OwnerAddressSection({
  address,
  onSave,
}: {
  address: OwnerAddress;
  onSave: (a: OwnerAddress) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OwnerAddress>(address);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const hasValue = address.line1.trim() || address.city.trim() || address.postalCode.trim();

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
    onSave(form);
    setEditing(false);
  };

  return (
    <section className="min-w-0 max-w-full">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Pickup address</h2>
          <p className="mt-0.5 text-xs text-slate-500">Where renters collect and return the box</p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-shrink-0 min-h-[44px] touch-manipulation rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {hasValue ? "Edit" : "Add address"}
          </button>
        ) : (
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={() => { setForm(address); setEditing(false); }}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors touch-manipulation"
              aria-label="Minimise"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-400 transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
      <div>
        {editing ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors touch-manipulation disabled:opacity-50"
            >
              {locationLoading ? (
                "Getting location…"
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Use my location
                </>
              )}
            </button>
            {locationError && <p className="text-sm text-red-400">{locationError}</p>}
            <div>
              <label className={labelClass}>Street address</label>
              <input
                type="text"
                value={form.line1}
                onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                placeholder="Street and number"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Address line 2 (optional)</label>
              <input
                type="text"
                value={form.line2}
                onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
                placeholder="Apartment, floor, etc."
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
              <div className="min-w-0">
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className={labelClass}>Postal code</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                  placeholder="Postal code"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="e.g. Sweden"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Small details (optional)</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                placeholder="e.g. gate code, parking spot, call on arrival"
                rows={3}
                className={inputClass + " resize-none"}
              />
              <p className="mt-1 text-xs text-slate-500">Add any extra details for renters.</p>
            </div>
          </div>
        ) : hasValue ? (
          <div className="text-sm text-slate-300 space-y-1 break-words min-w-0">
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>{[address.postalCode, address.city].filter(Boolean).join(" ")}</p>
            {address.country && <p>{address.country}</p>}
            {address.instructions && (
              <p className="mt-4 pt-4 border-t border-slate-800 text-slate-400">
                <span className="font-medium text-slate-500">Small details: </span>
                {address.instructions}
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Add your pickup address so renters know where to collect and return the box.</p>
        )}
      </div>
    </section>
  );
}
