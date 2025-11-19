import * as Notifications from 'expo-notifications';
import {Medication} from '@types';
import {SchedulingService} from './SchedulingService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Notification Service - Handles medication reminder notifications using Expo Notifications
 */
export class NotificationService {
  /**
   * Initialize notification service
   */
  static async initialize(): Promise<void> {
    // Request permissions
    await this.requestPermissions();
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule notifications for a medication
   */
  static async scheduleNotifications(medication: Medication): Promise<void> {
    // Cancel existing notifications for this medication first
    await this.cancelNotifications(medication.id);

    for (const reminderTime of medication.reminderTimes) {
      const hour = reminderTime.getHours();
      const minute = reminderTime.getMinutes();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication Reminder 💊',
          body: `Time to take ${medication.drugName} (${medication.dosage})`,
          sound: true,
          data: {medicationId: medication.id},
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
    }
  }

  /**
   * Cancel notifications for a medication
   */
  static async cancelNotifications(medicationId: string): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.medicationId === medicationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Display an immediate notification
   */
  static async displayNotification(
    title: string,
    body: string,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Get scheduled notifications count
   */
  static async getScheduledNotificationsCount(): Promise<number> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  }
}
