import { supabase } from "./supabase";

export interface ReportRecord {
  id: number;
  user_id: string | null;
  reporter_name: string | null;
  contact_number: string | null;
  emergency_type: string | null;
  accident_level: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  image_path: string | null;
  status: string;
  assigned_responder_id: string | null;
  municipality: string | null;
  province: string | null;
  created_at: string;
  backup_requested_at?: string | null;
}

export interface ReportStatus {
  id: number;
  status: string;
  assigned_responder_id: string | null;
  assigned_responder_name: string | null;
  assigned_responder_station: string | null;
}

type ResponderReportRecord = Pick<
  ReportRecord,
  | "id"
  | "reporter_name"
  | "contact_number"
  | "emergency_type"
  | "accident_level"
  | "status"
  | "latitude"
  | "longitude"
  | "municipality"
  | "province"
  | "description"
  | "image_path"
  | "created_at"
  | "assigned_responder_id"
  | "backup_requested_at"
>;

const signedImageUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const signedImageUrlRequests = new Map<string, Promise<string>>();
const SIGNED_IMAGE_URL_CACHE_TTL_MS = 55 * 60 * 1000;
const MAX_SIGNED_IMAGE_URL_CACHE_ENTRIES = 200;

export class ReportStatusUnavailableError extends Error {
  constructor() {
    super("This report is no longer available to track.");
    this.name = "ReportStatusUnavailableError";
  }
}

function throwSupabaseError(error: { message: string }) {
  throw new Error(error.message);
}

function notifyReportEvent(
  event: "report_created" | "report_claimed" | "backup_requested",
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

function imageDetails(uri: string) {
  const extension = uri.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  const formats: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = extension ? formats[extension] : undefined;
  if (!extension || !contentType) {
    throw new Error("Choose a JPG, PNG, GIF, or WebP image.");
  }
  return { extension, contentType };
}

async function uploadEvidence(userId: string, imageUri: string) {
  const { extension, contentType } = imageDetails(imageUri);
  const response = await fetch(imageUri);
  if (!response.ok) throw new Error("Could not read the selected report image.");
  const image = await response.blob();
  const objectPath = `${userId}/report_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;
  const { data, error } = await supabase.storage
    .from("incident-evidence")
    .upload(objectPath, image, { contentType, upsert: false });
  if (error) throw new Error(`Could not upload report image: ${error.message}`);
  return data.path;
}

async function addSignedImageUrl<
  T extends Pick<ReportRecord, "id" | "image_path">,
>(
  report: T,
): Promise<T> {
  if (!report.image_path) return report;
  const imagePath = report.image_path;
  const cachedImage = signedImageUrlCache.get(imagePath);
  if (cachedImage && cachedImage.expiresAt > Date.now()) {
    return { ...report, image_path: cachedImage.url };
  }

  let request = signedImageUrlRequests.get(imagePath);
  if (!request) {
    request = (async () => {
      const { data, error } = await supabase.storage
        .from("incident-evidence")
        .createSignedUrl(imagePath, 60 * 60);
      if (error) throw new Error(error.message);
      if (!data?.signedUrl) throw new Error("Supabase returned no signed image URL.");

      const now = Date.now();
      for (const [path, cached] of signedImageUrlCache) {
        if (cached.expiresAt <= now) signedImageUrlCache.delete(path);
      }
      while (signedImageUrlCache.size >= MAX_SIGNED_IMAGE_URL_CACHE_ENTRIES) {
        const oldestPath = signedImageUrlCache.keys().next().value;
        if (oldestPath === undefined) break;
        signedImageUrlCache.delete(oldestPath);
      }
      signedImageUrlCache.set(imagePath, {
        url: data.signedUrl,
        expiresAt: now + SIGNED_IMAGE_URL_CACHE_TTL_MS,
      });
      return data.signedUrl;
    })().finally(() => signedImageUrlRequests.delete(imagePath));
    signedImageUrlRequests.set(imagePath, request);
  }

  try {
    return { ...report, image_path: await request };
  } catch (error) {
    console.error(`Could not load evidence for report ${report.id}:`, error);
    return { ...report, image_path: null };
  }
}

export async function getCitizenReports(userId: string) {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, user_id, reporter_name, contact_number, emergency_type, accident_level, description, latitude, longitude, image_path, status, assigned_responder_id, municipality, province, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throwSupabaseError(error);
  if (!data) throw new Error("Supabase returned no citizen report data.");
  return Promise.all((data as ReportRecord[]).map(addSignedImageUrl));
}

export async function getResponderLiveLocation(reportId: number) {
  const { data, error } = await supabase.rpc("get_responder_live_location", {
    p_report_id: reportId,
  });
  if (error) throw new Error(`Could not load rescuer location: ${error.message}`);
  if (!Array.isArray(data)) throw new Error("The server returned an invalid rescuer location.");
  if (data.length === 0) return null;
  const location: unknown = data[0];
  if (
    typeof location !== "object" || location === null ||
    !("latitude" in location) || typeof location.latitude !== "number" ||
    !("longitude" in location) || typeof location.longitude !== "number" ||
    !("updated_at" in location) || typeof location.updated_at !== "string"
  ) {
    throw new Error("The server returned an invalid rescuer location.");
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: location.updated_at,
  };
}

export async function getResponderReports() {
  const baseColumns =
    "id, reporter_name, contact_number, emergency_type, accident_level, status, latitude, longitude, municipality, province, description, image_path, created_at, assigned_responder_id";
  const buildQuery = (columns: string) =>
    supabase
      .from("reports")
      .select(columns)
      .not("status", "ilike", "%resolved%")
      .order("created_at", { ascending: false })
      .limit(50);

  let { data, error } = await buildQuery(`${baseColumns}, backup_requested_at`);
  if (error) {
    // The backup column is missing until migration 007 is applied.
    ({ data, error } = await buildQuery(baseColumns));
  }
  if (error) throwSupabaseError(error);
  if (!data) throw new Error("Supabase returned no responder report data.");
  return Promise.all(
    (data as unknown as ResponderReportRecord[]).map(addSignedImageUrl),
  );
}

export async function getReportStatus(reportId: string | number) {
  const { data, error } = await supabase.rpc("get_report_status", {
    p_report_id: Number(reportId),
  });
  if (error) {
    if (
      error.code === "P0001" &&
      error.message.toLowerCase().includes("report not found or access denied")
    ) {
      throw new ReportStatusUnavailableError();
    }
    throwSupabaseError(error);
  }
  if (!data?.length) throw new ReportStatusUnavailableError();
  return data[0] as ReportStatus;
}

export async function submitReport(input: {
  userId: string;
  reporterName: string;
  emergencyType: string;
  accidentLevel: string;
  latitude: number;
  longitude: number;
  municipality?: string | null;
  province?: string | null;
  imageUri?: string | null;
}) {
  let uploadedPath: string | null = null;
  if (input.imageUri) uploadedPath = await uploadEvidence(input.userId, input.imageUri);

  const { data: profile } = await supabase
    .from("profiles")
    .select("contact_number")
    .eq("id", input.userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: input.userId,
      reporter_name: input.reporterName,
      contact_number: profile?.contact_number || null,
      emergency_type: input.emergencyType,
      accident_level: input.accidentLevel,
      latitude: input.latitude,
      longitude: input.longitude,
      municipality: input.municipality || null,
      province: input.province || null,
      image_path: uploadedPath,
      status: "Pending",
    })
    .select("id")
    .single();

  if (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("incident-evidence")
        .remove([uploadedPath]);
      if (cleanupError) {
        console.error("Could not remove unreferenced report image:", cleanupError);
      }
    }
    throwSupabaseError(error);
  }
  if (!data) throw new Error("Supabase did not return the saved report ID.");
  notifyReportEvent("report_created", data.id);
  return data.id as number;
}

export async function submitAnonymousQuickReport(
  latitude: number,
  longitude: number,
) {
  const { data, error } = await supabase.functions.invoke(
    "submit-quick-report",
    { body: { latitude, longitude } },
  );
  if (error) {
    const responseMessage =
      typeof error.context === "object" &&
      error.context !== null &&
      "json" in error.context &&
      typeof error.context.json === "function"
        ? await error.context.json().catch(() => null)
        : null;
    const message =
      typeof responseMessage === "object" &&
      responseMessage !== null &&
      "error" in responseMessage &&
      typeof responseMessage.error === "string"
        ? responseMessage.error
        : error.message;
    throw new Error(message || "Could not send your quick alert.");
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("reportId" in data) ||
    typeof data.reportId !== "number"
  ) {
    throw new Error("The server did not confirm the quick report.");
  }
  return data.reportId;
}

export async function respondToReport(
  reportId: string | number,
) {
  const { data, error } = await supabase.rpc("respond_to_report", {
    report_id: Number(reportId),
  });

  if (error) throwSupabaseError(error);
  if (!data) {
    throw new Error("This incident was already claimed or is no longer available.");
  }
  notifyReportEvent("report_claimed", Number(reportId));
}

export async function requestReportBackup(
  reportId: string | number,
  note?: string,
) {
  const { data, error } = await supabase.rpc("request_report_backup", {
    report_id: Number(reportId),
    note: note?.trim() || null,
  });

  if (error) throwSupabaseError(error);
  if (!data) {
    throw new Error("Only the assigned responder can request backup for an open incident.");
  }
  notifyReportEvent("backup_requested", Number(reportId));
}
