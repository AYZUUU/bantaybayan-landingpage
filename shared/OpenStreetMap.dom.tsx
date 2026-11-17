"use dom";

import type { DOMProps } from "expo/dom";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };

type Props = {
  location: Coordinates;
  draggable: boolean;
  tileUrl: string;
  title?: string;
  description?: string;
  followLocation?: boolean;
  onLocationChange?: (location: Coordinates) => Promise<void>;
  dom?: DOMProps;
};

export default function OpenStreetMap({
  location,
  draggable,
  tileUrl,
  title,
  description,
  followLocation = false,
  onLocationChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const locationRef = useRef(location);
  const changeRef = useRef(onLocationChange);
  const [error, setError] = useState("");

  useEffect(() => {
    locationRef.current = location;
    const previous = markerRef.current?.getLatLng();
    markerRef.current?.setLatLng([location.latitude, location.longitude]);
    if (followLocation && previous &&
      (previous.lat !== location.latitude || previous.lng !== location.longitude)) {
      mapRef.current?.panTo([location.latitude, location.longitude]);
    }
  }, [followLocation, location]);

  useEffect(() => {
    changeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;
      const current = locationRef.current;
      const map = L.map(containerRef.current).setView(
        [current.latitude, current.longitude],
        17,
      );
      mapRef.current = map;
      const tiles = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      tiles.on("tileerror", () => setError("Map tiles could not load. Check your connection."));
      tiles.on("tileload", () => setError(""));

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:24px;height:24px;background:#be123c;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px #0008"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      const marker = L.marker([current.latitude, current.longitude], {
        draggable,
        icon,
      }).addTo(map);
      markerRef.current = marker;
      if (title || description) {
        const content = document.createElement("div");
        if (title) {
          const heading = document.createElement("strong");
          heading.textContent = title;
          content.appendChild(heading);
        }
        if (description) {
          const detail = document.createElement("div");
          detail.textContent = description;
          content.appendChild(detail);
        }
        marker.bindPopup(content);
      }
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        void changeRef.current?.({ latitude: point.lat, longitude: point.lng }).catch((err: unknown) => {
          console.error("Could not update the selected location:", err);
          setError("Could not update the selected location. Try again.");
        });
      });
    }).catch((err: unknown) => {
      console.error("Could not load the map:", err);
      setError("Could not load the map. Please try again.");
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [description, draggable, tileUrl, title]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {error ? (
        <div role="alert" style={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 1000, background: "white", padding: 8, color: "#991b1b", fontSize: 13 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
