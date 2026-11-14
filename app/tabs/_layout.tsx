import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useAuth } from "../../shared/auth";
import { useAppPreferences } from "../../shared/AppPreferences";
import { getCitizenReportNumber } from "../../shared/reportNumber";
import {
  getReportStatus,
  ReportStatusUnavailableError,
} from "../../services/reports";
import { clearUnavailableReportTracking } from "../../shared/reportTracking";

const RESOLVED_REPORT_STATUS_KEY = "last_resolved_report_status";

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: NonNullable<React.ComponentProps<typeof Ionicons>["color"]>;
  focused: boolean;
  isDark: boolean;
};

function getTabIconColor(
  color:
    | string
    | number
    | React.ComponentProps<typeof Ionicons>["color"]
    | null,
  isDark: boolean,
) {
  return typeof color === "number" || color == null
    ? isDark
      ? "#94a3b8"
      : "#64748b"
    : color;
}

function TabIcon({
  name,
  color,
  focused,
  isDark,
}: TabIconProps) {
  return (
    <View
      style={[
        styles.tabIconContainer,
        focused && (isDark ? styles.darkActiveTabIcon : styles.activeTabIcon),
      ]}
    >
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { isLoggedIn, userRole, userId } = useAuth();
  const { preferences } = useAppPreferences();
  const isDark = useColorScheme() === "dark";
  const isResponder = userRole?.toLowerCase() === "responder";
  const [responseUpdate, setResponseUpdate] = useState<{
    reportId: string;
    citizenReportNumber: number | null;
    status: string;
    responderName: string | null;
    responderStation: string | null;
  } | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const pollingRef = useRef(false);
  const acknowledgedStatusesRef = useRef(new Map<string, string>());

  const checkActiveReport = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    let reportId: string | null = null;

    try {
      reportId = await AsyncStorage.getItem("last_active_report_id");
      if (!reportId) return;

      const report = await getReportStatus(reportId);
      if (String(report.id) !== reportId) return;

      const status = String(report.status || "").trim();
      if (!status) return;

      const normalizedStatus = status.toLowerCase();
      if (normalizedStatus.includes("resolved")) {
        await AsyncStorage.setItem(
          RESOLVED_REPORT_STATUS_KEY,
          JSON.stringify({
            status,
            responderName: report.assigned_responder_name?.trim() || null,
            responderStation:
              report.assigned_responder_station?.trim() || null,
          }),
        );
        await AsyncStorage.removeItem("last_active_report_id");
        acknowledgedStatusesRef.current.delete(reportId);
        return;
      }

      const isResponderUpdate =
        normalizedStatus.includes("accept") ||
        normalizedStatus.includes("respond") ||
        normalizedStatus.includes("en route") ||
        normalizedStatus.includes("dispatch") ||
        normalizedStatus.includes("assigned") ||
        normalizedStatus.includes("in progress");
      if (!isResponderUpdate) return;
      if (!preferences.notificationsEnabled) return;

      const acknowledgedStatus =
        acknowledgedStatusesRef.current.get(reportId);
      if (acknowledgedStatus === status) return;

      const citizenReportNumber = await getCitizenReportNumber(
        reportId,
        userId,
      );
      if (
        (await AsyncStorage.getItem("last_active_report_id")) !== reportId
      ) {
        return;
      }

      setResponseUpdate({
        reportId,
        citizenReportNumber,
        status,
        responderName: report.assigned_responder_name?.trim() || null,
        responderStation:
          report.assigned_responder_station?.trim() || null,
      });
      setResponseModalVisible(true);
    } catch (error) {
      if (error instanceof ReportStatusUnavailableError && reportId) {
        try {
          if (await clearUnavailableReportTracking(reportId)) {
            acknowledgedStatusesRef.current.delete(reportId);
            setResponseModalVisible(false);
            setResponseUpdate(null);
          }
        } catch (cleanupError) {
          console.error("Could not clear unavailable report tracking:", cleanupError);
        }
        return;
      }
      console.error("Error checking active report status:", error);
    } finally {
      pollingRef.current = false;
    }
  }, [preferences.notificationsEnabled, userId]);

  useEffect(() => {
    if (!isLoggedIn || isResponder) return;

    const initialCheck = setTimeout(() => {
      checkActiveReport();
    }, 0);
    const interval = setInterval(checkActiveReport, 5000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [checkActiveReport, isLoggedIn, isResponder]);

  const acknowledgeResponse = () => {
    if (responseUpdate) {
      acknowledgedStatusesRef.current.set(
        responseUpdate.reportId,
        responseUpdate.status,
      );
    }
    setResponseModalVisible(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          transitionSpec: {
            animation: "timing",
            config: {
              duration: 120,
              easing: Easing.out(Easing.cubic),
            },
          },
          sceneStyleInterpolator: ({ current }) => ({
            sceneStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-4, 0, 4],
                  }),
                },
              ],
            },
          }),
          tabBarActiveTintColor: isDark ? "#93c5fd" : "#2563eb",
          tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
          tabBarStyle: {
            height: 76,
            paddingTop: 5,
            paddingBottom: 12,
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            borderTopColor: isDark ? "#334155" : "#e2e8f0",
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: 12,
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 2,
          },
          tabBarItemStyle: {
            minHeight: 64,
            justifyContent: "center",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="reporting"
          options={{
            title: "Report",
            headerShown: false,
            href: isResponder ? null : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="megaphone-outline"
                color={getTabIconColor(color, isDark)}
                focused={focused}
                isDark={isDark}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            headerShown: false,
            href: !isLoggedIn || isResponder ? null : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="home-outline"
                color={getTabIconColor(color, isDark)}
                focused={focused}
                isDark={isDark}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="rescuer"
          options={{
            title: "Rescuer",
            headerShown: false,
           
            href: isLoggedIn && isResponder ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="medkit-outline"
                color={getTabIconColor(color, isDark)}
                focused={focused}
                isDark={isDark}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            href: isLoggedIn ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="settings-outline"
                color={getTabIconColor(color, isDark)}
                focused={focused}
                isDark={isDark}
              />
            ),
          }}
        />

      </Tabs>

      <Modal
        animationType="fade"
        transparent
        visible={
          responseModalVisible &&
          isLoggedIn &&
          !isResponder &&
          preferences.notificationsEnabled
        }
        onRequestClose={acknowledgeResponse}
      >
        <View style={[styles.modalOverlay, isDark && styles.darkModalOverlay]}>
          <View style={[styles.modalCard, isDark && styles.darkCard]}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>
              {responseUpdate?.citizenReportNumber
                ? `Report #${responseUpdate.citizenReportNumber} · `
                : ""}
              {responseUpdate?.status.toLowerCase().includes("en route") ||
              responseUpdate?.status.toLowerCase().includes("dispatch")
                ? "Rescuer En Route"
                : "Rescuer Responded"}
            </Text>
            <Text
              style={[
                styles.modalMessage,
                isDark && styles.darkSecondaryText,
              ]}
            >
              {responseUpdate?.status.toLowerCase().includes("en route") ||
              responseUpdate?.status.toLowerCase().includes("dispatch")
                ? `${
                    responseUpdate.responderName
                      ? `Rescuer ${responseUpdate.responderName}`
                      : "A rescuer"
                  } is on the way to your location. Station: ${
                    responseUpdate.responderStation || "Not listed"
                  }.`
                : `Your report has been acknowledged${
                    responseUpdate?.responderName
                      ? ` by ${responseUpdate.responderName}`
                      : ""
                  }. Station: ${
                    responseUpdate?.responderStation || "Not listed"
                  }. Current status: ${responseUpdate?.status || "Updated"}`}
            </Text>
            <Pressable
              style={[
                styles.acknowledgeButton,
                isDark && styles.darkAcknowledgeButton,
              ]}
              onPress={acknowledgeResponse}
            >
              <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 36,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabIcon: {
    backgroundColor: "#eff6ff",
  },
  darkActiveTabIcon: {
    backgroundColor: "#1e3a5f",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalMessage: {
    textAlign: "center",
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
  acknowledgeButton: {
    width: "100%",
    backgroundColor: "#15803d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  acknowledgeButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  darkCard: {
    backgroundColor: "#1e293b",
  },
  darkModalOverlay: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  darkAcknowledgeButton: {
    backgroundColor: "#166534",
  },
  darkText: {
    color: "#f8fafc",
  },
  darkSecondaryText: {
    color: "#cbd5e1",
  },
});