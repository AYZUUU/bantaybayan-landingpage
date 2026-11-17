import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getReportStatus,
  ReportStatusUnavailableError,
  submitAnonymousQuickReport,
  submitReport,
} from "../../services/reports";
import { pickSource as pickPhotoFromCamera } from "../../shared/imagecapture";
import LocationPopup from "../../shared/Popup";
import RescuerLocation from "../../shared/RescuerLocation";
import WarningPulse from "../../shared/warningpulse";
import { useAuth } from "../../shared/auth";
import { getCitizenReportNumber } from "../../shared/reportNumber";
import { clearUnavailableReportTracking } from "../../shared/reportTracking";
import { useActivePolling } from "../../shared/useActivePolling";
import { lookupPlaceName } from "../../shared/placeName";
import {
  getCachedHotlineNumber,
  refreshHotlineNumber,
} from "../../services/appSettings";

type MyLoc = { latitude: number; longitude: number } | null;

type ReportStatus = {
  status: string;
  responderName: string | null;
  responderStation: string | null;
};

const RESOLVED_REPORT_STATUS_KEY = "last_resolved_report_status";

type SmsFallback = {
  emergencyType: string;
  level: string;
  latitude: number;
  longitude: number;
};

export default function Reporting() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<MyLoc>(null);
  const [loading, setLoading] = useState(false);
  const isDark = useColorScheme() === "dark";

  const [popupVisible, setPopupVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isRescuerMapVisible, setIsRescuerMapVisible] = useState(false);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [activeReportNumber, setActiveReportNumber] = useState<number | null>(
    null,
  );

  const { isLoggedIn, userName, userId } = useAuth();
  const isFocused = useIsFocused();

  const [activeReportStatus, setActiveReportStatus] =
    useState<ReportStatus | null>(null);

  const updateActiveReportStatus = useCallback(
    (nextStatus: ReportStatus | null) => {
      setActiveReportStatus((currentStatus) => {
        if (
          currentStatus?.status === nextStatus?.status &&
          currentStatus?.responderName === nextStatus?.responderName &&
          currentStatus?.responderStation === nextStatus?.responderStation
        ) {
          return currentStatus;
        }

        return nextStatus;
      });
    },
    [],
  );

  // Avoid overlapping polling requests.
  const pollingRef = useRef(false);

  // Used to distinguish a new report from an older report.
  const trackedReportIdRef = useRef<string | null>(null);

  const checkReportStatus = useCallback(async () => {
    if (pollingRef.current) return;

    pollingRef.current = true;
    let activeId: string | null = null;

    try {
      activeId = await AsyncStorage.getItem(
        "last_active_report_id"
      );

      if (!activeId) {
        trackedReportIdRef.current = null;
        setActiveReportId(null);
        setIsRescuerMapVisible(false);
        const resolvedStatus = await AsyncStorage.getItem(
          RESOLVED_REPORT_STATUS_KEY
        );
        if (resolvedStatus) {
          const parsed: unknown = JSON.parse(resolvedStatus);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "status" in parsed &&
            typeof parsed.status === "string" &&
            parsed.status.toLowerCase().includes("resolved")
          ) {
            if (
              "reportNumber" in parsed &&
              typeof parsed.reportNumber === "number"
            ) {
              setActiveReportNumber(parsed.reportNumber);
            }
            updateActiveReportStatus({
              status: parsed.status,
              responderName:
                "responderName" in parsed &&
                typeof parsed.responderName === "string"
                  ? parsed.responderName
                  : null,
              responderStation:
                "responderStation" in parsed &&
                typeof parsed.responderStation === "string"
                  ? parsed.responderStation
                  : null,
            });
          }
        }
        return;
      }

      // Reset previous values when tracking a different report.
      if (trackedReportIdRef.current !== activeId) {
        trackedReportIdRef.current = activeId;
        setActiveReportId(null);
        setIsRescuerMapVisible(false);
        const storedNumber = await AsyncStorage.getItem(
          "last_active_report_number",
        );
        let reportNumber: number | null = null;
        if (storedNumber) {
          const parsed: unknown = JSON.parse(storedNumber);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "reportId" in parsed &&
            parsed.reportId === activeId &&
            "number" in parsed &&
            typeof parsed.number === "number"
          ) {
            reportNumber = parsed.number;
          }
        }
        if (reportNumber === null) {
          reportNumber = await getCitizenReportNumber(activeId, userId);
          if (reportNumber !== null) {
            await AsyncStorage.setItem(
              "last_active_report_number",
              JSON.stringify({ reportId: activeId, number: reportNumber }),
            );
          }
        }
        setActiveReportNumber(reportNumber);
      }

      const report = await getReportStatus(activeId);
      if (
        trackedReportIdRef.current !== activeId ||
        (await AsyncStorage.getItem("last_active_report_id")) !== activeId
      ) {
        return;
      }
      const currentStatus = String(report.status ?? "").trim();
      const responderName = report.assigned_responder_name?.trim() || null;
      const responderStation =
        report.assigned_responder_station?.trim() || null;

      if (!currentStatus) return;

      const normalizedStatus = currentStatus.toLowerCase();

      updateActiveReportStatus({
        status: currentStatus,
        responderName,
        responderStation,
      });
      setActiveReportId(normalizedStatus.includes("resolved") ? null : report.id);

      // Stop tracking once the report is resolved.
      if (normalizedStatus.includes("resolved")) {
        setIsRescuerMapVisible(false);
        await AsyncStorage.setItem(
          RESOLVED_REPORT_STATUS_KEY,
          JSON.stringify({
            status: currentStatus,
            reportNumber: activeReportNumber,
            responderName,
            responderStation,
          })
        );
        await AsyncStorage.removeItem("last_active_report_id");
        trackedReportIdRef.current = null;
      }
    } catch (error) {
      if (error instanceof ReportStatusUnavailableError && activeId) {
        try {
          if (await clearUnavailableReportTracking(activeId)) {
            trackedReportIdRef.current = null;
            setActiveReportId(null);
            setIsRescuerMapVisible(false);
            setActiveReportNumber(null);
            updateActiveReportStatus(null);
          }
        } catch (cleanupError) {
          console.error("Could not clear unavailable report tracking:", cleanupError);
        }
        return;
      }
      console.error("Error polling report status:", error);
    } finally {
      pollingRef.current = false;
    }
  }, [
    activeReportNumber,
    updateActiveReportStatus,
    userId,
  ]);

  useActivePolling(isFocused && isLoggedIn, checkReportStatus);

  // Fetch the device's current location.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Toast.show({
            type: "error",
            text1: "Permission Denied",
            text2: "Location is required for BantayBayan.",
          });
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync({});

        if (lastKnown && !cancelled) {
          setLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        }
      } catch (error) {
        console.error("GPS Fetch Error:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const emergencyTypes = [
    { id: "Medical", label: "Medical Emergency" },
    { id: "Fire", label: "Fire" },
    { id: "Accident", label: "Accident" },
    { id: "Crime", label: "Crime" },
  ] as const;
  const emergencyIcons = {
    Medical: "medkit-outline",
    Fire: "flame-outline",
    Accident: "car-sport-outline",
    Crime: "shield-outline",
  } as const;

  const [selectedType, setSelectedType] = useState("Medical");
  const severityLevels = [
    { id: "Low", color: "#16a34a", lightColor: "#15803d" },
    { id: "Medium", color: "#d97706", lightColor: "#92400e" },
    { id: "High", color: "#ea580c", lightColor: "#9a3412" },
    { id: "Critical", color: "#be123c", lightColor: "#be123c" },
  ] as const;
  const [selectedLevel, setSelectedLevel] = useState<string>("Medium");
  const [smsFallback, setSmsFallback] = useState<SmsFallback | null>(null);
  const [hotlineNumber, setHotlineNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCachedHotlineNumber().then((cached) => {
      if (!cancelled) setHotlineNumber(cached);
    });
    refreshHotlineNumber()
      .then(async (fresh) => {
        if (fresh === null || cancelled) return;
        setHotlineNumber(await getCachedHotlineNumber());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const sendSmsFallback = async () => {
    if (!smsFallback || !hotlineNumber) return;
    const { emergencyType, level, latitude, longitude } = smsFallback;
    const body = `BANTAYBAYAN EMERGENCY: ${emergencyType} (${level}). Location: ${latitude.toFixed(
      5,
    )},${longitude.toFixed(5)} https://maps.google.com/?q=${latitude},${longitude}`;
    const separator = Platform.OS === "ios" ? "&" : "?";
    try {
      await Linking.openURL(
        `sms:${hotlineNumber}${separator}body=${encodeURIComponent(body)}`,
      );
    } catch {
      Toast.show({
        type: "error",
        text1: "Could not open messages",
        text2: `Text or call ${hotlineNumber} with your location.`,
      });
    }
  };

  // Start tracking a newly submitted report.
  const startTrackingReport = async (reportId: string | number) => {
    const id = String(reportId);

    // Reset stale tracking data before storing the new report.
    trackedReportIdRef.current = id;

    setActiveReportStatus(null);
    setActiveReportNumber(null);
    setActiveReportId(null);
    setIsRescuerMapVisible(false);

    await AsyncStorage.setItem(`last_active_report_status:${id}`, "Pending");
    await AsyncStorage.removeItem(RESOLVED_REPORT_STATUS_KEY);
    const reportNumber = await getCitizenReportNumber(id, userId);
    setActiveReportNumber(reportNumber);
    if (reportNumber !== null) {
      await AsyncStorage.setItem(
        "last_active_report_number",
        JSON.stringify({ reportId: id, number: reportNumber }),
      );
    }
    await AsyncStorage.setItem("last_active_report_id", id);

    // Fetch the initial status to establish the baseline.
    await checkReportStatus();
  };

  const trackSubmittedReport = async (reportId?: string | number) => {
    if (reportId === undefined || String(reportId).trim() === "") {
      Toast.show({
        type: "info",
        text1: "Alert sent",
        text2: "Live status tracking is unavailable for this report.",
      });
      return;
    }

    try {
      await startTrackingReport(reportId);
    } catch (error) {
      console.error("Report submitted but tracking could not start:", error);
      Toast.show({
        type: "info",
        text1: "Alert sent",
        text2: "Your report was submitted, but status tracking could not start.",
      });
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!photo) {
      Toast.show({
        type: "error",
        text1: "Photo required",
        text2: "Add an incident photo before sending a detailed report.",
      });
      return;
    }

    if (!location) {
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: "Still fetching GPS...",
      });
      return;
    }

    setLoading(true);

    try {
      if (!userId) throw new Error("Sign in again before sending a report.");
      const place = await lookupPlaceName(
        location.latitude,
        location.longitude,
      );
      const reportId = await submitReport({
        userId,
        reporterName: userName || "Anonymous",
        emergencyType: selectedType,
        accidentLevel: selectedLevel,
        latitude: location.latitude,
        longitude: location.longitude,
        municipality: place.municipality,
        province: place.province,
        imageUri: photo,
      });

      await trackSubmittedReport(reportId);

      setSmsFallback(null);
      setPhoto(null);
      setPopupVisible(true);
    } catch (error) {
      console.error("Report submission failed:", error);
      setSmsFallback({
        emergencyType: selectedType,
        level: selectedLevel,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Toast.show({
        type: "error",
        text1: "Submission Not Confirmed",
        text2: `Check your report history before retrying to avoid duplicate alerts. ${
          error instanceof Error ? error.message : "The server could not be reached."
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = async () => {
    if (loading) return;

    if (!location) {
      Toast.show({
        type: "info",
        text1: "Wait for GPS",
      });
      return;
    }

    setLoading(true);

    try {
      if (userId) {
        const reportId = await submitReport({
          userId,
          reporterName: userName || "Anonymous",
          emergencyType: "Urgent",
          accidentLevel: "Critical",
          latitude: location.latitude,
          longitude: location.longitude,
        });
        await trackSubmittedReport(reportId);
      } else {
        await submitAnonymousQuickReport(
          location.latitude,
          location.longitude,
        );
      }

      setSmsFallback(null);
      setPopupVisible(true);
    } catch (error) {
      console.error("Quick report failed:", error);
      setSmsFallback({
        emergencyType: "Urgent",
        level: "Critical",
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Toast.show({
        type: "error",
        text1: "Quick Alert Failed",
        text2:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, isDark && darkStyles.background]}
    >
      {/* LOCATION PICKER POPUP */}
      <LocationPopup
        visible={isMapVisible}
        isDark={isDark}
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

      <Modal
        visible={isLoggedIn && isRescuerMapVisible && activeReportId !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setIsRescuerMapVisible(false)}
      >
        <View style={styles.rescuerMapOverlay}>
          <View style={[styles.rescuerMapCard, isDark && darkStyles.rescuerMapCard]}>
            <Text style={[styles.rescuerMapTitle, isDark && darkStyles.text]}>
              Rescuer location
            </Text>
            {isLoggedIn && isRescuerMapVisible && activeReportId !== null && (
              <RescuerLocation
                key={activeReportId}
                reportId={activeReportId}
                enabled={isFocused}
                isDark={isDark}
              />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsRescuerMapVisible(false)}
            >
              <View style={styles.rescuerMapClose}>
                <Text style={styles.rescuerMapCloseText}>Close</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* REPORT SUBMISSION CONFIRMATION */}
      <LocationPopup
        visible={popupVisible}
        isDark={isDark}
        onClose={() => setPopupVisible(false)}
        address={
          location
            ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`
            : "Fetching GPS..."
        }
        location={location}
        isDraggable={false}
        showMap={false}
        title="Emergency Sent!"
        buttonText={isLoggedIn ? "View report status" : "Continue reporting"}
        onAction={() => setPopupVisible(false)}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!isLoggedIn && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            onPress={() => router.replace("/")}
          >
            <View
              style={{
                minHeight: 50,
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#1d4ed8",
                backgroundColor: "#2563eb",
                shadowColor: "#1d4ed8",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Back to Home
              </Text>
            </View>
          </Pressable>
        )}

        {/* ACTIVE REPORT STATUS */}
        {activeReportStatus && (
          <View style={[styles.statusBanner, isDark && darkStyles.banner]}>
            <Text
              style={[
                styles.statusBannerHeader,
                isDark && darkStyles.bannerText,
              ]}
            >
              {activeReportNumber !== null
                ? `REPORT #${activeReportNumber} Â· `
                : ""}
              {activeReportStatus.status.toLowerCase().includes("resolved")
                ? "REPORT COMPLETE"
                : "STATUS TRACKER"}
            </Text>

            <Text
              style={[
                styles.statusBannerTitle,
                isDark && darkStyles.bannerTitle,
              ]}
            >
              {activeReportStatus.status.toLowerCase().includes("resolved")
                ? "Report Resolved"
                : activeReportStatus.status.toLowerCase() === "dispatched"
                  ? activeReportStatus.responderName
                    ? `${activeReportStatus.responderName} is on the way to your location`
                    : "Rescuer Dispatched to Your Location"
                  : activeReportStatus.status}
            </Text>

            {activeReportStatus.responderName && (
              <Text
                style={[
                  styles.statusBannerSubtext,
                  isDark && darkStyles.bannerText,
                ]}
              >
                Assigned: {activeReportStatus.responderName}
              </Text>
            )}
            {activeReportStatus.responderName && (
              <Text
                style={[
                  styles.statusBannerSubtext,
                  isDark && darkStyles.bannerText,
                ]}
              >
                Station: {activeReportStatus.responderStation || "Not listed"}
              </Text>
            )}
            {isLoggedIn && activeReportId !== null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View rescuer location"
                onPress={() => setIsRescuerMapVisible(true)}
              >
                <View style={styles.rescuerLocationButton}>
                  <Text style={styles.rescuerLocationButtonText}>View rescuer location</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* QUICK EMERGENCY BUTTON */}
        <View
          style={[
            styles.quickReportCard,
            isDark && darkStyles.quickReportCard,
          ]}
        >
          <View style={styles.quickReportText}>
            <Text style={[styles.quickReportTitle, isDark && darkStyles.text]}>
              Need help now?
            </Text>
            <Text
              style={[
                styles.quickReportSubText,
                isDark && darkStyles.secondaryText,
              ]}
            >
              Send your location to responders instantly.
              {!isLoggedIn ? " No account needed; anonymous alerts cannot be tracked in the app." : ""}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send quick emergency alert"
            accessibilityHint="Sends your current location as an urgent report"
            onPress={handleQuickReport}
            disabled={loading}
            style={({ pressed }) => [
              styles.quickAlertButton,
              pressed && styles.quickAlertPressed,
              loading && styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#e11d48" />
            ) : isFocused ? (
              <WarningPulse size={64} />
            ) : null}
          </Pressable>
        </View>

        {smsFallback && hotlineNumber ? (
          <View
            style={[styles.smsCard, isDark && darkStyles.smsCard]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.smsTitle, isDark && darkStyles.text]}>
              Can&apos;t send online?
            </Text>
            <Text
              style={[styles.smsText, isDark && darkStyles.secondaryText]}
            >
              Send your location by SMS to the emergency hotline instead. Photos
              can&apos;t be included.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send emergency report by SMS"
              onPress={sendSmsFallback}
              style={({ pressed }) => [
                styles.smsButton,
                isDark && darkStyles.smsButton,
                pressed && styles.quickAlertPressed,
              ]}
            >
              <Text style={styles.smsButtonText}>Send by SMS</Text>
            </Pressable>
          </View>
        ) : null}

        {/* LOCATION */}
        <Pressable
          onPress={() => setIsMapVisible(true)}
          style={[styles.locationCard, isDark && darkStyles.locationCard]}
        >
          <View style={styles.locationText}>
            <Text style={[styles.locationTitle, isDark && darkStyles.text]}>
              Your location
            </Text>
            <Text
              style={[
                styles.locationSubText,
                isDark && darkStyles.secondaryText,
              ]}
              numberOfLines={2}
            >
              {location
                ? "GPS ready - Tap to adjust"
                : "Getting your current location..."}
            </Text>
          </View>
          <View
            style={[
              styles.locationIcon,
              isDark && darkStyles.locationIcon,
            ]}
          >
            <Ionicons
              name="map-outline"
              size={22}
              color={isDark ? "#bfdbfe" : "#2563eb"}
            />
          </View>
        </Pressable>

        {/* EMERGENCY TYPE */}
        <View style={[styles.emergencyCard, isDark && darkStyles.card]}>
          <View style={styles.sectionHeading}>
            <Text
              style={[
                styles.emergencyCardTitle,
                isDark && darkStyles.text,
              ]}
            >
              What happened?
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                isDark && darkStyles.secondaryText,
              ]}
            >
              Choose the closest match.
            </Text>
          </View>

          <View style={styles.emergencyOptions}>
            {emergencyTypes.map((type) => {
              const isActive = selectedType === type.id;

              return (
                <Pressable
                  key={type.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelectedType(type.id)}
                  style={[
                    styles.emergencyButton,
                    isActive
                      ? styles.emergencyButtonActive
                      : [
                          styles.emergencyButtonInactive,
                          isDark && darkStyles.emergencyButtonInactive,
                        ],
                    isActive && isDark && darkStyles.activeEmergencyButton,
                  ]}
                >
                  <View
                    style={[
                      styles.emergencyIcon,
                      isActive
                        ? styles.emergencyIconActive
                        : isDark && darkStyles.emergencyIcon,
                    ]}
                  >
                    <Ionicons
                      name={emergencyIcons[type.id]}
                      size={20}
                      color={
                        isActive ? "#ffffff" : isDark ? "#cbd5e1" : "#475569"
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.emergencyButtonText,
                      isActive
                        ? styles.textActive
                        : [
                            styles.textInactive,
                            isDark && darkStyles.emergencyButtonText,
                          ],
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              styles.severityTitle,
              isDark && darkStyles.secondaryText,
            ]}
          >
            How serious is it?
          </Text>
          <View style={styles.severityRow}>
            {severityLevels.map((level) => {
              const isActive = selectedLevel === level.id;
              return (
                <Pressable
                  key={level.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${level.id} severity`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelectedLevel(level.id)}
                  style={[
                    styles.severityChip,
                    isDark && styles.severityChipDark,
                    isActive && {
                      backgroundColor: isDark ? level.color : level.lightColor,
                      borderColor: isDark ? level.color : level.lightColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityChipText,
                      isDark && darkStyles.secondaryText,
                      isActive && styles.severityChipTextActive,
                    ]}
                  >
                    {level.id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* PHOTO AND SUBMIT */}
        <View style={styles.bottomContainer}>
          <View style={[styles.photoCard, isDark && darkStyles.photoCard]}>
            <View style={styles.photoHeading}>
              <View style={styles.photoHeadingText}>
                <Text style={[styles.photoTitle, isDark && darkStyles.text]}>
                  Incident photo{" "}
                  <Text
                    style={[
                      styles.requiredMark,
                      isDark && darkStyles.requiredMark,
                    ]}
                  >
                    *
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.attachPhotoText,
                    isDark && darkStyles.secondaryText,
                  ]}
                >
                  Required for a detailed report
                </Text>
              </View>
              <View
                style={[
                  styles.photoStatusIcon,
                  photo
                    ? styles.photoStatusComplete
                    : isDark && darkStyles.photoStatusIcon,
                  photo && isDark && darkStyles.photoStatusComplete,
                ]}
              >
                <Ionicons
                  name={photo ? "checkmark" : "camera-outline"}
                  size={17}
                  color={
                    photo
                      ? isDark
                        ? "#86efac"
                        : "#16a34a"
                      : isDark
                        ? "#cbd5e1"
                        : "#475569"
                  }
                />
              </View>
            </View>
            {photo ? (
              <View style={styles.photoPreview}>
                <Image
                  source={{ uri: photo }}
                  style={styles.attachedImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.photoPlaceholder,
                  isDark && darkStyles.photoPlaceholder,
                ]}
              >
                <View
                  style={[
                    styles.photoIcon,
                    isDark && darkStyles.photoIcon,
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={27}
                    color={isDark ? "#bfdbfe" : "#64748b"}
                  />
                </View>
                <Text
                  style={[
                    styles.photoPlaceholderText,
                    isDark && darkStyles.secondaryText,
                  ]}
                >
                  A clear photo helps responders assess the incident.
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo ? "Retake incident photo" : "Take incident photo"}
              onPress={() => pickPhotoFromCamera(setPhoto)}
              disabled={loading}
              style={loading ? styles.disabledButton : undefined}
            >
              <View style={[styles.photoAction, isDark && darkStyles.photoAction]}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.photoActionText}>
                  {photo ? "Retake photo" : "Take incident photo"}
                </Text>
              </View>
            </Pressable>
          </View>

          <View
            style={[
              styles.warningContainer,
              isDark && darkStyles.warningContainer,
            ]}
          >
            <View style={styles.warningIcon}>
              <Ionicons
                name="warning-sharp"
                size={19}
                color={isDark ? "#fca5a5" : "#c2410c"}
              />
            </View>
            <View style={styles.warningText}>
              <Text
                style={[
                  styles.warningTitle,
                  isDark && darkStyles.warningTitle,
                ]}
              >
                Safety reminder
              </Text>
              <Text
                style={[
                  styles.warningSubText,
                  isDark && darkStyles.warningSubText,
                ]}
              >
                Misuse of this app may lead to legal consequences.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.submitActionPanel,
              isDark && darkStyles.submitActionPanel,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send detailed report"
              accessibilityHint={!photo ? "Attach a photo to enable report submission." : undefined}
              accessibilityState={{ disabled: loading || !photo, busy: loading }}
              onPress={handleSubmit}
              disabled={loading || !photo}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.submitButton,
                    photo && !isDark && styles.submitButtonLight,
                    !photo && styles.submitButtonDisabled,
                    !photo && isDark && darkStyles.submitButtonDisabled,
                    pressed && photo && !loading && styles.submitPressed,
                  ]}
                >
                  <View style={styles.submitButtonContent}>
                    {loading ? (
                      <ActivityIndicator color={!photo && !isDark ? "#1e3a8a" : "#ffffff"} />
                    ) : (
                      <Ionicons
                        name={photo ? "send" : "lock-closed"}
                        size={20}
                        color={!photo && !isDark ? "#1e3a8a" : "#ffffff"}
                      />
                    )}
                    <Text
                      style={[
                        styles.submitButtonText,
                        photo && !isDark && styles.submitButtonTextLight,
                        !photo && !isDark && styles.submitButtonDisabledText,
                      ]}
                    >
                      {loading ? "Sending report..." : "Send detailed report"}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
            {!photo && (
              <Text
                style={[
                  styles.submitHint,
                  isDark && darkStyles.secondaryText,
                ]}
              >
                Attach a photo to enable report submission.
              </Text>
            )}
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  statusBanner: {
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rescuerLocationButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#166534",
  },
  rescuerLocationButtonText: { color: "#ffffff", fontWeight: "700" },
  rescuerMapOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  rescuerMapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },
  rescuerMapTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  rescuerMapClose: {
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#166534",
  },
  rescuerMapCloseText: { color: "#ffffff", fontWeight: "700" },
  statusBannerHeader: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "bold",
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#14532d",
    marginTop: 2,
  },
  statusBannerSubtext: {
    fontSize: 13,
    color: "#15803d",
    marginTop: 4,
  },
  quickReportCard: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#ffe4e6",
    shadowColor: "#9f1239",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  quickReportText: {
    flex: 1,
    gap: 5,
  },
  quickReportTitle: {
    color: "#881337",
    fontSize: 18,
    fontWeight: "800",
  },
  quickAlertButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAlertPressed: {
    transform: [{ scale: 0.96 }],
  },
  disabledButton: {
    opacity: 0.6,
  },
  quickReportSubText: {
    color: "#9f1239",
    fontSize: 13,
    lineHeight: 19,
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: "#eff6ff",
    width: "100%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  locationText: { flex: 1, gap: 4 },
  locationTitle: {
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: 16,
  },
  locationSubText: {
    color: "#3b82f6",
    fontSize: 13,
    lineHeight: 18,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  emergencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    width: "100%",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeading: {
    marginBottom: 14,
    gap: 4,
  },
  emergencyCardTitle: {
    fontWeight: "bold",
    color: "#1e293b",
    fontSize: 17,
  },
  smsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
  },
  smsTitle: { fontSize: 16, fontWeight: "800", color: "#9a3412" },
  smsText: { marginTop: 4, fontSize: 13, color: "#7c2d12", lineHeight: 18 },
  smsButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9a3412",
  },
  smsButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  severityTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  severityRow: { flexDirection: "row", gap: 8 },
  severityChip: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  severityChipDark: { backgroundColor: "#1e293b", borderColor: "#334155" },
  severityChipText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  severityChipTextActive: { color: "#ffffff" },
  emergencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  emergencyButton: {
    width: "48.5%",
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 9,
  },
  emergencyIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  emergencyIconActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  emergencyButtonActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
    shadowColor: "#b91c1c",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  emergencyButtonInactive: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  emergencyButtonText: {
    flex: 1,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 17,
  },
  textActive: {
    color: "#FFFFFF",
  },
  textInactive: {
    color: "#4B5563",
  },
  bottomContainer: {
    width: "100%",
    gap: 12,
  },
  photoCard: {
    width: "100%",
    padding: 16,
    gap: 12,
    alignItems: "stretch",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#f0f7ff",
  },
  photoHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  photoHeadingText: {
    flex: 1,
    gap: 3,
  },
  photoStatusIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  photoStatusComplete: {
    backgroundColor: "#dcfce7",
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  photoTitle: {
    color: "#1e293b",
    fontWeight: "700",
    fontSize: 15,
  },
  requiredMark: {
    color: "#dc2626",
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  attachedImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    minHeight: 112,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPlaceholderText: {
    color: "#64748b",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  photoAction: {
    alignSelf: "stretch",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1d4ed8",
    borderWidth: 1,
    borderColor: "#1e40af",
  },
  photoActionText: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    includeFontPadding: false,
  },
  attachPhotoText: {
    color: "#64748b",
    fontSize: 13,
  },
  warningContainer: {
    width: "100%",
    minHeight: 68,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  warningText: {
    flex: 1,
    gap: 3,
  },
  warningIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  warningSubText: {
    color: "#9a3412",
    fontSize: 12,
    lineHeight: 17,
  },
  warningTitle: {
    color: "#C82909",
    fontWeight: "bold",
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#1d4ed8",
    borderWidth: 2,
    borderColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitActionPanel: {
    width: "100%",
    padding: 16,
    gap: 10,
    borderRadius: 18,

    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitButtonLight: {
    minHeight: 68,
    backgroundColor: "#1e3a8a",
    borderColor: "#172554",
  },
  submitButtonDisabled: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonTextLight: {
    fontSize: 18,
    fontWeight: "800",
  },
  submitButtonDisabledText: {
    color: "#1e3a8a",
  },
  submitPressed: {
    backgroundColor: "#1e40af",
    transform: [{ scale: 0.98 }],
  },
  submitHint: {
    color: "#475569",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
  },
  submitButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 17,
    flexShrink: 1,
  },
});

const darkStyles = StyleSheet.create({
  background: { backgroundColor: "#0f172a" },
  card: { backgroundColor: "#1e293b", borderColor: "#334155" },
  rescuerMapCard: { backgroundColor: "#1e293b" },
  text: { color: "#f8fafc" },
  secondaryText: { color: "#cbd5e1" },
  banner: { backgroundColor: "#14532d", borderColor: "#166534" },
  bannerText: { color: "#bbf7d0" },
  bannerTitle: { color: "#f0fdf4" },
  quickReportCard: { backgroundColor: "#3b1222", borderColor: "#7f1d3b" },
  smsCard: { backgroundColor: "#431407", borderColor: "#9a3412" },
  smsButton: { backgroundColor: "#ea580c" },
  locationCard: { backgroundColor: "#172d4a", borderColor: "#315b8e" },
  locationIcon: { backgroundColor: "#1e3a5f" },
  activeEmergencyButton: { backgroundColor: "#be123c", borderColor: "#be123c" },
  emergencyButtonInactive: {
    backgroundColor: "#27364a",
    borderColor: "#475569",
  },
  emergencyButtonText: { color: "#f8fafc" },
  emergencyIcon: { backgroundColor: "#334155" },
  warningContainer: { backgroundColor: "#3b1b22", borderColor: "#7f1d3b" },
  warningTitle: { color: "#fecaca" },
  warningSubText: { color: "#fca5a5" },
  photoIcon: { backgroundColor: "#334155" },
  photoCard: { backgroundColor: "#172d4a", borderColor: "#60a5fa" },
  photoStatusIcon: { backgroundColor: "#334155" },
  photoStatusComplete: { backgroundColor: "#14532d" },
  requiredMark: { color: "#fca5a5" },
  photoPlaceholder: {
    backgroundColor: "#0f172a",
    borderColor: "#475569",
  },
  photoAction: { backgroundColor: "#2563eb", borderColor: "#60a5fa" },
  submitButtonDisabled: { backgroundColor: "#64748b", borderColor: "#94a3b8" },
  submitActionPanel: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
});
