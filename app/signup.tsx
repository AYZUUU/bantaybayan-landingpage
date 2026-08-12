import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { pickSource } from "./_utils/imagepicker";

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
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturing, setCapturing] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleTakePicture = async () => {
    if (cameraRef.current && !capturing) {
      try {
        setCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });

        if (photo?.uri) {
          try {
            let perm = mediaPermission;
            if (!perm?.granted) {
              perm = await requestMediaPermission();
            }
            if (perm?.granted) {
              await MediaLibrary.createAssetAsync(photo.uri);
            }
          } catch (e) {
            console.log("Failed to save asset to gallery:", e);
          }

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
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={enableTorch}
          >
            <SafeAreaView style={styles.overlayContainer}>
              {/* Header Controls */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                  <Text style={styles.btnText}>✕ Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEnableTorch((prev) => !prev)}
                  style={styles.headerButton}
                >
                  <Text style={styles.btnText}>
                    {enableTorch ? "🔦 Flash ON" : "⚡ Flash OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ID Card Target Alignment Frame */}
              <View style={styles.frameContainer}>
                <View style={styles.idCardGuide} />
                <Text style={styles.instructionText}>
                  Position the ID card inside the frame
                </Text>
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
          </CameraView>
        ) : (
          <SafeAreaView style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>
              Requesting Camera Permission...
            </Text>
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

  const handleGoToPreview = () => {
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

    // Pass signup details directly to preview.tsx
    router.push({
      pathname: "/preview",
      params: {
        firstName,
        lastName,
        contactNumber,
        email,
        password,
        role: value,
        photo,
      },
    });
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("../assets/images/bantaybayan.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titleText}>Create Account</Text>

            {/* Input Fields */}
            <TextInput
              placeholder="First Name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              placeholder="Contact Number (e.g. 09123456789)"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
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

            {/* Photo Capture Preview Area */}
            <Pressable
              onPress={() => {
                if (photo) {
                  pickSource(setPhoto);
                } else {
                  setIsScannerOpen(true);
                }
              }}
              style={[
                styles.photoBox,
                !photo && styles.photoBoxDashed,
              ]}
            >
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    Tap to Scan ID
                  </Text>
                </View>
              )}
            </Pressable>

            {/* External Options for Captured Photo */}
            {photo && (
              <View style={styles.photoActionRow}>
                <TouchableOpacity onPress={handleExportPhoto}>
                  <Text style={styles.shareText}>📤 Share ID</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsScannerOpen(true)}>
                  <Text style={styles.rescanText}>📷 Rescan ID</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Navigation to Preview Screen */}
            <Pressable
              onPress={handleGoToPreview}
              style={styles.previewButtonContainer}
            >
              <View style={styles.previewButton}>
                <Text style={styles.previewButtonText}>Signup</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>

      <IDScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCapture={(capturedUri) => setPhoto(capturedUri)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    marginTop: 20,
  },
  cardContainer: {
    height: "auto",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "83.33%",
    marginBottom: 4,
    padding: 24,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logo: {
    width: 224,
    height: 224,
    alignSelf: "center",
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
  },
  photoBoxDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
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
    marginTop: 8,
  },
  shareText: {
    color: "#2563EB",
    fontWeight: "600",
  },
  rescanText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  previewButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  previewButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    width: "75%",
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
  overlayContainer: {
    flex: 1,
    justifyContent: "space-between",
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
  frameContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  idCardGuide: {
    width: "90%",
    aspectRatio: 1.586,
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  instructionText: {
    color: "#ffffff",
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
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
});