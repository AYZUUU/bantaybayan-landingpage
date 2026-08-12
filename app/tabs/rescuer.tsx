import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";
import RescuerCard, { Report } from "../_utils/rescuercard";
import MapView, { Marker } from "react-native-maps";

export default function Rescuer() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const lastReportIdRef = useRef<number | null>(null);

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  
  const [newEmergencyType, setNewEmergencyType] = useState("");
  const [newReportData, setNewReportData] = useState<Report | null>(null);

  const fetchReports = async () => {
    try {
      const response = await fetch("http://192.168.100.108/api/getReports.php");
      const jsonResponse = await response.json();
      const reportsArray = jsonResponse.data;

      if (reportsArray && reportsArray.length > 0) {
        const top5Reports = reportsArray.slice(0, 5);
        const latestReport = reportsArray[0];
        
        console.log("Raw Report Data from DB:", latestReport); 

        const latestId = Number(latestReport.id);



        if (
          lastReportIdRef.current !== null &&
          latestId > lastReportIdRef.current
        ) {
          setNewEmergencyType(latestReport.emergency_type || "A new report was posted.");
          setNewReportData(latestReport); 
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

  if (!isLoggedIn) return null;

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* HEADER */}
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

        {/* LIST OF REPORTS */}
       <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        >
          {reports.length > 0 ? (
            <RescuerCard 
              recentReports={reports} 
              onViewDetails={(selectedReport) => {
                setNewReportData(selectedReport); 
                setDetailsModalVisible(true);    
              }}

            />
          ) : (
            <Text className="text-center text-gray-500 mt-10">
              No active emergencies at this time.
            </Text>
          )}
        </ScrollView>

        {/* ALERT MODAL */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={alertModalVisible}
          onRequestClose={() => setAlertModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
            <View className="bg-white w-10/12 rounded-3xl p-6 items-center shadow-lg">
              <View className="bg-red-100 rounded-full p-4 mb-4">
                <FontAwesome5 name="exclamation-triangle" size={40} color="#dc2626" />
              </View>

              <Text className="text-2xl font-bold text-gray-900 mb-2">New Emergency!</Text>

              <Text className="text-center text-gray-600 text-lg mb-8">
                An <Text className="font-bold text-red-600">{newEmergencyType}</Text> has just been reported.
              </Text>

              <View className="flex-row gap-3 w-full">
                <Pressable
                  onPress={() => setAlertModalVisible(false)}
                  className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
                >
                  <Text className="text-gray-800 font-bold text-base">Dismiss</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setAlertModalVisible(false);
                    setDetailsModalVisible(true); 
                  }}
                  className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-base">View Details</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* DETAILS MODAL */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={detailsModalVisible}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
            <View className="bg-white w-full rounded-t-3xl p-6 shadow-lg min-h-[50%]">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">Report Details</Text>
                <Pressable onPress={() => setDetailsModalVisible(false)}>
                  <MaterialIcons name="close" size={28} color="black" />
                </Pressable>
              </View>

              {newReportData ? (
                <View className="gap-5">
                  <View>
                    <Text className="text-sm text-gray-500 font-semibold uppercase">Emergency Type</Text>
                    <Text className="text-xl text-red-600 font-bold">{newReportData.emergency_type}</Text>
                  </View>

                  <View>
                    <Text className="text-sm text-gray-500 font-semibold uppercase">Reported By</Text>
                    <Text className="text-lg text-gray-900 font-medium">{newReportData.reporter_name || "Anonymous Community Member"}</Text>
                  </View>
                  
                  <View>
                    <Text className="text-sm text-gray-500 font-semibold uppercase">GPS Location</Text>
                    <Text className="text-lg text-gray-900">
                      {/* @ts-ignore */}
                      {newReportData.latitude && newReportData.longitude 
                        ? `Lat: ${newReportData.latitude}, Lon: ${newReportData.longitude}` 
                        : "Location data unavailable"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm text-gray-500 font-semibold uppercase mb-2">
                      Emergency Location
                    </Text>
                    
                    {/* @ts-ignore */}
                    {newReportData.latitude && newReportData.longitude ? (
                      <View className="h-80 w-full rounded-2xl overflow-hidden border border-gray-200">
                        <MapView
                          style={{ width: "100%", height: "100%" }}
                          initialRegion={{
                     
                            latitude: Number(newReportData.latitude),
               
                            longitude: Number(newReportData.longitude),
                            latitudeDelta: 0.005, 
                            longitudeDelta: 0.005,
                          }}
                        >
                       
                          <Marker
                            coordinate={{
               
                              latitude: Number(newReportData.latitude),
            
                              longitude: Number(newReportData.longitude),
                            }}
                            title={newReportData.emergency_type}
                            description={`Reported by ${newReportData.reporter_name || "Anonymous"}`}
                          />
                        </MapView>
                      </View>
                    ) : (
                      <Text className="text-lg text-gray-900 italic bg-gray-100 p-4 rounded-xl text-center">
                        Location data unavailable
                      </Text>
                    )}
                  </View>

                  
                </View>
              ) : (
                <Text className="text-center text-gray-500">Loading details...</Text>
              )}

              <Pressable
                onPress={() => setDetailsModalVisible(false)}
                className="bg-black w-full py-4 rounded-xl items-center mt-8"
              >
                <Text className="text-white font-bold text-lg">Close Details</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}