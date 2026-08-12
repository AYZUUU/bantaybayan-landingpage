import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
      <View className="flex-1 bg-black">
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            className="absolute inset-0"
            facing="back"
            enableTorch={enableTorch}
          >
            <SafeAreaView className="flex-1 justify-between">
              {/* Header */}
              <View className="flex-row justify-between px-5 pt-5 mt-7">
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-black/60 px-4 py-2 rounded-full"
                >
                  <Text className="text-white font-semibold text-sm">
                    ✕ Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEnableTorch((prev) => !prev)}
                  className="bg-black/60 px-4 py-2 rounded-full"
                >
                  <Text className="text-white font-semibold text-sm">
                    {enableTorch ? "🔦 Flash ON" : "⚡ Flash OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Framing Guide */}
              <View className="items-center justify-center px-5">
                <View
                  className="w-[90%] border-2 border-emerald-500 rounded-2xl bg-white/5"
                  style={{ aspectRatio: 1.586 }}
                />
                <Text className="text-white mt-4 text-sm font-medium text-center bg-black/50 px-3 py-1.5 rounded-lg overflow-hidden">
                  Position the ID card inside the frame
                </Text>
              </View>

              {/* Shutter Footer */}
              <View className="items-center pb-8">
                <TouchableOpacity
                  onPress={handleTakePicture}
                  disabled={capturing}
                  className="w-18 h-18 rounded-full border-4 border-white justify-center items-center bg-white/30"
                  style={{ width: 72, height: 72 }}
                >
                  {capturing ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-white" />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </CameraView>
        ) : (
          <SafeAreaView className="flex-1 justify-center items-center bg-gray-900">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white mt-3">
              Requesting Camera Permission...
            </Text>
            <TouchableOpacity onPress={onClose} className="mt-5">
              <Text className="text-blue-500 font-bold">Cancel</Text>
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
      Toast.show({ type: "info", text1: "Sharing not supported on device" });
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
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} className="flex-1">
      <SafeAreaView className="flex-1 items-center mt-5">
        <View className="h-auto bg-white rounded-3xl shadow-lg w-10/12 mb-1 p-6 z-10">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("../assets/images/bantaybayan.png")}
              className="w-56 h-56 self-center"
              resizeMode="contain"
            />
            <Text className="font-bold text-lg text-center mb-4 text-gray-800">
              Create Account
            </Text>

            <TextInput
              placeholder="First Name"
              className="rounded bg-gray-100 h-10 mb-4 px-3 text-gray-800"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              placeholder="Last Name"
              className="rounded bg-gray-100 h-10 mb-4 px-3 text-gray-800"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              placeholder="Contact Number (e.g. 09123456789)"
              className="rounded bg-gray-100 h-10 mb-4 px-3 text-gray-800"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Email"
              className="rounded bg-gray-100 h-10 mb-4 px-3 text-gray-800"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              className="rounded bg-gray-100 h-10 mb-4 px-3 text-gray-800"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <DropDownPicker
              style={{ borderRadius: 7, marginBottom: 16 }}
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

            {/* ID Capture Preview Box */}
            <Pressable
              onPress={() => {
                if (photo) {
                  pickSource(setPhoto);
                } else {
                  setIsScannerOpen(true);
                }
              }}
              className={`items-center justify-center rounded-xl overflow-hidden h-30 ${
                photo ? "" : "border-2 border-dashed border-gray-400"
              }`}
              style={{ height: 120 }}
            >
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  className="w-full h-full rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <Text className="text-gray-500 font-semibold">
                    Tap to Scan ID
                  </Text>
                </View>
              )}
            </Pressable>

            {photo && (
              <View className="flex-row justify-between mt-2">
                <TouchableOpacity onPress={handleExportPhoto}>
                  <Text className="text-blue-600 font-semibold">
                    📤 Share ID
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsScannerOpen(true)}>
                  <Text className="text-red-500 font-semibold">
                    📷 Rescan ID
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Next / Preview Button */}
            <Pressable
              onPress={handleGoToPreview}
              className="justify-center items-center mt-5 mb-5"
            >
              <View className="bg-blue-600 rounded-xl w-3/4 h-12 justify-center items-center shadow">
                <Text className="text-white font-bold text-lg">
                  Preview Details
                </Text>
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