import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";

export default function TabLayout() {
  const { isLoggedIn, userRole } = useAuth();
  console.log("User logged in?", isLoggedIn);

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#4D8BE2" }}>
      <Tabs.Screen
        name="reporting"
        options={{
          title: "Report",
          tabBarItemStyle: {
            display: isLoggedIn && userRole !== "rescuer" ? "flex" : "none",
          },
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
          tabBarItemStyle: {
            display: isLoggedIn && userRole !== "rescuer" ? "flex" : "none",
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="rescuer"
        options={{
          title: "Rescuer",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="medkit" size={28} color={color} />
          ),
        }}
      />
      <Toast />
    </Tabs>
  );
}
