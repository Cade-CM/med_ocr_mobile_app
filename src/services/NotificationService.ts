import notifee, {
  TimestampTrigger,
  TriggerType,
  AndroidImportance,
} from '@notifee/react-native';
import {Medication} from '@types';
import {SchedulingService} from './SchedulingService';

/**
 * Notification Service - Handles medication reminder notifications
 */
export class NotificationService {
  private static CHANNEL_ID = 'medication-reminders';

  /**
   * Initialize notification channel
   */
  static async initialize(): Promise<void> {
    await notifee.createChannel({
      id: this.CHANNEL_ID,
      name: 'Medication Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  }

  /**
   * Schedule notifications for a medication
   */
  static async scheduleNotifications(medication: Medication): Promise<void> {
    // Cancel existing notifications for this medication first
    await this.cancelNotifications(medication.id);

    const now = new Date();
    
    for (const reminderTime of medication.reminderTimes) {
      const notificationTime = new Date(reminderTime);
      
      // If the time has passed today, schedule for tomorrow
      if (notificationTime < now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationTime.getTime(),
        repeatFrequency: 'daily',
      };

      await notifee.createTriggerNotification(
        {
          id: `${medication.id}-${reminderTime.getHours()}-${reminderTime.getMinutes()}`,
          title: 'Medication Reminder 💊',
          body: `Time to take ${medication.drugName} (${medication.dosage})`,
          android: {
            channelId: this.CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'medication-taken',
              launchActivity: 'default',
            },
            actions: [
              {
                title: 'Mark as Taken',
                pressAction: {
                  id: 'mark-taken',
                },
              },
              {
                title: 'Snooze 15 min',
                pressAction: {
                  id: 'snooze',
                },
              },
            ],
          },
          ios: {
            categoryId: 'medication-reminder',
            sound: 'default',
          },
        },
        trigger,
      );
    }
  }

  /**
   * Cancel notifications for a medication
   */
  static async cancelNotifications(medicationId: string): Promise<void> {
    const notifications = await notifee.getTriggerNotifications();
    
    for (const notification of notifications) {
      if (notification.notification.id?.startsWith(medicationId)) {
        await notifee.cancelNotification(notification.notification.id);
      }
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await notifee.cancelAllNotifications();
  }

  /**
   * Display an immediate notification
   */
  static async displayNotification(
    title: string,
    body: string,
  ): Promise<void> {
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: this.CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
      },
      ios: {
        sound: 'default',
      },
    });
  }

  /**
   * Set up notification action handlers
   */
  static setupNotificationHandlers(): void {
    // Handle background events
    notifee.onBackgroundEvent(async ({type, detail}) => {
      const {notification, pressAction} = detail;
      
      if (pressAction?.id === 'mark-taken') {
        // Handle mark as taken action
        // This would typically update the adherence record
        await notifee.cancelNotification(notification?.id || '');
      } else if (pressAction?.id === 'snooze') {
        // Snooze for 15 minutes
        const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);
        
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: snoozeTime.getTime(),
        };

        await notifee.createTriggerNotification(
          {
            title: notification?.title || 'Medication Reminder',
            body: notification?.body || 'Time to take your medication',
            android: {
              channelId: this.CHANNEL_ID,
            },
          },
          trigger,
        );
        
        await notifee.cancelNotification(notification?.id || '');
      }
    });

    // Handle foreground events
    notifee.onForegroundEvent(({type, detail}) => {
      // Handle foreground notification events if needed
    });
  }

  /**
   * Get scheduled notifications count
   */
  static async getScheduledNotificationsCount(): Promise<number> {
    const notifications = await notifee.getTriggerNotifications();
    return notifications.length;
  }
}
