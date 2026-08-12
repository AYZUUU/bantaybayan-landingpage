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


export interface Report {
  id: string;

  accident_level: string;
  status: string;
  created_at: string;
}


interface CardProps {
  userReports: Report[];
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


export default function Card({ userReports }: CardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <Pressable
      className="bg-white rounded-xl p-8 m-2 shadow-md"
      onPress={toggleCard}
    >
      <Text className="text-lg font-bold">Your Reports</Text>
      <Text className="text-gray-500 mt-1">Track your emergency reports</Text>

      {isExpanded && (
        <View className="mt-4 pt-4 border-t border-gray-200">
          
        
          {userReports && userReports.length > 0 ? (
            userReports.map((report) => (
              <View key={report.id} className="mb-3">
                <Text className="text-gray-800 font-bold">
                </Text>
                <Text className="text-gray-500 ml-3 text-sm">
                  Status: {report.status} | Time: {report.created_at}
                </Text>
              </View>
            ))
          ) : (
           
            <Text className="text-gray-500 italic text-center py-2">
              You haven't submitted any reports yet.
            </Text>
          )}

        </View>
      )}

      <View className="mt-3 items-center">
        <FontAwesome6 name={isExpanded ? "angle-up" : "angle-down"} size={28} />
      </View>
    </Pressable>
  );
}