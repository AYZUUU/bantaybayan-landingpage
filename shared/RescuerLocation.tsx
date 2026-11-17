import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getResponderLiveLocation } from "../services/reports";
import LocationMap from "./LocationMap";
import { useActivePolling } from "./useActivePolling";

type Props = {
  reportId: number;
  enabled: boolean;
  isDark: boolean;
};

export default function RescuerLocation({ reportId, enabled, isDark }: Props) {
  const [result, setResult] = useState<{
    reportId: number;
    location: Awaited<ReturnType<typeof getResponderLiveLocation>>;
    error: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const location = await getResponderLiveLocation(reportId);
      setResult({ reportId, location, error: false });
    } catch (error) {
      console.error("Could not load rescuer location:", error);
      setResult({ reportId, location: null, error: true });
    }
  }, [reportId]);

  useActivePolling(enabled, refresh, 10000);

  useEffect(() => {
    if (!result?.location) return;
    const { reportId: resultReportId, location } = result;
    const remaining = Date.parse(location.updatedAt) + 120000 - Date.now();
    const timeout = setTimeout(() => {
      setResult((current) =>
        current?.reportId === resultReportId && current.location?.updatedAt === location.updatedAt
          ? { reportId: resultReportId, location: null, error: false }
          : current,
      );
    }, Math.max(0, remaining));
    return () => clearTimeout(timeout);
  }, [result]);

  const location = result?.reportId === reportId ? result.location : null;
  const message = result?.reportId === reportId && result.error
    ? "Could not load the rescuer's location. Trying again."
    : "Location is unavailable until an assigned rescuer shares it.";

  return (
    <>
      {location ? (
        <>
          <View style={styles.map}>
            <LocationMap location={location} followLocation title="Rescuer" />
          </View>
          <Text style={[styles.text, isDark && styles.darkText]}>
            Updated {new Date(location.updatedAt).toLocaleTimeString()}
          </Text>
        </>
      ) : (
        <Text style={[styles.text, isDark && styles.darkText]}>{message}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 240,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  text: { fontSize: 14, color: "#111827", marginTop: 4 },
  darkText: { color: "#f8fafc" },
});
