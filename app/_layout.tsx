import "./global.css";
import "../services/responderLocation";
import { Stack, usePathname, useRouter } from "expo-router";
import { LogBox, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import Toast, { BaseToast, type ToastConfig } from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "../shared/auth";
import {
  APP_PREFERENCES_STORAGE_KEY,
  AppPreferencesProvider,
} from "../shared/AppPreferences";

Notifications.setNotificationHandler({
  handleNotification: async () => {
    let notificationsEnabled = true;
    let soundEnabled = true;
    try {
      const storedValue = await AsyncStorage.getItem(
        APP_PREFERENCES_STORAGE_KEY,
      );
      if (storedValue) {
        const preferences: unknown = JSON.parse(storedValue);
        if (typeof preferences === "object" && preferences !== null) {
          if ("notificationsEnabled" in preferences) {
            notificationsEnabled =
              preferences.notificationsEnabled === true;
          }
          if ("soundEnabled" in preferences) {
            soundEnabled = preferences.soundEnabled === true;
          }
        }
      }
    } catch (error) {
      console.error("Could not read notification preferences:", error);
    }

    return {
      shouldPlaySound: notificationsEnabled && soundEnabled,
      shouldSetBadge: false,
      shouldShowBanner: notificationsEnabled,
      shouldShowList: notificationsEnabled,
    };
  },
});

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.successToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.errorToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.infoToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
};

LogBox.ignoreAllLogs(true);

function AuthNavigation() {
  const { isAuthReady, isLoggedIn, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthReady) return;

    const isProtectedRoute = [
      "/tabs/dashboard",
      "/tabs/rescuer",
      "/tabs/settings",
    ].includes(pathname);
    const defaultRoute =
      userRole === "responder" ? "/tabs/rescuer" : "/tabs/reporting";

    if (isLoggedIn) {
      if (pathname === "/" || pathname === "/login") {
        router.replace(defaultRoute);
        return;
      }

      if (isProtectedRoute) {
        const allowedRoutes =
          userRole === "responder"
            ? ["/tabs/rescuer", "/tabs/settings"]
            : ["/tabs/reporting", "/tabs/dashboard", "/tabs/settings"];

        if (!allowedRoutes.includes(pathname)) {
          router.replace(defaultRoute);
          return;
        }
      }

      return;
    }

    if (isProtectedRoute) {
      router.replace("/login");
    }
  }, [isAuthReady, isLoggedIn, pathname, router, userRole]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppPreferencesProvider>
        <View style={{ flex: 1 }}>
          <AuthNavigation />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="tabs" />
          </Stack>
          <Toast
            config={toastConfig}
            visibilityTime={5000}
            topOffset={60}
            swipeable
          />
        </View>
      </AppPreferencesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  toast: {
    width: "92%",
    maxWidth: 480,
    minHeight: 76,
    height: "auto",
    borderRadius: 16,
    borderLeftWidth: 6,
    paddingVertical: 10,
    paddingRight: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successToast: {
    backgroundColor: "#ecfdf5",
    borderLeftColor: "#059669",
  },
  errorToast: {
    backgroundColor: "#fff1f2",
    borderLeftColor: "#e11d48",
  },
  infoToast: {
    backgroundColor: "#eff6ff",
    borderLeftColor: "#2563eb",
  },
  toastContent: {
    paddingHorizontal: 16,
  },
  toastTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  toastMessage: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
});
