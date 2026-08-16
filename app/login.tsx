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
import { useAuth } from "./(auth)/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIsLoggedIn, setUserRole, setUserName } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: "info",
        text1: "Fill up the field.",
        text2: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://192.168.100.108/api/logsignup.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await response.text();
      console.log(" RAW SERVER RESPONSE 🚨:\n", rawText);

      const result = JSON.parse(rawText);

      if (result.status === "success") {
        let fullName = "Anonymous";
        if (result.user && result.user.first_name) {
          fullName = `${result.user.first_name} ${result.user.last_name}`.trim();
        }
        Toast.show({
          type: "success",
          text1: "Login Successful, Welcome back!",
          text2: "Redirecting to dashboard...",
        });

        setTimeout(() => {
          const safeRole = result.role?.toLowerCase()?.trim();

          setUserName(fullName);
          setIsLoggedIn(true);
          setUserRole(safeRole);

          if (safeRole === "responder") {
            router.replace("/tabs/rescuer");
          } else if (safeRole === "citizen") {
            router.replace("/tabs/dashboard");
          } else {
            Toast.show({
              type: "error",
              text1: "Routing Error",
              text2: "Unknown user role: " + safeRole,
            });
          }
        }, 2000);
      } else {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: result.message || "Invalid credentials",
        });
      }
    } catch (error) {
      console.error("Login Error:", error);
      Toast.show({
        type: "error",
        text1: "Server error",
        text2: "Could not connect to the local server.",
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

              <Link href="/signup" style={styles.linkContainer}>
                <Text style={{ color: "#2A4C7C" }}>Don't have an Account? </Text>
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