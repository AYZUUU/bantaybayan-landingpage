import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
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

  const [selectedLevel] = useState("Medium");

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
    <SafeAreaView style={styles.safeArea}>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.quickReportContainer}>
          <Pressable onPress={handleQuickReport}>
            <WarningPulse />
          </Pressable>
          <Text style={styles.quickReportSubText}>Tap for Quick Emergency</Text>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Report Incident</Text>
          <Text style={styles.reporterText}>
            Reporting as: {userName || "Anonymous"}
          </Text>
        </View>

        <Pressable onPress={() => setIsMapVisible(true)} style={styles.locationCard}>
          <View>
            <Text style={styles.locationTitle}>View Location</Text>
            <Text style={styles.locationSubText}>
              {location ? "GPS Acquired. Tap to adjust." : "Fetching GPS..."}
            </Text>
          </View>
          <Ionicons name="map" size={24} color="#1d4ed8" />
        </Pressable>

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyCardTitle}>
            Select Emergency Type:
          </Text>
          <View>
            {emergencyTypes.map((type) => {
              const isActive = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedType(type.id)}
                  style={[
                    styles.emergencyButton,
                    isActive
                      ? styles.emergencyButtonActive
                      : styles.emergencyButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.emergencyButtonText,
                      isActive ? styles.textActive : styles.textInactive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <Pressable
            onPress={() => pickSource(setPhoto)}
            style={styles.photoContainer}
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.attachedImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.attachPhotoText}>Attach Photo</Text>
            )}
          </Pressable>

          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>
              <Ionicons name="warning-sharp" size={20} color="#C82909" /> Note:
            </Text>
            <Text style={styles.warningSubText}>
              Misuse of this app may lead to legal consequences.
            </Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, loading && { opacity: 0.5 }]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                Send Detailed Report
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  quickReportContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  quickReportSubText: {
    marginTop: 16,
    color: "#9CA3AF",
  },
  headerContainer: {
    marginTop: 32,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 30,
    alignSelf: "center",
    color: "#1F2937",
  },
  reporterText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 8,
  },
  locationCard: {
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
  },
  locationTitle: {
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: 18,
  },
  locationSubText: {
    color: "#3b82f6",
    fontSize: 12,
    marginTop: 4,
  },
  emergencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    width: "83.3%",
    padding: 24,
    alignSelf: "center",
    marginTop: 24,
  },
  emergencyCardTitle: {
    marginBottom: 16,
    fontWeight: "bold",
    color: "#6B7280",
    textAlign: "center",
  },
  emergencyButton: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  emergencyButtonActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  emergencyButtonInactive: {
    backgroundColor: "transparent",
    borderColor: "#D1D5DB",
  },
  emergencyButtonText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  textActive: {
    color: "#FFFFFF",
  },
  textInactive: {
    color: "#4B5563",
  },
  bottomContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  photoContainer: {
    width: "83.3%",
    height: 384,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  attachedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  attachPhotoText: {
    color: "#9CA3AF",
    fontWeight: "bold",
  },
  warningContainer: {
    width: "83.3%",
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  warningTitle: {
    color: "#C82909",
    fontWeight: "bold",
    fontSize: 18,
  },
  warningSubText: {
    color: "#F54927",
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    width: "83.3%",
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
});