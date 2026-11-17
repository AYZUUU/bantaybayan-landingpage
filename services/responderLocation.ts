import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const TASK_NAME = "responder-live-location";
const MAX_LOCATION_AGE_MS = 60_000;

async function sendLocation(location: Location.LocationObject) {
  if (!Number.isFinite(location.timestamp) || Date.now() - location.timestamp > MAX_LOCATION_AGE_MS) {
    throw new Error("The device returned an outdated location.");
  }
  const { data, error } = await supabase.rpc("update_responder_live_location", {
    p_latitude: location.coords.latitude,
    p_longitude: location.coords.longitude,
  });
  if (error) throw new Error(`Could not share location: ${error.message}`);
  if (typeof data !== "number") throw new Error("The server did not confirm location sharing.");
  return data;
}

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        console.error("Background location failed:", error);
        return;
      }
      const location = data?.locations?.at(-1);
      if (!location) {
        console.error("Background location task received no location.");
        return;
      }
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          await stopResponderLocation();
          return;
        }
        const count = await sendLocation(location);
        if (count === 0) await stopResponderLocation();
      } catch (taskError) {
        console.error("Could not update responder location:", taskError);
      }
    },
  );
}

export async function isResponderLocationRunning() {
  return Platform.OS !== "web" && Location.hasStartedLocationUpdatesAsync(TASK_NAME);
}

export async function stopResponderLocation(clearLastLocation = false) {
  const running = await isResponderLocationRunning();
  if (running) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  if (!running && !clearLastLocation) return;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return;
  const { error } = await supabase.rpc("clear_my_responder_live_locations");
  if (error) throw new Error(`Location sharing stopped, but the server could not clear the last position: ${error.message}`);
}

export async function startResponderLocation() {
  if (Platform.OS === "web") {
    throw new Error("Background location sharing is only available in the mobile app.");
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error("Background location sharing is not supported in Expo Go. Use a development or release build.");
  }
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    throw new Error("Location permission is needed to share your position.");
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    throw new Error("Allow location all the time in device settings to share your position in the background.");
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("Turn on device location services before sharing your position.");
  }
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const wasRunning = await isResponderLocationRunning();
  const { data: enabled, error: enableError } = await supabase.rpc("start_responder_location_sharing");
  if (enableError) throw new Error(`Could not enable location sharing: ${enableError.message}`);
  if (enabled !== true) {
    throw new Error("No eligible active citizen response is assigned to you.");
  }
  try {
    if (await sendLocation(location) === 0) {
      throw new Error("No eligible active citizen response is assigned to you.");
    }
    if (!wasRunning) {
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: "Sharing your location",
          notificationBody: "Your location is shared with the citizen during an active response.",
        },
      });
    }
  } catch (error) {
    if (!wasRunning) {
      try {
        await stopResponderLocation(true);
      } catch (cleanupError) {
        console.error("Could not clear the last responder location:", cleanupError);
        throw new Error("Could not start sharing or clear the last position. The last position expires after two minutes.");
      }
    }
    throw error;
  }
}
