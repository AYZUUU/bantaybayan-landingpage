import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { pickSource } from "./_utils/imagepicker";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Citizen", value: "Citizen" },
    { label: "Rescuer", value: "Responder" },

  ]);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      !firstName ||
      !lastName ||
      !contactNumber ||
      !email ||
      !password ||
      !value ||
      !photo
    ) {
      Toast.show({ type: "info", text1: "Missing Fields" });
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("contact_number", contactNumber);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", value);

      const uriParts = photo.split(".");
      const fileType = uriParts[uriParts.length - 1];

      formData.append("photo", {
        uri: photo,
        name: `id_upload.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await fetch("http://192.168.100.108/api/signup.php", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      const result = JSON.parse(rawText);

      if (result.status === "success") {
        Toast.show({ type: "success", text1: "Account Created!" });
        setTimeout(() => {
          router.replace("/login");
        }, 1000);
      } else {
        Toast.show({ type: "error", text1: "Registration Failed" });
      }
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ alignItems: "center", flex: 1, marginTop: 20 }}>
        <View
          className="h-auto bg-primary rounded-3xl shadow-lg w-10/12 mb-1 p-6"
          style={{ zIndex: 10 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps={"handled"}
          >
            <Image
              source={require("../assets/images/bantaybayan.png")}
              className="w-56 h-56 self-center"
              resizeMode="contain"
            />
            <Text className="text-box font-bold text-lg text-center">
              Create Account
            </Text>

            {/* Inputs */}
            <TextInput
              placeholder="First Name"
              className="input-box rounded bg-light-100 h-10 mb-4 px-3"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              placeholder="Last Name"
              className="input-box rounded bg-light-100 h-10 mb-4 px-3"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              placeholder="Contact Number (e.g. 09123456789)"
              className="input-box rounded bg-light-100 h-10 mb-4 px-3"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Email"
              className="input-box rounded bg-light-100 h-10 mb-4 px-3"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              className="input-box rounded bg-light-100 h-10 mb-4 px-3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Dropdown */}
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

            {/* Upload ID */}
            <Pressable
              onPress={() => pickSource(setPhoto)}
              className="items-center justify-center rounded-xl"
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: "#9ca3af",
                height: 120,
              }}
            >
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-gray-500 font-semibold">
                  Upload your ID
                </Text>
              )}
            </Pressable>

            {/* Signup Button */}
            <Pressable
              onPress={handleSignup}
              className="justify-center items-center mt-5 mb-5"
              style={{ opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              <View className="bg-accent rounded-xl w-1/2 h-12 justify-center items-center">
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={{ color: "white", fontWeight: "bold", fontSize: 18 }}
                  >
                    Signup
                  </Text>
                )}
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
