import { supabase } from "./supabase";
import { getCachedSignedStorageUrl } from "./storageUrls";

export interface AdminReport {
  id: number;
  user_id: string | null;
  emergency_type: string | null;
  accident_level: string | null;
  reporter_name: string | null;
  contact_number: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  municipality: string | null;
  province: string | null;
  status: string;
  created_at: string;
  image_path: string | null;
  assigned_responder_id: string | null;
  backup_requested_at: string | null;
  backup_note: string | null;
}

export interface ActiveResponder {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
}

export interface ResponderLiveLocation {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

function notifyReportEvent(
  event: "report_assigned" | "report_resolved",
  reportId: number,
) {
  void supabase.functions
    .invoke("notify-report-event", { body: { event, reportId } })
    .then(({ error }) => {
      if (error) console.error(`Could not send ${event} notification:`, error);
    })
    .catch((error: unknown) => {
      console.error(`Could not send ${event} notification:`, error);
    });
}

const BASE_REPORT_COLUMNS =
  "id, user_id, emergency_type, accident_level, reporter_name, contact_number, description, latitude, longitude, municipality, province, status, created_at, image_path, assigned_responder_id";

export async function getReporterIdPhoto(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id_photo_path")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load reporter identification: ${error.message}`);
  if (!data) throw new Error("Reporter account is unavailable.");
  if (!data.id_photo_path) return null;
  return getCachedSignedStorageUrl("id-photos", data.id_photo_path);
}

export async function getAdminReports(): Promise<AdminReport[]> {
  let { data, error } = await supabase
    .from("reports")
    .select(`${BASE_REPORT_COLUMNS}, backup_requested_at, backup_note`)
    .order("created_at", { ascending: false });
  if (error) {
    // Backup columns are missing until migration 007 is applied.
    console.warn("Falling back to report columns without backup data:", error.message);
    const fallback = await supabase
      .from("reports")
      .select(BASE_REPORT_COLUMNS)
      .order("created_at", { ascending: false });
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Supabase returned no report data.");

  return Promise.all(
    (data as unknown as AdminReport[]).map(async (report) => {
      if (!report.image_path) return report;
      try {
        const imageUrl = await getCachedSignedStorageUrl(
          "incident-evidence",
          report.image_path,
        );
        return { ...report, image_path: imageUrl };
      } catch (error) {
        console.error(
          `Could not create a signed URL for report ${report.id}:`,
          error,
        );
        return { ...report, image_path: null };
      }
    }),
  );
}

export async function getActiveResponders(): Promise<ActiveResponder[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, contact_number")
    .eq("role", "responder")
    .eq("status", "active")
    .order("first_name", { ascending: true });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Supabase returned no responder data.");
  return data as ActiveResponder[];
}

export async function getAdminResponderLiveLocation(
  reportId: number,
): Promise<ResponderLiveLocation | null> {
  const { data, error } = await supabase.rpc("get_responder_live_location", {
    p_report_id: reportId,
  });
  if (error) throw new Error(`Could not load rescuer location: ${error.message}`);
  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid rescuer location.");
  }
  if (data.length === 0) return null;

  const location: unknown = data[0];
  if (
    typeof location !== "object" ||
    location === null ||
    !("latitude" in location) ||
    typeof location.latitude !== "number" ||
    !("longitude" in location) ||
    typeof location.longitude !== "number" ||
    !("updated_at" in location) ||
    typeof location.updated_at !== "string"
  ) {
    throw new Error("The server returned an invalid rescuer location.");
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: location.updated_at,
  };
}

export async function updateAdminReport(
  reportId: number,
  status: string,
  responderId?: string,
) {
  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      ...(responderId ? { assigned_responder_id: responderId } : {}),
    })
    .eq("id", reportId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The incident was not available to update.");
  if (responderId) {
    notifyReportEvent("report_assigned", reportId);
  } else if (status.toLowerCase().includes("resolved")) {
    notifyReportEvent("report_resolved", reportId);
  }
}
