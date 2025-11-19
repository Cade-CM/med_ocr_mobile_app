import {Medication, ReminderSchedule, UserPreferences} from '@types';
import {addHours, addMinutes, setHours, setMinutes, startOfDay, parseISO, format} from 'date-fns';

/**
 * Medication Scheduling Service
 * Generates personalized reminder schedules based on medication frequency and user preferences
 */
export class SchedulingService {
  /**
   * Generate reminder times for a medication based on frequency and user preferences
   */
  static generateReminderSchedule(
    medication: Medication,
    preferences: UserPreferences,
    timesPerDay: number,
  ): Date[] {
    const now = new Date();
    const reminderTimes: Date[] = [];

    // Parse wake and sleep times
    const [wakeHour, wakeMinute] = preferences.wakeTime.split(':').map(Number);
    const [sleepHour, sleepMinute] = preferences.sleepTime.split(':').map(Number);

    // Calculate awake hours
    let awakeMinutes = (sleepHour * 60 + sleepMinute) - (wakeHour * 60 + wakeMinute);
    if (awakeMinutes < 0) {
      awakeMinutes += 24 * 60; // Handle overnight
    }

    if (timesPerDay === 1) {
      // Once daily - schedule at wake time or breakfast
      let reminderTime = setHours(setMinutes(now, wakeMinute), wakeHour);
      
      if (preferences.mealTimes?.breakfast) {
        const [breakfastHour, breakfastMinute] = preferences.mealTimes.breakfast.split(':').map(Number);
        reminderTime = setHours(setMinutes(now, breakfastMinute), breakfastHour);
      }
      
      reminderTimes.push(reminderTime);
    } else if (timesPerDay === 2) {
      // Twice daily - morning and evening
      let morningTime = setHours(setMinutes(now, wakeMinute), wakeHour);
      
      if (preferences.mealTimes?.breakfast) {
        const [breakfastHour, breakfastMinute] = preferences.mealTimes.breakfast.split(':').map(Number);
        morningTime = setHours(setMinutes(now, breakfastMinute), breakfastHour);
      }
      
      reminderTimes.push(morningTime);
      
      // Evening dose - before sleep or at dinner
      let eveningTime = setHours(setMinutes(now, sleepMinute), sleepHour);
      eveningTime = addMinutes(eveningTime, -60); // 1 hour before sleep
      
      if (preferences.mealTimes?.dinner) {
        const [dinnerHour, dinnerMinute] = preferences.mealTimes.dinner.split(':').map(Number);
        eveningTime = setHours(setMinutes(now, dinnerMinute), dinnerHour);
      }
      
      reminderTimes.push(eveningTime);
    } else {
      // Multiple times per day - evenly distribute across awake hours
      const intervalMinutes = Math.floor(awakeMinutes / timesPerDay);
      
      for (let i = 0; i < timesPerDay; i++) {
        const minutesFromWake = intervalMinutes * i;
        let reminderTime = setHours(setMinutes(now, wakeMinute), wakeHour);
        reminderTime = addMinutes(reminderTime, minutesFromWake);
        reminderTimes.push(reminderTime);
      }
    }

    return reminderTimes;
  }

  /**
   * Adjust reminder times based on meal schedule if medication should be taken with food
   */
  static adjustForMeals(
    reminderTimes: Date[],
    preferences: UserPreferences,
    withFood: boolean,
  ): Date[] {
    if (!withFood || !preferences.mealTimes) {
      return reminderTimes;
    }

    const mealTimes: Date[] = [];
    const now = new Date();

    if (preferences.mealTimes.breakfast) {
      const [hour, minute] = preferences.mealTimes.breakfast.split(':').map(Number);
      mealTimes.push(setHours(setMinutes(now, minute), hour));
    }
    if (preferences.mealTimes.lunch) {
      const [hour, minute] = preferences.mealTimes.lunch.split(':').map(Number);
      mealTimes.push(setHours(setMinutes(now, minute), hour));
    }
    if (preferences.mealTimes.dinner) {
      const [hour, minute] = preferences.mealTimes.dinner.split(':').map(Number);
      mealTimes.push(setHours(setMinutes(now, minute), hour));
    }

    // Match each reminder time to the closest meal time
    return reminderTimes.map(reminderTime => {
      let closestMeal = mealTimes[0];
      let minDiff = Math.abs(reminderTime.getTime() - mealTimes[0].getTime());

      for (const mealTime of mealTimes) {
        const diff = Math.abs(reminderTime.getTime() - mealTime.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestMeal = mealTime;
        }
      }

      return closestMeal;
    });
  }

  /**
   * Get next scheduled dose time
   */
  static getNextDoseTime(medication: Medication): Date | null {
    const now = new Date();
    const upcomingTimes = medication.reminderTimes.filter(time => time > now);
    
    if (upcomingTimes.length > 0) {
      return upcomingTimes[0];
    }

    // If no upcoming times today, return first time tomorrow
    if (medication.reminderTimes.length > 0) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const firstTime = medication.reminderTimes[0];
      return setHours(setMinutes(tomorrow, firstTime.getMinutes()), firstTime.getHours());
    }

    return null;
  }

  /**
   * Check if a dose is late
   */
  static isDoseLate(scheduledTime: Date, currentTime: Date = new Date()): boolean {
    const diffMinutes = (currentTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
    return diffMinutes > 30; // Consider late if more than 30 minutes past scheduled time
  }

  /**
   * Calculate lateness in minutes
   */
  static calculateLateness(scheduledTime: Date, takenTime: Date): number {
    return Math.floor((takenTime.getTime() - scheduledTime.getTime()) / (1000 * 60));
  }

  /**
   * Get default user preferences
   */
  static getDefaultPreferences(): UserPreferences {
    return {
      wakeTime: '07:00',
      sleepTime: '22:00',
      mealTimes: {
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '18:00',
      },
      notificationEnabled: true,
      notificationSound: true,
    };
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date): string {
    return format(date, 'h:mm a');
  }

  /**
   * Format time list for display
   */
  static formatTimeList(times: Date[]): string {
    return times.map(time => this.formatTime(time)).join(', ');
  }
}
