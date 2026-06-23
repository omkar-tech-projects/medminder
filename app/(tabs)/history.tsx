import { Screen, AppHeader, EmptyState } from '@/components';

export default function HistoryScreen() {
  return (
    <Screen edges={['top']}>
      <AppHeader title="History" subtitle="Your dose log" />
      <EmptyState
        icon="time-outline"
        title="No history yet"
        subtitle="Your dose log will appear here once you start tracking medications."
      />
    </Screen>
  );
}
