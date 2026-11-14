import * as Location from "expo-location";

export interface PlaceName {
  municipality: string | null;
  province: string | null;
}

export async function lookupPlaceName(
  latitude: number,
  longitude: number,
): Promise<PlaceName> {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    if (!address) return { municipality: null, province: null };
    return {
      municipality: address.city || address.district || null,
      province: address.subregion || address.region || null,
    };
  } catch (error) {
    console.error("Could not look up the place name:", error);
    return { municipality: null, province: null };
  }
}
