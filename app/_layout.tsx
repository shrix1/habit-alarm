import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { NotificationService } from "../services/NotificationService";
import { useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

export default function RootLayout() {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initialize notification handling
    NotificationService.setupNotificationHandling();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      // Redirect authenticated users to the main app
      router.replace("/(app)");
    } else if (!session && !inAuthGroup) {
      // Redirect unauthenticated users to sign in
      router.replace("/sign-in");
    }
  }, [session, initialized, segments]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
