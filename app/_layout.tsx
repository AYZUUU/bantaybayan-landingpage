import { Stack } from "expo-router";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { AuthProvider } from "./(auth)/auth";
import "./globals.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <Toast />
      </View>
    </AuthProvider>
  );
}
