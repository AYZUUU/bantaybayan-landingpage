import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function Card() {
  return (
    <Pressable className="bg-white rounded-xl p-10 m-2 shadow-md">
      <Text className="text-lg font-bold">Your Reports</Text>
      <Text className="text-gray-500 mt-1">Track your emergency reports</Text>
      <View className="mt-3 items-center">
        <FontAwesome6 name="angle-down" size={28} />
      </View>
    </Pressable>
  );
}
