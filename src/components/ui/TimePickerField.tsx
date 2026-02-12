"use client";

import { useMemo, forwardRef } from "react";

export type TimePickerFieldProps = {
  /** Value in HH:mm format (24-hour). Pass null to clear. Minutes are always 00. */
  value: string | null;
  /** Called with HH:mm (e.g. "09:00", "14:00", "23:00"). Minutes are always 00. */
  onChange: (value: string | null) => void;
  /** 24-hour format. Default true. */
  use24Hour?: boolean;
  className?: string;
  disabled?: boolean;
  minTime?: string;
  maxTime?: string;
};

/**
 * Hour picker: dropdown select for hours (0-23) in 24-hour format.
 * Displays as HH:00, returns HH:00 format. Minutes are always 00.
 */
export const TimePickerField = forwardRef<HTMLSelectElement, TimePickerFieldProps>(function TimePickerField({
  value,
  onChange,
  use24Hour = true,
  className = "",
  disabled = false,
  minTime,
  maxTime,
}, ref) {
  // Extract hour from HH:mm or HH format
  const currentHour = value ? (value.includes(':') ? value.split(':')[0] : value) : '';

  // Generate hour options (0-23)
  const hourOptions = useMemo(() => {
    const hours: number[] = [];
    let minHour = 0;
    let maxHour = 23;

    if (minTime) {
      minHour = parseInt(minTime.split(':')[0], 10);
    }
    if (maxTime) {
      maxHour = parseInt(maxTime.split(':')[0], 10);
    }

    for (let h = minHour; h <= maxHour; h++) {
      hours.push(h);
    }

    return hours;
  }, [minTime, maxTime]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedHour = e.target.value;
    
    if (!selectedHour || selectedHour === '') {
      onChange(null);
      return;
    }

    const hourNum = parseInt(selectedHour, 10);
    onChange(`${hourNum.toString().padStart(2, '0')}:00`);
  };

  const defaultClassName = "block w-full px-3 py-2 text-sm border border-white/20 rounded-lg text-white bg-black/30 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200";
  const finalClassName = className || defaultClassName;

  return (
    <select
      ref={ref}
      value={currentHour}
      onChange={handleChange}
      disabled={disabled}
      className={finalClassName}
      style={{
        backgroundColor: 'rgb(30 41 59)',
        color: 'white',
      }}
    >
      <option value="" style={{ backgroundColor: 'rgb(30 41 59)', color: 'white' }}>--</option>
      {hourOptions.map((hour) => (
        <option 
          key={hour} 
          value={hour.toString().padStart(2, '0')}
          style={{ backgroundColor: 'rgb(30 41 59)', color: 'white' }}
        >
          {hour.toString().padStart(2, '0')}:00
        </option>
      ))}
    </select>
  );
});
