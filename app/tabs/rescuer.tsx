// icons
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";

// expo & react packages
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useIsFocused, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { MapView, Marker } from "../../shared/MapComponents";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";


import { useAuth } from "../../shared/auth";
import RescuerCard, { Report } from "../../shared/rescuercard";
import LogoutConfirmation from "../../shared/LogoutConfirmation";
import OSMTileLayer, { OSM_ATTRIBUTION } from "../../shared/OSMTileLayer";
import { useAppPreferences } from "../../shared/AppPreferences";
import { useActivePolling } from "../../shared/useActivePolling";
import { getResponderReports, requestReportBackup, respondToReport } from "../../services/reports";

export default function Rescuer() {
  const router = useRouter();
  const { isLoggedIn, signOut, userName, userId } = useAuth();
  const isFocused = useIsFocused();
  const { preferences } = useAppPreferences();
  const isDark = useColorScheme() === "dark";

  const [reports, setReports] = useState<Report[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const lastReportIdRef = useRef<number | null>(null);
  const isInitialFetchRef = useRef(true);
  const previousStatusesRef = useRef<Map<number, string>>(new Map());

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isRequestingBackup, setIsRequestingBackup] = useState(false);
  const [isLogoutConfirmationVisible, setIsLogoutConfirmationVisible] =
    useState(false);

  const [newEmergencyType, setNewEmergencyType] = useState("");
  const [newReportData, setNewReportData] = useState<Report | null>(null);
  const [alertTitle, setAlertTitle] = useState("New Emergency!");
  const [alertMessage, setAlertMessage] = useState("has just been reported.");

  const fetchReports = useCallback(async () => {
    try {
      const reportsArray = (await getResponderReports()).map((report) => ({
        id: report.id,
        emergency_type: report.emergency_type ?? undefined,
        accident_level: report.accident_level ?? undefined,
        reporter_name: report.reporter_name ?? undefined,
        contact_number: report.contact_number ?? undefined,
        status: report.status,
        latitude: report.latitude ?? undefined,
        longitude: report.longitude ?? undefined,
        municipality: report.municipality ?? undefined,
        province: report.province ?? undefined,
        description: report.description ?? undefined,
        created_at: report.created_at,
        image_path: report.image_path ?? undefined,
        assigned_responder_id: report.assigned_responder_id ?? undefined,
        backup_requested_at: report.backup_requested_at ?? undefined,
      }));
      setLoadFailed(false);

      if (reportsArray.length > 0) {
        const top5Reports = reportsArray.slice(0, 5);
        const latestReport = reportsArray[0];
        const latestId = Number(latestReport.id);
        const isInitialFetch = isInitialFetchRef.current;


        const dispatchedReport = reportsArray.find((report: Report) => {
          const reportId = Number(report.id);
          const currentStatus = String(report.status || "").toLowerCase();
          const previousStatus =
            previousStatusesRef.current.get(reportId) || "";

          return (
            !isInitialFetch &&
            currentStatus.includes("dispatched") &&
            !previousStatus.includes("dispatched")
          );
        });

        if (dispatchedReport && preferences.notificationsEnabled) {
          setAlertTitle("Dispatch Notification");
          setNewEmergencyType(dispatchedReport.emergency_type || "Incident");
          setAlertMessage("has been dispatched to you by the Admin.");
          setNewReportData(dispatchedReport);
          setAlertModalVisible(true);
        } else if (
          preferences.notificationsEnabled &&
          !isInitialFetchRef.current
        ) {
          if (
            lastReportIdRef.current !== null &&
            latestId > lastReportIdRef.current
          ) {
            setAlertTitle("New Emergency!");
            setNewEmergencyType(
              latestReport.emergency_type || "A new report was posted.",
            );
            setAlertMessage("has just been reported.");
            setNewReportData(latestReport);
            setAlertModalVisible(true);
          }
        }

        previousStatusesRef.current = new Map(
          reportsArray.map((report: Report) => [
            Number(report.id),
            String(report.status || "").toLowerCase(),
          ]),
        );
        isInitialFetchRef.current = false;

        setReports(top5Reports);
        lastReportIdRef.current = latestId;
      } else {
        previousStatusesRef.current.clear();
        setReports([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setLoadFailed(true);
    }
  }, [preferences.notificationsEnabled]);

  useActivePolling(isLoggedIn && isFocused, fetchReports);

  useEffect(() => {
    if (!isLoggedIn || !isFocused) return;
    const notificationListener =
      Notifications.addNotificationReceivedListener(() => {
        fetchReports();
      });
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(() => {
        fetchReports();
      });

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [fetchReports, isFocused, isLoggedIn]);

  const handleLogout = async () => {
    setIsLogoutConfirmationVisible(false);
    await signOut();
    router.replace("/");
    Toast.show({
      type: "success",
      text1: "Logged out",
      text2: "You have been securely signed out.",
    });
  };

  if (!isLoggedIn) return null;

  const hasValidCoordinates = (
    report: Report | null,
  ): report is Report & { latitude: number; longitude: number } => {
    return (
      !!report &&
      report.latitude !== undefined &&
      report.longitude !== undefined &&
      !isNaN(Number(report.latitude)) &&
      !isNaN(Number(report.longitude))
    );
  };

  const isPendingReport = (report: Report) =>
    (report.status || "Pending").trim().toLowerCase() === "pending";

  const canRequestBackup = (report: Report) =>
    !!userId &&
    report.assigned_responder_id === userId &&
    !report.backup_requested_at &&
    !(report.status || "").toLowerCase().includes("resolved");

  const handleRequestBackup = async () => {
    if (!newReportData || isRequestingBackup) return;

    try {
      setIsRequestingBackup(true);
      await requestReportBackup(newReportData.id);
      const updatedReport = {
        ...newReportData,
        backup_requested_at: new Date().toISOString(),
      };
      setNewReportData(updatedReport);
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        ),
      );
      Toast.show({
        type: "success",
        text1: "Backup requested",
        text2: "Admins have been notified.",
      });
    } catch (error) {
      console.error("Backup request error:", error);
      Toast.show({
        type: "error",
        text1: "Could not request backup",
        text2:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsRequestingBackup(false);
    }
  };

  const handleRespondToEmergency = async () => {
    if (!newReportData || !userId || isResponding) return;

    try {
      setIsResponding(true);
      setAlertModalVisible(false);
      await respondToReport(newReportData.id);

      const respondedReport = {
        ...newReportData,
        status: "Rescuer En Route",
        assigned_responder_id: userId,
      };
      setNewReportData(respondedReport);
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === respondedReport.id ? respondedReport : report,
        ),
      );
      setDetailsModalVisible(true);
    } catch (error) {
      console.error("Respond Error:", error);
      Toast.show({
        type: "error",
        text1: "Could not respond",
        text2:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ["#0f172a", "#1e3a5f"] : ["#ffffff", "#4D8BE2"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.headerBrand}>
            <View style={styles.headerIcon}>
              <FontAwesome5
                name="ambulance"
                size={20}
                color={isDark ? "#bfdbfe" : "#2563eb"}
              />
            </View>
            <View style={styles.headerTitles}>
              <Text
                style={[styles.headerTitle, isDark && darkStyles.darkText]}
                numberOfLines={1}
              >
                Response Center
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  isDark && darkStyles.darkSecondaryText,
                ]}
                numberOfLines={1}
              >
                {userName || "Responder"}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => setIsLogoutConfirmationVisible(true)}
            style={styles.logoutButton}
          >
            <MaterialIcons name="logout" size={19} color="#be123c" />
          </Pressable>
        </View>

        {/* LIST OF REPORTS */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.queueSummary, isDark && darkStyles.darkCard]}>
            <View>
              <Text
                style={[
                  styles.queueLabel,
                  isDark && darkStyles.darkSecondaryText,
                ]}
              >
                ACTIVE INCIDENTS
              </Text>
              <Text style={[styles.queueCount, isDark && darkStyles.darkText]}>
                {reports.length}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          {reports.length > 0 ? (
            <RescuerCard
              recentReports={reports}
              isDark={isDark}
              onViewDetails={(selectedReport) => {
                setNewReportData(selectedReport);
                setDetailsModalVisible(true);
              }}
            />
          ) : (
            <View style={[styles.emptyState, isDark && darkStyles.darkCard]}>
              <View style={styles.emptyIcon}>
                <MaterialIcons
                  name="verified-user"
                  size={28}
                  color={isDark ? "#86efac" : "#16a34a"}
                />
              </View>
              <Text style={[styles.emptyTitle, isDark && darkStyles.darkText]}>
                {loadFailed ? "Can't reach the server" : "All clear"}
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  isDark && darkStyles.darkSecondaryText,
                ]}
              >
                {loadFailed
                  ? "Couldn't load incidents. Check your connection; we'll keep retrying."
                  : "New incidents will appear here as soon as they are reported."}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ALERT MODAL */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={alertModalVisible}
          onRequestClose={() => setAlertModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.alertCard, isDark && darkStyles.darkCard]}>
              <View style={styles.warningIconContainer}>
                <FontAwesome5
                  name="exclamation-triangle"
                  size={40}
                  color="#dc2626"
                />
              </View>

              <Text style={[styles.modalTitle, isDark && darkStyles.darkText]}>
                {alertTitle}
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,
                  isDark && darkStyles.darkSecondaryText,
                ]}
              >
                <Text style={[styles.redText, isDark && darkStyles.darkRedText]}>
                  {newEmergencyType}
                </Text>{" "}
                {alertMessage}
              </Text>

              <View style={styles.modalButtonRow}>
                <Pressable
                  onPress= {handleRespondToEmergency}
                  style={styles.respondButton}
                >
                  <Text style={styles.respondButtonText}>Respond</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setAlertModalVisible(false);
                    setDetailsModalVisible(true);
                  }}
                  style={styles.viewDetailsButton}
                >
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
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
          <View style={styles.bottomModalOverlay}>
            <View
              style={[
                styles.bottomModalContent,
                isDark && darkStyles.darkCard,
              ]}
            >
              <View style={styles.detailsHeader}>
                <Text
                  style={[
                    styles.modalMainTitle,
                    isDark && darkStyles.darkText,
                  ]}
                >
                  Report Details
                </Text>
                <Pressable onPress={() => setDetailsModalVisible(false)}>
                  <MaterialIcons
                    name="close"
                    size={28}
                    color={isDark ? "#f8fafc" : "#000000"}
                  />
                </Pressable>
              </View>

              {newReportData ? (
                <ScrollView contentContainerStyle={styles.detailsScroll}>
                  {newReportData.image_path ? (
                    <Image
                      source={{ uri: newReportData.image_path }}
                      resizeMode="cover"
                      style={styles.evidenceImage}
                      accessibilityLabel="Incident evidence photo"
                    />
                  ) : null}

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Report Number
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      #{newReportData.id}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Emergency Type
                    </Text>
                    <Text style={[styles.detailValueRed, isDark && darkStyles.darkRedText]}>
                      {newReportData.emergency_type}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Severity
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {newReportData.accident_level || "Not specified"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Status
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {newReportData.status || "Pending"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Contact Number
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {newReportData.contact_number || "Not provided"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Municipality
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {[newReportData.municipality, newReportData.province]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Description
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {newReportData.description || "No description provided"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Date Reported
                    </Text>
                    <Text style={[styles.detailValue, isDark && darkStyles.darkText]}>
                      {newReportData.created_at
                        ? new Date(newReportData.created_at).toLocaleString()
                        : "Not available"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Reported By
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {newReportData.reporter_name ||
                        "Anonymous Community Member"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      GPS Location
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {hasValidCoordinates(newReportData)
                        ? `Lat: ${newReportData.latitude}, Lon: ${newReportData.longitude}`
                        : "Location data unavailable"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        isDark && darkStyles.darkSecondaryText,
                        { marginBottom: 8 },
                      ]}
                    >
                      Emergency Location
                    </Text>

                    {hasValidCoordinates(newReportData) ? (
                      <View style={styles.mapContainer}>
                        <MapView
                          style={styles.mapView}
                          mapType={Platform.OS === "android" ? "none" : "standard"}
                          initialRegion={{
                            latitude: Number(newReportData.latitude),
                            longitude: Number(newReportData.longitude),
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                          }}
                        >
                          <OSMTileLayer />
                          <Marker
                            coordinate={{
                              latitude: Number(newReportData.latitude),
                              longitude: Number(newReportData.longitude),
                            }}
                            pinColor="#be123c"
                            title={newReportData.emergency_type}
                            description={`Reported by ${newReportData.reporter_name || "Anonymous"}`}
                          />
                        </MapView>
                        <Text pointerEvents="none" style={styles.mapAttribution}>
                          {OSM_ATTRIBUTION}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.unavailableBox,
                          isDark && darkStyles.darkText,
                        ]}
                      >
                        Location data unavailable
                      </Text>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Loading details...</Text>
              )}

              {newReportData && isPendingReport(newReportData) && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isResponding}
                  onPress={handleRespondToEmergency}
                  style={[
                    styles.detailsRespondButton,
                    isResponding && styles.disabledRespondButton,
                  ]}
                >
                  <Text style={styles.detailsRespondButtonText}>
                    {isResponding ? "Responding..." : "Respond"}
                  </Text>
                </Pressable>
              )}
              {newReportData && newReportData.backup_requested_at ? (
                <Text style={styles.backupSentText}>
                  Backup requested — admins have been notified.
                </Text>
              ) : null}
              {newReportData && canRequestBackup(newReportData) && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isRequestingBackup}
                  onPress={handleRequestBackup}
                  style={[
                    styles.backupButton,
                    isRequestingBackup && styles.disabledRespondButton,
                  ]}
                >
                  <Text style={styles.detailsRespondButtonText}>
                    {isRequestingBackup ? "Sending..." : "Request Backup"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeDetailsButton}
              >
                <Text style={styles.closeDetailsButtonText}>Close Details</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <LogoutConfirmation
          visible={isLogoutConfirmationVisible}
          onCancel={() => setIsLogoutConfirmationVisible(false)}
          onConfirm={handleLogout}
          isDark={isDark}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const darkStyles = StyleSheet.create({
  darkText: { color: "#f8fafc" },
  darkSecondaryText: { color: "#cbd5e1" },
  darkCard: { backgroundColor: "#1e293b" },
  darkRedText: { color: "#fda4af" },
});

const styles = StyleSheet.create({
  backupButton: {
    marginTop: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#d97706",
  },
  backupSentText: {
    marginTop: 10,
    textAlign: "center",
    color: "#b45309",
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  headerTitles: { flex: 1, gap: 2 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },
  logoutButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f2",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  logoutButtonText: {
    color: "#9f1239",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    gap: 16,
  },
  queueSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  queueLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  queueCount: {
    color: "#0f172a",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#dcfce7",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  liveText: { color: "#166534", fontSize: 11, fontWeight: "800" },
  emptyState: {
    alignItems: "center",
    padding: 24,
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertCard: {
    backgroundColor: "white",
    width: "83%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  warningIconContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 50,
    padding: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: "center",
    color: "#4b5563",
    fontSize: 16,
    marginBottom: 24,
  },
  redText: {
    fontWeight: "bold",
    color: "#dc2626",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
respondButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  respondButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  bottomModalContent: {
    backgroundColor: "white",
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "85%",
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalMainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  detailsScroll: {
    paddingBottom: 16,
  },
  evidenceImage: {
    width: "100%",
    height: 220,
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValueRed: {
    fontSize: 20,
    color: "#dc2626",
    fontWeight: "bold",
  },
  detailValue: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "500",
  },
  mapContainer: {
    height: 250,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    position: "relative",
  },
  mapView: {
    width: "100%",
    height: "100%",
  },
  mapAttribution: {
    position: "absolute",
    right: 6,
    bottom: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    color: "#374151",
    fontSize: 10,
  },
  unavailableBox: {
    fontSize: 16,
    color: "#111827",
    fontStyle: "italic",
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    textAlign: "center",
  },
  closeDetailsButton: {
    backgroundColor: "#000",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  detailsRespondButton: {
    backgroundColor: "#16a34a",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  disabledRespondButton: {
    opacity: 0.6,
  },
  detailsRespondButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  closeDetailsButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});