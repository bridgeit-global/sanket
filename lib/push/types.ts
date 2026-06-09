export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Modules whose users may receive operational push notifications. */
export const PUSH_ELIGIBLE_MODULE_KEYS = [
  'operator',
  'user-management',
  'back-office',
] as const;
