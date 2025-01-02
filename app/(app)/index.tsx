import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import Colors from "../../constants/Colors";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { NotificationService } from "../../services/NotificationService";
import { Swipeable } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

type Alarm = {
  id: string;
  user_id: string;
  title: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlarms();
    checkScheduledNotifications();
  }, []);

  async function fetchAlarms() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("alarms")
        .select("*")
        .eq("user_id", user.id)
        .order("time");

      if (error) throw error;
      setAlarms(data || []);
    } catch (error) {
      console.error("Error fetching alarms:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAlarm(id: string, isActive: boolean) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("alarms")
        .update({ is_active: !isActive })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      // Handle notifications based on the new state
      if (!isActive) {
        // If turning on, schedule notifications
        await NotificationService.scheduleAlarm({
          id: data.id,
          title: data.title,
          time: data.time,
          days_of_week: data.days_of_week,
          verification_delay: data.verification_delay,
        });
      } else {
        // If turning off, cancel notifications
        await NotificationService.cancelAlarmNotifications(data.id);
      }

      setAlarms(
        alarms.map((alarm) =>
          alarm.id === id ? { ...alarm, is_active: !isActive } : alarm
        )
      );
    } catch (error) {
      console.error("Error toggling alarm:", error);
    }
  }

  async function deleteAlarm(id: string) {
    Alert.alert("Delete Alarm", "Are you sure you want to delete this alarm?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Cancel notifications first
            await NotificationService.cancelAlarmNotifications(id);

            const { error } = await supabase
              .from("alarms")
              .delete()
              .eq("id", id);

            if (error) throw error;
            setAlarms(alarms.filter((alarm) => alarm.id !== id));
          } catch (error) {
            console.error("Error deleting alarm:", error);
            Alert.alert("Error", "Failed to delete alarm");
          }
        },
      },
    ]);
  }

  function formatTime(time: string) {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return format(date, "hh:mm a");
  }

  function formatDays(days: number[]) {
    if (days.length === 7) return "Every day";
    if (days.length === 5 && !days.includes(0) && !days.includes(6))
      return "Weekdays";
    return days.map((d) => DAYS[d]).join(", ");
  }

  const router = useRouter();

  const renderRightActions = (id: string) => {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/${id}`)}
        >
          <Ionicons name="pencil" size={24} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteAlarm(id)}
        >
          <Ionicons name="trash" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderAlarm = ({ item }: { item: Alarm }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false}
    >
      <View style={styles.alarmItem}>
        <View style={styles.alarmInfo}>
          <Text style={styles.alarmTime}>{formatTime(item.time)}</Text>
          <Text style={styles.alarmTitle}>{item.title}</Text>
          <Text style={styles.alarmDays}>{formatDays(item.days_of_week)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleAlarm(item.id, item.is_active)}
          style={[styles.toggle, item.is_active && styles.toggleActive]}
        >
          <View
            style={[styles.toggleDot, item.is_active && styles.toggleDotActive]}
          />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  async function checkScheduledNotifications() {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      console.log("Currently scheduled notifications:", notifications);
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading alarms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alarms}
        renderItem={renderAlarm}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No alarms yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first alarm to get started
            </Text>
          </View>
        }
      />
      <Link href="/new-alarm" asChild>
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  alarmItem: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  alarmTitle: {
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 4,
  },
  alarmDays: {
    fontSize: 14,
    color: Colors.secondary,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: Colors.gray[200],
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleDot: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: Colors.white,
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.secondary,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
});
