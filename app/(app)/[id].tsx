import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../lib/supabase";
import Colors from "../../constants/Colors";
import { format, parse } from "date-fns";
import { NotificationService } from "../../services/NotificationService";

const DAYS = [
  { id: 0, name: "Sun" },
  { id: 1, name: "Mon" },
  { id: 2, name: "Tue" },
  { id: 3, name: "Wed" },
  { id: 4, name: "Thu" },
  { id: 5, name: "Fri" },
  { id: 6, name: "Sat" },
];

const PRESETS = [
  { name: "Every Day", days: [0, 1, 2, 3, 4, 5, 6] },
  { name: "Weekdays", days: [1, 2, 3, 4, 5] },
  { name: "Weekends", days: [0, 6] },
];

export default function EditAlarm() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchAlarmDetails();
  }, []);

  async function fetchAlarmDetails() {
    try {
      const { data, error } = await supabase
        .from("alarms")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Alarm not found");

      setTitle(data.title);
      const timeObj = parse(data.time, "HH:mm", new Date());
      setTime(timeObj);
      setSelectedDays(data.days_of_week);
    } catch (error) {
      console.error("Error fetching alarm:", error);
      Alert.alert("Error", "Failed to load alarm details");
      router.back();
    } finally {
      setInitialLoading(false);
    }
  }

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((id) => id !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const selectPreset = (days: number[]) => {
    setSelectedDays(days);
  };

  const handleTimeChange = (_: any, selectedTime: Date | undefined) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const updateAlarm = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert("Error", "Please select at least one day");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Cancel existing notifications
      await NotificationService.cancelAlarmNotifications(id as string);

      const { data, error } = await supabase
        .from("alarms")
        .update({
          title: title.trim(),
          time: format(time, "HH:mm"),
          days_of_week: selectedDays,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      // Schedule new notifications
      await NotificationService.scheduleAlarm({
        id: data.id,
        title: data.title,
        time: data.time,
        days_of_week: data.days_of_week,
        verification_delay: data.verification_delay,
      });

      router.back();
    } catch (error) {
      console.error("Error updating alarm:", error);
      Alert.alert("Error", "Failed to update alarm");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter alarm title"
          maxLength={50}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeButtonText}>{format(time, "hh:mm a")}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleTimeChange}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Repeat</Text>
        <View style={styles.presets}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              style={[
                styles.presetButton,
                JSON.stringify(selectedDays) === JSON.stringify(preset.days) &&
                  styles.presetButtonActive,
              ]}
              onPress={() => selectPreset(preset.days)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  JSON.stringify(selectedDays) ===
                    JSON.stringify(preset.days) &&
                    styles.presetButtonTextActive,
                ]}
              >
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.days}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.day,
                selectedDays.includes(day.id) && styles.daySelected,
              ]}
              onPress={() => toggleDay(day.id)}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDays.includes(day.id) && styles.dayTextSelected,
                ]}
              >
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={updateAlarm}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Updating..." : "Update Alarm"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeButton: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  presets: {
    flexDirection: "row",
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  presetButtonActive: {
    backgroundColor: Colors.primary,
  },
  presetButtonText: {
    color: Colors.secondary,
    fontSize: 14,
  },
  presetButtonTextActive: {
    color: Colors.white,
  },
  days: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  day: {
    width: "13.5%",
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  daySelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: Colors.text,
  },
  dayTextSelected: {
    color: Colors.white,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
