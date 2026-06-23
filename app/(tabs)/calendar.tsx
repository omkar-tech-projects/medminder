import { Screen, AppHeader, EmptyState } from '@/components';

export default function CalendarScreen() {
  return (
    <Screen edges={['top']}>
      <AppHeader title="Calendar" subtitle="Upcoming doses" />
      <EmptyState
        icon="calendar-outline"
        title="No upcoming doses"
        subtitle="Add a medication and schedule your doses to see them here."
      />
    </Screen>
  );
}
