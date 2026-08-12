import React from "react";
import { View, Text, Pressable } from "react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

export interface Report {
  id: string | number;
  emergency_type?: string; 
  accident_level?: string; 
  reporter_name?: string;  
  latitude?: number;
  longitude?: number;
  description?: string;
  created_at?: string; // Optional: If your DB sends a timestamp
}

interface RescuerCardProps {
  recentReports: Report[];
  // 1. ADD THIS PROP so the card can talk to the main screen
  onViewDetails?: (report: Report) => void; 
}

export default function RescuerCard({ recentReports, onViewDetails }: RescuerCardProps) {
  return (
    <View className="w-full">
      <Text className="text-lg font-bold text-gray-800 mb-4 mt-6">Recent Reports</Text>
      
      {recentReports.map((report, index) => (
        <View key={report.id || index} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <View className="bg-red-100 p-3 rounded-full mr-4">
              <FontAwesome5 name="exclamation-circle" size={24} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {report.emergency_type || "Unknown Emergency"}
              </Text>
              <Text className="text-sm text-orange-600 font-bold mt-1">
                Severity: {report.accident_level || "Unspecified"}
              </Text>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-gray-500 text-sm flex-1" numberOfLines={1}>
              Reported by: {report.reporter_name || "Anonymous"}
            </Text>
          </View>

          {/* 2. ADD THE BUTTON HERE */}
          <Pressable 
            onPress={() => onViewDetails && onViewDetails(report)}
            className="bg-gray-100 mt-4 py-3 rounded-xl items-center border border-gray-200"
          >
            <Text className="text-gray-700 font-bold text-base">View Details</Text>
          </Pressable>

        </View>
      ))}
    </View>
  );
}