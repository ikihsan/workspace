export const DEFAULT_JOB_REMOVE_ON_COMPLETE = 100;
export const DEFAULT_JOB_REMOVE_ON_FAIL = 200;

export const BASE_QUEUE_NAMES = {
  SYSTEM_RETRY: 'system-retry',
  DEAD_LETTER: 'dead-letter',
  SCHEDULER: 'scheduler',
  SLACK_EVENT_RETRY: 'slack-event-retry',
  PREFERENCE_SYNC: 'preference-sync',
  PREFERENCE_REMINDER: 'preference-reminder',
  MEETING_CREATE_RETRY: 'meeting-create-retry',
} as const;

export type BaseQueueName = (typeof BASE_QUEUE_NAMES)[keyof typeof BASE_QUEUE_NAMES];
