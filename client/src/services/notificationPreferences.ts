export interface NotificationPreferences {
  studyReminders: boolean;
  reminderTime: string;
}

const STORAGE_KEY = 'ilovetoeic_notification_preferences';
const DEFAULT_PREFERENCES: NotificationPreferences = {
  studyReminders: true,
  reminderTime: '20:00',
};

export const notificationPreferencesService = {
  get(): NotificationPreferences {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
      return {
        studyReminders: parsed.studyReminders ?? DEFAULT_PREFERENCES.studyReminders,
        reminderTime: /^\d{2}:\d{2}$/.test(parsed.reminderTime || '')
          ? parsed.reminderTime!
          : DEFAULT_PREFERENCES.reminderTime,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  set(preferences: NotificationPreferences) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Notification settings remain unchanged when storage is unavailable.
    }
  },
};
