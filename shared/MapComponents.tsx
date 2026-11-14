import React from "react";
import { Platform, Text, View } from "react-native";

type NativeMapModule = typeof import("react-native-maps");
type MapViewProps = React.ComponentProps<NativeMapModule["default"]>;
type MarkerProps = React.ComponentProps<NativeMapModule["Marker"]>;
type UrlTileProps = React.ComponentProps<NativeMapModule["UrlTile"]>;

function getNativeMapModule(): NativeMapModule {
  // Loaded lazily so the native-only module is never evaluated on web.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-maps") as NativeMapModule;
}

export function MapView(props: MapViewProps) {
  if (Platform.OS === "web") {
    return (
      <View
        style={props.style}
        accessibilityRole="image"
        accessibilityLabel="Interactive map available in the mobile app"
      >
        <Text>Open the mobile app to view this interactive map.</Text>
      </View>
    );
  }

  const NativeMapView = getNativeMapModule().default;
  return <NativeMapView {...props} />;
}

export function Marker(props: MarkerProps) {
  if (Platform.OS === "web") return null;
  const NativeMarker = getNativeMapModule().Marker;
  return <NativeMarker {...props} />;
}

export function UrlTile(props: UrlTileProps) {
  if (Platform.OS === "web") return null;
  const NativeUrlTile = getNativeMapModule().UrlTile;
  return <NativeUrlTile {...props} />;
}
