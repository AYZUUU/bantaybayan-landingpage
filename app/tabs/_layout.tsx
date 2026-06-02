import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";

export default function TabLayout() {
  const { isLoggedIn, userRole } = useAuth();
  console.log("User logged in?", isLoggedIn, "| Role:", userRole);


  const isResponder = userRole === "responder";

  return (
    <>
      <Tabs screenOptions={{ tabBarActiveTintColor: "#4D8BE2" }}>
        
        <Tabs.Screen
          name="reporting"
          options={{
            title: "Report",
            // Hide from responders/rescuers
            href: !isLoggedIn || isResponder ? null : undefined,
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
            // Hide from responders/rescuers
            href: !isLoggedIn || isResponder ? null : undefined,
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
            // ONLY show to responders/rescuers
            href: isLoggedIn && isResponder ? undefined : null,
            tabBarIcon: ({ color }) => (
              <Ionicons name="medkit" size={28} color={color} />
            ),
          }}
        />

      </Tabs>

      <Toast />
    </>
  );
}