import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addMinutes, format, parse } from "date-fns";
import { supabase } from "../lib/supabase";

type NotificationData = {
  alarmId: string;
  type: "alarm" | "verification";
};

// Configure notifications for local usage
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export class NotificationService {
  static async requestPermissions() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("alarms", {
        name: "Alarms",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    console.log("Requesting notification permissions...");
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push notification permissions");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }

  static async scheduleAlarm(alarm: {
    id: string;
    title: string;
    time: string;
    days_of_week: number[];
    verification_delay: string;
  }) {
    console.log("Scheduling alarm:", alarm);
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log("No notification permissions granted");
      return false;
    }

    // Cancel existing notifications for this alarm
    await this.cancelAlarmNotifications(alarm.id);

    // Parse the time string (format: "HH:mm")
    const [hours, minutes] = alarm.time.split(":").map(Number);
    const timeObj = new Date();
    timeObj.setHours(hours, minutes, 0, 0);

    const verificationTime = new Date(timeObj);
    verificationTime.setMinutes(
      verificationTime.getMinutes() + parseInt(alarm.verification_delay)
    );

    try {
      for (const day of alarm.days_of_week) {
        // Schedule the alarm notification
        const alarmTrigger = this.getNextDayTrigger(day, timeObj);
        console.log(`Scheduling alarm for day ${day} at:`, alarmTrigger);

        const alarmId = await Notifications.scheduleNotificationAsync({
          content: {
            title: alarm.title,
            body: "Time for your habit!",
            sound: true,
            data: { alarmId: alarm.id, type: "alarm" } as NotificationData,
          },
          trigger: alarmTrigger,
        });
        console.log("Scheduled alarm notification with ID:", alarmId);

        // Schedule the verification notification
        const verificationTrigger = this.getNextDayTrigger(
          day,
          verificationTime
        );
        console.log(
          `Scheduling verification for day ${day} at:`,
          verificationTrigger
        );

        const verificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Did you complete: ${alarm.title}?`,
            body: "Tap to mark as completed",
            data: {
              alarmId: alarm.id,
              type: "verification",
            } as NotificationData,
          },
          trigger: verificationTrigger,
        });
        console.log(
          "Scheduled verification notification with ID:",
          verificationId
        );
      }

      return true;
    } catch (error) {
      console.error("Error scheduling notifications:", error);
      return false;
    }
  }

  private static getNextDayTrigger(day: number, time: Date) {
    const now = new Date();
    const targetDate = new Date(now);

    // Set the target time
    targetDate.setHours(time.getHours());
    targetDate.setMinutes(time.getMinutes());
    targetDate.setSeconds(0);
    targetDate.setMilliseconds(0);

    // Calculate days until next occurrence
    let daysUntilTarget = day - now.getDay();
    if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && now > targetDate)) {
      daysUntilTarget += 7;
    }

    // Add days to target date
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);

    return targetDate;
  }

  static async cancelAlarmNotifications(alarmId: string) {
    console.log("Cancelling notifications for alarm:", alarmId);
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log("All scheduled notifications:", notifications);

    const alarmNotifications = notifications.filter(
      (notification: Notifications.NotificationRequest) =>
        (notification.content.data as NotificationData)?.alarmId === alarmId
    );
    console.log("Found notifications to cancel:", alarmNotifications.length);

    for (const notification of alarmNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
      console.log("Cancelled notification:", notification.identifier);
    }
  }

  static async handleVerificationResponse(alarmId: string, completed: boolean) {
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      const { error } = await supabase.from("alarm_completions").upsert({
        alarm_id: alarmId,
        date: today,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating completion:", error);
      return false;
    }
  }

  static async setupNotificationHandling() {
    console.log("Setting up notification handling...");

    // Handle notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(
      async (response: Notifications.NotificationResponse) => {
        console.log("Notification response received:", response);
        const data = response.notification.request.content
          .data as NotificationData;

        if (data?.type === "verification") {
          await this.handleVerificationResponse(data.alarmId, true);
        }

        // Reschedule the notification for next week
        const { content, trigger } = response.notification.request;
        if (trigger instanceof Date) {
          const nextWeek = new Date(trigger);
          nextWeek.setDate(nextWeek.getDate() + 7);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: content.title || "",
              body: content.body || "",
              data: content.data,
              sound: true,
            },
            trigger: nextWeek,
          });
          console.log("Rescheduled notification for next week:", nextWeek);
        }
      }
    );

    // Handle foreground notifications
    Notifications.addNotificationReceivedListener(
      async (notification: Notifications.Notification) => {
        console.log("Notification received in foreground:", notification);
        const data = notification.request.content.data as NotificationData;

        if (data?.type === "verification") {
          // Show an in-app alert or UI for verification
          // This should be handled by your app's UI components
        }

        // Reschedule the notification for next week
        const { content, trigger } = notification.request;
        if (trigger instanceof Date) {
          const nextWeek = new Date(trigger);
          nextWeek.setDate(nextWeek.getDate() + 7);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: content.title || "",
              body: content.body || "",
              data: content.data,
              sound: true,
            },
            trigger: nextWeek,
          });
          console.log("Rescheduled notification for next week:", nextWeek);
        }
      }
    );
  }
}
