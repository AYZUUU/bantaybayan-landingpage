import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";


import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";

import {
  MFA_CHALLENGE_REQUIRED,
  useAuth,
} from "../shared/auth";
import { getVerifiedTotpFactor } from "../shared/totpMfa";
import { supabase } from "../services/supabase";
import { useAppPreferences } from "../shared/AppPreferences";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingPushToken, setPendingPushToken] = useState<string | null>(null);
  const { isAuthReady, signIn, completeTotpSignIn } = useAuth();
  const { preferences } = useAppPreferences();

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Emergency alerts",
            importance: AndroidImportance.HIGH,
            sound: "default",
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF0000",
          });
        } catch (error) {
          console.warn(
            "Could not configure the Android notification channel:",
            error,
          );
        }
      }

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      console.log("Must use a physical device for Push Notifications, emulators won't work.");
    }
    return token;
  }

  const handleLogin = async () => {
    if (!isAuthReady) {
      Toast.show({
        type: "info",
        text1: "Checking saved session",
        text2: "Please wait a moment and try again.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const submittedPassword = password;

    if (!normalizedEmail || !submittedPassword) {
      Toast.show({
        type: "info",
        text1: "Fill up the field.",
        text2: "Please enter both email and password.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Toast.show({
        type: "error",
        text1: "Invalid email",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);

    try {
      let pushToken: string | null = null;
      if (preferences.notificationsEnabled) {
        try {
          pushToken = (await registerForPushNotificationsAsync()) ?? null;
          setPendingPushToken(pushToken);
        } catch (error) {
          console.warn(
            "Push notification registration failed; continuing login without a push token:",
            error,
          );
          Toast.show({
            type: "info",
            text1: "Notifications unavailable",
            text2: "Login will continue without push notifications.",
          });
        }
      }
      const safeRole = await signIn(
        normalizedEmail,
        submittedPassword,
        pushToken,
      );

      Toast.show({
        type: "success",
        text1: "Login successful",
        text2: "You’re signed in with Supabase.",
      });

      router.replace(
        safeRole === "responder" ? "/tabs/rescuer" : "/tabs/reporting",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === MFA_CHALLENGE_REQUIRED
      ) {
        try {
          const factor = await getVerifiedTotpFactor(supabase);
          if (!factor) throw new Error("No verified authenticator is available.");
          setMfaFactorId(factor.id);
          return;
        } catch (factorError) {
          console.error("Could not start authenticator verification:", factorError);
          Toast.show({
            type: "error",
            text1: "Authenticator unavailable",
            text2:
              factorError instanceof Error
                ? factorError.message
                : "Try signing in again.",
          });
          return;
        }
      }
      console.error("Login Error:", error);
      Toast.show({
        type: "error",
        text1: "Login could not be completed",
        text2:
          error instanceof Error
            ? error.message
            : "Check your email and password, then try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!mfaFactorId || !/^\d{6}$/.test(mfaCode.trim())) {
      Toast.show({
        type: "info",
        text1: "Enter the 6-digit code",
        text2: "Use the current code from your authenticator app.",
      });
      return;
    }
    setLoading(true);
    try {
      const safeRole = await completeTotpSignIn(
        mfaFactorId,
        mfaCode,
        pendingPushToken,
      );
      router.replace(
        safeRole === "responder" ? "/tabs/rescuer" : "/tabs/reporting",
      );
    } catch (error) {
      console.error("Authenticator verification failed:", error);
      Toast.show({
        type: "error",
        text1: "Verification failed",
        text2:
          error instanceof Error
            ? error.message
            : "Check the code and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.avoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.title}>BantayBayan</Text>

              <View style={styles.formContainer}>
                <Text style={styles.label}>Email:</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={[styles.label, { marginTop: 16 }]}>Password:</Text>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                <View style={styles.submitButton}>
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Login</Text>
                  )}
                </View>
              </Pressable>

              {mfaFactorId && (
                <View style={styles.mfaContainer}>
                  <Text style={styles.label}>Authenticator code:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={mfaCode}
                    onChangeText={(code) =>
                      setMfaCode(code.replace(/\D/g, "").slice(0, 6))
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    onPress={handleVerifyTotp}
                    disabled={loading}
                    style={{ opacity: loading ? 0.5 : 1 }}
                  >
                    <View style={styles.submitButton}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          Verify authenticator
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </View>
              )}

              <Link href="/signup" style={styles.linkContainer}>
                <Text style={{ color: "#2A4C7C" }}>
                  Don&apos;t have an Account?{" "}
                </Text>
                <Text style={{ color: "#FF0000", fontWeight: "bold" }}>
                  Sign Up
                </Text>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  avoidingView: {
    flex: 1,
    width: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "83%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  title: {
    color: "#2A4C7C",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 16,
  },
  formContainer: {
    marginTop: 24,
  },
  mfaContainer: {
    marginTop: 24,
    gap: 12,
  },
  label: {
    fontWeight: "bold",
    color: "#1F2937",
  },
  textInput: {
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
    color: "#000000",
  },
  submitButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    width: "100%",
    height: 48,
    marginTop: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  linkContainer: {
    textAlign: "center",
    marginTop: 24,
    alignSelf: "center",
  },
});