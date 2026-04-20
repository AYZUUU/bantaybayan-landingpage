import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Card() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <Pressable
      className="bg-white rounded-xl p-10 m-2 shadow-md"
      onPress={toggleCard}
    >
      <Text className="text-lg font-bold">Your Reports</Text>
      <Text className="text-gray-500 mt-1">Track your emergency reports</Text>

      {isExpanded && (
        <View className="mt-4 pt-4 border-t border-gray-200">
          <Text className="text-gray-600 mb-2">
            • Suspicious activity on 5th Ave
          </Text>
          <Text className="text-gray-600 mb-2">
            • Noise complaint at Building B
          </Text>
          <Text className="text-gray-600">
            • Stray dog reported near the park
          </Text>
        </View>
      )}

      <View className="mt-3 items-center">
        <FontAwesome6 name={isExpanded ? "angle-up" : "angle-down"} size={28} />
      </View>
    </Pressable>
  );
}
