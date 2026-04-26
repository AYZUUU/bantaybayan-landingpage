import { MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";
import RescuerCard from "../_utils/rescuercard";

export default function Rescuer() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const handleLogout = async () => {
    try {
      setIsLoggedIn(false);
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
  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        >
          {/* --- HEADER --- */}
          <View className=" h-16 flex-row items-center justify-between px-4">
            <FontAwesome5 name="ambulance" size={24} color="black" />

            <View>
              <Text className="text-2xl font-bold text-center text-black">
                Dashboard
              </Text>
            </View>

            <View className="flex-row items-center gap-4">
              <Pressable onPress={handleLogout}>
                <MaterialIcons name="logout" size={28} color="black" />
              </Pressable>
            </View>
          </View>

          <View className="items-center ">
            <RescuerCard />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
