  import { MaterialIcons } from "@expo/vector-icons";
  import { LinearGradient } from "expo-linear-gradient";
  import { Redirect, useIsFocused, useRouter } from "expo-router";
  import React, { useCallback, useEffect, useMemo, useState } from "react";
  import {
    Pressable,
    ScrollView,
    Text,
    View,
    Image,
    StyleSheet,
    Modal,
    useColorScheme,
  } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import Toast from "react-native-toast-message";
  import { useAuth } from "../../shared/auth";
  import LogoutConfirmation from "../../shared/LogoutConfirmation";
  import { getCitizenReports } from "../../services/reports";
  import RescuerLocation from "../../shared/RescuerLocation";
  import { useActivePolling } from "../../shared/useActivePolling";
  import { lookupPlaceName } from "../../shared/placeName";

  export interface Report {
    id: number;
    emergency_type: string;
    accident_level?: string;
    reporter_name?: string;
    contact_number?: string | null;
    description?: string | null;
    status: string;
    location?: string;
    municipality?: string | null;
    province?: string | null;
    longitude?: number;
    latitude?: number;
    created_at?: string;
    image_path?: string;
    userName?: string;
  }

  type ReportStatusFilter = "all" | "pending" | "en-route" | "resolved";

  function getReportStatusCategory(status: string): Exclude<ReportStatusFilter, "all"> {
    const normalizedStatus = status.trim().toLowerCase();
    if (normalizedStatus.includes("resolved")) return "resolved";
    if (
      normalizedStatus.includes("en route") ||
      normalizedStatus.includes("enroute") ||
      normalizedStatus.includes("on the way") ||
      normalizedStatus.includes("dispatch") ||
      normalizedStatus.includes("accept") ||
      normalizedStatus.includes("respond") ||
      normalizedStatus.includes("assign") ||
      normalizedStatus.includes("progress")
    ) {
      return "en-route";
    }
    return "pending";
  }

  function getReportStatusLabel(status: string) {
    const category = getReportStatusCategory(status);
    if (category === "resolved") return "Resolved";
    if (category === "en-route") return "En Route";
    return "Pending";
  }

  function getCitizenReportNumbers(reports: Report[]) {
    const datedReports = reports.map((report, index) => ({
      report,
      index,
      timestamp: report.created_at ? Date.parse(report.created_at) : NaN,
    }));

    datedReports.sort((a, b) => {
      const aHasDate = Number.isFinite(a.timestamp);
      const bHasDate = Number.isFinite(b.timestamp);

      if (aHasDate && bHasDate && a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
      return a.index - b.index;
    });

    return new Map(
      datedReports.map(({ report }, index) => [report.id, index + 1]),
    );
  }

  export default function Dashboard() {
    const router = useRouter();
    const { isLoggedIn, signOut, userName, userId, avatarUrl } = useAuth();
    const isFocused = useIsFocused();
    const [myReports, setMyReports] = useState<Report[]>([]);
    const citizenReportNumbers = useMemo(
      () => getCitizenReportNumbers(myReports),
      [myReports],
    );
    const isDark = useColorScheme() === "dark";

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLogoutConfirmationVisible, setIsLogoutConfirmationVisible] =
      useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [statusFilter, setStatusFilter] =
      useState<ReportStatusFilter>("all");
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const statusFilters: { value: ReportStatusFilter; label: string }[] = [
      { value: "all", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "en-route", label: "En Route" },
      { value: "resolved", label: "Resolved" },
    ];
    const selectedStatusLabel =
      statusFilters.find((filter) => filter.value === statusFilter)?.label ??
      "All";
    const filteredReports = useMemo(
      () =>
        statusFilter === "all"
          ? myReports
          : myReports.filter(
              (report) =>
                getReportStatusCategory(report.status) === statusFilter,
            ),
      [myReports, statusFilter],
    );

    const [loadFailed, setLoadFailed] = useState(false);
    const fetchMyReports = useCallback(async () => {
      if (!userId) return;
      try {
        const reports = await getCitizenReports(userId);
        setLoadFailed(false);
        setMyReports(
          reports.map((report) => ({
            ...report,
            emergency_type: report.emergency_type || "Emergency Report",
            status: report.status || "Pending",
            accident_level: report.accident_level ?? undefined,
            reporter_name: report.reporter_name ?? undefined,
            image_path: report.image_path ?? undefined,
            latitude: report.latitude ?? undefined,
            longitude: report.longitude ?? undefined,
            location:
              report.latitude !== null && report.longitude !== null
                ? `Lat: ${report.latitude}, Lon: ${report.longitude}`
                : undefined,
          })),
        );
      } catch (error) {
        console.error("Error fetching reports:", error);
        setLoadFailed(true);
      }
    }, [userId]);

    useActivePolling(isLoggedIn && isFocused, fetchMyReports);

    const [lookedUpPlace, setLookedUpPlace] = useState<{
      reportId: number;
      text: string;
    } | null>(null);
    const reportNeedsPlace =
      !!selectedReport &&
      !selectedReport.municipality &&
      !selectedReport.province &&
      selectedReport.latitude !== undefined &&
      selectedReport.longitude !== undefined;
    const selectedReportId = selectedReport?.id;
    const selectedLatitude = selectedReport?.latitude;
    const selectedLongitude = selectedReport?.longitude;
    useEffect(() => {
      if (
        !reportNeedsPlace ||
        selectedReportId === undefined ||
        selectedLatitude === undefined ||
        selectedLongitude === undefined
      ) {
        return;
      }
      let cancelled = false;
      lookupPlaceName(selectedLatitude, selectedLongitude).then((place) => {
        const text = [place.municipality, place.province]
          .filter(Boolean)
          .join(", ");
        if (!cancelled && text) {
          setLookedUpPlace({ reportId: selectedReportId, text });
        }
      });
      return () => {
        cancelled = true;
      };
    }, [reportNeedsPlace, selectedReportId, selectedLatitude, selectedLongitude]);

    const handleLogout = async () => {
      setIsLogoutConfirmationVisible(false);
      try {
        await signOut();
      } catch (error) {
        Toast.show({ type: "error", text1: "Could not log out", text2: error instanceof Error ? error.message : "Try again." });
        return;
      }
      router.replace("/");
      Toast.show({
        type: "success",
        text1: "Logged out",
        text2: "You have been securely signed out.",
      });
    };

    if (!isLoggedIn) {
      return <Redirect href="/" />;
    }

    const getBadgeStyle = (status: string) => {
      switch (getReportStatusCategory(status)) {
        case "pending":
          return isDark
            ? { bg: "#422f14", text: "#fcd34d" }
            : { bg: "#fef3c7", text: "#a16207" };
        case "en-route":
          return isDark
            ? { bg: "#172f4a", text: "#bfdbfe" }
            : { bg: "#dbeafe", text: "#1d4ed8" };
        case "resolved":
          return isDark
            ? { bg: "#14532d", text: "#bbf7d0" }
            : { bg: "#dcfce7", text: "#15803d" };
      }
    };


    const handleViewReport = (report: Report) => {
      setSelectedReport(report);
      setIsModalVisible(true);
    };

    return (
      <LinearGradient
        colors={isDark ? ["#0f172a", "#1e3a5f"] : ["#ffffff", "#4D8BE2"]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* --- HEADER --- */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text
                  style={[
                    styles.greeting,
                    isDark && darkStyles.darkSecondaryText,
                  ]}
                >
                  Good day,
                </Text>
                <Text
                  style={[
                    styles.headerTitle,
                    isDark && darkStyles.darkText,
                  ]}
                  numberOfLines={1}
                >
                  {userName || "BantayBayan user"}
                </Text>
              </View>

              <View style={styles.headerActions}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      isDark && darkStyles.darkIconWrapper,
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={22}
                      color={isDark ? "#bfdbfe" : "#2563eb"}
                    />
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                  onPress={() => setIsLogoutConfirmationVisible(true)}
                  style={styles.logoutButton}
                >
                  <MaterialIcons name="logout" size={19} color="#be123c" />
                </Pressable>
              </View>
            </View>

            {/* --- REPORTS LIST --- */}
            <View style={styles.reportsContainer}>
              <View
                style={[
                  styles.summaryCard,
                  isDark && darkStyles.darkCard,
                ]}
              >
                <View style={styles.summaryText}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      isDark && darkStyles.darkSecondaryText,
                    ]}
                  >
                    YOUR SUBMISSIONS
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      isDark && darkStyles.darkText,
                    ]}
                  >
                    {myReports.length}
                  </Text>
                  <Text
                    style={[
                      styles.summaryHint,
                      isDark && darkStyles.darkSecondaryText,
                    ]}
                  >
                    {myReports.length === 1
                      ? "incident reported"
                      : "incidents reported"}
                  </Text>
                </View>
                <View style={styles.summaryIcon}>
                  <MaterialIcons
                    name="assignment"
                    size={25}
                    color="#2563eb"
                  />
                </View>
              </View>

              <View style={styles.reportsHeading}>
                <Text style={[styles.sectionTitle, isDark && darkStyles.darkText]}>
                  Recent activity
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Filter reports: ${selectedStatusLabel}`}
                  accessibilityState={{ expanded: isStatusFilterOpen }}
                  onPress={() => setIsStatusFilterOpen(true)}
                  style={[
                    styles.filterPickerContainer,
                    isDark && darkStyles.filterPickerContainer,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPickerText,
                      isDark && darkStyles.filterPickerText,
                    ]}
                  >
                    {selectedStatusLabel}
                  </Text>
                  <MaterialIcons
                    name={isStatusFilterOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={22}
                    color={isDark ? "#cbd5e1" : "#475569"}
                  />
                </Pressable>
              </View>

              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const badgeTheme = getBadgeStyle(report.status);
                  const statusLabel = getReportStatusLabel(report.status);

                  return (
                    <View
                      key={report.id}
                      style={[styles.card, isDark && darkStyles.darkCard]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                          <Text
                            style={[
                              styles.emergencyType,
                              isDark && darkStyles.darkText,
                            ]}
                          >
                            {report.emergency_type || "Emergency Report"}
                          </Text>
                          <Text
                            style={[
                              styles.reportNumber,
                              isDark && darkStyles.darkSecondaryText,
                            ]}
                          >
                            Report #{citizenReportNumbers.get(report.id)}
                          </Text>

                          {report.accident_level && (
                            <Text style={[styles.severityLevel, isDark && darkStyles.severityLevel]}>
                              Severity: {report.accident_level}
                            </Text>
                          )}

                          {report.created_at && (
                            <Text
                              style={[
                                styles.dateText,
                                isDark && darkStyles.darkSecondaryText,
                              ]}
                            >
                              {report.created_at}
                            </Text>
                          )}
                        </View>

                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: badgeTheme.bg },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: badgeTheme.text }]}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      </View>

                      {report.image_path && (
                        <Image
                          source={{
                            uri: report.image_path,
                          }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      )}

                      <View style={styles.cardFooter}>
                        <MaterialIcons
                          name="location-on"
                          size={16}
                          color="#64748B"
                        />
                        <Text
                          style={[
                            styles.locationText,
                            isDark && darkStyles.darkSecondaryText,
                          ]}
                          numberOfLines={1}
                        >
                          {report.location || "Location logged via GPS"}
                        </Text>

                        {/* MODIFIED VIEW BUTTON */}
                        <Pressable
                          style={styles.viewButton}
                          onPress={() => handleViewReport(report)}
                        >
                          <Text style={styles.viewButtonText}>View</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.emptyState, isDark && darkStyles.darkCard]}>
                  <MaterialIcons name="inbox" size={48} color="#94A3B8" />
                  <Text
                    style={[
                      styles.emptyStateText,
                      isDark && darkStyles.darkSecondaryText,
                    ]}
                  >
                    {loadFailed && myReports.length === 0
                      ? "Couldn't load your reports. Check your connection; we'll keep retrying."
                      : myReports.length === 0
                      ? "You haven't submitted any reports yet."
                      : statusFilter === "all"
                        ? "No reports found."
                        : `No ${statusFilter === "en-route" ? "en route" : statusFilter} reports.`}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>

        <Modal
          visible={isStatusFilterOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsStatusFilterOpen(false)}
        >
          <View
            style={[
              styles.filterModalOverlay,
              isDark && darkStyles.filterModalOverlay,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close status filter"
              style={StyleSheet.absoluteFill}
              onPress={() => setIsStatusFilterOpen(false)}
            />
            <View
              style={[
                styles.filterMenu,
                isDark && darkStyles.filterMenu,
              ]}
            >
              {statusFilters.map((filter) => {
                const selected = statusFilter === filter.value;
                return (
                  <Pressable
                    key={filter.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setStatusFilter(filter.value);
                      setIsStatusFilterOpen(false);
                    }}
                    style={[
                      styles.filterOption,
                      selected && styles.filterOptionSelected,
                      selected && isDark && darkStyles.filterOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        isDark && darkStyles.filterOptionText,
                        selected && styles.filterOptionTextSelected,
                        selected && isDark && darkStyles.filterOptionTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                    {selected && (
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={isDark ? "#86efac" : "#15803d"}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>

        {/* --- REPORT DETAILS MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && darkStyles.darkCard]}>
              {selectedReport && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScroll}
                >
                  <View style={styles.modalHeaderRow}>
                    <Text
                      style={[
                        styles.modalMainTitle,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      Report #{citizenReportNumbers.get(selectedReport.id)}
                    </Text>
                    <Pressable
                      onPress={() => setIsModalVisible(false)}
                      style={[
                        styles.modalCloseIcon,
                        isDark && darkStyles.modalCloseIcon,
                      ]}
                    >
                      <MaterialIcons
                        name="close"
                        size={24}
                        color={isDark ? "#cbd5e1" : "#64748b"}
                      />
                    </Pressable>
                  </View>

                  {selectedReport.image_path ? (
                    <Image
                      source={{
                        uri: selectedReport.image_path,
                      }}
                      style={styles.modalLargeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.modalNoImage,
                        isDark && darkStyles.modalNoImage,
                      ]}
                    >
                      <MaterialIcons
                        name="image-not-supported"
                        size={32}
                        color="#cbd5e1"
                      />
                      <Text
                        style={[
                          styles.modalNoImageText,
                          isDark && darkStyles.darkSecondaryText,
                        ]}
                      >
                        No image provided
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Status
                    </Text>
                    <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: getBadgeStyle(selectedReport.status).bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getBadgeStyle(selectedReport.status).text },
                          ]}
                        >
                          {getReportStatusLabel(selectedReport.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.modalInfoGroup, isDark && darkStyles.modalInfoGroup]}>
                    <Text style={[styles.modalLabel, isDark && darkStyles.darkSecondaryText]}>
                      Rescuer location
                    </Text>
                    {isModalVisible && (
                      <RescuerLocation
                        key={selectedReport.id}
                        reportId={selectedReport.id}
                        enabled={isLoggedIn && isFocused}
                        isDark={isDark}
                      />
                    )}
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Emergency Type
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {selectedReport.emergency_type}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Severity Level
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        { color: isDark ? "#fdba74" : "#ea580c" },
                      ]}
                    >
                      {selectedReport.accident_level || "Not specified"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Location
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {selectedReport.latitude !== undefined &&
                      selectedReport.longitude !== undefined
                        ? `Lat: ${selectedReport.latitude}, Lon: ${selectedReport.longitude}`
                        : selectedReport.location || "N/A"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Municipality
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {[selectedReport.municipality, selectedReport.province]
                        .filter(Boolean)
                        .join(", ") ||
                        (lookedUpPlace?.reportId === selectedReport.id
                          ? lookedUpPlace.text
                          : reportNeedsPlace
                            ? "Looking up location..."
                            : "Not provided")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Reported By
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {selectedReport.reporter_name || "Anonymous"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Contact Number
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {selectedReport.contact_number || "Not provided"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalInfoGroup,
                      isDark && darkStyles.modalInfoGroup,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalLabel,
                        isDark && darkStyles.darkSecondaryText,
                      ]}
                    >
                      Date Reported
                    </Text>
                    <Text
                      style={[
                        styles.modalValue,
                        isDark && darkStyles.darkText,
                      ]}
                    >
                      {selectedReport.created_at
                        ? new Date(selectedReport.created_at).toLocaleString()
                        : "Not available"}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.modalCloseButton,
                      isDark && darkStyles.modalCloseButton,
                    ]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <LogoutConfirmation
          visible={isLogoutConfirmationVisible}
          onCancel={() => setIsLogoutConfirmationVisible(false)}
          onConfirm={handleLogout}
          isDark={isDark}
        />
      </LinearGradient>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 20 },
    header: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 18,
    },
    headerTitleContainer: { flex: 1, gap: 2 },
    greeting: { fontSize: 13, fontWeight: "600", color: "#64748b" },
    headerIconWrapper: {
      backgroundColor: "#dbeafe",
      padding: 8,
      borderRadius: 9999,
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: "#1e293b" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#dbeafe",
    },
    avatarFallback: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#dbeafe",
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
    summaryCard: {
      minHeight: 128,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      marginBottom: 24,
      borderRadius: 22,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    summaryText: { gap: 3 },
    summaryLabel: {
      color: "#64748b",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
    },
    summaryValue: {
      color: "#0f172a",
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
    },
    summaryHint: { color: "#64748b", fontSize: 13 },
    summaryIcon: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: "#dbeafe",
    },
    reportsContainer: { paddingHorizontal: 16 },
    reportsHeading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 0,
      paddingHorizontal: 8,
      flexShrink: 0,
    },
    filterPickerContainer: {
      minWidth: 156,
      minHeight: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#cbd5e1",
      backgroundColor: "#ffffff",
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    filterPickerText: {
      color: "#334155",
      fontSize: 14,
      fontWeight: "600",
    },
    filterModalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
      backgroundColor: "rgba(15, 23, 42, 0.35)",
    },
    filterMenu: {
      width: "100%",
      maxWidth: 360,
      padding: 8,
      borderRadius: 16,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 12,
    },
    filterOption: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    filterOptionSelected: { backgroundColor: "#f0fdf4" },
    filterOptionText: {
      color: "#334155",
      fontSize: 15,
      fontWeight: "500",
    },
    filterOptionTextSelected: { color: "#166534", fontWeight: "700" },
    card: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#f1f5f9",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    cardTitleContainer: { flex: 1, paddingRight: 16 },
    emergencyType: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1e293b",
      marginBottom: 4,
    },
    reportNumber: {
      fontSize: 12,
      fontWeight: "700",
      color: "#64748b",
      marginBottom: 6,
    },
    severityLevel: {
      fontSize: 12,
      fontWeight: "600",
      color: "#9a3412",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    dateText: { fontSize: 12, color: "#64748b" },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
    badgeText: { fontSize: 12, fontWeight: "bold" },
    cardImage: {
      width: "100%",
      height: 128,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: "#f1f5f9",
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#f1f5f9",
    },
    locationText: { fontSize: 14, color: "#64748b", marginLeft: 4, flex: 1 },
    viewButton: {
      backgroundColor: "#eff6ff",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    viewButtonText: { color: "#2563eb", fontWeight: "bold", fontSize: 14 },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.6)",
    },
    emptyStateText: { color: "#64748b", marginTop: 16, fontWeight: "500" },

    /* --- MODAL STYLES --- */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark semi-transparent background
      justifyContent: "flex-end", // Pushes modal to the bottom like a bottom sheet
    },
    modalContent: {
      backgroundColor: "#ffffff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "85%", // Takes up 85% of the screen
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    modalScroll: {
      paddingBottom: 40,
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalMainTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#1e293b",
    },
    modalCloseIcon: {
      padding: 4,
      backgroundColor: "#f1f5f9",
      borderRadius: 999,
    },
    modalLargeImage: {
      width: "100%",
      height: 200,
      borderRadius: 16,
      marginBottom: 20,
      backgroundColor: "#f1f5f9",
    },
    modalNoImage: {
      width: "100%",
      height: 150,
      borderRadius: 16,
      marginBottom: 20,
      backgroundColor: "#f8fafc",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#f1f5f9",
      borderStyle: "dashed",
    },
    modalNoImageText: {
      marginTop: 8,
      color: "#64748b",
      fontWeight: "500",
    },
    modalInfoGroup: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
    },
    modalLabel: {
      fontSize: 12,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: "bold",
      marginBottom: 4,
    },
    modalValue: {
      fontSize: 16,
      color: "#1e293b",
      fontWeight: "600",
    },
    modalCloseButton: {
      backgroundColor: "#1e293b", // Dark Slate Button
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    modalCloseButtonText: {
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 16,
    },
  });

  const darkStyles = StyleSheet.create({
    darkText: { color: "#f8fafc" },
    darkSecondaryText: { color: "#cbd5e1" },
    severityLevel: { color: "#ea580c" },
    darkCard: { backgroundColor: "#1e293b", borderColor: "#334155" },
    filterModalOverlay: { backgroundColor: "rgba(2, 6, 23, 0.72)" },
    darkIconWrapper: { backgroundColor: "#1e3a5f" },
    filterPickerContainer: {
      borderColor: "#475569",
      backgroundColor: "#1e293b",
    },
    filterPickerText: { color: "#e2e8f0" },
    filterMenu: {
      backgroundColor: "#1e293b",
      borderColor: "#334155",
    },
    filterOptionSelected: { backgroundColor: "#173a2b" },
    filterOptionText: { color: "#e2e8f0" },
    filterOptionTextSelected: { color: "#bbf7d0" },
    modalCloseIcon: { backgroundColor: "#334155" },
    modalNoImage: {
      backgroundColor: "#0f172a",
      borderColor: "#334155",
    },
    modalInfoGroup: { borderBottomColor: "#334155" },
    modalCloseButton: { backgroundColor: "#334155" },
  });
