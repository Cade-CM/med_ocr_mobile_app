import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Medication, UserPreferences } from '@types';
import { StorageService } from '@services/StorageService';
import { SchedulingService } from '@services/SchedulingService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ViewType = 'daily' | 'weekly' | 'monthly';

const { width } = Dimensions.get('window');
const HOUR_HEIGHT = 60;

const ScheduleCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [viewType, setViewType] = useState<ViewType>('daily');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(
    SchedulingService.getDefaultPreferences()
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const meds = await StorageService.getMedications();
    setMedications(meds);
    const prefs = await StorageService.getUserPreferences();
    if (prefs) {
      setPreferences(prefs);
    }
  };

  const handleEditSchedule = () => {
    navigation.navigate('ScheduleSettings');
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const getMedicationsForTime = (timeSlot: string) => {
    const medList = Array.isArray(medications) ? medications : [];
    return medList.filter((med) => {
      const times = Array.isArray(med.reminderTimes) ? med.reminderTimes : [];
      if (times.length === 0) return false;
      return med.reminderTimes.some((time) => {
        const timeDate = new Date(time);
        const timeStr = `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}`;
        const medHour = parseInt(timeStr.split(':')[0]);
        const slotHour = parseInt(timeSlot.split(':')[0]);
        return medHour === slotHour;
      });
    });
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const getMonthName = (date: Date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const getMedicationsForDate = (date: Date) => {
    // For now, return all active medications
    // You could filter by date-specific rules later
    return medications;
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewType === 'daily') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const renderDailyView = () => {
    const timeSlots = getTimeSlots();
    const wakeHour = parseInt(preferences.wakeTime?.split(':')[0] || '7');
    const sleepHour = parseInt(preferences.sleepTime?.split(':')[0] || '22');

    return (
      <ScrollView style={styles.timelineContainer}>
        <View style={styles.timeline}>
          {timeSlots.map((timeSlot, index) => {
            const hour = parseInt(timeSlot.split(':')[0]);
            const isAwakeHours = hour >= wakeHour && hour <= sleepHour;
            const medsAtTime = getMedicationsForTime(timeSlot);

            return (
              <View key={timeSlot} style={styles.timeSlotRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{timeSlot}</Text>
                  {!isAwakeHours && (
                    <MaterialIcons name="nightlight" size={16} color="#9E9E9E" />
                  )}
                </View>
                <View
                  style={[
                    styles.eventColumn,
                    !isAwakeHours && styles.sleepHours,
                  ]}
                >
                  {medsAtTime.map((med) => (
                    <TouchableOpacity
                      key={med.id}
                      style={styles.medicationCard}
                      onPress={() =>
                        navigation.navigate('MedicationDetails', { medication: med })
                      }
                    >
                      <View style={styles.medicationIcon}>
                        <MaterialIcons name="medication" size={20} color="#007AFF" />
                      </View>
                      <View style={styles.medicationInfo}>
                        <Text style={styles.medicationName}>{med.drugName}</Text>
                        <Text style={styles.medicationDose}>
                          {med.dosage} • {med.frequency}
                        </Text>
                      </View>
                      {med.rfidTagId && (
                        <MaterialIcons name="nfc" size={16} color="#34C759" />
                      )}
                    </TouchableOpacity>
                  ))}
                  {/* Meal Time Indicators */}
                  {preferences.mealTimes?.breakfast === timeSlot && (
                    <View style={styles.mealIndicator}>
                      <MaterialIcons name="free-breakfast" size={16} color="#FF6B6B" />
                      <Text style={styles.mealText}>Breakfast</Text>
                    </View>
                  )}
                  {preferences.mealTimes?.lunch === timeSlot && (
                    <View style={styles.mealIndicator}>
                      <MaterialIcons name="lunch-dining" size={16} color="#4ECDC4" />
                      <Text style={styles.mealText}>Lunch</Text>
                    </View>
                  )}
                  {preferences.mealTimes?.dinner === timeSlot && (
                    <View style={styles.mealIndicator}>
                      <MaterialIcons name="dinner-dining" size={16} color="#FFB347" />
                      <Text style={styles.mealText}>Dinner</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderWeeklyView = () => {
    const weekDays = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekScrollContent}
        style={styles.weekScrollView}
      >
        {weekDays.map((day, index) => {
          const isToday =
            day.toDateString() === new Date().toDateString();
          const dayMeds = getMedicationsForDate(day);

          return (
            <View
              key={index}
              style={[styles.weekDayCard, isToday && styles.todayCard]}
            >
              <View style={styles.weekDayHeader}>
                <Text style={[styles.weekDayName, isToday && styles.todayText]}>
                  {getDayOfWeek(day).substring(0, 3)}
                </Text>
                <Text style={[styles.weekDayDate, isToday && styles.todayText]}>
                  {day.getDate()}
                </Text>
              </View>
              <ScrollView style={styles.weekDayMeds}>
                {dayMeds.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.weekMedicationItem}
                    onPress={() =>
                      navigation.navigate('MedicationDetails', { medication: med })
                    }
                  >
                    <View style={styles.weekMedIcon}>
                      <MaterialIcons name="medication" size={16} color="#007AFF" />
                    </View>
                    <Text style={styles.weekMedName} numberOfLines={2}>
                      {med.drugName}
                    </Text>
                    {Array.isArray(med.reminderTimes) && med.reminderTimes.length > 0 && (
                      <View style={styles.doseBadge}>
                        <Text style={styles.doseBadgeText}>
                          {Array.isArray(med.reminderTimes) ? med.reminderTimes.length : 0}x
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderMonthlyView = () => {
    const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);
    const weeks = [];
    let days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
      if (Array.isArray(days) && days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }

    // Add remaining days to complete the last week
    if (Array.isArray(days) && days.length > 0) {
      while (Array.isArray(days) && days.length < 7) {
        days.push(null);
      }
      weeks.push(days);
    }

    return (
      <ScrollView>
        <View style={styles.monthGrid}>
          {/* Day headers */}
          <View style={styles.monthDayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.monthDayHeader}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.monthWeekRow}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <View key={dayIndex} style={styles.monthDayCell} />;
                }

                const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const isToday = date.toDateString() === new Date().toDateString();
                const dayMeds = getMedicationsForDate(date);

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.monthDayCell,
                      isToday && styles.monthTodayCell,
                    ]}
                    onPress={() => {
                      setCurrentDate(date);
                      setViewType('daily');
                    }}
                  >
                    <Text
                      style={[
                        styles.monthDayNumber,
                        isToday && styles.monthTodayNumber,
                      ]}
                    >
                      {day}
                    </Text>
                    {Array.isArray(dayMeds) && dayMeds.length > 0 && (
                      <View style={styles.monthMedIndicator}>
                        <Text style={styles.monthMedCount}>{Array.isArray(dayMeds) ? dayMeds.length : 0}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const getDateRangeText = () => {
    if (viewType === 'daily') {
      return `${getDayOfWeek(currentDate)}, ${getMonthName(currentDate)} ${currentDate.getDate()}`;
    } else if (viewType === 'weekly') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${getMonthName(startOfWeek)} ${startOfWeek.getDate()} - ${getMonthName(endOfWeek)} ${endOfWeek.getDate()}`;
    } else {
      return `${getMonthName(currentDate)} ${currentDate.getFullYear()}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.editScheduleButton}
            onPress={handleEditSchedule}
          >
            <MaterialIcons name="access-time" size={20} color="#007AFF" />
            <Text style={styles.editScheduleText}>Edit Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* View Type Selector */}
        <View style={styles.viewSelector}>
          <TouchableOpacity
            style={[styles.viewButton, viewType === 'daily' && styles.viewButtonActive]}
            onPress={() => setViewType('daily')}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewType === 'daily' && styles.viewButtonTextActive,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewType === 'weekly' && styles.viewButtonActive]}
            onPress={() => setViewType('weekly')}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewType === 'weekly' && styles.viewButtonTextActive,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewType === 'monthly' && styles.viewButtonActive]}
            onPress={() => setViewType('monthly')}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewType === 'monthly' && styles.viewButtonTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => changeDate('prev')}
          >
            <MaterialIcons name="chevron-left" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.dateRangeText}>{getDateRangeText()}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => changeDate('next')}
          >
            <MaterialIcons name="chevron-right" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {viewType === 'daily' && renderDailyView()}
      {viewType === 'weekly' && renderWeeklyView()}
      {viewType === 'monthly' && renderMonthlyView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  editScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editScheduleText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  viewSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 5,
    borderRadius: 8,
  },
  viewButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewButtonTextActive: {
    color: 'white',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navButton: {
    padding: 5,
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Daily View Styles
  timelineContainer: {
    flex: 1,
  },
  timeline: {
    padding: 15,
  },
  timeSlotRow: {
    flexDirection: 'row',
    minHeight: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timeColumn: {
    width: 70,
    paddingTop: 5,
    paddingRight: 10,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  eventColumn: {
    flex: 1,
    paddingLeft: 15,
    paddingVertical: 5,
  },
  sleepHours: {
    backgroundColor: '#F9F9F9',
  },
  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  medicationDose: {
    fontSize: 13,
    color: '#666',
  },
  mealIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  mealText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Weekly View Styles
  weekScrollView: {
    flex: 1,
  },
  weekScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  weekDayCard: {
    width: width * 0.4, // Show ~2.5 days at a time
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 450,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  weekDayHeader: {
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  weekDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  weekDayDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  todayText: {
    color: '#007AFF',
  },
  weekDayMeds: {
    flex: 1,
    padding: 8,
  },
  weekMedicationItem: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekMedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  weekMedName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  doseBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doseBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  // Monthly View Styles
  monthGrid: {
    padding: 15,
  },
  monthDayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  monthDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  monthWeekRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  monthDayCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'white',
    marginHorizontal: 2,
    borderRadius: 8,
    padding: 5,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  monthTodayCell: {
    backgroundColor: '#E8F4FF',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  monthDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  monthTodayNumber: {
    color: '#007AFF',
  },
  monthMedIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  monthMedCount: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ScheduleCalendarScreen;
