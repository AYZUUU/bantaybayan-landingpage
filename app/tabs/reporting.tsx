import { Ionicons } from "@expo/vector-icons";
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
import LocationPopup from "../_utils/Popup";
import WarningPulse from "../_utils/warningpulse";

import { useAuth } from "../(auth)/auth";

type MyLoc = { latitude: number; longitude: number } | null;

export default function Reporting() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<MyLoc>(null);
  const [loading, setLoading] = useState(false);

  const [popupVisible, setPopupVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);

  const { userName } = useAuth();

  const emergencyTypes = [
    { id: "Medical", label: "Medical Emergency" },
    { id: "Fire", label: "Fire" },
    { id: "Accident", label: "Accident" },
    { id: "Crime", label: "Crime" },
  ];

  const [selectedType, setSelectedType] = useState("Medical");

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Toast.show({
            type: "error",
            text1: "Permission Denied",
            text2: "Location is required for BantayBayan.",
          });
          return;
        }

        let lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        }

        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.error("GPS Fetch Error:", error);
      }
    })();
  }, []);

  const severityLevels = ["Low", "Medium", "High", "Critical"];
  const [selectedLevel, setSelectedLevel] = useState("Medium");

  const handleSubmit = async () => {
    if (!location)
      return Toast.show({
        type: "error",
        text1: "Location Error",
        text2: "Still fetching GPS...",
      });

    setLoading(true);
    try {
      await sendReport({
        emergency_type: selectedType,
        accident_level: selectedLevel,
        reporter_name: userName || "Anonymous",
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
      setPopupVisible(true);
    } catch (error: any) {
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
        accident_level: "Critical",
        reporter_name: userName || "Anonymous",
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Toast.show({ type: "success", text1: "Emergency Sent!" });
      setPopupVisible(true);
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Quick Alert Failed" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LocationPopup
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        address={
          location
            ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`
            : "Fetching GPS..."
        }
        location={location}
        onLocationChange={setLocation}
        isDraggable={true}
        title="Pinpoint Location"
        buttonText="Confirm Location"
      />

      <LocationPopup
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        address={
          location
            ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`
            : "Fetching GPS..."
        }
        location={location}
        isDraggable={false}
        title="Emergency Sent!"
        buttonText="Return to Dashboard"
      />

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
          {/* Optional visual confirmation of who is reporting */}
          <Text className="text-center text-gray-500 mt-2">
            Reporting as: {userName || "Anonymous"}
          </Text>
        </View>
        <Pressable
          onPress={() => setIsMapVisible(true)}
          style={{
            backgroundColor: "#eff6ff",
            width: "83.3%",
            alignSelf: "center",
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#bfdbfe",
            marginTop: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <View>
            <Text
              style={{ color: "#1d4ed8", fontWeight: "bold", fontSize: 18 }}
            >
              View Location
            </Text>
            <Text style={{ color: "#3b82f6", fontSize: 12, marginTop: 4 }}>
              {location ? "GPS Acquired. Tap to adjust." : "Fetching GPS..."}
            </Text>
          </View>
          <Ionicons name="map" size={24} color="#1d4ed8" />
        </Pressable>

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

          {/* Warning about misuse of the app */}
          
         
           <View className="w-10/12 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200">
          
            <Text
              style={{ color: "#C82909", fontWeight: "bold", fontSize: 18 }}
            >
             <Ionicons name="warning-sharp" size={24} color="#C82909" /> Note:
            </Text> 
            
            <Text style={{ color: "#F54927", fontSize: 12, marginTop: 4 }}>
              Misuse of this app may lead to legal consequences.
            </Text>
           </View>
           
   

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
