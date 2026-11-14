import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  return address && address.length <= 128 ? address : null;
}

async function hashAddress(address: string, secret: string) {
  const bytes = new TextEncoder().encode(`${secret}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Quick-report function environment is incomplete.");
    return respond(500, { error: "Quick reporting is not configured." });
  }

  const address = clientAddress(request);
  if (!address) {
    return respond(503, {
      error: "Could not verify this network for an anonymous quick report.",
    });
  }

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return respond(400, { error: "Invalid quick-report request." });
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("latitude" in payload) ||
      !("longitude" in payload) ||
      typeof payload.latitude !== "number" ||
      typeof payload.longitude !== "number" ||
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90 ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      return respond(400, { error: "A valid GPS location is required." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const requestKey = await hashAddress(address, serviceRoleKey);
    const { data: allowed, error: limitError } = await adminClient.rpc(
      "consume_quick_report_rate_limit",
      {
        p_request_key: requestKey,
        p_limit: 5,
        p_window_seconds: 3600,
      },
    );
    if (limitError) throw limitError;
    if (allowed !== true) {
      return respond(429, {
        error: "This network has reached the quick-report limit. Please call your local emergency service if this is urgent.",
      });
    }

    const { data: report, error: reportError } = await adminClient
      .from("reports")
      .insert({
        user_id: null,
        reporter_name: "Anonymous",
        emergency_type: "Urgent",
        accident_level: "Critical",
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: "Pending",
      })
      .select("id")
      .single();
    if (reportError) throw reportError;
    if (!report) throw new Error("Supabase returned no quick-report ID.");

    try {
      const notificationResponse = await fetch(
        `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/notify-report-event`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "report_created",
            reportId: report.id,
          }),
        },
      );
      if (!notificationResponse.ok) {
        console.error(
          "Could not notify responders about anonymous quick report:",
          notificationResponse.status,
        );
      }
    } catch (error) {
      console.error("Could not notify responders about anonymous quick report:", error);
    }

    return respond(200, { reportId: report.id });
  } catch (error) {
    console.error(
      "Anonymous quick-report submission failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return respond(500, { error: "Could not send your quick alert." });
  }
});
