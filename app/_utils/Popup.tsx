import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

interface LocationPopupProps {
  visible: boolean;
  onClose: () => void;
  address?: string;
}

export default function LocationPopup({
  visible,
  onClose,
  address,
}: LocationPopupProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-5">
        <View className="bg-white w-full rounded-[28px] p-5 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-extrabold text-gray-900">
              Your Location
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <FontAwesome6 name="xmark" size={22} color="#4b5563" />
            </Pressable>
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-sm font-semibold text-gray-500 mb-1">
              Your Location
            </Text>
            <Text
              className="text-base font-bold text-gray-800"
              numberOfLines={2}
            >
              {address || "Fetching location..."}
            </Text>
          </View>

          <Pressable className="bg-red-50 flex-row justify-center items-center h-14 rounded-2xl mb-3">
            <Text className="text-red-700 font-bold text-lg">
              Copy My Location
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
