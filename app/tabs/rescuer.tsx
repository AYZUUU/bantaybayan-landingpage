import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";
import RescuerCard, { Report } from "../_utils/rescuercard";

export default function Rescuer() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [lastReportId, setLastReportId] = useState(null);

  const fetchReports = async () => {
    try {
      const response = await fetch("http://192.168.100.108/api/getReports.php");
      const jsonResponse = await response.json();
      const reportsArray = jsonResponse.data;

      if (reportsArray && reportsArray.length > 0) {
        const top5Reports = reportsArray.slice(0, 5);
        const latestReport = reportsArray[0];

        if (lastReportId !== null && latestReport.id > lastReportId) {
          Toast.show({
            type: "info",
            text1: "New Emergency!",
            text2: latestReport.incident_type,
          });
        }
        setReports(top5Reports);
        setLastReportId(latestReport.id);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchReports();
      const interval = setInterval(fetchReports, 10000);
      return () => clearInterval(interval);
    }
  }, [lastReportId, isLoggedIn]);

  const handleLogout = async () => {
    try {
      setIsLoggedIn(false);
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "Returning to HomePage...",
      });
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Logout Error!",
        text2: "Something went wrong.",
      });
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* --- FIXED HEADER --- */}
        <View className="h-16 flex-row items-center justify-between px-4 mb-2">
          <FontAwesome5 name="ambulance" size={24} color="black" />
          <View>
            <Text className="text-2xl font-bold text-center text-black">
              Dashboard
            </Text>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable onPress={handleLogout}>
              <MaterialIcons name="logout" size={28} color="black" />
            </Pressable>
          </View>
        </View>

        {/* --- SCROLLABLE LIST OF REPORTS --- */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          {reports.length > 0 ? (
            
            <RescuerCard recentReports={reports} /> 
          ) : (
            <Text className="text-center text-gray-500 mt-10">
              No active emergencies at this time.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
