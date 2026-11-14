import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_REPORT_ID_KEY = "last_active_report_id";
const ACTIVE_REPORT_NUMBER_KEY = "last_active_report_number";

export async function clearUnavailableReportTracking(reportId: string) {
  if ((await AsyncStorage.getItem(ACTIVE_REPORT_ID_KEY)) !== reportId) {
    return false;
  }

  await AsyncStorage.multiRemove([
    ACTIVE_REPORT_ID_KEY,
    `last_active_report_status:${reportId}`,
  ]);

  const storedNumber = await AsyncStorage.getItem(ACTIVE_REPORT_NUMBER_KEY);
  if (storedNumber) {
    try {
      const parsed: unknown = JSON.parse(storedNumber);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "reportId" in parsed &&
        parsed.reportId === reportId
      ) {
        await AsyncStorage.removeItem(ACTIVE_REPORT_NUMBER_KEY);
      }
    } catch (error) {
      console.error("Could not parse the stored report number:", error);
    }
  }

  return true;
}
