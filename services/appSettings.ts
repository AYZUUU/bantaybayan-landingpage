import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";

const HOTLINE_CACHE_KEY = "hotline_number_cache";
const BUILD_TIME_HOTLINE = (process.env.EXPO_PUBLIC_HOTLINE_NUMBER || "").trim();

export async function getCachedHotlineNumber() {
  try {
    const cached = await AsyncStorage.getItem(HOTLINE_CACHE_KEY);
    return cached || BUILD_TIME_HOTLINE;
  } catch {
    return BUILD_TIME_HOTLINE;
  }
}

// Fetched while online and cached so the SMS fallback still works offline.
export async function refreshHotlineNumber() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "hotline_number")
    .maybeSingle();
  if (error || !data) return null;
  const value = String(data.value ?? "").trim();
  await AsyncStorage.setItem(HOTLINE_CACHE_KEY, value);
  return value;
}
