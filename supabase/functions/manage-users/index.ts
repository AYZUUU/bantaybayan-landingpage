import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class InputError extends Error {}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredText(value: unknown, field: string, maximum = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new InputError(`Invalid ${field}.`);
  }
  return value.trim();
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
    console.error("Supabase function environment is incomplete.");
    return respond(500, { error: "User management is not configured." });
  }
  if (!authorization) return respond(401, { error: "Sign in is required." });
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return respond(401, { error: "Sign in is required." });

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const {
      data: { user: actor },
      error: actorError,
    } = await callerClient.auth.getUser(accessToken);
    if (actorError || !actor) return respond(401, { error: "Session is invalid." });

    const { data: actorProfile, error: actorProfileError } = await adminClient
      .from("profiles")
      .select("role, status")
      .eq("id", actor.id)
      .maybeSingle();
    if (actorProfileError) throw actorProfileError;
    const actorRole = actorProfile?.role;
    const { data: assurance, error: assuranceError } =
      await callerClient.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
    if (assuranceError) throw assuranceError;
    if (
      actorProfile?.status !== "active" ||
      (actorRole !== "admin" && actorRole !== "superadmin")
    ) {
      return respond(403, { error: "Administrator access is required." });
    }
    if (assurance.currentLevel !== "aal2") {
      return respond(403, {
        error: "Verify your authenticator code before managing accounts.",
      });
    }

    const payload: unknown = await request.json();
    if (typeof payload !== "object" || payload === null) {
      return respond(400, { error: "Invalid request body." });
    }
    const body = payload as Record<string, unknown>;
    const action = requiredText(body.action, "action", 20);

    if (action === "create") {
      const role = requiredText(body.role, "role", 20).toLowerCase();
      if (
        (role !== "responder" && role !== "admin") ||
        (role === "admin" && actorRole !== "superadmin")
      ) {
        return respond(403, { error: "You cannot create this account role." });
      }

      const email = requiredText(body.email, "email", 320).toLowerCase();
      const password = requiredText(body.password, "password", 128);
      if (password.length < 8 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return respond(400, { error: "Enter a valid email and an 8-character password." });
      }
      const firstName = requiredText(body.first_name, "first name", 100);
      const lastName = requiredText(body.last_name, "last name", 100);
      const contactNumber = requiredText(body.contact_number, "contact number", 40);
      const station =
        role === "responder"
          ? requiredText(body.station, "station", 120)
          : null;

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          migration_source: "admin-provisioning",
        },
      });
      if (error || !data.user) {
        return respond(400, {
          error: error?.message || "Could not create the account.",
        });
      }

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          role,
          status: "active",
          station,
        })
        .eq("id", data.user.id)
        .select("id")
        .maybeSingle();
      if (profileError || !profile) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(
          data.user.id,
        );
        if (cleanupError) {
          console.error("Could not remove the incomplete provisioned account.");
        }
        throw profileError || new Error("The new account profile was not created.");
      }
      return respond(200, { id: profile.id });
    }

    const targetId = requiredText(body.id, "account ID", 64);
    if (targetId === actor.id && action === "delete") {
      return respond(400, { error: "You cannot delete your own account." });
    }
    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return respond(404, { error: "Account not found." });
    if (
      actorRole !== "superadmin" &&
      (target.role === "admin" || target.role === "superadmin")
    ) {
      return respond(403, { error: "You cannot modify this account." });
    }

    if (action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return respond(200, { id: targetId });
    }

    if (action !== "update") {
      return respond(400, { error: "Unsupported user-management action." });
    }

    const updates: Record<string, string | null> = {};
    for (const field of ["first_name", "last_name", "contact_number", "station"]) {
      if (field in body) {
        updates[field] =
          body[field] === null && field === "station"
            ? null
            : requiredText(body[field], field, field === "station" ? 120 : 100);
      }
    }
    if ("role" in body) {
      const role = requiredText(body.role, "role", 20).toLowerCase();
      if (
        !["citizen", "responder", "admin", "superadmin"].includes(role) ||
        (actorRole !== "superadmin" &&
          (role === "admin" || role === "superadmin"))
      ) {
        return respond(403, { error: "You cannot assign this account role." });
      }
      updates.role = role;
    }
    if ("status" in body) {
      const status = requiredText(body.status, "status", 20).toLowerCase();
      if (!["active", "pending", "suspended"].includes(status)) {
        return respond(400, { error: "Invalid account status." });
      }
      updates.status = status;
    }
    if (Object.keys(updates).length === 0) {
      return respond(400, { error: "No editable account fields were supplied." });
    }

    const { error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", targetId);
    if (error) throw error;
    return respond(200, { id: targetId });
  } catch (error) {
    if (error instanceof InputError) {
      return respond(400, { error: error.message });
    }
    console.error(
      "User-management request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return respond(500, { error: "Could not complete user management." });
  }
});
