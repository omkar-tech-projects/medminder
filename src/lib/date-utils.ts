import { format, isToday, isTomorrow, isYesterday, parseISO, differenceInDays } from 'date-fns';

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toISODateTime(date: Date): string {
  return date.toISOString();
}

export function formatDisplayDate(isoDate: string): string {
  const d = parseISO(isoDate);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

export function formatTime(isoDatetime: string): string {
  return format(parseISO(isoDatetime), 'h:mm a');
}

export function daysUntil(isoDate: string): number {
  return differenceInDays(parseISO(isoDate), new Date());
}

export function computeEndDate(startDate: string, durationDays: number): string {
  const start = parseISO(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays - 1);
  return toISODate(end);
}
