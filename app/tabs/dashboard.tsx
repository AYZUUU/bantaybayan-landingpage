import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "../(auth)/auth";
import Card from "../_utils/card";
import WarningPulse from "../_utils/warningpulse";

export default function Dashboard() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn === false) {
      Toast.show({
        type: "error",
        text1: "Unauthorized",
        text2: "Please log in to access the dashboard.",
      });
      router.replace("/");
    }
  }, [isLoggedIn]);

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
          <View className="bg-primary h-16 flex-row items-center justify-between px-4">
            <Image
              source={require("../../assets/images/ambulance.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />

            <View>
              <Text className="text-2xl font-bold text-center">Dashboard</Text>
            </View>

            <View className="flex-row items-center gap-4">
              <Pressable>
                <MaterialIcons name="notifications" size={28} color="black" />
              </Pressable>

              <Pressable onPress={handleLogout}>
                <MaterialIcons name="logout" size={28} color="black" />
              </Pressable>
            </View>
          </View>
          {/* --- HEADER --- */}

          <View className="items-center pt-8 px-4">
            <View className="mb-8">
              <WarningPulse />
            </View>

            <View className="w-full items-center">
              <Card />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
