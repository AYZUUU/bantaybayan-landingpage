import React from "react";
import { Platform, Text, View } from "react-native";
import { MapView, Marker } from "./MapComponents";
import OSMTileLayer, { OSM_ATTRIBUTION } from "./OSMTileLayer";
import OpenStreetMap from "./OpenStreetMap.dom";

type Coordinates = { latitude: number; longitude: number };

type Props = {
  location: Coordinates;
  draggable?: boolean;
  interactive?: boolean;
  title?: string;
  description?: string;
  followLocation?: boolean;
  onLocationChange?: (location: Coordinates) => void;
};

export default function LocationMap({ location, draggable = false, interactive = true, title, description, followLocation = false, onLocationChange }: Props) {
  if (Platform.OS === "android") {
    return (
      <OpenStreetMap
        location={location}
        draggable={draggable}
        title={title}
        description={description}
        followLocation={followLocation}
        tileUrl={process.env.EXPO_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        onLocationChange={async (point) => onLocationChange?.(point)}
        dom={{ style: { width: "100%", height: "100%" }, scrollEnabled: false }}
      />
    );
  }

  return (
    <View style={{ width: "100%", height: "100%" }}>
      <MapView
        style={{ width: "100%", height: "100%" }}
        initialRegion={{ ...location, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        region={followLocation ? { ...location, latitudeDelta: 0.005, longitudeDelta: 0.005 } : undefined}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
      >
        <OSMTileLayer />
        <Marker
          coordinate={location}
          pinColor="#be123c"
          draggable={draggable}
          title={title}
          description={description}
          onDragEnd={(event) => onLocationChange?.(event.nativeEvent.coordinate)}
        />
      </MapView>
      <Text pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 22, backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 5, color: "#374151", fontSize: 10 }}>
        {OSM_ATTRIBUTION}
      </Text>
    </View>
  );
}
