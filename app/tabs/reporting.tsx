import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { sendReport } from "../../services/api";
import { pickSource } from "../_utils/imagecapture";
import WarningPulse from "../_utils/warningpulse";

type MyLoc = { latitude: number; longitude: number } | null;

export default function Reporting() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<MyLoc>(null);
  const [loading, setLoading] = useState(false);

  const emergencyTypes = [
    { id: "medical", label: "Medical Emergency" },
    { id: "fire", label: "Fire" },
    { id: "accident", label: "Accident" },
    { id: "crime", label: "Crime" },
  ];

  const [selectedType, setSelectedType] = useState("medical");
  const [reporterName, setReporterName] = useState("Anonymous User");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Location is required for BantayBayan.",
        });
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const handleSubmit = async () => {
    if (!location) {
      return Toast.show({
        type: "error",
        text1: "Location Error",
        text2: "Still fetching GPS...",
      });
    }

    setLoading(true);
    try {
      await sendReport({
        emergency_type: selectedType,
        accident_type: selectedType,
        reporter_name: reporterName,
        latitude: location.latitude,
        longitude: location.longitude,
        image: photo,
      });

      Toast.show({
        type: "success",
        text1: "Report Sent",
        text2: "Community alerted.",
      });
      setPhoto(null);
    } catch (error: any) {
      console.error(
        "Detailed Report Error:",
        error.response?.data || error.message || error,
      );
      Toast.show({ type: "error", text1: "Submission Failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = async () => {
    if (!location) return Toast.show({ type: "info", text1: "Wait for GPS" });

    try {
      await sendReport({
        emergency_type: "Urgent",
        accident_type: "Quick Alert",
        reporter_name: "Anonymous",
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Toast.show({ type: "success", text1: "Emergency Sent!" });
    } catch (e: any) {
      console.error("Quick Alert Error:", e.response?.data || e.message || e);
      Toast.show({ type: "error", text1: "Quick Alert Failed" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center mt-10">
          <Pressable onPress={handleQuickReport}>
            <WarningPulse />
          </Pressable>
          <Text className="mt-4 text-gray-400">Tap for Quick Emergency</Text>
        </View>
        <View className="mt-10">
          <Text className="font-bold text-3xl self-center text-gray-800">
            Report Incident
          </Text>
        </View>

        <View className="bg-white rounded-3xl shadow-lg w-10/12 p-6 self-center mt-6">
          <Text className="mb-4 font-bold text-gray-500 text-center">
            Select Emergency Type:
          </Text>
          <View>
            {emergencyTypes.map((type) => {
              const isActive = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedType(type.id)}
                  className={`mb-3 p-4 rounded-xl border-2 items-center ${
                    isActive
                      ? "bg-red-500 border-red-500"
                      : "bg-transparent border-gray-300"
                  }`}
                >
                  <Text
                    className={`font-bold text-lg ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-8 items-center">
          <Pressable
            onPress={() => pickSource(setPhoto)}
            className="w-10/12 h-96 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50"
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                className="w-full h-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-gray-400 font-bold">Attach Photo</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className={`w-10/12 mt-6 p-4 rounded-2xl bg-black ${
              loading ? "opacity-50" : ""
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Send Detailed Report
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
