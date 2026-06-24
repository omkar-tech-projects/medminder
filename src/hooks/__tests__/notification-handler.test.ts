import type * as Notifications from 'expo-notifications';
import { NOTIFICATION_ACTIONS } from '@/lib/constants';
import { processResponse } from '@/hooks/use-notification-handler';

const mockMarkTaken = jest.fn();
jest.mock('@/store/dose-store', () => ({
  useDoseStore: { getState: () => ({ markTaken: mockMarkTaken }) },
}));

const mockCancel = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
const mockSnooze = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
jest.mock('@/services/notification-service', () => ({
  cancelNotificationsForDoseLog: (...args: unknown[]) => mockCancel(...args),
  scheduleSnoozeNotification: (...args: unknown[]) => mockSnooze(...args),
}));

const mockGetSettings = jest.fn(() => ({
  snoozeDurationMin: 10,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  notificationSoundEnabled: true,
}));
jest.mock('@/store/settings-store', () => ({
  useSettingsStore: { getState: () => mockGetSettings() },
}));

function fakeResponse(
  actionIdentifier: string,
  data: Record<string, unknown>,
): Notifications.NotificationResponse {
  return {
    actionIdentifier,
    notification: { request: { content: { data } } },
  } as unknown as Notifications.NotificationResponse;
}

beforeEach(() => jest.clearAllMocks());

describe('processResponse — SNOOZE', () => {
  it('cancels existing chain then schedules snooze at snoozeDurationMin', async () => {
    await processResponse(
      fakeResponse(NOTIFICATION_ACTIONS.SNOOZE, {
        doseLogId: 'dl:1',
        medicineName: 'Dolo',
        dosage: '650 mg',
      }),
    );
    expect(mockCancel).toHaveBeenCalledWith('dl:1');
    expect(mockSnooze).toHaveBeenCalledWith(
      expect.objectContaining({ doseLogId: 'dl:1', snoozeMinutes: 10 }),
    );
  });

  it('picks up a changed snoozeDurationMin from the settings store', async () => {
    mockGetSettings.mockReturnValueOnce({
      snoozeDurationMin: 2,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      notificationSoundEnabled: true,
    });
    await processResponse(
      fakeResponse(NOTIFICATION_ACTIONS.SNOOZE, {
        doseLogId: 'dl:2',
        medicineName: 'Pan',
        dosage: '40 mg',
      }),
    );
    expect(mockSnooze).toHaveBeenCalledWith(
      expect.objectContaining({ snoozeMinutes: 2 }),
    );
  });

  it('ignores test notifications', async () => {
    await processResponse(
      fakeResponse(NOTIFICATION_ACTIONS.SNOOZE, { doseLogId: 'test', isTest: true }),
    );
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockSnooze).not.toHaveBeenCalled();
  });

  it('ignores responses with no doseLogId', async () => {
    await processResponse(fakeResponse(NOTIFICATION_ACTIONS.SNOOZE, {}));
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('processResponse — MARK_TAKEN', () => {
  it('marks dose taken and cancels nag chain', async () => {
    await processResponse(
      fakeResponse(NOTIFICATION_ACTIONS.MARK_TAKEN, { doseLogId: 'dl:3' }),
    );
    expect(mockMarkTaken).toHaveBeenCalledWith('dl:3', 'notification');
    expect(mockCancel).toHaveBeenCalledWith('dl:3');
    expect(mockSnooze).not.toHaveBeenCalled();
  });
});
