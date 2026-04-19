import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import Toast from "react-native-toast-message";

import { useAuth } from "../(auth)/auth";
export default function TabLayout() {
  const { isLoggedIn } = useAuth();
  console.log("User logged in?", isLoggedIn);
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#4D8BE2" }}>
      <Tabs.Screen
        name="reporting"
        options={{
          title: "Report",

          tabBarIcon: ({ color }) => (
            <Ionicons name="megaphone" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarItemStyle: { display: isLoggedIn ? "flex" : "none" },
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />
      <Toast />
    </Tabs>
  );
}
