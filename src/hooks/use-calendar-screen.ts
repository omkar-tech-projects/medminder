import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import {
  getMonthAdherence,
  getCalendarDayDoses,
  type DayAdherence,
  type CalendarDose,
} from '@/db/queries/dose-logs';
import { useProfileStore } from '@/store/profile-store';

export type { DayAdherence, CalendarDose };

export function useCalendarScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayAdherence>>({});
  const [doses, setDoses] = useState<CalendarDose[]>([]);

  const loadMonth = useCallback((): void => {
    const start = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(viewMonth), 'yyyy-MM-dd');
    setDayStatuses(getMonthAdherence(start, end, activeProfileId));
  }, [viewMonth, activeProfileId]);

  const loadDay = useCallback((): void => {
    setDoses(getCalendarDayDoses(selectedDate, activeProfileId));
  }, [selectedDate, activeProfileId]);

  const refresh = useCallback((): void => {
    loadMonth();
    loadDay();
  }, [loadMonth, loadDay]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const prevMonth = useCallback((): void => {
    setViewMonth((d) => subMonths(d, 1));
  }, []);

  const nextMonth = useCallback((): void => {
    setViewMonth((d) => addMonths(d, 1));
  }, []);

  const jumpToToday = useCallback((): void => {
    setViewMonth(startOfMonth(new Date()));
    setSelectedDate(today);
  }, [today]);

  return {
    today,
    viewMonth,
    selectedDate,
    setSelectedDate,
    dayStatuses,
    doses,
    refresh,
    prevMonth,
    nextMonth,
    jumpToToday,
  };
}
