import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReportEvent =
  | "report_created"
  | "report_assigned"
  | "report_claimed"
  | "report_resolved"
  | "backup_requested";

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Notification service is not configured." });
  }
  if (!authorization) return respond(401, { error: "Sign in is required." });

  const internalRequest = authorization === `Bearer ${serviceRoleKey}`;
  const callerClient = internalRequest
    ? null
    : createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let actorId: string | null = null;
    let actorRole: string | null = null;
    if (!internalRequest && callerClient) {
      const {
        data: { user: actor },
        error: authError,
      } = await callerClient.auth.getUser();
      if (authError || !actor) {
        return respond(401, { error: "Session is invalid." });
      }
      actorId = actor.id;

      const { data: actorProfile, error: actorError } = await adminClient
        .from("profiles")
        .select("role, status")
        .eq("id", actor.id)
        .maybeSingle();
      if (actorError) throw actorError;
      if (actorProfile?.status !== "active") {
        return respond(403, { error: "An active account is required." });
      }
      actorRole = actorProfile.role;
    }

    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("event" in body) ||
      !("reportId" in body) ||
      typeof body.event !== "string" ||
      typeof body.reportId !== "number" ||
      !Number.isSafeInteger(body.reportId)
    ) {
      return respond(400, { error: "Invalid notification request." });
    }

    const event = body.event as ReportEvent;
    if (
      ![
        "report_created",
        "report_assigned",
        "report_claimed",
        "report_resolved",
        "backup_requested",
      ].includes(event)
    ) {
      return respond(400, { error: "Unsupported report event." });
    }

    const { data: report, error: reportError } = await adminClient
      .from("reports")
      .select(
        "id, user_id, reporter_name, emergency_type, accident_level, status, assigned_responder_id, backup_requested_at, backup_note",
      )
      .eq("id", body.reportId)
      .maybeSingle();
    if (reportError) throw reportError;
    if (!report) return respond(404, { error: "Report not found." });

    const isAdmin =
      actorRole === "admin" || actorRole === "superadmin";
    if (isAdmin) {
      if (!callerClient) {
        return respond(403, { error: "Administrator session is required." });
      }
      const { data: assurance, error: assuranceError } =
        await callerClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== "aal2") {
        return respond(403, {
          error: "Verify your authenticator code before sending admin alerts.",
        });
      }
    }
    const unauthorizedInternalRequest =
      internalRequest && (event !== "report_created" || report.user_id !== null);
    const unauthorizedUserRequest =
      !internalRequest &&
      ((event === "report_created" && report.user_id !== actorId) ||
        (event === "report_assigned" &&
          (!isAdmin || !report.assigned_responder_id)) ||
        (event === "report_claimed" &&
          (actorRole !== "responder" ||
            report.assigned_responder_id !== actorId)) ||
        (event === "backup_requested" &&
          (actorRole !== "responder" ||
            report.assigned_responder_id !== actorId ||
            !report.backup_requested_at)) ||
        (event === "report_resolved" &&
          (!isAdmin || !report.status.toLowerCase().includes("resolved"))));
    if (unauthorizedInternalRequest || unauthorizedUserRequest) {
      return respond(403, { error: "This account cannot send that report alert." });
    }

    let targetIds: string[] = [];
    if (event === "report_created" || event === "backup_requested") {
      const roles = event === "report_created"
        ? ["responder", "admin", "superadmin"]
        : ["admin", "superadmin"];
      const { data, error } = await adminClient
        .from("profiles")
        .select("id")
        .in("role", roles)
        .eq("status", "active");
      if (error) throw error;
      targetIds = (data || []).map((profile) => profile.id);
    } else {
      const targetId =
        event === "report_assigned"
          ? report.assigned_responder_id
          : report.user_id;
      if (targetId) targetIds = [targetId];
    }

    if (!targetIds.length) return respond(200, { sent: 0 });

    const title =
      event === "report_created"
        ? "New emergency report"
        : event === "report_assigned"
          ? "Incident dispatched"
          : event === "report_claimed"
            ? "Responder on the way"
            : event === "backup_requested"
              ? "Backup requested"
              : "Incident resolved";
    const incidentName = report.emergency_type || "Emergency incident";
    const message =
      event === "report_created"
        ? `${report.accident_level ? `${report.accident_level} ` : ""}${incidentName} reported by ${report.reporter_name || "a citizen"}.`
        : event === "report_assigned"
          ? `${incidentName} has been assigned to your unit.`
          : event === "backup_requested"
            ? `A responder needs backup for report #${report.id} (${incidentName}).${report.backup_note ? ` ${report.backup_note}` : ""}`
          : event === "report_claimed"
            ? `A responder is on the way for your ${incidentName.toLowerCase()}.`
            : `Your ${incidentName.toLowerCase()} has been resolved.`;
    const tag = `report-${report.id}`;
    const appUrl =
      event === "report_created" ||
        event === "report_assigned" ||
        event === "backup_requested"
        ? "/incidents"
        : "/tabs/reporting";

    const { data: recipients, error: recipientError } = await adminClient
      .from("profiles")
      .select("id, push_token")
      .in("id", targetIds);
    if (recipientError) throw recipientError;

    const expoMessages = (recipients || [])
      .filter((recipient) => recipient.push_token)
      .map((recipient) => ({
        to: recipient.push_token,
        sound: "default",
        title,
        body: message,
        data: { reportId: report.id, event },
      }));
    const expoResponses = await Promise.all(
      expoMessages.map(async (messageBody) => {
        const headers = new Headers({ "Content-Type": "application/json" });
        const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
        if (expoAccessToken) {
          headers.set("Authorization", `Bearer ${expoAccessToken}`);
        }
        try {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers,
            body: JSON.stringify(messageBody),
          });
          if (!response.ok) {
            console.error("Expo push request failed:", response.status);
          }
          return response.ok;
        } catch (error) {
          console.error("Expo push delivery failed:", error);
          return false;
        }
      }),
    );

    const { data: subscriptions, error: subscriptionError } = await adminClient
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", targetIds);
    if (subscriptionError) throw subscriptionError;

    let webPushCount = 0;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (subscriptions?.length && vapidPublicKey && vapidPrivateKey && vapidSubject) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const results = await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webPush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              JSON.stringify({
                title,
                body: message,
                tag,
                url: appUrl,
              }),
            );
            return true;
          } catch (error) {
            const statusCode =
              typeof error === "object" && error !== null && "statusCode" in error
                ? error.statusCode
                : null;
            if (statusCode === 404 || statusCode === 410) {
              const { error: deleteError } = await adminClient
                .from("web_push_subscriptions")
                .delete()
                .eq("id", subscription.id);
              if (deleteError) console.error("Could not remove expired push subscription.");
              return false;
            }
            console.error("Web push delivery failed:", error);
            return false;
          }
        }),
      );
      webPushCount = results.filter(Boolean).length;
    } else if (subscriptions?.length) {
      console.error("Web push VAPID secrets are not configured.");
    }

    return respond(200, {
      sent: expoResponses.filter(Boolean).length + webPushCount,
    });
  } catch (error) {
    console.error(
      "Report notification failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return respond(500, { error: "Could not send report notifications." });
  }
});
