/**
 * Parse a UTC timestamp from the API.
 * Appends 'Z' if no timezone indicator is present so the browser
 * treats it as UTC and toLocale* methods convert to local time correctly.
 */
export function parseUTC(iso: string): Date {
  const normalized =
    iso.endsWith('Z') || iso.includes('+') || /[+-]\d{2}:\d{2}$/.test(iso)
      ? iso
      : iso + 'Z';
  return new Date(normalized);
}
