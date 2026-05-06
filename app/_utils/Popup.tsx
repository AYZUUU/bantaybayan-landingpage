import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
interface LocationPopupProps {
  visible: boolean;
  onClose: () => void;
  address?: string;
  location?: { latitude: number; longitude: number } | null;
  

  onLocationChange?: (loc: { latitude: number; longitude: number }) => void;
  isDraggable?: boolean;
  title?: string;
  buttonText?: string;
}

export default function LocationPopup({
  visible,
  onClose,
  address,
  location,
  onLocationChange,
  isDraggable = false,
  title = "Your Location",
  buttonText = "Close",
}: LocationPopupProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-5">
        <View className="bg-white w-full rounded-[28px] p-5 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-extrabold text-gray-900">
              {title}
            </Text>
            <Pressable onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <FontAwesome6 name="xmark" size={20} color="#4b5563" />
            </Pressable>
          </View>

   
          {isDraggable && (
            <Text className="text-gray-500 mb-4 text-sm font-medium">
              Hold and drag the marker to adjust your exact location.
            </Text>
          )}

      
          {location && (
            <View className="h-56 w-full rounded-2xl overflow-hidden border border-gray-200 mb-4">
              <MapView
                style={{ width: "100%", height: "100%" }}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={isDraggable}
                zoomEnabled={isDraggable}
              >
                <Marker
                  coordinate={location}
                  draggable={isDraggable}
                  onDragEnd={(e) => {
                    if (onLocationChange) {
                      onLocationChange(e.nativeEvent.coordinate);
                    }
                  }}
                />
              </MapView>
            </View>
          )}

          <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-sm font-semibold text-gray-500 mb-1">
              Location Data:
            </Text>
            <Text className="text-base font-bold text-gray-800" numberOfLines={2}>
              {address || "Fetching location..."}
            </Text>
          </View>

    
          <Pressable 
            onPress={onClose} 
            className="bg-black flex-row justify-center items-center h-14 rounded-2xl mb-2"
          >
            <Text className="text-white font-bold text-lg">
              {buttonText}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}