import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { ScrollView, Pressable, Text, View, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";
import RescuerCard, { Report } from "../_utils/rescuercard";

export default function Rescuer() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  
  // Ref to track the ID
  const lastReportIdRef = useRef<number | null>(null);

  // --- NEW MODAL STATES ---
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [newEmergencyType, setNewEmergencyType] = useState("");

  const fetchReports = async () => {
    try {
      const response = await fetch("http://192.168.100.108/api/getReports.php");
      const jsonResponse = await response.json();
      const reportsArray = jsonResponse.data;

      if (reportsArray && reportsArray.length > 0) {
        const top5Reports = reportsArray.slice(0, 5);
        const latestReport = reportsArray[0];
        
        const latestId = Number(latestReport.id);

        // Check if there is a new report
        if (lastReportIdRef.current !== null && latestId > lastReportIdRef.current) {
          // FIXED: Trigger the Modal instead of the Toast!
          setNewEmergencyType(latestReport.emergency_type || "A new report was posted.");
          setAlertModalVisible(true);
        }

        setReports(top5Reports);
        lastReportIdRef.current = latestId;
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
  }, [isLoggedIn]); 

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

        {/* --- NEW EMERGENCY MODAL --- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={alertModalVisible}
          onRequestClose={() => setAlertModalVisible(false)} // Handles Android back button
        >
          {/* Dark semi-transparent background overlay */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* Modal Box */}
            <View className="bg-white w-10/12 rounded-3xl p-6 items-center shadow-lg">
              
              {/* Warning Icon */}
              <View className="bg-red-100 rounded-full p-4 mb-4">
                <FontAwesome5 name="exclamation-triangle" size={40} color="#dc2626" />
              </View>

              <Text className="text-2xl font-bold text-gray-900 mb-2">
                New Emergency!
              </Text>
              
              <Text className="text-center text-gray-600 text-lg mb-8">
                An urgent <Text className="font-bold text-red-600">{newEmergencyType}</Text> has just been reported.
              </Text>

              {/* Acknowledge Button */}
              <Pressable
                onPress={() => setAlertModalVisible(false)}
                className="bg-red-600 w-full py-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-lg">Acknowledge</Text>
              </Pressable>

            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}