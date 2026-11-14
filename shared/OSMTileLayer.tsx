import React from "react";
import { UrlTile } from "./MapComponents";

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

export default function OSMTileLayer() {
  const tileUrl =
    process.env.EXPO_PUBLIC_OSM_TILE_URL ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return <UrlTile urlTemplate={tileUrl} maximumZ={19} tileSize={256} />;
}
