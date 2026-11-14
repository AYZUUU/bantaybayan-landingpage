import { MaterialIcons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface LogoutConfirmationProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDark?: boolean;
}

export default function LogoutConfirmation({
  visible,
  onCancel,
  onConfirm,
  isDark = false,
}: LogoutConfirmationProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={[styles.overlay, isDark && styles.darkOverlay]}>
        <View
          accessibilityRole="summary"
          accessibilityLabel="Confirm logout"
          style={[styles.card, isDark && styles.darkCard]}
        >
          <View style={[styles.iconWrap, isDark && styles.darkIconWrap]}>
            <MaterialIcons name="logout" size={24} color="#be123c" />
          </View>
          <Text style={[styles.title, isDark && styles.darkTitle]}>Log out?</Text>
          <Text style={[styles.message, isDark && styles.darkMessage]}>
            You will need to sign in again to access your account.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              accessibilityHint="Signs you out of your account"
              onPress={onConfirm}
              style={styles.buttonPressable}
            >
              <View style={styles.confirmButton}>
                <MaterialIcons name="logout" size={20} color="#ffffff" />
                <Text style={styles.confirmText}>Log out</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stay signed in"
              onPress={onCancel}
              style={styles.buttonPressable}
            >
              <View
                style={[styles.cancelButton, isDark && styles.darkCancelButton]}
              >
                <Text style={[styles.cancelText, isDark && styles.darkCancelText]}>
                  Stay signed in
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
  },
  darkOverlay: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    zIndex: 1,
    elevation: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  darkCard: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f2",
    marginBottom: 16,
  },
  darkIconWrap: {
    backgroundColor: "#4a2530",
  },
  title: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "700",
  },
  darkTitle: {
    color: "#f8fafc",
  },
  message: {
    marginTop: 8,
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  darkMessage: {
    color: "#cbd5e1",
  },
  actions: {
    marginTop: 24,
    flexDirection: "column",
    gap: 12,
  },
  buttonPressable: {
    width: "100%",
  },
  cancelButton: {
    width: "100%",
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  darkCancelButton: {
    backgroundColor: "#334155",
    borderColor: "#475569",
  },
  cancelText: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  darkCancelText: {
    color: "#f1f5f9",
  },
  confirmButton: {
    width: "100%",
    minHeight: 56,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#be123c",
    borderWidth: 2,
    borderColor: "#881337",
    elevation: 3,
    shadowColor: "#9f1239",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    includeFontPadding: false,
    flexShrink: 0,
    textAlign: "center",
  },
});
