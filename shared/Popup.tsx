import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import LocationMap from "./LocationMap";

interface LocationPopupProps {
  visible: boolean;
  onClose: () => void;
  address?: string;
  location?: { latitude: number; longitude: number } | null;
  onLocationChange?: (loc: { latitude: number; longitude: number }) => void;
  isDraggable?: boolean;
  showMap?: boolean;
  isDark?: boolean;
  title?: string;
  buttonText?: string;
  onAction?: () => void;
}

export default function LocationPopup({
  visible,
  onClose,
  address,
  location,
  onLocationChange,
  isDraggable = false,
  showMap = true,
  isDark = false,
  title = "Your Location",
  buttonText = "Close",
  onAction,
}: LocationPopupProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, isDark && darkStyles.modalCard]}>
          <View style={styles.headerRow}>
            <Text style={[styles.titleText, isDark && darkStyles.titleText]}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeIconButton,
                isDark && darkStyles.closeIconButton,
              ]}
            >
              <FontAwesome6
                name="xmark"
                size={20}
                color={isDark ? "#cbd5e1" : "#4b5563"}
              />
            </Pressable>
          </View>

          {isDraggable && (
            <Text
              style={[
                styles.instructionText,
                isDark && darkStyles.instructionText,
              ]}
            >
              Hold and drag the marker to adjust your exact location.
            </Text>
          )}

          {visible && showMap && location && (
            <View
              style={[
                styles.mapContainer,
                isDark && darkStyles.mapContainer,
              ]}
            >
              <LocationMap location={location} draggable={isDraggable} interactive={isDraggable} onLocationChange={onLocationChange} />
            </View>
          )}

          <View style={[styles.addressBox, isDark && darkStyles.addressBox]}>
            <Text
              style={[
                styles.addressLabel,
                isDark && darkStyles.addressLabel,
              ]}
            >
              Location Data:
            </Text>
            <Text
              style={[
                styles.addressText,
                isDark && darkStyles.addressText,
              ]}
              numberOfLines={2}
            >
              {address || "Fetching location..."}
            </Text>
          </View>

          <Pressable
            onPress={onAction ?? onClose}
            style={[styles.actionButton, isDark && darkStyles.actionButton]}
          >
            <Text style={styles.actionButtonText}>{buttonText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  closeIconButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 50,
  },
  instructionText: {
    color: "#6B7280",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  mapContainer: {
    height: 320,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    position: "relative",
  },
  addressBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  actionButton: {
    backgroundColor: "#166534",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 56,
    borderRadius: 16,
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
});

const darkStyles = StyleSheet.create({
  modalCard: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  titleText: { color: "#f8fafc" },
  closeIconButton: { backgroundColor: "#334155" },
  instructionText: { color: "#cbd5e1" },
  mapContainer: { borderColor: "#334155" },
  addressBox: { backgroundColor: "#0f172a", borderColor: "#334155" },
  addressLabel: { color: "#cbd5e1" },
  addressText: { color: "#f8fafc" },
  actionButton: { backgroundColor: "#15803d" },
});