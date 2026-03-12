import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';

import { formatTaskDateTime } from '@/components/app/task-date-utils';
import { AppCard, CardTitle, ScreenShell } from '@/components/app/screen-shell';
import { useTasks } from '@/components/app/tasks-context';

type ViewMode = 'weekly' | 'monthly' | 'yearly';
type WeekDay = {
  key: string;
  dayKey: string;
  day: string;
  date: number;
  label: string;
};
type MonthCell = {
  key: string;
  dayKey: string;
  dayNumber: number;
  inMonth: boolean;
};

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getWeekView(weekStart: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      key: date.toISOString(),
      dayKey: getDayKey(date),
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.getDate(),
      label: date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    };
  });
}

function getMonthCells(monthDate: Date): MonthCell[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstDayOfWeek = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -firstDayOfWeek);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: date.toISOString(),
      dayKey: getDayKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear(),
    };
  });
}

function getWeekRangeLabel(days: WeekDay[]) {
  if (!days.length) {
    return '';
  }

  const startDate = new Date(days[0].key);
  const endDate = new Date(days[days.length - 1].key);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth && sameYear) {
    return `${startDate.toLocaleDateString(undefined, {
      month: 'short',
    })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  return `${startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function getEmptyText(viewMode: ViewMode) {
  if (viewMode === 'weekly') {
    return 'No events on this day. Add timed tasks in the Tasks tab.';
  }
  if (viewMode === 'monthly') {
    return 'No events in this month. Add timed tasks in the Tasks tab.';
  }
  return 'No events in this year. Add timed tasks in the Tasks tab.';
}

export default function CalendarScreen() {
  const { calendarEvents } = useTasks();
  const today = useMemo(() => new Date(), []);

  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [weekAnimationDirection, setWeekAnimationDirection] = useState<'next' | 'previous'>('next');
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => new Date().getDay());

  const weekStartDate = useMemo(() => addDays(startOfWeek(today), weekOffset * 7), [today, weekOffset]);
  const weekDays = useMemo(() => getWeekView(weekStartDate), [weekStartDate]);
  const weekRangeLabel = useMemo(() => getWeekRangeLabel(weekDays), [weekDays]);

  const monthDate = useMemo(() => {
    const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [monthOffset, today]);

  const yearValue = today.getFullYear() + yearOffset;
  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[0];

  const monthCells = useMemo(() => getMonthCells(monthDate), [monthDate]);
  const yearMonths = useMemo(
    () => Array.from({ length: 12 }, (_, month) => new Date(yearValue, month, 1)),
    [yearValue]
  );

  const eventDayKeys = useMemo(() => {
    return new Set(
      calendarEvents
        .map((event) => new Date(event.scheduledAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map((date) => getDayKey(date))
    );
  }, [calendarEvents]);

  const periodEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      const eventDate = new Date(event.scheduledAt);
      if (Number.isNaN(eventDate.getTime())) {
        return false;
      }

      if (viewMode === 'weekly') {
        return selectedDay ? getDayKey(eventDate) === selectedDay.dayKey : false;
      }

      if (viewMode === 'monthly') {
        return (
          eventDate.getFullYear() === monthDate.getFullYear() &&
          eventDate.getMonth() === monthDate.getMonth()
        );
      }

      return eventDate.getFullYear() === yearValue;
    });
  }, [calendarEvents, monthDate, selectedDay, viewMode, yearValue]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'weekly') {
      return selectedDay?.label ?? 'Selected day';
    }
    if (viewMode === 'monthly') {
      return monthDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    }
    return String(yearValue);
  }, [monthDate, selectedDay, viewMode, yearValue]);

  const periodSummary = useMemo(() => {
    if (viewMode === 'weekly') {
      return weekRangeLabel;
    }
    if (viewMode === 'monthly') {
      return monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return String(yearValue);
  }, [monthDate, viewMode, weekRangeLabel, yearValue]);

  const modeOptions = useMemo(
    () => (['weekly', 'monthly', 'yearly'] as ViewMode[]).filter((mode) => mode !== viewMode),
    [viewMode]
  );

  const shiftPeriod = (delta: number) => {
    if (viewMode === 'weekly') {
      setWeekAnimationDirection(delta > 0 ? 'next' : 'previous');
      setWeekOffset((prev) => prev + delta);
      return;
    }

    if (viewMode === 'monthly') {
      setMonthOffset((prev) => prev + delta);
      return;
    }

    setYearOffset((prev) => prev + delta);
  };

  const selectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setIsModeMenuOpen(false);
  };

  return (
    <ScreenShell title="Calendar" subtitle="Your task events are auto-synced here.">
      <AppCard delay={90}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => shiftPeriod(-1)} style={styles.navButton}>
            <MaterialIcons color="#415072" name="chevron-left" size={22} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Pressable onPress={() => setIsModeMenuOpen((prev) => !prev)} style={styles.modeTrigger}>
              <Text style={styles.modeTriggerText}>{VIEW_MODE_LABELS[viewMode]}</Text>
              <MaterialIcons
                color="#415072"
                name={isModeMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={22}
              />
            </Pressable>
            <Text style={styles.periodText}>{periodSummary}</Text>
          </View>

          <Pressable onPress={() => shiftPeriod(1)} style={styles.navButton}>
            <MaterialIcons color="#415072" name="chevron-right" size={22} />
          </Pressable>
        </View>

        {isModeMenuOpen ? (
          <View style={styles.modeMenu}>
            {modeOptions.map((mode) => (
              <Pressable
                key={mode}
                onPress={() => selectViewMode(mode)}
                style={styles.modeOption}>
                <Text style={styles.modeOptionText}>{VIEW_MODE_LABELS[mode]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {viewMode === 'weekly' ? (
          <View style={styles.dayCarousel}>
            <Animated.View
              key={weekDays[0]?.dayKey ?? 'week-days'}
              entering={
                weekAnimationDirection === 'next'
                  ? SlideInRight.duration(220)
                  : SlideInLeft.duration(220)
              }
              exiting={
                weekAnimationDirection === 'next'
                  ? SlideOutLeft.duration(220)
                  : SlideOutRight.duration(220)
              }
              style={styles.dayRow}>
              {weekDays.map((day, index) => (
                <Pressable
                  key={day.key}
                  onPress={() => setSelectedDayIndex(index)}
                  style={[styles.dayPill, selectedDay?.dayKey === day.dayKey && styles.dayPillActive]}>
                  <Text style={[styles.dayName, selectedDay?.dayKey === day.dayKey && styles.dayNameActive]}>
                    {day.day}
                  </Text>
                  <Text style={[styles.dayDate, selectedDay?.dayKey === day.dayKey && styles.dayDateActive]}>
                    {day.date}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        ) : null}

        {viewMode === 'monthly' ? (
          <View style={styles.monthWrap}>
            <View style={styles.gridWeekHeader}>
              {WEEKDAY_SHORT.map((label) => (
                <Text key={label} style={styles.gridWeekLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthCells.map((cell) => (
                <View key={cell.key} style={[styles.monthCell, !cell.inMonth && styles.monthCellMuted]}>
                  <Text style={[styles.monthCellText, !cell.inMonth && styles.monthCellTextMuted]}>
                    {cell.dayNumber}
                  </Text>
                  {eventDayKeys.has(cell.dayKey) ? <View style={styles.monthDot} /> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {viewMode === 'yearly' ? (
          <View style={styles.yearGrid}>
            {yearMonths.map((month) => {
              const miniCells = getMonthCells(month);

              return (
                <View key={month.toISOString()} style={styles.yearMonthCard}>
                  <Text style={styles.yearMonthTitle}>
                    {month.toLocaleDateString(undefined, { month: 'short' })}
                  </Text>
                  <View style={styles.miniWeekHeader}>
                    {WEEKDAY_SHORT.map((label) => (
                      <Text key={label} style={styles.miniWeekLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.miniMonthGrid}>
                    {miniCells.map((cell) => (
                      <Text
                        key={cell.key}
                        style={[
                          styles.miniMonthDay,
                          !cell.inMonth && styles.miniMonthDayMuted,
                          eventDayKeys.has(cell.dayKey) && cell.inMonth && styles.miniMonthDayEvent,
                        ]}>
                        {cell.inMonth ? cell.dayNumber : ''}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </AppCard>

      <AppCard delay={160}>
        <Text style={styles.eventsLabel}>Events</Text>
        <CardTitle accent="#3A86FF" icon="event" title="Synced From Tasks" />
        <Text style={styles.selectedDayText}>{periodLabel}</Text>

        {periodEvents.length === 0 ? (
          <Text style={styles.emptyText}>{getEmptyText(viewMode)}</Text>
        ) : (
          periodEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.dot, { backgroundColor: event.categoryColor }]} />
              <View style={styles.eventText}>
                <Text style={[styles.eventTitle, event.done && styles.eventTitleDone]}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {formatTaskDateTime(event.scheduledAt)} · {event.categoryName}
                  {event.repeatable ? ' · Repeats' : ''}
                </Text>
                {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
              </View>
              {event.repeatable ? <MaterialIcons color="#5D6A89" name="repeat" size={16} /> : null}
            </View>
          ))
        )}
      </AppCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EDFA',
  },
  modeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#E8EDFA',
  },
  modeTriggerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#233253',
    letterSpacing: 0.2,
  },
  periodText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6A738D',
    fontWeight: '600',
  },
  modeMenu: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  modeOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7DEEF',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F4F7FF',
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#415072',
  },
  dayCarousel: {
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F2F5FC',
    gap: 4,
  },
  dayPillActive: {
    backgroundColor: '#273352',
  },
  dayName: {
    fontSize: 12,
    color: '#63708A',
    fontWeight: '600',
  },
  dayNameActive: {
    color: '#DCE6FF',
  },
  dayDate: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2133',
  },
  dayDateActive: {
    color: '#FFFFFF',
  },
  monthWrap: {
    gap: 8,
  },
  gridWeekHeader: {
    flexDirection: 'row',
  },
  gridWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#6D7792',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  monthCellMuted: {
    opacity: 0.35,
  },
  monthCellText: {
    fontSize: 13,
    color: '#1A2133',
    fontWeight: '600',
  },
  monthCellTextMuted: {
    color: '#7D879F',
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#3A86FF',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearMonthCard: {
    width: '48%',
    borderRadius: 10,
    backgroundColor: '#F7F9FE',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  yearMonthTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2133',
    textAlign: 'center',
  },
  miniWeekHeader: {
    flexDirection: 'row',
  },
  miniWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: '#7D879F',
  },
  miniMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniMonthDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 9,
    color: '#415072',
    paddingVertical: 1,
    fontWeight: '600',
  },
  miniMonthDayMuted: {
    color: 'transparent',
  },
  miniMonthDayEvent: {
    color: '#2F52D0',
    fontWeight: '800',
  },
  eventsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#586078',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: '#6A738D',
    lineHeight: 21,
  },
  selectedDayText: {
    fontSize: 13,
    color: '#6A738D',
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2133',
  },
  eventTitleDone: {
    color: '#6A738E',
    textDecorationLine: 'line-through',
  },
  eventMeta: {
    fontSize: 13,
    color: '#6A738D',
  },
  eventNotes: {
    fontSize: 12,
    color: '#76809A',
  },
});
