import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import Colors from "../constants/Colors";

type ContributionDay = {
  date: string;
  completed: boolean;
};

type Props = {
  data: ContributionDay[];
  weeks?: number;
};

export default function ContributionGraph({ data, weeks = 12 }: Props) {
  const today = new Date();
  const startDate = startOfWeek(subDays(today, (weeks - 1) * 7));

  const generateDays = () => {
    const days = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const contribution = data.find((d) => d.date === dateStr);
      days.push({
        date,
        completed: contribution?.completed ?? false,
      });
    }
    return days;
  };

  const days = generateDays();
  const weeks_array = Array.from({ length: weeks }, (_, i) =>
    days.slice(i * 7, (i + 1) * 7)
  );

  const getContributionColor = (completed: boolean) => {
    return completed ? Colors.success : Colors.gray[200];
  };

  return (
    <View style={styles.container}>
      <View style={styles.weekDays}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <Text key={i} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.graph}>
        {weeks_array.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <View
                key={dayIndex}
                style={[
                  styles.day,
                  { backgroundColor: getContributionColor(day.completed) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  weekDays: {
    marginRight: 8,
  },
  weekDay: {
    fontSize: 12,
    color: Colors.secondary,
    height: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  graph: {
    flex: 1,
    flexDirection: "row",
  },
  week: {
    marginRight: 4,
  },
  day: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 4,
  },
});
