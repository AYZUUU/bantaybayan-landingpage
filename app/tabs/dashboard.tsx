import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";

// 1. Updated the interface to match your database columns
export interface Report {
  id: number;
  emergency_type: string; // Changed from accident_type
  accident_level?: string; // Added severity level
  reporter_name?: string;  // Added to track ownership
  status: string;
  location?: string;
  created_at?: string;
  image_path?: string;
}

export default function Dashboard() {
  const router = useRouter();
  

  const { isLoggedIn, setIsLoggedIn, userName, setUserName } = useAuth();

  const [myReports, setMyReports] = useState<Report[]>([]);

  const fetchMyReports = async () => {
    try {
      const response = await fetch("http://192.168.100.108/api/getReports.php");
      const jsonResponse = await response.json();

      const reportsArray = jsonResponse.data;

      if (reportsArray && reportsArray.length > 0) {
        

        const filteredReports = reportsArray.filter(
          (report: any) => report.reporter_name === userName
        );

        setMyReports(filteredReports);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchMyReports();
    }
  }, [isLoggedIn]);

  const handleLogout = async () => {
    try {
      setIsLoggedIn(false);
      setUserName("");
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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        >
          {/* --- HEADER --- */}
          <View className="h-16 flex-row items-center justify-between px-6 mb-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-blue-100 p-2 rounded-full">
                <FontAwesome5 name="ambulance" size={20} color="#2563EB" />
              </View>
              <Text className="text-2xl font-extrabold text-slate-800">
                Dashboard
              </Text>
            </View>

            <Pressable
              onPress={handleLogout}
              className="bg-white/50 p-2 rounded-full"
            >
              <MaterialIcons name="logout" size={24} color="#334155" />
            </Pressable>
          </View>

          {/* --- REPORTS LIST --- */}
          <View className="px-4">
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
              My Submissions ({myReports.length})
            </Text>

            {myReports.length > 0 ? (
              myReports.map((report) => (
                <View
                  key={report.id}
                  className="w-full bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-100"
                >
                  {/* Status & Type Header */}
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 pr-4">
                      {/* Updated to emergency_type */}
                      <Text className="text-lg font-bold text-slate-800 mb-1">
                        {report.emergency_type || "Emergency Report"}
                      </Text>
                      
                      {/* Added Visual Accident Level Display */}
                      {report.accident_level && (
                        <Text className="text-xs font-semibold text-orange-600 uppercase mb-1">
                          Severity: {report.accident_level}
                        </Text>
                      )}

                      {report.created_at && (
                        <Text className="text-xs text-slate-400">
                          {report.created_at}
                        </Text>
                      )}
                    </View>
                    
                    {/* Dynamic Status Badge */}
                    <View
                      className={`px-3 py-1.5 rounded-full ${
                        report.status === "Pending"
                          ? "bg-yellow-100"
                          : report.status === "Verified"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          report.status === "Pending"
                            ? "text-yellow-700"
                            : report.status === "Verified"
                            ? "text-blue-700"
                            : "text-green-700"
                        }`}
                      >
                        {report.status || "Unknown"}
                      </Text>
                    </View>
                  </View>

                  {/* Optional Image */}
                  {report.image_path && (
                    <Image
                      source={{ uri: `http://192.168.100.108/api/${report.image_path}` }}
                      className="w-full h-32 rounded-xl mb-3 bg-slate-100"
                      resizeMode="cover"
                    />
                  )}

                  {/* Location / Extra Details */}
                  <View className="flex-row items-center pt-3 border-t border-slate-100">
                    <MaterialIcons name="location-on" size={16} color="#64748B" />
                    <Text className="text-sm text-slate-500 ml-1 flex-1" numberOfLines={1}>
                      {report.location || "Location logged via GPS"}
                    </Text>
                    
                    <Pressable className="bg-blue-50 px-4 py-2 rounded-lg">
                      <Text className="text-blue-600 font-bold text-sm">View</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View className="items-center justify-center py-10 bg-white/50 rounded-2xl border border-white/60">
                <MaterialIcons name="inbox" size={48} color="#94A3B8" />
                <Text className="text-slate-500 mt-4 font-medium">
                  You haven't submitted any reports yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}