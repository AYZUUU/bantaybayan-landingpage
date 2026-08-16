import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { 
  Pressable, 
  ScrollView, 
  Text, 
  View, 
  Image, 
  StyleSheet, 
  Modal 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";

export interface Report {
  id: number;
  emergency_type: string;
  accident_level?: string;
  reporter_name?: string;
  status: string;
  location?: string;
  created_at?: string;
  image_path?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn, userName, setUserName } = useAuth();
  const [myReports, setMyReports] = useState<Report[]>([]);
  
  // NEW STATES FOR THE MODAL
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchMyReports = async () => {
    try {
      const apiUrl = `http://192.168.100.108/api/getMyReports.php?userName=${encodeURIComponent(userName)}`;
      const response = await fetch(apiUrl);
      const jsonResponse = await response.json();

      if (jsonResponse.status === "success" && jsonResponse.data) {
        setMyReports(jsonResponse.data);
      }
      else {
        setMyReports([]);
      }
    }catch (error) {
      console.error("Error fetching reports:", error);
    }
  }


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

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "Pending":
        return { bg: "#fef08a", text: "#a16207" }; 
      case "Verified":
        return { bg: "#dbeafe", text: "#1d4ed8" }; 
      default:
        return { bg: "#dcfce7", text: "#15803d" }; 
    }
  };

  // Helper to open modal with data
  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsModalVisible(true);
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* --- HEADER --- */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconWrapper}>
                <FontAwesome5 name="ambulance" size={20} color="#2563EB" />
              </View>
              <Text style={styles.headerTitle}>Dashboard</Text>
            </View>

            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={24} color="#334155" />
            </Pressable>
          </View>

          {/* --- REPORTS LIST --- */}
          <View style={styles.reportsContainer}>
            <Text style={styles.sectionTitle}>
              My Submissions ({myReports.length})
            </Text>

            {myReports.length > 0 ? (
              myReports.map((report) => {
                const badgeTheme = getBadgeStyle(report.status);

                return (
                  <View key={report.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.emergencyType}>
                          {report.emergency_type || "Emergency Report"}
                        </Text>
                        
                        {report.accident_level && (
                          <Text style={styles.severityLevel}>
                            Severity: {report.accident_level}
                          </Text>
                        )}

                        {report.created_at && (
                          <Text style={styles.dateText}>
                            {report.created_at}
                          </Text>
                        )}
                      </View>
                      
                      <View style={[styles.badge, { backgroundColor: badgeTheme.bg }]}>
                        <Text style={[styles.badgeText, { color: badgeTheme.text }]}>
                          {report.status || "Unknown"}
                        </Text>
                      </View>
                    </View>

                    {report.image_path && (
                      <Image
                        source={{ uri: `http://192.168.100.108/api/${report.image_path}` }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    )}

                    <View style={styles.cardFooter}>
                      <MaterialIcons name="location-on" size={16} color="#64748B" />
                      <Text style={styles.locationText} numberOfLines={1}>
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
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>
                  You haven't submitted any reports yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- REPORT DETAILS MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalMainTitle}>Incident Details</Text>
                  <Pressable onPress={() => setIsModalVisible(false)} style={styles.modalCloseIcon}>
                    <MaterialIcons name="close" size={24} color="#64748b" />
                  </Pressable>
                </View>

                {selectedReport.image_path ? (
                  <Image
                    source={{ uri: `http://192.168.100.108/api/${selectedReport.image_path}` }}
                    style={styles.modalLargeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalNoImage}>
                    <MaterialIcons name="image-not-supported" size={32} color="#cbd5e1" />
                    <Text style={styles.modalNoImageText}>No image provided</Text>
                  </View>
                )}

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalLabel}>Emergency Type</Text>
                  <Text style={styles.modalValue}>{selectedReport.emergency_type}</Text>
                </View>

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalLabel}>Severity Level</Text>
                  <Text style={[styles.modalValue, { color: "#ea580c" }]}>
                    {selectedReport.accident_level || "Not specified"}
                  </Text>
                </View>

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalLabel}>Current Status</Text>
                  <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    <View style={[styles.badge, { backgroundColor: getBadgeStyle(selectedReport.status).bg }]}>
                      <Text style={[styles.badgeText, { color: getBadgeStyle(selectedReport.status).text }]}>
                        {selectedReport.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{selectedReport.location || "N/A"}</Text>
                </View>

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalLabel}>Date Reported</Text>
                  <Text style={styles.modalValue}>{selectedReport.created_at || "N/A"}</Text>
                </View>

                <Pressable 
                  style={styles.modalCloseButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrapper: { backgroundColor: "#dbeafe", padding: 8, borderRadius: 9999 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b" },
  logoutButton: { backgroundColor: "rgba(255, 255, 255, 0.5)", padding: 8, borderRadius: 9999 },
  reportsContainer: { paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardTitleContainer: { flex: 1, paddingRight: 16 },
  emergencyType: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 4 },
  severityLevel: { fontSize: 12, fontWeight: "600", color: "#ea580c", textTransform: "uppercase", marginBottom: 4 },
  dateText: { fontSize: 12, color: "#94a3b8" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  cardImage: { width: "100%", height: 128, borderRadius: 12, marginBottom: 12, backgroundColor: "#f1f5f9" },
  cardFooter: { flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  locationText: { fontSize: 14, color: "#64748b", marginLeft: 4, flex: 1 },
  viewButton: { backgroundColor: "#eff6ff", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  viewButtonText: { color: "#2563eb", fontWeight: "bold", fontSize: 14 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, backgroundColor: "rgba(255, 255, 255, 0.5)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.6)" },
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
    color: "#94a3b8",
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