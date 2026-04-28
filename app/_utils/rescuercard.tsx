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
  accident_type: string;
  accident_level: string;
  reporter_name: string;
  latitude: string;
  longitude: string;
  status: string;
  created_at: string;
  description?: string | null;
}


interface RescuerCard {
  recentReports: Report[];
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


export default function RescuerCard({ recentReports }: RescuerCard) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <Pressable
      className="bg-white rounded-xl p-6 shadow-md border-l-4 border-red-500"
      onPress={toggleCard}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-xl font-bold text-slate-800">Latest Emergencies</Text>
          <Text className="text-gray-500">Showing {recentReports.length} reports</Text>
        </View>
        <View className="bg-red-100 p-3 rounded-full">
          <FontAwesome6 name="triangle-exclamation" size={20} color="#ef4444" />
        </View>
      </View>


      {recentReports.map((report, index) => (
        <View 
          key={report.id} 
        
          className={`py-3 ${index !== recentReports.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-gray-800">{report.accident_type}</Text>
            <Text className="text-sm font-bold text-red-500">{report.accident_level}</Text>
          </View>

          {isExpanded && (
            <View className="mt-2 bg-gray-50 p-3 rounded-lg">
              <Text className="text-gray-600 mb-1">Reporter: {report.reporter_name}</Text>
              <Text className="text-gray-600 mb-1">Time: {report.created_at}</Text>
              <Text className="text-gray-600">Coords: {report.latitude}, {report.longitude}</Text>
            </View>
          )}
        </View>
      ))}

      <View className="mt-2 items-center">
        <FontAwesome6 name={isExpanded ? "angle-up" : "angle-down"} size={24} color="#94a3b8" />
      </View>
    </Pressable>
  );
}