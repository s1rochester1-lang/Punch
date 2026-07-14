import { TimeEntry } from "./types";

export function hoursBetween(startIso: string, endIso: string | null): number {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return Math.max(0, (end - start) / 1000 / 60 / 60);
}

export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

/** Monday 00:00 through the current moment, in the browser's local time. */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // shift so week starts Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isWithinCurrentWeek(iso: string): boolean {
  const entryTime = new Date(iso).getTime();
  return entryTime >= startOfWeek().getTime();
}

export function totalHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + hoursBetween(e.clock_in, e.clock_out), 0);
}

export function weeklyHours(entries: TimeEntry[]): number {
  return totalHours(entries.filter((e) => isWithinCurrentWeek(e.clock_in)));
}

/** Group entries by calendar day (local), newest day first. */
export function groupByDay(entries: TimeEntry[]): { day: string; entries: TimeEntry[] }[] {
  const map = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = new Date(e.clock_in).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([day, entries]) => ({ day, entries }));
}
