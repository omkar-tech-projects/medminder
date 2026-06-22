export type NotificationType = 'pre_dose' | 're_remind' | 'refill_warning';

export type NotificationPayload = {
  doseLogId: string;
  type: NotificationType;
  medicationName?: string;
};
