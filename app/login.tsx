import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  const { setIsLoggedIn } = useAuth();
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

      const result = await response.json();

      if (result.status === "success") {
        setIsLoggedIn(true);
        Toast.show({
          type: "success",
          text1: "Welcome back!",
          text2: "Logging you into BantayBayan...",
        });

        setTimeout(() => router.replace("/tabs/dashboard"), 1500);
      } else {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: result.message || "Invalid credentials",
        });
      }
    } catch (error) {
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
      <SafeAreaView
        className="items-center flex-1"
        edges={["bottom", "left", "right"]}
      >
        <View className="h-auto bg-primary rounded-3xl shadow-lg w-10/12 mt-10 mb-10 p-6">
          <Text
            style={{
              color: "#2A4C7C",
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            BantayBayan
          </Text>

          <View className="mt-6 space-y-4">
            <Text className="font-bold">Email:</Text>
            <TextInput
              className="input-box rounded bg-light-100 h-9 px-3 border border-gray-200"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Text className="font-bold mt-4">Password:</Text>
            <TextInput
              className="input-box rounded bg-light-100 h-9 px-3 border border-gray-200"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <View className="bg-accent rounded-xl w-full h-12 mt-8 justify-center items-center">
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{ color: "white", fontWeight: "bold", fontSize: 18 }}
                >
                  Login
                </Text>
              )}
            </View>
          </Pressable>

          <Link className="text-center mt-6" href="/signup">
            <Text style={{ color: "#2A4C7C" }}>Don't have an Account? </Text>
            <Text style={{ color: "#FF0000", fontWeight: "bold" }}>
              Sign Up
            </Text>
          </Link>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
