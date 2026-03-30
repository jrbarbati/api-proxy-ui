export interface DateRange {
  from: Date;
  to: Date;
}

export interface DatePreset {
  label: string;
  hours: number;
}

export const DATE_PRESETS: DatePreset[] = [
  { label: '1h',  hours: 1 },
  { label: '6h',  hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '7d',  hours: 168 },
];

export function rangeFromHours(hours: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  return { from, to };
}

/** Format a Date to the value expected by <input type="datetime-local"> */
export function toDatetimeLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
