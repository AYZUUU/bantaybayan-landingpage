import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LEVELS = ["Low", "Medium", "High", "Critical"];
const MAX_MESSAGE_LENGTH = 600;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Accepts Globe Labs inbound JSON, or a flat { from, message } / { From, Body } payload.
async function readSms(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let data: Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    data = await request.json();
  } else {
    const form = await request.formData();
    data = Object.fromEntries(form.entries());
  }

  const globe = (data.inboundSMSMessageList as
    | { inboundSMSMessage?: Record<string, unknown>[] }
    | undefined)?.inboundSMSMessage?.[0];
  const from = String(
    globe?.senderAddress ?? data.from ?? data.From ?? data.sender ?? data.number ?? "",
  );
  const message = String(
    globe?.message ?? data.message ?? data.Body ?? data.text ?? "",
  );
  return { from: from.replace(/^tel:/i, "").trim(), message: message.trim() };
}

function parseReport(message: string) {
  const match = message.match(
    /BANTAYBAYAN\s+EMERGENCY:\s*(.+?)\s*\((\w+)\)\.?\s*Location:\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i,
  );
  if (!match) return null;
  const emergencyType = match[1].trim().slice(0, 40);
  const level = LEVELS.find((l) => l.toLowerCase() === match[2].toLowerCase());
  const latitude = Number(match[3]);
  const longitude = Number(match[4]);
  if (
    !level ||
    !emergencyType ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { emergencyType, level, latitude, longitude };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("SMS_WEBHOOK_SECRET");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !webhookSecret) {
    console.error("SMS report function environment is incomplete.");
    return respond(500, { error: "SMS reporting is not configured." });
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  if (!safeEqual(token, webhookSecret)) {
    return respond(401, { error: "Unauthorized." });
  }

  try {
    const sms = await readSms(request);
    if (!sms.from || !sms.message || sms.message.length > MAX_MESSAGE_LENGTH) {
      return respond(400, { error: "Invalid SMS payload." });
    }
    const report = parseReport(sms.message);
    const isLocated = report !== null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: limitError } = await adminClient.rpc(
      "consume_quick_report_rate_limit",
      {
        p_request_key: await sha256Hex(`sms:${serviceRoleKey}:${sms.from}`),
        p_limit: 5,
        p_window_seconds: 3600,
      },
    );
    if (limitError) throw limitError;
    if (allowed !== true) return respond(200, { ignored: true });

    // The sender number is spoofable, so it is only used for the display name,
    // never to attribute the report to an account.
    let reporterName = "SMS report";
    const digits = sms.from.replace(/\D/g, "").slice(-10);
    if (digits.length === 10) {
      const { data: matches } = await adminClient
        .from("profiles")
        .select("first_name, last_name")
        .ilike("contact_number", `%${digits}`)
        .limit(2);
      if (matches?.length === 1) {
        const name = `${matches[0].first_name} ${matches[0].last_name}`.trim();
        if (name) reporterName = `${name} (SMS)`;
      }
    }

    const { data: created, error: insertError } = await adminClient
      .from("reports")
      .insert({
        user_id: null,
        reporter_name: reporterName,
        contact_number: sms.from,
        // Free-text messages have no coordinates; staff call the sender back.
        emergency_type: report?.emergencyType ?? "SMS Report",
        accident_level: report?.level ?? "High",
        description: isLocated ? null : sms.message,
        latitude: report?.latitude ?? null,
        longitude: report?.longitude ?? null,
        status: "Pending",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      const notification = await fetch(
        `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/notify-report-event`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event: "report_created", reportId: created.id }),
        },
      );
      if (!notification.ok) {
        console.error("Could not notify about SMS report:", notification.status);
      }
    } catch (error) {
      console.error("Could not notify about SMS report:", error);
    }

    return respond(200, { reportId: created.id });
  } catch (error) {
    console.error(
      "SMS report failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return respond(500, { error: "Could not process the SMS report." });
  }
});
