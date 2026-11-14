import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface Report {
  id: string | number;
  emergency_type?: string;
  accident_level?: string;
  reporter_name?: string;
  contact_number?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  municipality?: string;
  province?: string;
  description?: string;
  created_at?: string;
  image_path?: string;
  assigned_responder_id?: string;
  backup_requested_at?: string;
}

interface RescuerCardProps {
  recentReports: Report[];
  isDark?: boolean;
  onViewDetails?: (report: Report) => void;
}

export default function RescuerCard({
  recentReports,
  isDark = false,
  onViewDetails,
}: RescuerCardProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
        Recent Reports
      </Text>

      {recentReports.map((report, index) => (
        <View
          key={report.id || index}
          style={[styles.card, isDark && styles.darkCard]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <FontAwesome5
                name="exclamation-circle"
                size={24}
                color="#dc2626"
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.emergencyTitle, isDark && styles.darkText]}>
                {report.emergency_type || "Unknown Emergency"}
              </Text>
              <Text style={styles.severityText}>
                Severity: {report.accident_level || "Unspecified"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.reportId, isDark && styles.darkSecondaryText]}>
              REPORT #{report.id}
            </Text>
            <View
              style={[
                styles.statusBadge,
                report.status?.toLowerCase().includes("dispatch")
                  ? styles.dispatchedBadge
                  : styles.pendingBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  report.status?.toLowerCase().includes("dispatch")
                    ? styles.dispatchedText
                    : styles.pendingText,
                ]}
              >
                {report.status || "Pending"}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text
              style={[
                styles.reporterText,
                isDark && styles.darkSecondaryText,
              ]}
              numberOfLines={1}
            >
              Reported by: {report.reporter_name || "Anonymous"}
            </Text>
          </View>

          <Pressable
            onPress={() => onViewDetails && onViewDetails(report)}
            style={[
              styles.detailsButton,
              isDark && styles.darkDetailsButton,
            ]}
          >
            <Text
              style={[
                styles.detailsButtonText,
                isDark && styles.darkSecondaryText,
              ]}
            >
              View Details
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    marginTop: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reportId: {
    color: "#64748b",
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pendingBadge: { backgroundColor: "#fef3c7" },
  dispatchedBadge: { backgroundColor: "#dbeafe" },
  statusText: { fontSize: 11, fontWeight: "700" },
  pendingText: { color: "#92400e" },
  dispatchedText: { color: "#1d4ed8" },
  iconContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 9999,
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  severityText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea580c",
    marginTop: 4,
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  reporterText: {
    color: "#6b7280",
    fontSize: 14,
    flex: 1,
  },
  detailsButton: {
    backgroundColor: "#f3f4f6",
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  detailsButtonText: {
    color: "#374151",
    fontWeight: "bold",
    fontSize: 16,
  },
  darkText: {
    color: "#f8fafc",
  },
  darkSecondaryText: {
    color: "#cbd5e1",
  },
  darkCard: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  darkDetailsButton: {
    backgroundColor: "#334155",
    borderColor: "#475569",
  },
});
