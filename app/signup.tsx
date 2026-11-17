import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { saveRegistrationDraft } from "../shared/registrationDraft";

interface IDScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}

const IDScannerModal: React.FC<IDScannerModalProps> = ({
  visible,
  onClose,
  onCapture,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [capturing, setCapturing] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission, visible]);

  const handleTakePicture = async () => {
    if (cameraRef.current && !capturing) {
      try {
        setCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });

        if (photo?.uri) {
          onCapture(photo.uri);
          onClose();
        }
      } catch (error) {
        console.error("Failed to capture ID:", error);
      } finally {
        setCapturing(false);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.modalContainer}>
        {permission?.granted ? (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={enableTorch}
            />

            <SafeAreaView style={styles.overlayAbsolute} pointerEvents="box-none">
              {/* Header Controls */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEnableTorch((prev) => !prev)}
                  style={styles.headerButton}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={enableTorch ? "flash" : "flash-off"} size={20} color="#ffffff" />
                    <Text style={styles.btnText}>
                      {enableTorch ? "Flash ON" : "Flash OFF"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Shutter Button Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handleTakePicture}
                  disabled={capturing}
                  style={styles.shutterOuterCircle}
                >
                  {capturing ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={styles.shutterInnerCircle} />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView style={styles.centerContainer}>
            {permission && !permission.canAskAgain && !permission.granted ? (
              <Text style={styles.loadingText}>
                Camera access denied. Please enable in Settings.
              </Text>
            ) : (
              <>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>
                  Requesting Camera Permission
                </Text>
              </>
            )}
            <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
};

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Citizen", value: "Citizen" },
    { label: "Responder", value: "Responder" },
  ]);

  const handleExportPhoto = async () => {
    if (!photo) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(photo);
    } else {
      Toast.show({ type: "info", text1: "Sharing not supported on this device" });
    }
  };

  const handleGoToPreview = async () => {
    if (isOpeningPreview) return;
    if (
      !firstName ||
      !lastName ||
      !contactNumber ||
      !email ||
      !password ||
      !value ||
      !photo
    ) {
      Toast.show({ type: "info", text1: "Please complete all fields" });
      return;
    }

    setIsOpeningPreview(true);
    try {
      const draftId = await saveRegistrationDraft({
        firstName,
        lastName,
        contactNumber,
        email,
        password,
        role: value,
        photoUri: photo,
      });
      router.push({ pathname: "/preview", params: { draftId } });
    } catch (error) {
      console.error("Could not save signup details:", error);
      Toast.show({
        type: "error",
        text1: "Could not continue",
        text2: "Your signup details could not be saved. Please try again.",
      });
    } finally {
      setIsOpeningPreview(false);
    }
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.cardContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <Image
                source={require("../assets/images/bantaybayan.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.titleText}>Create Account</Text>

              {/* ID Scanner Box Placed Above Inputs */}
              <Pressable
                onPress={() => {
                  if (photo) {
                    setIsPreviewModalOpen(true);
                  } else {
                    setIsScannerOpen(true);
                  }
                }}
                style={[
                  styles.photoBox,
                  !photo && styles.photoBoxDashed,
                  { marginBottom: 16 },
                ]}
              >
                {photo ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: photo }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.viewOverlay}>
                      <Text style={styles.viewOverlayText}>Click to view</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color="#6B7280" style={{ marginBottom: 4 }} />
                    <Text style={styles.photoPlaceholderText}>Tap to Scan ID</Text>
                  </View>
                )}
              </Pressable>

              {/* External Options for Captured Photo */}
              {photo && (
                <View style={[styles.photoActionRow, { marginBottom: 16 }]}>
                  <TouchableOpacity onPress={handleExportPhoto} style={styles.actionButton}>
                    <Ionicons color="#2563EB" name="share-outline" size={18} />
                    <Text style={styles.shareText}>Share ID</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsScannerOpen(true)} style={styles.actionButton}>
                    <Ionicons color="#b91c1c" name="scan-outline" size={18} />
                    <Text style={styles.rescanText}>Rescan ID</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Input Fields */}
              <TextInput
                placeholder="First Name"
                placeholderTextColor="#475569"
                style={styles.textInput}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                placeholder="Last Name"
                placeholderTextColor="#475569"
                style={styles.textInput}
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                placeholder="Contact Number (e.g. 09123456789)"
                placeholderTextColor="#475569"
                style={styles.textInput}
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#475569"
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#475569"
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Role Dropdown */}
              <DropDownPicker
                style={styles.dropdown}
                open={open}
                value={value}
                items={items}
                setOpen={setOpen}
                setValue={setValue}
                setItems={setItems}
                placeholder="Select role"
                zIndex={1000}
                zIndexInverse={3000}
                dropDownDirection="BOTTOM"
                listMode="SCROLLVIEW"
              />

              {/* Navigation to Preview Screen */}
              <Pressable
                onPress={handleGoToPreview}
                disabled={isOpeningPreview}
                style={styles.previewButtonContainer}
              >
                <View style={styles.previewButton}>
                  {isOpeningPreview ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.previewButtonText}>Signup</Text>
                  )}
                </View>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <IDScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCapture={(capturedUri) => setPhoto(capturedUri)}
      />

      {/* Full Screen ID Preview Modal */}
      <Modal visible={isPreviewModalOpen} transparent={true} animationType="fade">
        <View style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalContent}>
            <TouchableOpacity
              onPress={() => setIsPreviewModalOpen(false)}
              style={styles.closeModalButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scanned ID Preview</Text>
            {photo && (
              <Image
                source={{ uri: photo }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "88%",
    maxHeight: "90%",
    marginVertical: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 4,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
    color: "#1F2937",
  },
  textInput: {
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    height: 40,
    marginBottom: 16,
    paddingHorizontal: 12,
    color: "#1F2937",
  },
  dropdown: {
    borderRadius: 7,
    marginBottom: 16,
    borderColor: "#E5E7EB",
  },
  photoBox: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden",
    height: 120,
    backgroundColor: "#F3F4F6",
  },
  photoBoxDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  viewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  viewOverlayText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  photoPlaceholder: {
    alignItems: "center",
  },
  photoPlaceholderText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  photoActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 15,
  },
  rescanText: {
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: 15,
  },
  previewButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  previewButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  previewButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 12,
  },
  cancelText: {
    color: "#3B82F6",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 30,
  },
  headerButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 30,
  },
  shutterOuterCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  shutterInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
  },
  overlayAbsolute: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    zIndex: 10,
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullscreenModalContent: {
    width: "100%",
    height: "70%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1F2937",
  },
  fullscreenImage: {
    width: "100%",
    height: "85%",
    borderRadius: 12,
  },
});