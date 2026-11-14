import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type {} from "leaflet.markercluster";
import * as L from "leaflet";
import { divIcon } from "leaflet";
import type { MarkerCluster } from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { useEffect, useRef, useState } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  AttributionControl,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

export interface IncidentMapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  status?: string;
  municipality?: string | null;
  createdAt?: string;
}

export interface MunicipalityBoundaryProperties {
  municipality: string;
  province: string;
}

export type MunicipalityBoundaries = FeatureCollection<
  Geometry,
  MunicipalityBoundaryProperties
>;

interface IncidentMapProps {
  center: [number, number];
  zoom: number;
  markers: IncidentMapMarker[];
  boundaries?: MunicipalityBoundaries | null;
  selectedMunicipality?: string;
  autoFitMarkers?: boolean;
  onMarkerClick?: (id: IncidentMapMarker["id"]) => void;
}

const tileUrl =
  import.meta.env.VITE_OSM_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function getMarkerStatus(status?: string) {
  const normalizedStatus = status?.trim().toLowerCase() || "";
  if (normalizedStatus.includes("resolved")) return "resolved";
  if (normalizedStatus.includes("en route")) return "en-route";
  if (normalizedStatus.includes("dispatched")) return "dispatched";
  return "pending";
}

function getDisplayStatus(status?: string) {
  const markerStatus = getMarkerStatus(status);
  if (markerStatus === "en-route") return "En route";
  return markerStatus.charAt(0).toUpperCase() + markerStatus.slice(1);
}

function createIncidentIcon(status?: string, animationClass = "") {
  const markerStatus = getMarkerStatus(status);
  if (markerStatus === "pending") {
    return divIcon({
      className: `incident-map-pending-marker ${animationClass}`.trim(),
      html: '<span class="incident-map-pending-dot" aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  const markerContent =
    markerStatus === "dispatched" || markerStatus === "en-route"
      ? '<path class="incident-map-pin-shape" d="M12 1C6.48 1 2 5.48 2 11c0 7.1 10 16 10 16s10-8.9 10-16C22 5.48 17.52 1 12 1Z"/><path class="incident-map-pin-vehicle" d="M7.2 9.2h.9l1-2.7h5.8l1 2.7h.9c1 0 1.8.8 1.8 1.8v3.7h-1.3v1.5h-1.8v-1.5h-7v1.5H6.7v-1.5H5.4V11c0-1 .8-1.8 1.8-1.8Zm3-.9-.7 1.9h5l-.7-1.9h-3.6ZM7.9 11a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm8.2 0a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"/>'
      : '<path class="incident-map-pin-shape" d="M12 1C6.48 1 2 5.48 2 11c0 7.1 10 16 10 16s10-8.9 10-16C22 5.48 17.52 1 12 1Z"/><circle cx="12" cy="11" r="3.5"/>';

  return divIcon({
    className: `incident-map-pin incident-map-pin--${markerStatus} ${animationClass}`.trim(),
    html: `<svg viewBox="0 0 24 28" aria-hidden="true">${markerContent}</svg>`,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -34],
  });
}

function createIncidentClusterIcon(cluster: MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? "small" : count < 100 ? "medium" : "large";

  return divIcon({
    html: `<span aria-label="Expand ${count} incidents" aria-expanded="false">${count}</span>`,
    className: `marker-cluster marker-cluster-${size} incident-map-cluster`,
    iconSize: [40, 40],
  });
}

function createExpandedClusterIcon(count: number, closing: boolean) {
  return divIcon({
    html: `<span aria-label="Collapse ${count} incidents" aria-expanded="true">${count}<span aria-hidden="true">×</span></span>`,
    className: `incident-map-expanded-cluster${closing ? " incident-map-marker-exit" : ""}`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function getIncidentMarkerAlt(marker: IncidentMapMarker) {
  return `incident-${marker.id}-${marker.title || "location"}`;
}

function IncidentMarker({
  marker,
  position,
  expanded = false,
  closing = false,
  animationIndex = 0,
  onMarkerClick,
}: {
  marker: IncidentMapMarker;
  position: [number, number];
  expanded?: boolean;
  closing?: boolean;
  animationIndex?: number;
  onMarkerClick?: (id: IncidentMapMarker["id"]) => void;
}) {
  const animationClass = closing
    ? "incident-map-marker-exit"
    : expanded
      ? `incident-map-marker-enter incident-map-marker-enter--${animationIndex % 6}`
      : "";

  return (
    <Marker
      position={position}
      icon={createIncidentIcon(marker.status, animationClass)}
      title={marker.title || "Incident location"}
      alt={getIncidentMarkerAlt(marker)}
    >
      <Popup className="incident-marker-popup">
        <div className="incident-marker-popup-content">
          <div className="incident-marker-popup-heading">
            <strong>{marker.title || "Incident location"}</strong>
            <span
              className={`incident-marker-popup-status incident-marker-popup-status--${getMarkerStatus(marker.status)}`}
            >
              {getDisplayStatus(marker.status)}
            </span>
          </div>
          {marker.municipality && (
            <p className="incident-marker-popup-location">
              {marker.municipality}
            </p>
          )}
          <p className="incident-marker-popup-coordinates">
            {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
          </p>
          {formatMarkerDate(marker.createdAt) && (
            <p className="incident-marker-popup-date">
              {formatMarkerDate(marker.createdAt)}
            </p>
          )}
          {onMarkerClick && (
            <button
              type="button"
              className="incident-marker-popup-action"
              onClick={() => onMarkerClick(marker.id)}
            >
              View incident details
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

interface ExpandedCluster {
  markerIds: IncidentMapMarker["id"][];
  center: [number, number];
  closing: boolean;
}

function ExpandedClusterMarkers({
  expandedCluster,
  markers,
  closing,
  onCollapse,
  onMarkerClick,
}: {
  expandedCluster: ExpandedCluster;
  markers: IncidentMapMarker[];
  closing: boolean;
  onCollapse: () => void;
  onMarkerClick?: (id: IncidentMapMarker["id"]) => void;
}) {
  const map = useMap();
  const count = markers.length;
  const centerPoint = map.project(expandedCluster.center, map.getZoom());

  return (
    <>
      {markers.map((marker, index) => {
        const angle = index * 2.399963229728653;
        const radius = 26 * Math.sqrt(index + 1);
        const position = map.unproject(
          centerPoint.add(
            L.point(Math.cos(angle) * radius, Math.sin(angle) * radius),
          ),
          map.getZoom(),
        );

        return (
          <IncidentMarker
            key={marker.id}
            marker={marker}
            position={[position.lat, position.lng]}
            expanded
            closing={closing}
            animationIndex={index}
            onMarkerClick={onMarkerClick}
          />
        );
      })}
      <Marker
        position={expandedCluster.center}
        icon={createExpandedClusterIcon(count, closing)}
        keyboard
        title={`Collapse ${count} incidents`}
        eventHandlers={{ click: closing ? undefined : onCollapse }}
      />
    </>
  );
}

function formatMarkerDate(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function MapViewUpdater({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const latitude = center[0];
  const longitude = center[1];

  useEffect(() => {
    map.setView([latitude, longitude], zoom);
  }, [latitude, longitude, map, zoom]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const invalidateMapSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
      });
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(invalidateMapSize);

    resizeObserver?.observe(container);
    window.addEventListener("resize", invalidateMapSize);
    invalidateMapSize();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", invalidateMapSize);
      cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function MapMarkerBoundsUpdater({
  markers,
  enabled,
}: {
  markers: IncidentMapMarker[];
  enabled: boolean;
}) {
  const map = useMap();
  const lastFitSignature = useRef<string | null>(null);
  const markerSignature = JSON.stringify(
    markers.map(({ id, latitude, longitude }) => [id, latitude, longitude]),
  );

  useEffect(() => {
    if (!enabled || markers.length === 0) return;
    if (markerSignature === lastFitSignature.current) return;

    lastFitSignature.current = markerSignature;
    const bounds = L.latLngBounds(
      markers.map((marker) => [marker.latitude, marker.longitude]),
    );
    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 12,
      animate: false,
    });
  }, [enabled, map, markerSignature, markers]);

  return null;
}

function MapBoundaryBoundsUpdater({
  boundaries,
  enabled,
}: {
  boundaries: MunicipalityBoundaries | null;
  enabled: boolean;
}) {
  const map = useMap();
  const lastFitSignature = useRef<string | null>(null);
  const boundarySignature = JSON.stringify(
    boundaries?.features.map((feature) => feature.properties.municipality) ?? [],
  );

  useEffect(() => {
    if (!enabled || !boundaries?.features.length) {
      lastFitSignature.current = null;
      return;
    }
    if (boundarySignature === lastFitSignature.current) return;

    lastFitSignature.current = boundarySignature;
    const bounds = L.geoJSON(boundaries).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 12,
        animate: false,
      });
    }
  }, [boundaries, boundarySignature, enabled, map]);

  return null;
}

export default function IncidentMap({
  center,
  zoom,
  markers,
  boundaries,
  selectedMunicipality = "all",
  autoFitMarkers = false,
  onMarkerClick,
}: IncidentMapProps) {
  const [expandedCluster, setExpandedCluster] =
    useState<ExpandedCluster | null>(null);
  useEffect(() => {
    if (!expandedCluster?.closing) return;

    const timeout = window.setTimeout(() => setExpandedCluster(null), 150);
    return () => window.clearTimeout(timeout);
  }, [expandedCluster]);

  const activeExpandedCluster = expandedCluster
    ? {
        ...expandedCluster,
        markerIds: expandedCluster.markerIds.filter((id) =>
          markers.some((marker) => marker.id === id),
        ),
      }
    : null;
  const visibleExpandedCluster =
    activeExpandedCluster?.markerIds.length ? activeExpandedCluster : null;
  const expandedMarkers = visibleExpandedCluster
    ? markers.filter((marker) =>
        visibleExpandedCluster.markerIds.includes(marker.id),
      )
    : [];
  const highlightedBoundaries = boundaries
    ? {
        ...boundaries,
        features: boundaries.features.filter(
          (feature) =>
            selectedMunicipality === "all" ||
            feature.properties.municipality === selectedMunicipality,
        ),
      }
    : null;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      attributionControl={false}
      className="incident-map h-full w-full"
    >
      <MapViewUpdater center={center} zoom={zoom} />
      <MapResizeHandler />
      <MapMarkerBoundsUpdater markers={markers} enabled={autoFitMarkers} />
      <MapBoundaryBoundsUpdater
        boundaries={highlightedBoundaries}
        enabled={selectedMunicipality !== "all" && markers.length === 0}
      />
      <AttributionControl prefix={false} />
      <TileLayer
        attribution={tileAttribution}
        url={tileUrl}
      />
      {highlightedBoundaries && (
        <GeoJSON
          key={selectedMunicipality}
          data={highlightedBoundaries}
          interactive={false}
          style={{
            color: selectedMunicipality === "all" ? "#15803d" : "#166534",
            weight: selectedMunicipality === "all" ? 2 : 3,
            fillColor: selectedMunicipality === "all" ? "#22c55e" : "#16a34a",
            fillOpacity: selectedMunicipality === "all" ? 0.12 : 0.2,
          }}
        />
      )}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom={false}
        zoomToBoundsOnClick={false}
        iconCreateFunction={createIncidentClusterIcon}
        onClick={(event) => {
          if (!(event.layer instanceof L.MarkerCluster)) return;

          const markersByAlt = new Map(
            markers.map((marker) => [getIncidentMarkerAlt(marker), marker]),
          );
          const clusterMarkers = event.layer
            .getAllChildMarkers()
            .flatMap((childMarker) => {
              const marker = childMarker.options.alt
                ? markersByAlt.get(childMarker.options.alt)
                : undefined;
              return marker ? [marker] : [];
            });
          const clusterCenter = event.layer.getLatLng();

          if (clusterMarkers.length > 1) {
            setExpandedCluster({
              markerIds: clusterMarkers.map((marker) => marker.id),
              center: [clusterCenter.lat, clusterCenter.lng],
              closing: false,
            });
          }
        }}
      >
        {markers
          .filter(
            (marker) =>
              !visibleExpandedCluster?.markerIds.includes(marker.id),
          )
          .map((marker) => (
            <IncidentMarker
              key={marker.id}
              marker={marker}
              position={[marker.latitude, marker.longitude]}
              onMarkerClick={onMarkerClick}
            />
          ))}
      </MarkerClusterGroup>
      {visibleExpandedCluster && (
        <ExpandedClusterMarkers
          expandedCluster={visibleExpandedCluster}
          markers={expandedMarkers}
          closing={visibleExpandedCluster.closing}
          onCollapse={() =>
            setExpandedCluster((current) =>
              current ? { ...current, closing: true } : null,
            )
          }
          onMarkerClick={onMarkerClick}
        />
      )}
    </MapContainer>
  );
}
